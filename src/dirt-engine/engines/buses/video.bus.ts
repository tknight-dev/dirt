/**
 * @author tknight-dev
 */

import { AssetDeclarations } from '../../models/asset.model';
import { AudioEngine } from '../audio.engine';
import { AudioModulation } from '../../models/audio-modulation.model';
import { KeyAction, KeyCommon } from '../keyboard.engine';
import { Map, MapActive, MapConfig } from '../../models/map.model';
import { MouseAction } from '../mouse.engine';
import { ResizeEngine } from '../resize.engine';
import {
	VideoInputCmd,
	VideoInputCmdGameModeEdit,
	VideoInputCmdGameModeEditApply,
	VideoInputCmdGameModeEditDraw,
	VideoInputCmdGameModePlay,
	VideoInputCmdGamePause,
	VideoInputCmdGamePauseReason,
	VideoInputCmdGameSave,
	VideoInputCmdGameStart,
	VideoInputCmdGameUnpause,
	VideoInputCmdInit,
	VideoInputCmdResize,
	VideoInputCmdSettings,
	VideoPayload,
	VideoOutputCmd,
	VideoOutputCmdAudioEffect,
	VideoOutputCmdAudioMusicFade,
	VideoOutputCmdAudioMusicPause,
	VideoOutputCmdAudioMusicPlay,
	VideoOutputCmdAudioMusicUnpause,
	VideoOutputCmdAudioVolume,
	VideoOutputCmdEditCameraUpdate,
	VideoOutputCmdMapAsset,
	VideoOutputCmdMapLoadStatus,
	VideoOutputCmdMapSave,
	VideoWorkerPayload,
	VideoWorkerStatusInitialized,
} from '../../models/video-worker-cmds.model';
import { VisibilityEngine } from '../visibility.engine';

export class VideoBus {
	private static callbackEditCameraUpdate: (update: VideoOutputCmdEditCameraUpdate) => void;
	private static callbackEditComplete: () => void;
	private static callbackMapAsset: (mapActive: MapActive | undefined) => void;
	private static callbackMapHourOfDayEff: (hourOfDayEff: number) => void;
	private static callbackMapLoadStatus: (status: boolean) => void;
	private static callbackMapSave: (data: string, name: string) => void;
	private static callbackStatusInitialized: (durationInMs: number) => void;
	private static canvasBackground: HTMLCanvasElement;
	private static canvasForeground: HTMLCanvasElement;
	private static canvasOverlay: HTMLCanvasElement;
	private static canvasPrimary: HTMLCanvasElement;
	private static canvasUnderlay: HTMLCanvasElement;
	private static complete: boolean;
	private static fps: number = 60;
	private static initialized: boolean;
	private static mapInteration: HTMLElement;
	private static streams: HTMLElement;
	private static worker: Worker;

