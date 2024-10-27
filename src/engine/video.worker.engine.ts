import { AssetCollection } from './models/asset.model';
import { AssetEngine } from './asset.engine';
import { CameraEngine } from './camera.engine';
import { FPSDrawEngine } from './draw/fps.draw.engine';
import { KernelEngine } from './kernel.engine';
import { KeyAction } from './keyboard.engine';
import { Map } from './models/map.model';
import { MapAsset } from './assets/map.asset';
import { MapEngine } from './map.engine';
import { MouseAction } from './mouse.engine';
import { UtilEngine } from './util.engine';
import {
	VideoCmd,
	VideoCmdInit,
	VideoCmdMapLoad,
	VideoCmdResize,
	VideoCmdGamePause,
	VideoCmdGamePauseReason,
	VideoCmdGameStart,
	VideoCmdGameUnpause,
	VideoCmdSettings,
	VideoPayload,
	VideoWorkerCmd,
	VideoWorkerCmdAudioEffect,
	VideoWorkerPayload,
} from './models/video-worker-cmds.model';

/**
 * @author tknight-dev
 */

self.onmessage = (event: MessageEvent) => {
	let videoPayload: VideoPayload = event.data;

	switch (videoPayload.cmd) {
		case VideoCmd.GAME_PAUSE:
			Video.inputGamePause(<VideoCmdGamePause>videoPayload.data);
			break;
		case VideoCmd.GAME_START:
			Video.inputGameStart(<VideoCmdGameStart>videoPayload.data);
			break;
		case VideoCmd.GAME_UNPAUSE:
			Video.inputGameUnpause(<VideoCmdGameUnpause>videoPayload.data);
			break;
		case VideoCmd.INIT:
			Video.initialize(self, <VideoCmdInit>videoPayload.data);
			break;
		case VideoCmd.KEY:
			KernelEngine.inputKey(<KeyAction>videoPayload.data);
			break;
		case VideoCmd.MAP_LOAD:
			Video.inputMapLoad(<VideoCmdMapLoad>videoPayload.data);
			break;
		case VideoCmd.MOUSE:
			KernelEngine.inputMouse(<MouseAction>videoPayload.data);
			break;
		case VideoCmd.RESIZE:
			Video.inputGamePause({ reason: VideoCmdGamePauseReason.RESIZE });
			Video.inputResize(<VideoCmdResize>videoPayload.data);
			break;
		case VideoCmd.SETTINGS:
			Video.inputSettings(<VideoCmdSettings>videoPayload.data);
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
	private static gameStarted: boolean;
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

		// Engines
		await AssetEngine.initialize(AssetCollection.VIDEO);
		await AssetEngine.load();
		await CameraEngine.initialize();
		await KernelEngine.initialize(
			Video.canvasOffscreenContext,
			Video.canvasOffscreenBackgroundContext,
			Video.canvasOffscreenForegroundContext,
			Video.canvasOffscreenOverlayContext,
		);
		await MapEngine.initialize();

		// Config
		await FPSDrawEngine.initialize();
		Video.inputResize(data);
		Video.inputSettings(data);

		// Last
		KernelEngine.setModeEdit(data.modeEdit);
		//KernelEngine.start(MapEngine.load(MapAsset.LEVEL01)); // When level1 has something to start from
		KernelEngine.start(MapEngine.default());
	}

	public static inputGamePause(pause: VideoCmdGamePause): void {
		console.log('VideoWorker > gamePause', pause);
	}

	/**
	 * Start the game (company intro complete)
	 */
	public static inputGameStart(start: VideoCmdGameStart): void {
		if (Video.gameStarted) {
			console.error('Video > gameStart: already started');
			return;
		}
		Video.gameStarted = true;
		console.log('VideoWorker > gameStart', start);
	}

	public static inputGameUnpause(unpause: VideoCmdGameUnpause): void {
		console.log('VideoWorker > gameUnpause', unpause);
	}

	public static inputMapLoad(videoCmdMapLoad: VideoCmdMapLoad): void {
		let map: Map,
			status: boolean = true;

		try {
			map = UtilEngine.mapDecode(videoCmdMapLoad.data);
		} catch (error: any) {
			status = false;
		}

		Video.post([
			{
				cmd: VideoWorkerCmd.MAP_LOAD_STATUS,
				data: {
					status: status,
				},
			},
		]);
	}

	/**
	 * Supports high dpi screens
	 */
	public static inputResize(resize: VideoCmdResize): void {
		let devicePixelRatio: number = resize.devicePixelRatio,
			height: number = Math.ceil(resize.height * devicePixelRatio),
			width: number = Math.ceil(resize.width * devicePixelRatio);

		KernelEngine.setDimension(height, width);

		Video.canvasOffscreen.height = height;
		Video.canvasOffscreen.width = width;
		Video.canvasOffscreenBackground.height = height;
		Video.canvasOffscreenBackground.width = width;
		Video.canvasOffscreenForeground.height = height;
		Video.canvasOffscreenForeground.width = width;
		Video.canvasOffscreenOverlay.height = height;
		Video.canvasOffscreenOverlay.width = width;
	}

	public static inputSettings(settings: VideoCmdSettings): void {
		console.log('VideoWorker > settings', settings);

		KernelEngine.updateSettings(settings);
	}

	/**
	 * @param pan between -1 left and 1 right (precision 3)
	 * @param volumePercentage between 0 and 1 (precision 3)
	 */
	public static outputAudioEffect(assetId: string, pan: number, volumePercentage: number): void {
		Video.post([
			{
				cmd: VideoWorkerCmd.AUDIO_EFFECT,
				data: {
					id: assetId,
					pan: Math.round(Math.max(-1, Math.min(1, pan)) * 1000) / 1000,
					volumePercentage: Math.round(Math.max(0, Math.min(1, volumePercentage)) * 1000) / 1000,
				},
			},
		]);
	}

	/**
	 * Play a stack of effects at once
	 *
	 * @param pan between -1 left and 1 right (precision 3)
	 * @param volumePercentage between 0 and 1 (precision 3)
	 */
	public static outputAudioEffectBatch(effects: VideoWorkerCmdAudioEffect[]): void {
		let effect: VideoWorkerCmdAudioEffect,
			payloads: VideoWorkerPayload[] = [];

		for (let i in effects) {
			effect = effects[i];

			payloads.push({
				cmd: VideoWorkerCmd.AUDIO_EFFECT,
				data: {
					id: effect.id,
					pan: Math.round(Math.max(-1, Math.min(1, effect.pan)) * 1000) / 1000,
					volumePercentage: Math.round(Math.max(0, Math.min(1, effect.volumePercentage)) * 1000) / 1000,
				},
			});
		}

		Video.post(payloads);
	}

	/**
	 * @param durationInMs min 100 (precision 0)
	 * @param volumePercentage between 0 and 1 (precision 3)
	 */
	public static outputAudioMusicFade(assetId: string, durationInMs: number, volumePercentage: number): void {
		Video.post([
			{
				cmd: VideoWorkerCmd.AUDIO_MUSIC_FADE,
				data: {
					durationInMs: Math.max(100, Math.round(durationInMs)),
					id: assetId,
					volumePercentage: Math.round(Math.max(0, Math.min(1, volumePercentage)) * 1000) / 1000,
				},
			},
		]);
	}

	/**
	 * @param volumePercentage between 0 and 1 (precision 3)
	 */
	public static outputAudioMusicPlay(assetId: string, volumePercentage: number): void {
		Video.post([
			{
				cmd: VideoWorkerCmd.AUDIO_MUSIC_PLAY,
				data: {
					id: assetId,
					volumePercentage: Math.round(Math.max(0, Math.min(1, volumePercentage)) * 1000) / 1000,
				},
			},
		]);
	}

	public static outputAudioMusicPause(assetId: string): void {
		Video.post([
			{
				cmd: VideoWorkerCmd.AUDIO_MUSIC_PAUSE,
				data: {
					id: assetId,
				},
			},
		]);
	}

	public static outputAudioMusicUnpause(assetId: string): void {
		Video.post([
			{
				cmd: VideoWorkerCmd.AUDIO_MUSIC_UNPAUSE,
				data: {
					id: assetId,
				},
			},
		]);
	}

	/**
	 * @param volumePercentage between 0 and 1 (precision 3)
	 */
	public static outputAudioVolume(assetId: string, volumePercentage: number): void {
		Video.post([
			{
				cmd: VideoWorkerCmd.AUDIO_VOLUME,
				data: {
					id: assetId,
					volumePercentage: Math.round(Math.max(0, Math.min(1, volumePercentage)) * 1000) / 1000,
				},
			},
		]);
	}

	public static outputMapSave(map: Map): void {
		Video.post([
			{
				cmd: VideoWorkerCmd.MAP_SAVE,
				data: {
					data: UtilEngine.mapEncode(map),
					name: map.name,
				},
			},
		]);
	}

	private static post(videoWorkerPayloads: VideoWorkerPayload[]): void {
		Video.self.postMessage({
			payloads: videoWorkerPayloads,
		});
	}
}
