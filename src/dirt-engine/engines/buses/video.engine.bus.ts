/**
 * @author tknight-dev
 */

import { AssetDeclarations } from '../../models/asset.model';
import { AudioEngine } from '../audio.engine';
import { AudioModulation } from '../../models/audio-modulation.model';
import { KeyAction } from '../keyboard.engine';
import { MapActive, MapConfig } from '../../models/map.model';
import { MouseAction } from '../mouse.engine';
import { TouchAction } from '../touch.engine';
import { ResizeEngine } from '../resize.engine';
import {
	VideoBusInputCmd,
	VideoBusInputCmdGameModeEdit,
	VideoBusInputCmdGameModeEditApply,
	VideoBusInputCmdGameModeEditDraw,
	VideoBusInputCmdGameModePlay,
	VideoBusInputCmdGamePause,
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
	VideoBusOutputCmdRumble,
	VideoBusWorkerPayload,
	VideoBusWorkerStatusInitialized,
} from '../../engines/buses/video.model.bus';
import { UtilEngine } from '../util.engine';

export class VideoEngineBus {
	private static callbackEditCameraUpdate: (update: VideoBusOutputCmdEditCameraUpdate) => void;
	private static callbackEditComplete: () => void;
	private static callbackFPS: (fps: number) => void;
	private static callbackMapAsset: (mapActive: MapActive | undefined) => void;
	private static callbackMapHourOfDayEff: (hourOfDayEff: number) => void;
	private static callbackMapLoadStatus: (status: boolean) => void;
	private static callbackMapSave: (data: string, name: string) => void;
	private static callbackRumble: (durationInMs: number, enable: boolean, intensity: number) => void;
	private static callbackStatusInitialized: (durationInMs: number) => void;
	private static canvasBackground: HTMLCanvasElement;
	private static canvasForeground: HTMLCanvasElement;
	private static canvasOverlay: HTMLCanvasElement;
	private static canvasPrimary: HTMLCanvasElement;
	private static canvasSecondary: HTMLCanvasElement;
	private static canvasUnderlay: HTMLCanvasElement;
	private static canvasVanishing: HTMLCanvasElement;
	private static complete: boolean;
	private static initialized: boolean;
	private static mapInteration: HTMLElement;
	private static resolution: null | number;
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
		canvasSecondary: HTMLCanvasElement,
		canvasUnderlay: HTMLCanvasElement,
		canvasVanishing: HTMLCanvasElement,
		mapInteration: HTMLElement,
		settings: VideoBusInputCmdSettings,
	): Promise<void> {
		if (VideoEngineBus.initialized) {
			console.error('VideoEngineBus > initialize: already initialized');
			return;
		}
		VideoEngineBus.initialized = true;

		let canvasOffscreenUnderlay: OffscreenCanvas = canvasUnderlay.transferControlToOffscreen(),
			canvasOffscreenBackground: OffscreenCanvas = canvasBackground.transferControlToOffscreen(),
			canvasOffscreenPrimary: OffscreenCanvas = canvasPrimary.transferControlToOffscreen(),
			canvasOffscreenSecondary: OffscreenCanvas = canvasSecondary.transferControlToOffscreen(),
			canvasOffscreenForeground: OffscreenCanvas = canvasForeground.transferControlToOffscreen(),
			canvasOffscreenOverlay: OffscreenCanvas = canvasOverlay.transferControlToOffscreen(),
			canvasOffscreenVanishing: OffscreenCanvas = canvasVanishing.transferControlToOffscreen(),
			videoBusInputCmdInit: VideoBusInputCmdInit,
			videoBusInputCmdResize: VideoBusInputCmdResize,
			videoBusPayload: VideoBusPayload;

		// Cache
		VideoEngineBus.canvasBackground = canvasBackground;
		VideoEngineBus.canvasForeground = canvasForeground;
		VideoEngineBus.canvasOverlay = canvasOverlay;
		VideoEngineBus.canvasPrimary = canvasPrimary;
		VideoEngineBus.canvasSecondary = canvasSecondary;
		VideoEngineBus.canvasUnderlay = canvasUnderlay;
		VideoEngineBus.canvasVanishing = canvasVanishing;
		VideoEngineBus.mapInteration = mapInteration;
		VideoEngineBus.streams = streams;

		// Config
		VideoEngineBus.resolution = settings.resolution;
		ResizeEngine.setCallback(VideoEngineBus.resized);

		// Spawn Video thread
		if (window.Worker) {
			VideoEngineBus.worker = new Worker(new URL('../workers/video.worker.engine', import.meta.url), {
				name: 'VideoWorkerEngine',
			});

			// Setup listener
			VideoEngineBus.input();

			/*
			 * Initialization payload
			 */
			videoBusInputCmdResize = VideoEngineBus.resized(true);
			videoBusInputCmdInit = Object.assign(
				{
					assetDeclarations: assetDeclarations,
					canvasOffscreenBackground: canvasOffscreenBackground,
					canvasOffscreenForeground: canvasOffscreenForeground,
					canvasOffscreenOverlay: canvasOffscreenOverlay,
					canvasOffscreenPrimary: canvasOffscreenPrimary,
					canvasOffscreenSecondary: canvasOffscreenSecondary,
					canvasOffscreenUnderlay: canvasOffscreenUnderlay,
					canvasOffscreenVanishing: canvasOffscreenVanishing,
				},
				videoBusInputCmdResize,
				settings,
			);
			videoBusPayload = {
				cmd: VideoBusInputCmd.INIT,
				data: videoBusInputCmdInit,
			};
			VideoEngineBus.worker.postMessage(videoBusPayload, [
				canvasOffscreenBackground,
				canvasOffscreenForeground,
				canvasOffscreenOverlay,
				canvasOffscreenPrimary,
				canvasOffscreenSecondary,
				canvasOffscreenUnderlay,
				canvasOffscreenVanishing,
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
			videoBusOutputCmdAudioEffect: VideoBusOutputCmdAudioEffect,
			videoBusOutputCmdAudioMusicFade: VideoBusOutputCmdAudioMusicFade,
			videoBusOutputCmdAudioMusicPlay: VideoBusOutputCmdAudioMusicPlay,
			videoBusOutputCmdAudioMusicPause: VideoBusOutputCmdAudioMusicPause,
			videoBusOutputCmdAudioMusicUnpause: VideoBusOutputCmdAudioMusicUnpause,
			videoBusOutputCmdAudioVolume: VideoBusOutputCmdAudioVolume,
			videoBusOutputCmdEditCameraUpdate: VideoBusOutputCmdEditCameraUpdate,
			videoBusOutputCmdMapAsset: VideoBusOutputCmdMapAsset,
			videoBusOutputCmdMapLoadStatus: VideoBusOutputCmdMapLoadStatus,
			videoBusOutputCmdMapSave: VideoBusOutputCmdMapSave,
			videoBusOutputCmdRumble: VideoBusOutputCmdRumble,
			videoBusWorkerPayload: VideoBusWorkerPayload,
			videoBusWorkerPayloads: VideoBusWorkerPayload[],
			videoBusWorkerStatusInitialized: VideoBusWorkerStatusInitialized;

		VideoEngineBus.worker.onmessage = (event: MessageEvent) => {
			videoBusWorkerPayloads = event.data.payloads;

			for (let i = 0; i < videoBusWorkerPayloads.length; i++) {
				videoBusWorkerPayload = videoBusWorkerPayloads[i];

				switch (videoBusWorkerPayload.cmd) {
					case VideoBusOutputCmd.AUDIO_EFFECT:
						videoBusOutputCmdAudioEffect = <VideoBusOutputCmdAudioEffect>videoBusWorkerPayload.data;
						audioModulation = AudioModulation.find(videoBusOutputCmdAudioEffect.modulationId);
						if (audioModulation) {
							AudioEngine.trigger(
								videoBusOutputCmdAudioEffect.id,
								audioModulation,
								videoBusOutputCmdAudioEffect.pan,
								videoBusOutputCmdAudioEffect.volumePercentage,
							);
						} else {
							console.error('GameEngine > video: effect asset-id or modulation-id invalid');
						}
						break;
					case VideoBusOutputCmd.AUDIO_MUSIC_FADE:
						videoBusOutputCmdAudioMusicFade = <VideoBusOutputCmdAudioMusicFade>videoBusWorkerPayload.data;
						AudioEngine.fade(
							videoBusOutputCmdAudioMusicFade.id,
							videoBusOutputCmdAudioMusicFade.durationInMs,
							videoBusOutputCmdAudioMusicPlay.volumePercentage,
						);
						break;
					case VideoBusOutputCmd.AUDIO_MUSIC_PLAY:
						videoBusOutputCmdAudioMusicPlay = <VideoBusOutputCmdAudioMusicPlay>videoBusWorkerPayload.data;
						AudioEngine.play(
							videoBusOutputCmdAudioMusicPlay.id,
							videoBusOutputCmdAudioMusicPlay.timeInS,
							videoBusOutputCmdAudioMusicPlay.volumePercentage,
						);
						break;
					case VideoBusOutputCmd.AUDIO_MUSIC_PAUSE:
						videoBusOutputCmdAudioMusicPause = <VideoBusOutputCmdAudioMusicPause>videoBusWorkerPayload.data;
						AudioEngine.pause(videoBusOutputCmdAudioMusicPause.id);
						break;
					case VideoBusOutputCmd.AUDIO_MUSIC_UNPAUSE:
						videoBusOutputCmdAudioMusicUnpause = <VideoBusOutputCmdAudioMusicUnpause>videoBusWorkerPayload.data;
						AudioEngine.unpause(videoBusOutputCmdAudioMusicUnpause.id);
						break;
					case VideoBusOutputCmd.AUDIO_VOLUME:
						videoBusOutputCmdAudioVolume = <VideoBusOutputCmdAudioVolume>videoBusWorkerPayload.data;
						AudioEngine.setVolumeAsset(videoBusOutputCmdAudioVolume.id, videoBusOutputCmdAudioVolume.volumePercentage);
						break;
					case VideoBusOutputCmd.EDIT_CAMERA_UPDATE:
						videoBusOutputCmdEditCameraUpdate = <VideoBusOutputCmdEditCameraUpdate>videoBusWorkerPayload.data;
						if (VideoEngineBus.callbackEditCameraUpdate !== undefined) {
							VideoEngineBus.callbackEditCameraUpdate(videoBusOutputCmdEditCameraUpdate);
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
					case VideoBusOutputCmd.FPS:
						if (VideoEngineBus.callbackFPS !== undefined) {
							VideoEngineBus.callbackFPS(<number>videoBusWorkerPayload.data);
						} else {
							console.error('VideoEngineBus > input: fps callback not set');
						}
						break;
					case VideoBusOutputCmd.MAP_ASSET:
						videoBusOutputCmdMapAsset = <VideoBusOutputCmdMapAsset>videoBusWorkerPayload.data;
						if (VideoEngineBus.callbackMapAsset !== undefined) {
							VideoEngineBus.callbackMapAsset(videoBusOutputCmdMapAsset.mapActive);
						} else {
							console.error('VideoEngineBus > input: map asset callback not set');
						}
						break;
					case VideoBusOutputCmd.MAP_HOUR_OF_DAY_EFF:
						if (VideoEngineBus.callbackMapHourOfDayEff !== undefined) {
							VideoEngineBus.callbackMapHourOfDayEff(<number>videoBusWorkerPayload.data);
						} else {
							console.error('VideoEngineBus > input: hour of day eff callback not set');
						}
						break;
					case VideoBusOutputCmd.MAP_LOAD_STATUS:
						videoBusOutputCmdMapLoadStatus = <VideoBusOutputCmdMapLoadStatus>videoBusWorkerPayload.data;
						if (VideoEngineBus.callbackMapLoadStatus !== undefined) {
							VideoEngineBus.callbackMapLoadStatus(videoBusOutputCmdMapLoadStatus.status);
						} else {
							console.error('VideoEngineBus > input: map load status callback not set');
						}
						break;
					case VideoBusOutputCmd.MAP_SAVE:
						videoBusOutputCmdMapSave = <VideoBusOutputCmdMapSave>videoBusWorkerPayload.data;
						if (VideoEngineBus.callbackMapSave !== undefined) {
							VideoEngineBus.callbackMapSave(videoBusOutputCmdMapSave.data, videoBusOutputCmdMapSave.name);
						} else {
							console.error('VideoEngineBus > input: map save callback not set');
						}
						break;
					case VideoBusOutputCmd.RUMBLE:
						videoBusOutputCmdRumble = <VideoBusOutputCmdRumble>videoBusWorkerPayload.data;
						if (VideoEngineBus.callbackRumble !== undefined) {
							VideoEngineBus.callbackRumble(
								videoBusOutputCmdRumble.durationInMS,
								videoBusOutputCmdRumble.enable,
								videoBusOutputCmdRumble.intensity,
							);
						} else {
							console.error('VideoEngineBus > input: map save callback not set');
						}
						break;
					case VideoBusOutputCmd.STATUS_INITIALIZED:
						videoBusWorkerStatusInitialized = <VideoBusWorkerStatusInitialized>videoBusWorkerPayload.data;
						VideoEngineBus.callbackStatusInitialized(videoBusWorkerStatusInitialized.durationInMs);
						break;
				}
			}
		};
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

	public static outputGameModeEditApplyGroup(group: boolean): void {
		VideoEngineBus.worker.postMessage({
			cmd: VideoBusInputCmd.GAME_MODE_EDIT_APPLY_GROUP,
			data: group,
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

	public static outputKey(keyAction: KeyAction): void {
		VideoEngineBus.worker.postMessage({
			cmd: VideoBusInputCmd.KEY,
			data: keyAction,
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

	public static outputMouse(action: MouseAction): void {
		VideoEngineBus.worker.postMessage({
			cmd: VideoBusInputCmd.MOUSE,
			data: action,
		});
	}

	public static outputSettings(settings: VideoBusInputCmdSettings): void {
		VideoEngineBus.worker.postMessage({
			cmd: VideoBusInputCmd.SETTINGS,
			data: settings,
		});
	}

	public static outputTouch(action: TouchAction): void {
		VideoEngineBus.worker.postMessage({
			cmd: VideoBusInputCmd.TOUCH,
			data: action,
		});
	}

	public static resized(disablePost?: boolean, force?: boolean): VideoBusInputCmdResize {
		let data: VideoBusInputCmdResize,
			devicePixelRatio: number = Math.round(window.devicePixelRatio * 1000) / 1000,
			devicePixelRatioEff: number = Math.round((1 / window.devicePixelRatio) * 1000) / 1000,
			domRect: DOMRect = VideoEngineBus.streams.getBoundingClientRect(),
			height: number,
			scaler: number,
			width: null | number = VideoEngineBus.resolution;

		switch (width) {
			case 128:
				height = 72;
				break;
			case 256:
				height = 144;
				break;
			case 384:
				height = 216;
				break;
			case 512:
				height = 288;
				break;
			case 640: // 360p
				height = 360;
				break;
			case 1280: // 720p
				height = 720;
				break;
			case 1920: // 1080p
				height = 1080;
				break;
			default: // native
				height = domRect.height;
				width = domRect.width;
				break;
		}

		if (VideoEngineBus.resolution !== null) {
			scaler = Math.round(((devicePixelRatioEff * domRect.width) / width) * 1000) / 1000;
		} else {
			scaler = devicePixelRatioEff;
		}

		// Transform the canvas to the intended size
		VideoEngineBus.canvasBackground.style.transform = 'scale(' + scaler + ')';
		VideoEngineBus.canvasForeground.style.transform = 'scale(' + scaler + ')';
		VideoEngineBus.canvasOverlay.style.transform = 'scale(' + scaler + ')';
		VideoEngineBus.canvasPrimary.style.transform = 'scale(' + scaler + ')';
		VideoEngineBus.canvasSecondary.style.transform = 'scale(' + scaler + ')';
		VideoEngineBus.canvasVanishing.style.transform = 'scale(' + scaler + ')';
		VideoEngineBus.canvasUnderlay.style.transform = 'scale(' + scaler + ')';

		// Transform the map interaction to the correct starting place
		VideoEngineBus.mapInteration.style.transform =
			'translate(' + -UtilEngine.renderOverflowP * scaler + 'px, ' + UtilEngine.renderOverflowP * scaler + 'px)';

		data = {
			devicePixelRatio: devicePixelRatio,
			force: force,
			height: Math.round(height),
			scaler: Math.round((domRect.width / width / devicePixelRatioEff) * 1000) / 1000,
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

	public static setCallbackEditCameraUpdate(callbackEditCameraUpdate: (update: VideoBusOutputCmdEditCameraUpdate) => void): void {
		VideoEngineBus.callbackEditCameraUpdate = callbackEditCameraUpdate;
	}

	public static setCallbackEditComplete(callbackEditComplete: () => void): void {
		VideoEngineBus.callbackEditComplete = callbackEditComplete;
	}

	public static setCallbackFPS(callbackFPS: (fps: number) => void): void {
		VideoEngineBus.callbackFPS = callbackFPS;
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

	public static setCallbackRumble(callbackRumble: (durationInMs: number, enable: boolean, intensity: number) => void): void {
		VideoEngineBus.callbackRumble = callbackRumble;
	}

	public static setCallbackStatusInitialized(callbackStatusInitialized: (durationInMs: number) => void): void {
		VideoEngineBus.callbackStatusInitialized = callbackStatusInitialized;
	}

	public static isGoComplete(): boolean {
		return VideoEngineBus.complete;
	}
}