	/**
	 * Start the video streams in another thread
	 */
	public static async initialize(
		assetDeclarations: AssetDeclarations,
		streams: HTMLElement,
		canvasBackground: HTMLCanvasElement,
		canvasForeground: HTMLCanvasElement,
		canvasOverlay: HTMLCanvasElement,
		canvasPrimary: HTMLCanvasElement,
		canvasUnderlay: HTMLCanvasElement,
		mapInteration: HTMLElement,
		VideoInputCmdSettings: VideoInputCmdSettings,
	): Promise<void> {
		if (VideoBus.initialized) {
			console.error('VideoBus > initialize: already initialized');
			return;
		}
		VideoBus.initialized = true;

		let canvasOffscreenUnderlay: OffscreenCanvas = canvasUnderlay.transferControlToOffscreen(),
			canvasOffscreenBackground: OffscreenCanvas = canvasBackground.transferControlToOffscreen(),
			canvasOffscreenPrimary: OffscreenCanvas = canvasPrimary.transferControlToOffscreen(),
			canvasOffscreenForeground: OffscreenCanvas = canvasForeground.transferControlToOffscreen(),
			canvasOffscreenOverlay: OffscreenCanvas = canvasOverlay.transferControlToOffscreen(),
			VideoInputCmdInit: VideoInputCmdInit,
			VideoInputCmdResize: VideoInputCmdResize,
			videoPayload: VideoPayload;

		// Cache
		VideoBus.canvasBackground = canvasBackground;
		VideoBus.canvasForeground = canvasForeground;
		VideoBus.canvasOverlay = canvasOverlay;
		VideoBus.canvasPrimary = canvasPrimary;
		VideoBus.canvasUnderlay = canvasUnderlay;
		VideoBus.mapInteration = mapInteration;
		VideoBus.streams = streams;

		// Config
		ResizeEngine.setCallback(VideoBus.resized);
		VisibilityEngine.setCallback((visible: boolean) => {
			if (!visible) {
				VideoBus.outputGamePause({
					reason: VideoInputCmdGamePauseReason.VISIBILITY,
				});
			} else {
				setTimeout(() => {
					VideoBus.resized(false, true);
				});
			}
		});

		// Spawn Video thread
		if (window.Worker) {
			VideoBus.worker = new Worker(new URL('../workers/video.worker.engine', import.meta.url));

			// Setup listener
			VideoBus.input();

			/*
			 * Initialization payload
			 */
			VideoInputCmdResize = VideoBus.resized(true);
			VideoInputCmdInit = Object.assign(
				{
					assetDeclarations: assetDeclarations,
					canvasOffscreenBackground: canvasOffscreenBackground,
					canvasOffscreenForeground: canvasOffscreenForeground,
					canvasOffscreenOverlay: canvasOffscreenOverlay,
					canvasOffscreenPrimary: canvasOffscreenPrimary,
					canvasOffscreenUnderlay: canvasOffscreenUnderlay,
				},
				VideoInputCmdResize,
				VideoInputCmdSettings,
			);
			videoPayload = {
				cmd: VideoInputCmd.INIT,
				data: VideoInputCmdInit,
			};
			VideoBus.worker.postMessage(videoPayload, [
				canvasOffscreenBackground,
				canvasOffscreenForeground,
				canvasOffscreenOverlay,
				canvasOffscreenPrimary,
				canvasOffscreenUnderlay,
			]);
			VideoBus.complete = true;
		} else {
			alert('Web Workers are not supported by your browser');
		}
	}

