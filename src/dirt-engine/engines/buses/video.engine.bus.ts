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
	VideoBusInputCmd,
	VideoBusInputCmdGameModeEdit,
	VideoBusInputCmdGameModeEditApply,
	VideoBusInputCmdGameModeEditDraw,
	VideoBusInputCmdGameModePlay,
	VideoBusInputCmdGamePause,
	VideoBusInputCmdGamePauseReason,
	VideoBusInputCmdGameSave,
	VideoBusInputCmdGameStart,
	VideoBusInputCmdGameUnpause,
	VideoBusInputCmdInit,
	VideoBusInputCmdResize,
	VideoBusInputCmdSettings,
	VideoBusPayload,
	VideoBusOutputCmd,
	VideoBusOutputCmdAudioEffect,
	VideoBusOutputCmdAudioMusicFade,
	VideoBusOutputCmdAudioMusicPause,
	VideoBusOutputCmdAudioMusicPlay,
	VideoBusOutputCmdAudioMusicUnpause,
	VideoBusOutputCmdAudioVolume,
	VideoBusOutputCmdEditCameraUpdate,
	VideoBusOutputCmdMapAsset,
	VideoBusOutputCmdMapLoadStatus,
	VideoBusOutputCmdMapSave,
	VideoBusWorkerPayload,
	VideoBusWorkerStatusInitialized,
} from '../../engines/buses/video.model.bus';
import { VisibilityEngine } from '../visibility.engine';

