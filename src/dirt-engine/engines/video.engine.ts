/**
 * @author tknight-dev
 */

import { AssetDeclarations } from '../models/asset.model';
import { AudioEngine } from './audio.engine';
import { AudioModulation } from '../models/audio-modulation.model';
import { KeyAction, KeyCommon } from './keyboard.engine';
import { Map, MapActive } from '../models/map.model';
import { MouseAction } from './mouse.engine';
import { ResizeEngine } from './resize.engine';
import {
	VideoCmd,
	VideoCmdGameModeEdit,
	VideoCmdGameModeEditApply,
	VideoCmdGameModePlay,
	VideoCmdGamePause,
	VideoCmdGamePauseReason,
	VideoCmdGameSave,
	VideoCmdGameStart,
	VideoCmdGameUnpause,
	VideoCmdInit,
	VideoCmdResize,
	VideoCmdSettings,
	VideoPayload,
	VideoWorkerCmd,
	VideoWorkerCmdAudioEffect,
	VideoWorkerCmdAudioMusicFade,
	VideoWorkerCmdAudioMusicPause,
	VideoWorkerCmdAudioMusicPlay,
	VideoWorkerCmdAudioMusicUnpause,
	VideoWorkerCmdAudioVolume,
	VideoWorkerCmdEditCameraUpdate,
	VideoWorkerCmdMapAsset,
	VideoWorkerCmdMapLoadStatus,
	VideoWorkerCmdMapSave,
	VideoWorkerPayload,
	VideoWorkerStatusInitialized,
} from '../models/video-worker-cmds.model';
import { VisibilityEngine } from './visibility.engine';

