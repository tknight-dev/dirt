/**
 * @author tknight-dev
 */

import { AudioAsset } from './assets/audio.asset';
import { AudioEngine } from './audio.engine';
import { KeyAction, KeyCommon } from './keyboard.engine';
import { MouseAction } from './mouse.engine';
import { ResizeEngine } from './resize.engine';
import { UtilEngine } from './util.engine';
import {
	VideoCmd,
	VideoCmdGameModeEdit,
	VideoCmdGameModePlay,
	VideoCmdGamePause,
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
} from './models/video-worker-cmds.model';

export class VideoEngine {
	private static callbackMapLoadStatus: (status: boolean) => void;
	private static callbackMapSave: (data: string, name: string) => void;
	private static complete: boolean;
	private static feed: HTMLElement;
	private static fps: number = 60;
	private static started: boolean;
	private static worker: Worker;

	/**
	 * Start the video feed in another thread
	 */
	public static async go(
		feed: HTMLElement,
		canvas: HTMLCanvasElement,
		canvasBackground: HTMLCanvasElement,
		canvasForeground: HTMLCanvasElement,
		canvasOverlay: HTMLCanvasElement,
		modeEdit: boolean,
		videoCmdSettings: VideoCmdSettings,
	): Promise<void> {
		if (VideoEngine.started) {
			console.error('VideoEngine > go: already started');
			return;
		}
		VideoEngine.started = true;

		let canvasOffscreen: OffscreenCanvas = canvas.transferControlToOffscreen(),
			canvasOffscreenBackground: OffscreenCanvas = canvasBackground.transferControlToOffscreen(),
			canvasOffscreenForeground: OffscreenCanvas = canvasForeground.transferControlToOffscreen(),
			canvasOffscreenOverlay: OffscreenCanvas = canvasOverlay.transferControlToOffscreen(),
			videoCmdInit: VideoCmdInit,
			videoCmdResize: VideoCmdResize,
			videoPayload: VideoPayload;

		// Config
		VideoEngine.feed = feed;
		ResizeEngine.setCallback(VideoEngine.resized);

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
					canvasOffscreen: canvasOffscreen,
					canvasOffscreenBackground: canvasOffscreenBackground,
					canvasOffscreenForeground: canvasOffscreenForeground,
					canvasOffscreenOverlay: canvasOffscreenOverlay,
					modeEdit: modeEdit,
				},
				videoCmdResize,
				videoCmdSettings,
			);
			videoPayload = {
				cmd: VideoCmd.INIT,
				data: videoCmdInit,
			};
			VideoEngine.worker.postMessage(videoPayload, [canvasOffscreen, canvasOffscreenBackground, canvasOffscreenForeground, canvasOffscreenOverlay]);
			VideoEngine.complete = true;
		} else {
			alert('Web Workers are not supported by your browser');
		}
	}

	private static resized(disablePost?: boolean): VideoCmdResize {
		let data: VideoCmdResize,
			domRect: DOMRect = VideoEngine.feed.getBoundingClientRect(),
			height: number = domRect.height,
			width: number = domRect.width;

		data = {
			devicePixelRatio: window.devicePixelRatio,
			height: Math.round(height + UtilEngine.renderOverflowP * 2),
			width: Math.round(width + UtilEngine.renderOverflowP * 2),
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
		let audioAsset: AudioAsset | null,
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
						audioAsset = AudioAsset.find(videoWorkerCmdAudioEffect.id);
						if (audioAsset) {
							AudioEngine.trigger(audioAsset, videoWorkerCmdAudioEffect.pan, videoWorkerCmdAudioEffect.volumePercentage);
						} else {
							console.error('GameEngine > video: effect asset id invalid');
						}
						break;
					case VideoWorkerCmd.AUDIO_MUSIC_FADE:
						videoWorkerCmdAudioMusicFade = <VideoWorkerCmdAudioMusicFade>videoWorkerPayload.data;
						audioAsset = AudioAsset.find(videoWorkerCmdAudioMusicFade.id);
						if (audioAsset) {
							AudioEngine.fade(audioAsset, videoWorkerCmdAudioMusicFade.durationInMs, videoWorkerCmdAudioMusicPlay.volumePercentage);
						} else {
							console.error('GameEngine > video: music asset fade id invalid');
						}
						break;
					case VideoWorkerCmd.AUDIO_MUSIC_PLAY:
						videoWorkerCmdAudioMusicPlay = <VideoWorkerCmdAudioMusicPlay>videoWorkerPayload.data;
						audioAsset = AudioAsset.find(videoWorkerCmdAudioMusicPlay.id);
						if (audioAsset) {
							AudioEngine.play(audioAsset, videoWorkerCmdAudioMusicPlay.timeInS, videoWorkerCmdAudioMusicPlay.volumePercentage);
						} else {
							console.error('GameEngine > video: music asset play id invalid');
						}
						break;
					case VideoWorkerCmd.AUDIO_MUSIC_PAUSE:
						videoWorkerCmdAudioMusicPause = <VideoWorkerCmdAudioMusicPause>videoWorkerPayload.data;
						audioAsset = AudioAsset.find(videoWorkerCmdAudioMusicPause.id);
						if (audioAsset) {
							AudioEngine.pause(audioAsset);
						} else {
							console.error('GameEngine > video: music asset pause id invalid');
						}
						break;
					case VideoWorkerCmd.AUDIO_MUSIC_UNPAUSE:
						videoWorkerCmdAudioMusicUnpause = <VideoWorkerCmdAudioMusicUnpause>videoWorkerPayload.data;
						audioAsset = AudioAsset.find(videoWorkerCmdAudioMusicUnpause.id);
						if (audioAsset) {
							AudioEngine.unpause(audioAsset);
						} else {
							console.error('GameEngine > video: music asset unpause id invalid');
						}
						break;
					case VideoWorkerCmd.AUDIO_VOLUME:
						videoWorkerCmdAudioVolume = <VideoWorkerCmdAudioVolume>videoWorkerPayload.data;
						audioAsset = AudioAsset.find(videoWorkerCmdAudioVolume.id);
						if (audioAsset) {
							AudioEngine.setVolumeAsset(audioAsset, videoWorkerCmdAudioVolume.volumePercentage);
						} else {
							console.error('GameEngine > video: asset volume id invalid');
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
