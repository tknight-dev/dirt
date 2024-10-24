import { AudioAsset, AudioType } from './assets/audio.asset';
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

/**
 * @author tknight-dev
 */

self.onmessage = (event: MessageEvent) => {
	let videoPayload: VideoPayload = event.data;

	switch (videoPayload.cmd) {
		case VideoCmd.INIT:
			Video.initialize(self, <VideoCmdInit>videoPayload.data);
			break;
		case VideoCmd.RESIZE:
			Video.resize(<VideoCmdResize>videoPayload.data);
			break;
	}
};

class Video {
	private static canvasOffscreen: OffscreenCanvas; // Z-1
	private static canvasOffscreenContext: OffscreenCanvasRenderingContext2D;
	private static canvasOffscreenBackground: OffscreenCanvas; // Z-2
	private static canvasOffscreenBackgroundContext: OffscreenCanvasRenderingContext2D;
	private static canvasOffscreenForeground: OffscreenCanvas; // Z-3
	private static canvasOffscreenForegroundContext: OffscreenCanvasRenderingContext2D;
	private static canvasOffscreenOverlay: OffscreenCanvas; // Z-4
	private static canvasOffscreenOverlayContext: OffscreenCanvasRenderingContext2D;
	private static devicePixelRatio: number;
	private static height: number;
	private static width: number;
	private static self: Window & typeof globalThis;

	public static async initialize(self: Window & typeof globalThis, data: VideoCmdInit): Promise<void> {
		// Assign
		Video.canvasOffscreen = data.canvasOffscreen;
		Video.canvasOffscreenBackground = data.canvasOffscreenBackground;
		Video.canvasOffscreenForeground = data.canvasOffscreenForeground;
		Video.canvasOffscreenOverlay = data.canvasOffscreenOverlay;
		Video.self = self;

		// Get contexts
		Video.canvasOffscreenContext = <any>Video.canvasOffscreen.getContext('2d', { alpha: false });
		Video.canvasOffscreenBackgroundContext = <any>Video.canvasOffscreenBackground.getContext('2d');
		Video.canvasOffscreenForegroundContext = <any>Video.canvasOffscreenForeground.getContext('2d');
		Video.canvasOffscreenOverlayContext = <any>Video.canvasOffscreenOverlay.getContext('2d');

		// Config
		Video.resize(data);
	}

	/**
	 * Support high dpi screens
	 */
	public static resize(videoCmdResize: VideoCmdResize): void {
		let devicePixelRatio: number = Math.max(1, Math.round(videoCmdResize.devicePixelRatio)),
			height: number = Math.round(videoCmdResize.height) * devicePixelRatio,
			width: number = Math.round(videoCmdResize.width) * devicePixelRatio;

		Video.devicePixelRatio = devicePixelRatio;
		Video.height = height;
		Video.width = width;

		Video.canvasOffscreen.height = height;
		Video.canvasOffscreen.width = width;
		Video.canvasOffscreenBackground.height = height;
		Video.canvasOffscreenBackground.width = width;
		Video.canvasOffscreenForeground.height = height;
		Video.canvasOffscreenForeground.width = width;
		Video.canvasOffscreenOverlay.height = height;
		Video.canvasOffscreenOverlay.width = width;
	}

	private static post(videoWorkerPayloads: VideoWorkerPayload[]): void {
		Video.self.postMessage({
			payloads: videoWorkerPayloads,
		});
	}
}