export class VideoEngine {
	private static callbackEditCameraUpdate: (update: VideoWorkerCmdEditCameraUpdate) => void;
	private static callbackEditComplete: () => void;
	private static callbackMapAsset: (mapActive: MapActive | undefined) => void;
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
		videoCmdSettings: VideoCmdSettings,
	): Promise<void> {
		if (VideoEngine.initialized) {
			console.error('VideoEngine > initialize: already initialized');
			return;
		}
		VideoEngine.initialized = true;

		let canvasOffscreenUnderlay: OffscreenCanvas = canvasUnderlay.transferControlToOffscreen(),
			canvasOffscreenBackground: OffscreenCanvas = canvasBackground.transferControlToOffscreen(),
			canvasOffscreenPrimary: OffscreenCanvas = canvasPrimary.transferControlToOffscreen(),
			canvasOffscreenForeground: OffscreenCanvas = canvasForeground.transferControlToOffscreen(),
			canvasOffscreenOverlay: OffscreenCanvas = canvasOverlay.transferControlToOffscreen(),
			videoCmdInit: VideoCmdInit,
			videoCmdResize: VideoCmdResize,
			videoPayload: VideoPayload;

		// Cache
		VideoEngine.canvasBackground = canvasBackground;
		VideoEngine.canvasForeground = canvasForeground;
		VideoEngine.canvasOverlay = canvasOverlay;
		VideoEngine.canvasPrimary = canvasPrimary;
		VideoEngine.canvasUnderlay = canvasUnderlay;
		VideoEngine.mapInteration = mapInteration;
		VideoEngine.streams = streams;

		// Config
		ResizeEngine.setCallback(VideoEngine.resized);
		VisibilityEngine.setCallback((visible: boolean) => {
			if (!visible) {
				VideoEngine.workerGamePause({
					reason: VideoCmdGamePauseReason.VISIBILITY,
				});
			} else {
				setTimeout(() => {
					VideoEngine.resized();
				});
			}
		});

		// Spawn Video thread
		if (window.Worker) {
			VideoEngine.worker = new Worker(new URL('./video.worker.engine', import.meta.url));

			// Setup listener
			VideoEngine.workerListen();

			/*
			 * Initialization payload
			 */
			videoCmdResize = VideoEngine.resized(true);
			videoCmdInit = Object.assign(
				{
					assetDeclarations: assetDeclarations,
					canvasOffscreenBackground: canvasOffscreenBackground,
					canvasOffscreenForeground: canvasOffscreenForeground,
					canvasOffscreenOverlay: canvasOffscreenOverlay,
					canvasOffscreenPrimary: canvasOffscreenPrimary,
					canvasOffscreenUnderlay: canvasOffscreenUnderlay,
				},
				videoCmdResize,
				videoCmdSettings,
			);
			videoPayload = {
				cmd: VideoCmd.INIT,
				data: videoCmdInit,
			};
			VideoEngine.worker.postMessage(videoPayload, [
				canvasOffscreenBackground,
				canvasOffscreenForeground,
				canvasOffscreenOverlay,
				canvasOffscreenPrimary,
				canvasOffscreenUnderlay,
			]);
			VideoEngine.complete = true;
		} else {
			alert('Web Workers are not supported by your browser');
		}
	}

	private static resized(disablePost?: boolean): VideoCmdResize {
		let data: VideoCmdResize,
			devicePixelRatio: number = Math.round(window.devicePixelRatio * 1000) / 1000,
			devicePixelRatioEff: number = Math.round((1 / window.devicePixelRatio) * 1000) / 1000,
			domRect: DOMRect = VideoEngine.streams.getBoundingClientRect(),
			height: number = domRect.height,
			width: number = domRect.width;

		// Transform the canvas to the intended size
		VideoEngine.canvasBackground.style.transform = 'scale(' + devicePixelRatioEff + ')';
		VideoEngine.canvasForeground.style.transform = 'scale(' + devicePixelRatioEff + ')';
		VideoEngine.canvasOverlay.style.transform = 'scale(' + devicePixelRatioEff + ')';
		VideoEngine.canvasPrimary.style.transform = 'scale(' + devicePixelRatioEff + ')';
		VideoEngine.canvasUnderlay.style.transform = 'scale(' + devicePixelRatioEff + ')';

		// Transform the map interaction to the correct starting place
		VideoEngine.mapInteration.style.transform =
			'translate(' + -20 * devicePixelRatioEff + 'px, ' + 20 * devicePixelRatioEff + 'px)';

		data = {
			devicePixelRatio: devicePixelRatio,
			height: Math.round(height),
			width: Math.round(width),
		};

		if (VideoEngine.complete && disablePost !== true) {
			VideoEngine.worker.postMessage({
				cmd: VideoCmd.RESIZE,
				data: data,
			});
		}

		return data;
	}

	/*
	 * Commands from worker (typically audio effect triggers)
	 */
	private static workerListen(): void {
		let audioModulation: AudioModulation | null,
			videoWorkerCmdAudioEffect: VideoWorkerCmdAudioEffect,
			videoWorkerCmdAudioMusicFade: VideoWorkerCmdAudioMusicFade,
			videoWorkerCmdAudioMusicPlay: VideoWorkerCmdAudioMusicPlay,
			videoWorkerCmdAudioMusicPause: VideoWorkerCmdAudioMusicPause,
			videoWorkerCmdAudioMusicUnpause: VideoWorkerCmdAudioMusicUnpause,
			videoWorkerCmdAudioVolume: VideoWorkerCmdAudioVolume,
			videoWorkerCmdEditCameraUpdate: VideoWorkerCmdEditCameraUpdate,
			videoWorkerCmdMapAsset: VideoWorkerCmdMapAsset,
			videoWorkerCmdMapLoadStatus: VideoWorkerCmdMapLoadStatus,
			videoWorkerCmdMapSave: VideoWorkerCmdMapSave,
			videoWorkerPayload: VideoWorkerPayload,
			videoWorkerPayloads: VideoWorkerPayload[],
			videoWorkerStatusInitialized: VideoWorkerStatusInitialized;

		VideoEngine.worker.onmessage = (event: MessageEvent) => {
			videoWorkerPayloads = event.data.payloads;

			for (let i = 0; i < videoWorkerPayloads.length; i++) {
				videoWorkerPayload = videoWorkerPayloads[i];

				switch (videoWorkerPayload.cmd) {
					case VideoWorkerCmd.AUDIO_EFFECT:
						videoWorkerCmdAudioEffect = <VideoWorkerCmdAudioEffect>videoWorkerPayload.data;
						audioModulation = AudioModulation.find(videoWorkerCmdAudioEffect.modulationId);
						if (audioModulation) {
							AudioEngine.trigger(
								videoWorkerCmdAudioEffect.id,
								audioModulation,
								videoWorkerCmdAudioEffect.pan,
								videoWorkerCmdAudioEffect.volumePercentage,
							);
						} else {
							console.error('GameEngine > video: effect asset-id or modulation-id invalid');
						}
						break;
					case VideoWorkerCmd.AUDIO_MUSIC_FADE:
						videoWorkerCmdAudioMusicFade = <VideoWorkerCmdAudioMusicFade>videoWorkerPayload.data;
						AudioEngine.fade(
							videoWorkerCmdAudioMusicFade.id,
							videoWorkerCmdAudioMusicFade.durationInMs,
							videoWorkerCmdAudioMusicPlay.volumePercentage,
						);
						break;
					case VideoWorkerCmd.AUDIO_MUSIC_PLAY:
						videoWorkerCmdAudioMusicPlay = <VideoWorkerCmdAudioMusicPlay>videoWorkerPayload.data;
						AudioEngine.play(
							videoWorkerCmdAudioMusicPlay.id,
							videoWorkerCmdAudioMusicPlay.timeInS,
							videoWorkerCmdAudioMusicPlay.volumePercentage,
						);
						break;
					case VideoWorkerCmd.AUDIO_MUSIC_PAUSE:
						videoWorkerCmdAudioMusicPause = <VideoWorkerCmdAudioMusicPause>videoWorkerPayload.data;
						AudioEngine.pause(videoWorkerCmdAudioMusicPause.id);
						break;
					case VideoWorkerCmd.AUDIO_MUSIC_UNPAUSE:
						videoWorkerCmdAudioMusicUnpause = <VideoWorkerCmdAudioMusicUnpause>videoWorkerPayload.data;
						AudioEngine.unpause(videoWorkerCmdAudioMusicUnpause.id);
						break;
					case VideoWorkerCmd.AUDIO_VOLUME:
						videoWorkerCmdAudioVolume = <VideoWorkerCmdAudioVolume>videoWorkerPayload.data;
						AudioEngine.setVolumeAsset(
							videoWorkerCmdAudioVolume.id,
							videoWorkerCmdAudioVolume.volumePercentage,
						);
						break;
					case VideoWorkerCmd.EDIT_CAMERA_UPDATE:
						videoWorkerCmdEditCameraUpdate = <VideoWorkerCmdEditCameraUpdate>videoWorkerPayload.data;
						if (VideoEngine.callbackEditCameraUpdate !== undefined) {
							VideoEngine.callbackEditCameraUpdate(videoWorkerCmdEditCameraUpdate);
						} else {
							console.error('VideoEngine > workerListen: edit camera update callback not set');
						}
						break;
					case VideoWorkerCmd.EDIT_COMPLETE:
						if (VideoEngine.callbackEditComplete !== undefined) {
							VideoEngine.callbackEditComplete();
						} else {
							console.error('VideoEngine > workerListen: edit complete callback not set');
						}
						break;
					case VideoWorkerCmd.MAP_ASSET:
						videoWorkerCmdMapAsset = <VideoWorkerCmdMapAsset>videoWorkerPayload.data;
						if (VideoEngine.callbackMapAsset !== undefined) {
							VideoEngine.callbackMapAsset(videoWorkerCmdMapAsset.mapActive);
						} else {
							console.error('VideoEngine > workerListen: map asset callback not set');
						}
						break;
					case VideoWorkerCmd.MAP_LOAD_STATUS:
						videoWorkerCmdMapLoadStatus = <VideoWorkerCmdMapLoadStatus>videoWorkerPayload.data;
						if (VideoEngine.callbackMapLoadStatus !== undefined) {
							VideoEngine.callbackMapLoadStatus(videoWorkerCmdMapLoadStatus.status);
						} else {
							console.error('VideoEngine > workerListen: map load status callback not set');
						}
						break;
					case VideoWorkerCmd.MAP_SAVE:
						videoWorkerCmdMapSave = <VideoWorkerCmdMapSave>videoWorkerPayload.data;
						if (VideoEngine.callbackMapSave !== undefined) {
							VideoEngine.callbackMapSave(videoWorkerCmdMapSave.data, videoWorkerCmdMapSave.name);
						} else {
							console.error('VideoEngine > workerListen: map save callback not set');
						}
						break;
					case VideoWorkerCmd.STATUS_INITIALIZED:
						videoWorkerStatusInitialized = <VideoWorkerStatusInitialized>videoWorkerPayload.data;
						VideoEngine.callbackStatusInitialized(videoWorkerStatusInitialized.durationInMs);
						break;
				}
			}
		};
	}

	public static workerKey(keyAction: KeyAction): void {
		VideoEngine.worker.postMessage({
			cmd: VideoCmd.KEY,
			data: keyAction,
		});
	}

	public static workerMouse(action: MouseAction): void {
		VideoEngine.worker.postMessage({
			cmd: VideoCmd.MOUSE,
			data: action,
		});
	}

	public static workerMapLoad(file: string): void {
		VideoEngine.worker.postMessage({
			cmd: VideoCmd.MAP_LOAD,
			data: {
				data: file,
			},
		});
	}

	/**
	 * @param id undefined indicates a new map
	 */
	public static workerMapLoadById(id: string | undefined): void {
		VideoEngine.worker.postMessage({
			cmd: VideoCmd.MAP_LOAD_BY_ID,
			data: {
				id: id,
			},
		});
	}

	public static workerGameModeEdit(edit: VideoCmdGameModeEdit): void {
		VideoEngine.worker.postMessage({
			cmd: VideoCmd.GAME_MODE_EDIT,
			data: edit,
		});
	}

	public static workerGameModeEditApply(apply: VideoCmdGameModeEditApply): void {
		VideoEngine.worker.postMessage({
			cmd: VideoCmd.GAME_MODE_EDIT_APPLY,
			data: apply,
		});
	}

	public static workerGameModeEditRedo(): void {
		VideoEngine.worker.postMessage({
			cmd: VideoCmd.GAME_MODE_EDIT_REDO,
			data: null,
		});
	}

	public static workerGameModeEditUndo(): void {
		VideoEngine.worker.postMessage({
			cmd: VideoCmd.GAME_MODE_EDIT_UNDO,
			data: null,
		});
	}

	public static workerGameModePlay(play: VideoCmdGameModePlay): void {
		VideoEngine.worker.postMessage({
			cmd: VideoCmd.GAME_MODE_PLAY,
			data: play,
		});
	}

	public static workerGamePause(pause: VideoCmdGamePause): void {
		VideoEngine.worker.postMessage({
			cmd: VideoCmd.GAME_PAUSE,
			data: pause,
		});
	}

	public static workerGameSave(save: VideoCmdGameSave): void {
		VideoEngine.worker.postMessage({
			cmd: VideoCmd.GAME_SAVE,
			data: save,
		});
	}

	public static workerGameStart(start: VideoCmdGameStart): void {
		VideoEngine.worker.postMessage({
			cmd: VideoCmd.GAME_START,
			data: start,
		});
	}

	public static workerGameUnpause(unpause: VideoCmdGameUnpause): void {
		VideoEngine.worker.postMessage({
			cmd: VideoCmd.GAME_UNPAUSE,
			data: unpause,
		});
	}

	public static workerSettings(settings: VideoCmdSettings): void {
		VideoEngine.worker.postMessage({
			cmd: VideoCmd.SETTINGS,
			data: settings,
		});
	}

	public static setCallbackEditCameraUpdate(
		callbackEditCameraUpdate: (update: VideoWorkerCmdEditCameraUpdate) => void,
	): void {
		VideoEngine.callbackEditCameraUpdate = callbackEditCameraUpdate;
	}

	public static setCallbackEditComplete(callbackEditComplete: () => void): void {
		VideoEngine.callbackEditComplete = callbackEditComplete;
	}

	public static setCallbackMapAsset(callbackMapAsset: (mapActive: MapActive | undefined) => void): void {
		VideoEngine.callbackMapAsset = callbackMapAsset;
	}

	public static setCallbackMapLoadStatus(callbackMapLoadStatus: (status: boolean) => void): void {
		VideoEngine.callbackMapLoadStatus = callbackMapLoadStatus;
	}

	public static setCallbackMapSave(callbackMapSave: (data: string, name: string) => void): void {
		VideoEngine.callbackMapSave = callbackMapSave;
	}

	public static setCallbackStatusInitialized(callbackStatusInitialized: (durationInMs: number) => void): void {
		VideoEngine.callbackStatusInitialized = callbackStatusInitialized;
	}

	public static isGoComplete(): boolean {
		return VideoEngine.complete;
	}
}