export class VideoEngineBus {
	private static callbackEditCameraUpdate: (update: VideoBusOutputCmdEditCameraUpdate) => void;
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
		VideoBusInputCmdSettings: VideoBusInputCmdSettings,
	): Promise<void> {
		if (VideoEngineBus.initialized) {
			console.error('VideoEngineBus > initialize: already initialized');
			return;
		}
		VideoEngineBus.initialized = true;

		let canvasOffscreenUnderlay: OffscreenCanvas = canvasUnderlay.transferControlToOffscreen(),
			canvasOffscreenBackground: OffscreenCanvas = canvasBackground.transferControlToOffscreen(),
			canvasOffscreenPrimary: OffscreenCanvas = canvasPrimary.transferControlToOffscreen(),
			canvasOffscreenForeground: OffscreenCanvas = canvasForeground.transferControlToOffscreen(),
			canvasOffscreenOverlay: OffscreenCanvas = canvasOverlay.transferControlToOffscreen(),
			VideoBusInputCmdInit: VideoBusInputCmdInit,
			VideoBusInputCmdResize: VideoBusInputCmdResize,
			VideoBusPayload: VideoBusPayload;

		// Cache
		VideoEngineBus.canvasBackground = canvasBackground;
		VideoEngineBus.canvasForeground = canvasForeground;
		VideoEngineBus.canvasOverlay = canvasOverlay;
		VideoEngineBus.canvasPrimary = canvasPrimary;
		VideoEngineBus.canvasUnderlay = canvasUnderlay;
		VideoEngineBus.mapInteration = mapInteration;
		VideoEngineBus.streams = streams;

		// Config
		ResizeEngine.setCallback(VideoEngineBus.resized);
		VisibilityEngine.setCallback((visible: boolean) => {
			if (!visible) {
				VideoEngineBus.outputGamePause({
					reason: VideoBusInputCmdGamePauseReason.VISIBILITY,
				});
			} else {
				setTimeout(() => {
					VideoEngineBus.resized(false, true);
				});
			}
		});

		// Spawn Video thread
		if (window.Worker) {
			VideoEngineBus.worker = new Worker(new URL('../workers/video.worker.engine', import.meta.url));

			// Setup listener
			VideoEngineBus.input();

			/*
			 * Initialization payload
			 */
			VideoBusInputCmdResize = VideoEngineBus.resized(true);
			VideoBusInputCmdInit = Object.assign(
				{
					assetDeclarations: assetDeclarations,
					canvasOffscreenBackground: canvasOffscreenBackground,
					canvasOffscreenForeground: canvasOffscreenForeground,
					canvasOffscreenOverlay: canvasOffscreenOverlay,
					canvasOffscreenPrimary: canvasOffscreenPrimary,
					canvasOffscreenUnderlay: canvasOffscreenUnderlay,
				},
				VideoBusInputCmdResize,
				VideoBusInputCmdSettings,
			);
			VideoBusPayload = {
				cmd: VideoBusInputCmd.INIT,
				data: VideoBusInputCmdInit,
			};
			VideoEngineBus.worker.postMessage(VideoBusPayload, [
				canvasOffscreenBackground,
				canvasOffscreenForeground,
				canvasOffscreenOverlay,
				canvasOffscreenPrimary,
				canvasOffscreenUnderlay,
			]);
			VideoEngineBus.complete = true;
		} else {
			alert('Web Workers are not supported by your browser');
		}
	}

	/*
	 * Commands from worker (typically audio effect triggers)
	 */
	private static input(): void {
		let audioModulation: AudioModulation | null,
			VideoBusOutputCmdAudioEffect: VideoBusOutputCmdAudioEffect,
			VideoBusOutputCmdAudioMusicFade: VideoBusOutputCmdAudioMusicFade,
			VideoBusOutputCmdAudioMusicPlay: VideoBusOutputCmdAudioMusicPlay,
			VideoBusOutputCmdAudioMusicPause: VideoBusOutputCmdAudioMusicPause,
			VideoBusOutputCmdAudioMusicUnpause: VideoBusOutputCmdAudioMusicUnpause,
			VideoBusOutputCmdAudioVolume: VideoBusOutputCmdAudioVolume,
			VideoBusOutputCmdEditCameraUpdate: VideoBusOutputCmdEditCameraUpdate,
			VideoBusOutputCmdMapAsset: VideoBusOutputCmdMapAsset,
			VideoBusOutputCmdMapLoadStatus: VideoBusOutputCmdMapLoadStatus,
			VideoBusOutputCmdMapSave: VideoBusOutputCmdMapSave,
			VideoBusWorkerPayload: VideoBusWorkerPayload,
			VideoBusWorkerPayloads: VideoBusWorkerPayload[],
			VideoBusWorkerStatusInitialized: VideoBusWorkerStatusInitialized;

		VideoEngineBus.worker.onmessage = (event: MessageEvent) => {
			VideoBusWorkerPayloads = event.data.payloads;

			for (let i = 0; i < VideoBusWorkerPayloads.length; i++) {
				VideoBusWorkerPayload = VideoBusWorkerPayloads[i];

				switch (VideoBusWorkerPayload.cmd) {
					case VideoBusOutputCmd.AUDIO_EFFECT:
						VideoBusOutputCmdAudioEffect = <VideoBusOutputCmdAudioEffect>VideoBusWorkerPayload.data;
						audioModulation = AudioModulation.find(VideoBusOutputCmdAudioEffect.modulationId);
						if (audioModulation) {
							AudioEngine.trigger(
								VideoBusOutputCmdAudioEffect.id,
								audioModulation,
								VideoBusOutputCmdAudioEffect.pan,
								VideoBusOutputCmdAudioEffect.volumePercentage,
							);
						} else {
							console.error('GameEngine > video: effect asset-id or modulation-id invalid');
						}
						break;
					case VideoBusOutputCmd.AUDIO_MUSIC_FADE:
						VideoBusOutputCmdAudioMusicFade = <VideoBusOutputCmdAudioMusicFade>VideoBusWorkerPayload.data;
						AudioEngine.fade(
							VideoBusOutputCmdAudioMusicFade.id,
							VideoBusOutputCmdAudioMusicFade.durationInMs,
							VideoBusOutputCmdAudioMusicPlay.volumePercentage,
						);
						break;
					case VideoBusOutputCmd.AUDIO_MUSIC_PLAY:
						VideoBusOutputCmdAudioMusicPlay = <VideoBusOutputCmdAudioMusicPlay>VideoBusWorkerPayload.data;
						AudioEngine.play(
							VideoBusOutputCmdAudioMusicPlay.id,
							VideoBusOutputCmdAudioMusicPlay.timeInS,
							VideoBusOutputCmdAudioMusicPlay.volumePercentage,
						);
						break;
					case VideoBusOutputCmd.AUDIO_MUSIC_PAUSE:
						VideoBusOutputCmdAudioMusicPause = <VideoBusOutputCmdAudioMusicPause>VideoBusWorkerPayload.data;
						AudioEngine.pause(VideoBusOutputCmdAudioMusicPause.id);
						break;
					case VideoBusOutputCmd.AUDIO_MUSIC_UNPAUSE:
						VideoBusOutputCmdAudioMusicUnpause = <VideoBusOutputCmdAudioMusicUnpause>(
							VideoBusWorkerPayload.data
						);
						AudioEngine.unpause(VideoBusOutputCmdAudioMusicUnpause.id);
						break;
					case VideoBusOutputCmd.AUDIO_VOLUME:
						VideoBusOutputCmdAudioVolume = <VideoBusOutputCmdAudioVolume>VideoBusWorkerPayload.data;
						AudioEngine.setVolumeAsset(
							VideoBusOutputCmdAudioVolume.id,
							VideoBusOutputCmdAudioVolume.volumePercentage,
						);
						break;
					case VideoBusOutputCmd.EDIT_CAMERA_UPDATE:
						VideoBusOutputCmdEditCameraUpdate = <VideoBusOutputCmdEditCameraUpdate>(
							VideoBusWorkerPayload.data
						);
						if (VideoEngineBus.callbackEditCameraUpdate !== undefined) {
							VideoEngineBus.callbackEditCameraUpdate(VideoBusOutputCmdEditCameraUpdate);
						} else {
							console.error('VideoEngineBus > input: edit camera update callback not set');
						}
						break;
					case VideoBusOutputCmd.EDIT_COMPLETE:
						if (VideoEngineBus.callbackEditComplete !== undefined) {
							VideoEngineBus.callbackEditComplete();
						} else {
							console.error('VideoEngineBus > input: edit complete callback not set');
						}
						break;
					case VideoBusOutputCmd.MAP_ASSET:
						VideoBusOutputCmdMapAsset = <VideoBusOutputCmdMapAsset>VideoBusWorkerPayload.data;
						if (VideoEngineBus.callbackMapAsset !== undefined) {
							VideoEngineBus.callbackMapAsset(VideoBusOutputCmdMapAsset.mapActive);
						} else {
							console.error('VideoEngineBus > input: map asset callback not set');
						}
						break;
						1440;
					case VideoBusOutputCmd.MAP_HOUR_OF_DAY_EFF:
						if (VideoEngineBus.callbackMapHourOfDayEff !== undefined) {
							VideoEngineBus.callbackMapHourOfDayEff(<number>VideoBusWorkerPayload.data);
						} else {
							console.error('VideoEngineBus > input: hour of day eff callback not set');
						}
						break;
					case VideoBusOutputCmd.MAP_LOAD_STATUS:
						VideoBusOutputCmdMapLoadStatus = <VideoBusOutputCmdMapLoadStatus>VideoBusWorkerPayload.data;
						if (VideoEngineBus.callbackMapLoadStatus !== undefined) {
							VideoEngineBus.callbackMapLoadStatus(VideoBusOutputCmdMapLoadStatus.status);
						} else {
							console.error('VideoEngineBus > input: map load status callback not set');
						}
						break;
					case VideoBusOutputCmd.MAP_SAVE:
						VideoBusOutputCmdMapSave = <VideoBusOutputCmdMapSave>VideoBusWorkerPayload.data;
						if (VideoEngineBus.callbackMapSave !== undefined) {
							VideoEngineBus.callbackMapSave(
								VideoBusOutputCmdMapSave.data,
								VideoBusOutputCmdMapSave.name,
							);
						} else {
							console.error('VideoEngineBus > input: map save callback not set');
						}
						break;
					case VideoBusOutputCmd.STATUS_INITIALIZED:
						VideoBusWorkerStatusInitialized = <VideoBusWorkerStatusInitialized>VideoBusWorkerPayload.data;
						VideoEngineBus.callbackStatusInitialized(VideoBusWorkerStatusInitialized.durationInMs);
						break;
				}
			}
		};
	}

	public static outputKey(keyAction: KeyAction): void {
		VideoEngineBus.worker.postMessage({
			cmd: VideoBusInputCmd.KEY,
			data: keyAction,
		});
	}

	public static outputMouse(action: MouseAction): void {
		VideoEngineBus.worker.postMessage({
			cmd: VideoBusInputCmd.MOUSE,
			data: action,
		});
	}

	public static outputMapLoad(file: string): void {
		VideoEngineBus.worker.postMessage({
			cmd: VideoBusInputCmd.MAP_LOAD,
			data: {
				data: file,
			},
		});
	}

	/**
	 * @param id undefined indicates a new map
	 */
	public static outputMapLoadById(id: string | undefined): void {
		VideoEngineBus.worker.postMessage({
			cmd: VideoBusInputCmd.MAP_LOAD_BY_ID,
			data: {
				id: id,
			},
		});
	}

	public static outputGameModeEdit(edit: VideoBusInputCmdGameModeEdit): void {
		VideoEngineBus.worker.postMessage({
			cmd: VideoBusInputCmd.GAME_MODE_EDIT,
			data: edit,
		});
	}

	public static outputGameModeEditApply(apply: VideoBusInputCmdGameModeEditApply): void {
		VideoEngineBus.worker.postMessage({
			cmd: VideoBusInputCmd.GAME_MODE_EDIT_APPLY,
			data: apply,
		});
	}

	public static outputGameModeEditDraw(apply: VideoBusInputCmdGameModeEditDraw): void {
		VideoEngineBus.worker.postMessage({
			cmd: VideoBusInputCmd.GAME_MODE_EDIT_DRAW,
			data: apply,
		});
	}

	public static outputGameModeEditRedo(): void {
		VideoEngineBus.worker.postMessage({
			cmd: VideoBusInputCmd.GAME_MODE_EDIT_REDO,
			data: null,
		});
	}

	public static outputGameModeEditSettings(mapConfig: MapConfig): void {
		VideoEngineBus.worker.postMessage({
			cmd: VideoBusInputCmd.GAME_MODE_EDIT_SETTINGS,
			data: mapConfig,
		});
	}

	public static outputGameModeEditTimeForced(enable: boolean): void {
		VideoEngineBus.worker.postMessage({
			cmd: VideoBusInputCmd.GAME_MODE_EDIT_TIME_FORCED,
			data: enable,
		});
	}

	public static outputGameModeEditUndo(): void {
		VideoEngineBus.worker.postMessage({
			cmd: VideoBusInputCmd.GAME_MODE_EDIT_UNDO,
			data: null,
		});
	}

	public static outputGameModePlay(play: VideoBusInputCmdGameModePlay): void {
		VideoEngineBus.worker.postMessage({
			cmd: VideoBusInputCmd.GAME_MODE_PLAY,
			data: play,
		});
	}

	public static outputGamePause(pause: VideoBusInputCmdGamePause): void {
		VideoEngineBus.worker.postMessage({
			cmd: VideoBusInputCmd.GAME_PAUSE,
			data: pause,
		});
	}

	public static outputGameSave(save: VideoBusInputCmdGameSave): void {
		VideoEngineBus.worker.postMessage({
			cmd: VideoBusInputCmd.GAME_SAVE,
			data: save,
		});
	}

	public static outputGameStart(start: VideoBusInputCmdGameStart): void {
		VideoEngineBus.worker.postMessage({
			cmd: VideoBusInputCmd.GAME_START,
			data: start,
		});
	}

	public static outputGameUnpause(unpause: VideoBusInputCmdGameUnpause): void {
		VideoEngineBus.worker.postMessage({
			cmd: VideoBusInputCmd.GAME_UNPAUSE,
			data: unpause,
		});
	}

	public static outputSettings(settings: VideoBusInputCmdSettings): void {
		VideoEngineBus.worker.postMessage({
			cmd: VideoBusInputCmd.SETTINGS,
			data: settings,
		});
	}

	private static resized(disablePost?: boolean, force?: boolean): VideoBusInputCmdResize {
		let data: VideoBusInputCmdResize,
			devicePixelRatio: number = Math.round(window.devicePixelRatio * 1000) / 1000,
			devicePixelRatioEff: number = Math.round((1 / window.devicePixelRatio) * 1000) / 1000,
			domRect: DOMRect = VideoEngineBus.streams.getBoundingClientRect(),
			height: number = domRect.height,
			width: number = domRect.width;

		// Transform the canvas to the intended size
		VideoEngineBus.canvasBackground.style.transform = 'scale(' + devicePixelRatioEff + ')';
		VideoEngineBus.canvasForeground.style.transform = 'scale(' + devicePixelRatioEff + ')';
		VideoEngineBus.canvasOverlay.style.transform = 'scale(' + devicePixelRatioEff + ')';
		VideoEngineBus.canvasPrimary.style.transform = 'scale(' + devicePixelRatioEff + ')';
		VideoEngineBus.canvasUnderlay.style.transform = 'scale(' + devicePixelRatioEff + ')';

		// Transform the map interaction to the correct starting place
		VideoEngineBus.mapInteration.style.transform =
			'translate(' + -20 * devicePixelRatioEff + 'px, ' + 20 * devicePixelRatioEff + 'px)';

		data = {
			devicePixelRatio: devicePixelRatio,
			force: force,
			height: Math.round(height),
			width: Math.round(width),
		};

		if (VideoEngineBus.complete && disablePost !== true) {
			VideoEngineBus.worker.postMessage({
				cmd: VideoBusInputCmd.RESIZE,
				data: data,
			});
		}

		return data;
	}

	public static setCallbackEditCameraUpdate(
		callbackEditCameraUpdate: (update: VideoBusOutputCmdEditCameraUpdate) => void,
	): void {
		VideoEngineBus.callbackEditCameraUpdate = callbackEditCameraUpdate;
	}

	public static setCallbackEditComplete(callbackEditComplete: () => void): void {
		VideoEngineBus.callbackEditComplete = callbackEditComplete;
	}

	public static setCallbackMapAsset(callbackMapAsset: (mapActive: MapActive | undefined) => void): void {
		VideoEngineBus.callbackMapAsset = callbackMapAsset;
	}

	public static setCallbackMapHourOfDayEff(callbackMapHourOfDayEff: (hourOfDayEff: number) => void): void {
		VideoEngineBus.callbackMapHourOfDayEff = callbackMapHourOfDayEff;
	}

	public static setCallbackMapLoadStatus(callbackMapLoadStatus: (status: boolean) => void): void {
		VideoEngineBus.callbackMapLoadStatus = callbackMapLoadStatus;
	}

	public static setCallbackMapSave(callbackMapSave: (data: string, name: string) => void): void {
		VideoEngineBus.callbackMapSave = callbackMapSave;
	}

	public static setCallbackStatusInitialized(callbackStatusInitialized: (durationInMs: number) => void): void {
		VideoEngineBus.callbackStatusInitialized = callbackStatusInitialized;
	}

	public static isGoComplete(): boolean {
		return VideoEngineBus.complete;
	}
}
