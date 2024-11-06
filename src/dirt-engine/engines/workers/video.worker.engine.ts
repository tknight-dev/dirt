import { AssetCollection, AssetImageSrcResolution, AssetManifestMaster, AssetMap } from '../../models/asset.model';
import { AssetEngine } from '../asset.engine';
import { Camera } from '../../models/camera.model';
import { CameraEngine } from '../camera.engine';
import { KernelEngine } from '../kernel.engine';
import { KeyAction } from '../keyboard.engine';
import { Map, MapActive } from '../../models/map.model';
import { MapEngine } from '../map.engine';
import { MapEditEngine } from '../map-edit.engine';
import { MouseAction } from '../mouse.engine';
import { UtilEngine } from '../util.engine';
import {
	VideoCmd,
	VideoCmdInit,
	VideoCmdMapLoad,
	VideoCmdMapLoadById,
	VideoCmdResize,
	VideoCmdGameModeEdit,
	VideoCmdGameModeEditApply,
	VideoCmdGamePause,
	VideoCmdGamePauseReason,
	VideoCmdGameSave,
	VideoCmdGameStart,
	VideoCmdGameUnpause,
	VideoCmdSettings,
	VideoPayload,
	VideoWorkerCmd,
	VideoWorkerCmdAudioEffect,
	VideoWorkerPayload,
} from '../../models/video-worker-cmds.model';

/**
 * @author tknight-dev
 */

