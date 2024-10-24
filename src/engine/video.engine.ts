/**
 * @author tknight-dev
 */

import { AudioAsset } from './assets/audio.asset';
import { AudioEngine } from './audio.engine';
import { ResizeEngine } from './resize.engine';
import {
	VideoCmd,
	VideoCmdInit,
	VideoCmdResize,
	VideoPayload,
	VideoWorkerCmd,
	VideoWorkerCmdAudioEffect,
	VideoWorkerCmdAudioMusic,
	VideoWorkerPayload,
} from './models/video-worker-cmds.model';

export class VideoEngine {
	private static feed: HTMLElement;
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
	): Promise<void> {
		let audioAsset: AudioAsset | null,
			canvasOffscreen: OffscreenCanvas = canvas.transferControlToOffscreen(),
			canvasOffscreenBackground: OffscreenCanvas = canvasBackground.transferControlToOffscreen(),
			canvasOffscreenForeground: OffscreenCanvas = canvasForeground.transferControlToOffscreen(),
			canvasOffscreenOverlay: OffscreenCanvas = canvasOverlay.transferControlToOffscreen(),
			videoCmdInit: VideoCmdInit,
			videoCmdResize: VideoCmdResize,
			videoPayload: VideoPayload,
			videoWorkerCmdAudioEffect: VideoWorkerCmdAudioEffect,
			videoWorkerCmdAudioMusic: VideoWorkerCmdAudioMusic,
			videoWorkerPayload: VideoWorkerPayload,
			videoWorkerPayloads: VideoWorkerPayload[];

		VideoEngine.feed = feed;
		await ResizeEngine.initialize();
		ResizeEngine.setCallback(VideoEngine.resized);

		if (window.Worker) {
			VideoEngine.worker = new Worker(new URL('./video.worker.engine', import.meta.url));

			videoCmdResize = VideoEngine.resized(true);
			videoCmdInit = {
				canvasOffscreen: canvasOffscreen,
				canvasOffscreenBackground: canvasOffscreenBackground,
				canvasOffscreenForeground: canvasOffscreenForeground,
				canvasOffscreenOverlay: canvasOffscreenOverlay,
				devicePixelRatio: videoCmdResize.devicePixelRatio,
				height: videoCmdResize.height,
				width: videoCmdResize.width,
			};
			videoPayload = {
				cmd: VideoCmd.INIT,
				data: videoCmdInit,
			};

			VideoEngine.worker.postMessage(videoPayload, [canvasOffscreen, canvasOffscreenBackground, canvasOffscreenForeground, canvasOffscreenOverlay]);

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
						case VideoWorkerCmd.AUDIO_MUSIC:
							videoWorkerCmdAudioMusic = <VideoWorkerCmdAudioMusic>videoWorkerPayload.data;
							audioAsset = AudioAsset.find(videoWorkerCmdAudioMusic.id);
							if (audioAsset) {
								AudioEngine.play(audioAsset, videoWorkerCmdAudioMusic.volumePercentage);
							} else {
								console.error('GameEngine > video: music asset id invalid');
							}
							break;
					}
				}
			};
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
			height: height,
			width: width,
		};

		if (disablePost !== true) {
			VideoEngine.worker.postMessage({
				cmd: VideoCmd.RESIZE,
				data: data,
			});
		}

		return data;
	}
}
