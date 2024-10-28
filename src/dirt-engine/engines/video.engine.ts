/**
 * @author tknight-dev
 */

import { AssetDeclarations } from '../models/asset.model';
import { AudioEngine } from './audio.engine';
import { AudioModulation } from '../models/audio-modulation.model';
import { KeyAction, KeyCommon } from './keyboard.engine';
import { MouseAction } from './mouse.engine';
import { ResizeEngine } from './resize.engine';
import {
	VideoCmd,
	VideoCmdGameModeEdit,
	VideoCmdGameModePlay,
	VideoCmdGamePause,
	VideoCmdGamePauseReason,
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
	VideoWorkerCmdMapLoadStatus,
	VideoWorkerCmdMapSave,
	VideoWorkerPayload,
} from '../models/video-worker-cmds.model';
import { VisibilityEngine } from './visibility.engine';

export class VideoEngine {
	private static callbackMapLoadStatus: (status: boolean) => void;
	private static callbackMapSave: (data: string, name: string) => void;
	private static complete: boolean;
	private static fps: number = 60;
	private static started: boolean;
	private static streams: HTMLElement;
	private static worker: Worker;

	/**
	 * Start the video streams in another thread
	 */
	public static async go(
		assetDeclarations: AssetDeclarations,
		streams: HTMLElement,
		canvasBackground: HTMLCanvasElement,
		canvasForeground: HTMLCanvasElement,
		canvasOverlay: HTMLCanvasElement,
		canvasPrimary: HTMLCanvasElement,
		canvasUnderlay: HTMLCanvasElement,
		modeEdit: boolean,
		videoCmdSettings: VideoCmdSettings,
	): Promise<void> {
		if (VideoEngine.started) {
			console.error('VideoEngine > go: already started');
			return;
		}
		VideoEngine.started = true;

		let canvasOffscreenUnderlay: OffscreenCanvas = canvasUnderlay.transferControlToOffscreen(),
			canvasOffscreenBackground: OffscreenCanvas = canvasBackground.transferControlToOffscreen(),
			canvasOffscreenPrimary: OffscreenCanvas = canvasPrimary.transferControlToOffscreen(),
			canvasOffscreenForeground: OffscreenCanvas = canvasForeground.transferControlToOffscreen(),
			canvasOffscreenOverlay: OffscreenCanvas = canvasOverlay.transferControlToOffscreen(),
			videoCmdInit: VideoCmdInit,
			videoCmdResize: VideoCmdResize,
			videoPayload: VideoPayload;

		// Config
		VideoEngine.streams = streams;
		ResizeEngine.setCallback(VideoEngine.resized);
		VisibilityEngine.setCallback((visible: boolean) => {
			if (!visible) {
				VideoEngine.workerGamePause({ reason: VideoCmdGamePauseReason.VISIBILITY });
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
					modeEdit: modeEdit,
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
			domRect: DOMRect = VideoEngine.streams.getBoundingClientRect(),
			height: number = domRect.height,
			width: number = domRect.width;

		data = {
			devicePixelRatio: window.devicePixelRatio,
			height: Math.round(height),
			width: Math.round(width),
		};

		if (disablePost !== true) {
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
			videoWorkerCmdMapLoadStatus: VideoWorkerCmdMapLoadStatus,
			videoWorkerCmdMapSave: VideoWorkerCmdMapSave,
			videoWorkerPayload: VideoWorkerPayload,
			videoWorkerPayloads: VideoWorkerPayload[];

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
						AudioEngine.play(videoWorkerCmdAudioMusicPlay.id, videoWorkerCmdAudioMusicPlay.timeInS, videoWorkerCmdAudioMusicPlay.volumePercentage);
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
						AudioEngine.setVolumeAsset(videoWorkerCmdAudioVolume.id, videoWorkerCmdAudioVolume.volumePercentage);
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

	public static workerLoadMap(file: string): void {
		VideoEngine.worker.postMessage({
			cmd: VideoCmd.MAP_LOAD,
			data: {
				data: file,
			},
		});
	}

	public static workerGameModeEdit(edit: VideoCmdGameModeEdit): void {
		VideoEngine.worker.postMessage({
			cmd: VideoCmd.GAME_MODE_EDIT,
			data: edit,
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

	public static setCallbackMapLoadStatus(callbackMapLoadStatus: (status: boolean) => void): void {
		VideoEngine.callbackMapLoadStatus = callbackMapLoadStatus;
	}

	public static setCallbackMapSave(callbackMapSave: (data: string, name: string) => void): void {
		VideoEngine.callbackMapSave = callbackMapSave;
	}

	public static isGoComplete(): boolean {
		return VideoEngine.complete;
	}
}