	/*
	 * Commands from worker (typically audio effect triggers)
	 */
	private static input(): void {
		let audioModulation: AudioModulation | null,
			VideoOutputCmdAudioEffect: VideoOutputCmdAudioEffect,
			VideoOutputCmdAudioMusicFade: VideoOutputCmdAudioMusicFade,
			VideoOutputCmdAudioMusicPlay: VideoOutputCmdAudioMusicPlay,
			VideoOutputCmdAudioMusicPause: VideoOutputCmdAudioMusicPause,
			VideoOutputCmdAudioMusicUnpause: VideoOutputCmdAudioMusicUnpause,
			VideoOutputCmdAudioVolume: VideoOutputCmdAudioVolume,
			VideoOutputCmdEditCameraUpdate: VideoOutputCmdEditCameraUpdate,
			VideoOutputCmdMapAsset: VideoOutputCmdMapAsset,
			VideoOutputCmdMapLoadStatus: VideoOutputCmdMapLoadStatus,
			VideoOutputCmdMapSave: VideoOutputCmdMapSave,
			videoWorkerPayload: VideoWorkerPayload,
			videoWorkerPayloads: VideoWorkerPayload[],
			videoWorkerStatusInitialized: VideoWorkerStatusInitialized;

		VideoBus.worker.onmessage = (event: MessageEvent) => {
			videoWorkerPayloads = event.data.payloads;

			for (let i = 0; i < videoWorkerPayloads.length; i++) {
				videoWorkerPayload = videoWorkerPayloads[i];

				switch (videoWorkerPayload.cmd) {
					case VideoOutputCmd.AUDIO_EFFECT:
						VideoOutputCmdAudioEffect = <VideoOutputCmdAudioEffect>videoWorkerPayload.data;
						audioModulation = AudioModulation.find(VideoOutputCmdAudioEffect.modulationId);
						if (audioModulation) {
							AudioEngine.trigger(
								VideoOutputCmdAudioEffect.id,
								audioModulation,
								VideoOutputCmdAudioEffect.pan,
								VideoOutputCmdAudioEffect.volumePercentage,
							);
						} else {
							console.error('GameEngine > video: effect asset-id or modulation-id invalid');
						}
						break;
					case VideoOutputCmd.AUDIO_MUSIC_FADE:
						VideoOutputCmdAudioMusicFade = <VideoOutputCmdAudioMusicFade>videoWorkerPayload.data;
						AudioEngine.fade(
							VideoOutputCmdAudioMusicFade.id,
							VideoOutputCmdAudioMusicFade.durationInMs,
							VideoOutputCmdAudioMusicPlay.volumePercentage,
						);
						break;
					case VideoOutputCmd.AUDIO_MUSIC_PLAY:
						VideoOutputCmdAudioMusicPlay = <VideoOutputCmdAudioMusicPlay>videoWorkerPayload.data;
						AudioEngine.play(
							VideoOutputCmdAudioMusicPlay.id,
							VideoOutputCmdAudioMusicPlay.timeInS,
							VideoOutputCmdAudioMusicPlay.volumePercentage,
						);
						break;
					case VideoOutputCmd.AUDIO_MUSIC_PAUSE:
						VideoOutputCmdAudioMusicPause = <VideoOutputCmdAudioMusicPause>videoWorkerPayload.data;
						AudioEngine.pause(VideoOutputCmdAudioMusicPause.id);
						break;
					case VideoOutputCmd.AUDIO_MUSIC_UNPAUSE:
						VideoOutputCmdAudioMusicUnpause = <VideoOutputCmdAudioMusicUnpause>videoWorkerPayload.data;
						AudioEngine.unpause(VideoOutputCmdAudioMusicUnpause.id);
						break;
					case VideoOutputCmd.AUDIO_VOLUME:
						VideoOutputCmdAudioVolume = <VideoOutputCmdAudioVolume>videoWorkerPayload.data;
						AudioEngine.setVolumeAsset(
							VideoOutputCmdAudioVolume.id,
							VideoOutputCmdAudioVolume.volumePercentage,
						);
						break;
					case VideoOutputCmd.EDIT_CAMERA_UPDATE:
						VideoOutputCmdEditCameraUpdate = <VideoOutputCmdEditCameraUpdate>videoWorkerPayload.data;
						if (VideoBus.callbackEditCameraUpdate !== undefined) {
							VideoBus.callbackEditCameraUpdate(VideoOutputCmdEditCameraUpdate);
						} else {
							console.error('VideoBus > input: edit camera update callback not set');
						}
						break;
					case VideoOutputCmd.EDIT_COMPLETE:
						if (VideoBus.callbackEditComplete !== undefined) {
							VideoBus.callbackEditComplete();
						} else {
							console.error('VideoBus > input: edit complete callback not set');
						}
						break;
					case VideoOutputCmd.MAP_ASSET:
						VideoOutputCmdMapAsset = <VideoOutputCmdMapAsset>videoWorkerPayload.data;
						if (VideoBus.callbackMapAsset !== undefined) {
							VideoBus.callbackMapAsset(VideoOutputCmdMapAsset.mapActive);
						} else {
							console.error('VideoBus > input: map asset callback not set');
						}
						break;
						1440;
					case VideoOutputCmd.MAP_HOUR_OF_DAY_EFF:
						if (VideoBus.callbackMapHourOfDayEff !== undefined) {
							VideoBus.callbackMapHourOfDayEff(<number>videoWorkerPayload.data);
						} else {
							console.error('VideoBus > input: hour of day eff callback not set');
						}
						break;
					case VideoOutputCmd.MAP_LOAD_STATUS:
						VideoOutputCmdMapLoadStatus = <VideoOutputCmdMapLoadStatus>videoWorkerPayload.data;
						if (VideoBus.callbackMapLoadStatus !== undefined) {
							VideoBus.callbackMapLoadStatus(VideoOutputCmdMapLoadStatus.status);
						} else {
							console.error('VideoBus > input: map load status callback not set');
						}
						break;
					case VideoOutputCmd.MAP_SAVE:
						VideoOutputCmdMapSave = <VideoOutputCmdMapSave>videoWorkerPayload.data;
						if (VideoBus.callbackMapSave !== undefined) {
							VideoBus.callbackMapSave(VideoOutputCmdMapSave.data, VideoOutputCmdMapSave.name);
						} else {
							console.error('VideoBus > input: map save callback not set');
						}
						break;
					case VideoOutputCmd.STATUS_INITIALIZED:
						videoWorkerStatusInitialized = <VideoWorkerStatusInitialized>videoWorkerPayload.data;
						VideoBus.callbackStatusInitialized(videoWorkerStatusInitialized.durationInMs);
						break;
				}
			}
		};
	}