self.onmessage = (event: MessageEvent) => {
	let videoPayload: VideoPayload = event.data;

	switch (videoPayload.cmd) {
		case VideoCmd.GAME_MODE_EDIT:
			Video.inputGameModeEdit(<VideoCmdGameModeEdit>videoPayload.data);
			break;
		case VideoCmd.GAME_MODE_EDIT_APPLY:
			Video.inputGameModeEditApply(<VideoCmdGameModeEditApply>videoPayload.data);
			break;
		case VideoCmd.GAME_MODE_EDIT_REDO:
			Video.inputGameModeEditRedo();
			break;
		case VideoCmd.GAME_MODE_EDIT_UNDO:
			Video.inputGameModeEditUndo();
			break;
		case VideoCmd.GAME_PAUSE:
			Video.inputGamePause(<VideoCmdGamePause>videoPayload.data);
			break;
		case VideoCmd.GAME_SAVE:
			Video.inputGameSave(<VideoCmdGameSave>videoPayload.data);
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
		case VideoCmd.MAP_LOAD_BY_ID:
			Video.inputMapLoadById(<VideoCmdMapLoadById>videoPayload.data);
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
	private static assetManifestMaster: AssetManifestMaster;
	private static canvasOffscreenBackground: OffscreenCanvas; // Z-2
	private static canvasOffscreenBackgroundContext: OffscreenCanvasRenderingContext2D;
	private static canvasOffscreenForeground: OffscreenCanvas; // Z-4
	private static canvasOffscreenForegroundContext: OffscreenCanvasRenderingContext2D;
	private static canvasOffscreenOverlay: OffscreenCanvas; // Z-5
	private static canvasOffscreenOverlayContext: OffscreenCanvasRenderingContext2D;
	private static canvasOffscreenPrimary: OffscreenCanvas; // Z-3
	private static canvasOffscreenPrimaryContext: OffscreenCanvasRenderingContext2D;
	private static canvasOffscreenUnderlay: OffscreenCanvas; // Z-1
	private static canvasOffscreenUnderlayContext: OffscreenCanvasRenderingContext2D;
	private static gameModeEdit: boolean;
	private static gameStarted: boolean;
	private static initialized: boolean;
	private static resolution: AssetImageSrcResolution;
	private static self: Window & typeof globalThis;

	public static async initialize(self: Window & typeof globalThis, data: VideoCmdInit): Promise<void> {
		if (Video.initialized) {
			console.error('Video > initialize: already initialized');
			return;
		}
		Video.initialized = true;
		let timestamp: number = performance.now();

		// Assign
		Video.assetManifestMaster = AssetEngine.compileMasterManifest(data.assetDeclarations.manifest || <any>{});
		Video.canvasOffscreenBackground = data.canvasOffscreenBackground;
		Video.canvasOffscreenForeground = data.canvasOffscreenForeground;
		Video.canvasOffscreenPrimary = data.canvasOffscreenPrimary;
		Video.canvasOffscreenOverlay = data.canvasOffscreenOverlay;
		Video.canvasOffscreenUnderlay = data.canvasOffscreenUnderlay;
		Video.resolution = data.resolution;
		Video.self = self;

		// Get contexts
		Video.canvasOffscreenBackgroundContext = <any>Video.canvasOffscreenBackground.getContext('2d');
		Video.canvasOffscreenForegroundContext = <any>Video.canvasOffscreenForeground.getContext('2d');
		Video.canvasOffscreenOverlayContext = <any>Video.canvasOffscreenOverlay.getContext('2d');
		Video.canvasOffscreenPrimaryContext = <any>Video.canvasOffscreenPrimary.getContext('2d');
		Video.canvasOffscreenUnderlayContext = <any>Video.canvasOffscreenUnderlay.getContext('2d');

		// Engines
		await AssetEngine.initialize(data.assetDeclarations, AssetCollection.VIDEO);
		await AssetEngine.load();
		await CameraEngine.initialize();
		await KernelEngine.initialize(
			Video.canvasOffscreenBackgroundContext,
			Video.canvasOffscreenForegroundContext,
			Video.canvasOffscreenOverlayContext,
			Video.canvasOffscreenPrimaryContext,
			Video.canvasOffscreenUnderlayContext,
		);
		await MapEngine.initialize();
		await MapEditEngine.initialize(false);

		// Config
		CameraEngine.setCallback((camera: Camera) => {
			Video.outputEditCameraUpdate(camera);
		});
		Video.inputResize(data);
		Video.inputSettings(data);

		// Done
		Video.post([
			{
				cmd: VideoWorkerCmd.STATUS_INITIALIZED,
				data: {
					durationInMs: performance.now() - timestamp,
				},
			},
		]);
	}

	public static inputGameModeEdit(modeEdit: VideoCmdGameModeEdit): void {
		console.log('VideoWorker > modeEdit', modeEdit);
		Video.gameModeEdit = modeEdit.edit;
	}

	public static inputGameModeEditApply(apply: VideoCmdGameModeEditApply): void {
		MapEditEngine.apply(apply);
		Video.post([
			{
				cmd: VideoWorkerCmd.EDIT_COMPLETE,
				data: null,
			},
		]);
	}

	public static inputGameModeEditRedo(): void {
		MapEditEngine.historyRedo();
		Video.post([
			{
				cmd: VideoWorkerCmd.EDIT_COMPLETE,
				data: null,
			},
		]);
	}

	public static inputGameModeEditUndo(): void {
		MapEditEngine.historyUndo();
		Video.post([
			{
				cmd: VideoWorkerCmd.EDIT_COMPLETE,
				data: null,
			},
		]);
	}

	public static inputGamePause(pause: VideoCmdGamePause): void {
		//console.log('VideoWorker > gamePause', pause);
	}

	public static inputGameSave(save: VideoCmdGameSave): void {
		if (KernelEngine.isModeEdit()) {
			Video.outputMapSave(KernelEngine.getMapActive());
		} else {
			console.log('save current game state', save);
		}
	}

	/**
	 * Start the game (company intro complete)
	 */
	public static inputGameStart(start: VideoCmdGameStart): void {
		if (!Video.initialized) {
			console.error('Video > gameStart: not initialized');
			return;
		} else if (Video.gameStarted) {
			console.error('Video > gameStart: already started');
			return;
		}
		Video.gameStarted = true;
		Video.gameModeEdit = start.modeEdit;
		console.log('VideoWorker > gameStart', start);

		// Last
		KernelEngine.setModeEdit(start.modeEdit);
	}

	public static inputGameUnpause(unpause: VideoCmdGameUnpause): void {
		console.log('VideoWorker > gameUnpause', unpause);
	}

	public static async inputMapLoad(videoCmdMapLoad: VideoCmdMapLoad): Promise<void> {
		let map: Map,
			mapActive: MapActive,
			status: boolean = true;

		//let maps: { [key: string]: AssetMap } = Video.assetManifestMaster.maps

		try {
			map = UtilEngine.mapDecode(videoCmdMapLoad.data);

			if (map) {
				mapActive = MapEngine.loadFromFile(map);
				await MapEditEngine.load(mapActive);
			} else {
				status = false;
			}
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

	public static async inputMapLoadById(videoCmdMapLoadById: VideoCmdMapLoadById): Promise<void> {
		let mapActive: MapActive | undefined, mapAsset: AssetMap;

		try {
			if (!videoCmdMapLoadById.id) {
				mapActive = MapEngine.default();
			} else {
				mapAsset = Video.assetManifestMaster.maps[videoCmdMapLoadById.id];
				mapActive = MapEngine.load(mapAsset);
			}

			if (mapActive) {
				await MapEditEngine.load(mapActive);
			}
		} catch (error: any) {
			console.error('Video > inputMapLoadById', error);
		}

		Video.post([
			{
				cmd: VideoWorkerCmd.MAP_ASSET,
				data: {
					mapActive: mapActive,
				},
			},
		]);
	}

	/**
	 * Supports high dpi screens
	 */
	public static inputResize(resize: VideoCmdResize): void {
		let devicePixelRatio: number = resize.devicePixelRatio,
			height: number = Math.floor(resize.height * devicePixelRatio),
			width: number = Math.floor(resize.width * devicePixelRatio);

		UtilEngine.renderOverflowPEff = Math.round(UtilEngine.renderOverflowP * devicePixelRatio * 1000) / 1000;
		KernelEngine.setDimension(height, width);

		Video.canvasOffscreenBackground.height = height;
		Video.canvasOffscreenBackground.width = width;
		Video.canvasOffscreenForeground.height = height;
		Video.canvasOffscreenForeground.width = width;
		Video.canvasOffscreenOverlay.height = height;
		Video.canvasOffscreenOverlay.width = width;
		Video.canvasOffscreenPrimary.height = height;
		Video.canvasOffscreenPrimary.width = width;
		Video.canvasOffscreenUnderlay.height = height;
		Video.canvasOffscreenUnderlay.width = width;
	}

	public static inputSettings(settings: VideoCmdSettings): void {
		console.log('VideoWorker > settings', settings);

		KernelEngine.updateSettings(settings);
	}

	/**
	 * @param pan between -1 left and 1 right (precision 3)
	 * @param volumePercentage between 0 and 1 (precision 3)
	 */
	public static outputAudioEffect(
		assetId: string,
		modulationId: string,
		pan: number,
		volumePercentage: number,
	): void {
		Video.post([
			{
				cmd: VideoWorkerCmd.AUDIO_EFFECT,
				data: {
					id: assetId,
					modulationId: modulationId,
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
					modulationId: effect.modulationId,
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
	public static outputAudioMusicPlay(assetId: string, timeInS: number, volumePercentage: number): void {
		Video.post([
			{
				cmd: VideoWorkerCmd.AUDIO_MUSIC_PLAY,
				data: {
					id: assetId,
					timeInS: Math.round(timeInS),
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

	public static outputEditCameraUpdate(camera: Camera): void {
		if (Video.gameModeEdit) {
			Video.post([
				{
					cmd: VideoWorkerCmd.EDIT_CAMERA_UPDATE,
					data: {
						gInPh: camera.gInPh,
						gInPw: camera.gInPw,
						viewportPh: camera.viewportPh,
						viewportPw: camera.viewportPw,
						viewportPx: camera.viewportPx,
						viewportPy: camera.viewportPy,
						viewportGx: camera.viewportGx,
						viewportGy: camera.viewportGy,
						zoom: camera.zoom,
					},
				},
			]);
		}
	}

	public static outputMapSave(map: Map): void {
		Video.post([
			{
				cmd: VideoWorkerCmd.MAP_SAVE,
				data: {
					data: UtilEngine.mapEncode(MapEditEngine.gridBlockTableDeflate(<MapActive>map)),
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