	public static outputKey(keyAction: KeyAction): void {
		VideoBus.worker.postMessage({
			cmd: VideoInputCmd.KEY,
			data: keyAction,
		});
	}

	public static outputMouse(action: MouseAction): void {
		VideoBus.worker.postMessage({
			cmd: VideoInputCmd.MOUSE,
			data: action,
		});
	}

	public static outputMapLoad(file: string): void {
		VideoBus.worker.postMessage({
			cmd: VideoInputCmd.MAP_LOAD,
			data: {
				data: file,
			},
		});
	}

	/**
	 * @param id undefined indicates a new map
	 */
	public static outputMapLoadById(id: string | undefined): void {
		VideoBus.worker.postMessage({
			cmd: VideoInputCmd.MAP_LOAD_BY_ID,
			data: {
				id: id,
			},
		});
	}

	public static outputGameModeEdit(edit: VideoInputCmdGameModeEdit): void {
		VideoBus.worker.postMessage({
			cmd: VideoInputCmd.GAME_MODE_EDIT,
			data: edit,
		});
	}

	public static outputGameModeEditApply(apply: VideoInputCmdGameModeEditApply): void {
		VideoBus.worker.postMessage({
			cmd: VideoInputCmd.GAME_MODE_EDIT_APPLY,
			data: apply,
		});
	}

	public static outputGameModeEditDraw(apply: VideoInputCmdGameModeEditDraw): void {
		VideoBus.worker.postMessage({
			cmd: VideoInputCmd.GAME_MODE_EDIT_DRAW,
			data: apply,
		});
	}

	public static outputGameModeEditRedo(): void {
		VideoBus.worker.postMessage({
			cmd: VideoInputCmd.GAME_MODE_EDIT_REDO,
			data: null,
		});
	}

	public static outputGameModeEditSettings(mapConfig: MapConfig): void {
		VideoBus.worker.postMessage({
			cmd: VideoInputCmd.GAME_MODE_EDIT_SETTINGS,
			data: mapConfig,
		});
	}

	public static outputGameModeEditTimeForced(enable: boolean): void {
		VideoBus.worker.postMessage({
			cmd: VideoInputCmd.GAME_MODE_EDIT_TIME_FORCED,
			data: enable,
		});
	}

	public static outputGameModeEditUndo(): void {
		VideoBus.worker.postMessage({
			cmd: VideoInputCmd.GAME_MODE_EDIT_UNDO,
			data: null,
		});
	}

	public static outputGameModePlay(play: VideoInputCmdGameModePlay): void {
		VideoBus.worker.postMessage({
			cmd: VideoInputCmd.GAME_MODE_PLAY,
			data: play,
		});
	}

	public static outputGamePause(pause: VideoInputCmdGamePause): void {
		VideoBus.worker.postMessage({
			cmd: VideoInputCmd.GAME_PAUSE,
			data: pause,
		});
	}

	public static outputGameSave(save: VideoInputCmdGameSave): void {
		VideoBus.worker.postMessage({
			cmd: VideoInputCmd.GAME_SAVE,
			data: save,
		});
	}

	public static outputGameStart(start: VideoInputCmdGameStart): void {
		VideoBus.worker.postMessage({
			cmd: VideoInputCmd.GAME_START,
			data: start,
		});
	}

	public static outputGameUnpause(unpause: VideoInputCmdGameUnpause): void {
		VideoBus.worker.postMessage({
			cmd: VideoInputCmd.GAME_UNPAUSE,
			data: unpause,
		});
	}

	public static outputSettings(settings: VideoInputCmdSettings): void {
		VideoBus.worker.postMessage({
			cmd: VideoInputCmd.SETTINGS,
			data: settings,
		});
	}

	private static resized(disablePost?: boolean, force?: boolean): VideoInputCmdResize {
		let data: VideoInputCmdResize,
			devicePixelRatio: number = Math.round(window.devicePixelRatio * 1000) / 1000,
			devicePixelRatioEff: number = Math.round((1 / window.devicePixelRatio) * 1000) / 1000,
			domRect: DOMRect = VideoBus.streams.getBoundingClientRect(),
			height: number = domRect.height,
			width: number = domRect.width;

		// Transform the canvas to the intended size
		VideoBus.canvasBackground.style.transform = 'scale(' + devicePixelRatioEff + ')';
		VideoBus.canvasForeground.style.transform = 'scale(' + devicePixelRatioEff + ')';
		VideoBus.canvasOverlay.style.transform = 'scale(' + devicePixelRatioEff + ')';
		VideoBus.canvasPrimary.style.transform = 'scale(' + devicePixelRatioEff + ')';
		VideoBus.canvasUnderlay.style.transform = 'scale(' + devicePixelRatioEff + ')';

		// Transform the map interaction to the correct starting place
		VideoBus.mapInteration.style.transform =
			'translate(' + -20 * devicePixelRatioEff + 'px, ' + 20 * devicePixelRatioEff + 'px)';

		data = {
			devicePixelRatio: devicePixelRatio,
			force: force,
			height: Math.round(height),
			width: Math.round(width),
		};

		if (VideoBus.complete && disablePost !== true) {
			VideoBus.worker.postMessage({
				cmd: VideoInputCmd.RESIZE,
				data: data,
			});
		}

		return data;
	}

	public static setCallbackEditCameraUpdate(
		callbackEditCameraUpdate: (update: VideoOutputCmdEditCameraUpdate) => void,
	): void {
		VideoBus.callbackEditCameraUpdate = callbackEditCameraUpdate;
	}

	public static setCallbackEditComplete(callbackEditComplete: () => void): void {
		VideoBus.callbackEditComplete = callbackEditComplete;
	}

	public static setCallbackMapAsset(callbackMapAsset: (mapActive: MapActive | undefined) => void): void {
		VideoBus.callbackMapAsset = callbackMapAsset;
	}

	public static setCallbackMapHourOfDayEff(callbackMapHourOfDayEff: (hourOfDayEff: number) => void): void {
		VideoBus.callbackMapHourOfDayEff = callbackMapHourOfDayEff;
	}

	public static setCallbackMapLoadStatus(callbackMapLoadStatus: (status: boolean) => void): void {
		VideoBus.callbackMapLoadStatus = callbackMapLoadStatus;
	}

	public static setCallbackMapSave(callbackMapSave: (data: string, name: string) => void): void {
		VideoBus.callbackMapSave = callbackMapSave;
	}

	public static setCallbackStatusInitialized(callbackStatusInitialized: (durationInMs: number) => void): void {
		VideoBus.callbackStatusInitialized = callbackStatusInitialized;
	}

	public static isGoComplete(): boolean {
		return VideoBus.complete;
	}
}
