import { AssetCollection, AssetImageSrcQuality, AssetManifestMaster, AssetMap } from '../../models/asset.model';
import { AssetEngine } from '../asset.engine';
import { AudioOptions } from '../audio.engine';
import { ClockCalcEngine } from '../../calc/clock.calc.engine';
import { Grid } from '../../models/grid.model';
import { Camera } from '../../models/camera.model';
import { CameraEngine } from '../camera.engine';
import { ImageBlockDrawEngine } from '../../draw/image-block.draw.engine';
import { InputsCalcEngine } from '../../calc/inputs.calc.engine';
import { KernelEngine } from '../kernel.engine';
import { KeyAction } from '../keyboard.engine';
import { LightingEngine } from '../lighting.engine';
import { Map, MapActive, MapConfig } from '../../models/map.model';
import { MapDrawEngine } from '../../draw/map.draw.engine';
import { MapDrawEngineBus } from '../../draw/buses/map.draw.engine.bus';
import { MapEngine } from '../map.engine';
import { MapEditEngine } from '../map-edit.engine';
import { MouseAction } from '../mouse.engine';
import { TouchAction } from '../touch.engine';
import { UtilEngine } from '../util.engine';
import {
	VideoBusInputCmd,
	VideoBusInputCmdAudioBufferIds,
	VideoBusInputCmdInit,
	VideoBusInputCmdMapLoad,
	VideoBusInputCmdMapLoadById,
	VideoBusInputCmdResize,
	VideoBusInputCmdGameModeEdit,
	VideoBusInputCmdGameModeEditApply,
	VideoBusInputCmdGameModeEditDraw,
	VideoBusInputCmdGamePause,
	VideoBusInputCmdGamePauseReason,
	VideoBusInputCmdGameSave,
	VideoBusInputCmdGameStart,
	VideoBusInputCmdGameUnpause,
	VideoBusInputCmdSettings,
	VideoBusPayload,
	VideoBusOutputCmd,
	VideoBusWorkerPayload,
} from '../../engines/buses/video.model.bus';

/**
 * @author tknight-dev
 */

self.onmessage = (event: MessageEvent) => {
	let videoBusPayload: VideoBusPayload = event.data;

	switch (videoBusPayload.cmd) {
		case VideoBusInputCmd.AUDIO_BUFFER_IDS:
			VideoWorkerEngine.inputAudioBufferIds(<VideoBusInputCmdAudioBufferIds>videoBusPayload.data);
			break;
		case VideoBusInputCmd.GAME_MODE_EDIT:
			VideoWorkerEngine.inputGameModeEdit(<VideoBusInputCmdGameModeEdit>videoBusPayload.data);
			break;
		case VideoBusInputCmd.GAME_MODE_EDIT_APPLY:
			VideoWorkerEngine.inputGameModeEditApply(<VideoBusInputCmdGameModeEditApply>videoBusPayload.data);
			break;
		case VideoBusInputCmd.GAME_MODE_EDIT_APPLY_GROUP:
			VideoWorkerEngine.inputGameModeEditApplyGroup(<boolean>videoBusPayload.data);
			break;
		case VideoBusInputCmd.GAME_MODE_EDIT_DRAW:
			VideoWorkerEngine.inputGameModeEditDraw(<VideoBusInputCmdGameModeEditDraw>videoBusPayload.data);
			break;
		case VideoBusInputCmd.GAME_MODE_EDIT_REDO:
			VideoWorkerEngine.inputGameModeEditRedo();
			break;
		case VideoBusInputCmd.GAME_MODE_EDIT_SETTINGS:
			VideoWorkerEngine.inputGameModeEditSettings(<MapConfig>videoBusPayload.data);
			break;
		case VideoBusInputCmd.GAME_MODE_EDIT_TIME_FORCED:
			VideoWorkerEngine.inputGameModeEditTimeForced(<boolean>videoBusPayload.data);
			break;
		case VideoBusInputCmd.GAME_MODE_EDIT_UNDO:
			VideoWorkerEngine.inputGameModeEditUndo();
			break;
		case VideoBusInputCmd.GAME_PAUSE:
			VideoWorkerEngine.inputGamePause(<VideoBusInputCmdGamePause>videoBusPayload.data);
			break;
		case VideoBusInputCmd.GAME_SAVE:
			VideoWorkerEngine.inputGameSave(<VideoBusInputCmdGameSave>videoBusPayload.data);
			break;
		case VideoBusInputCmd.GAME_START:
			VideoWorkerEngine.inputGameStart(<VideoBusInputCmdGameStart>videoBusPayload.data);
			break;
		case VideoBusInputCmd.GAME_UNPAUSE:
			VideoWorkerEngine.inputGameUnpause(<VideoBusInputCmdGameUnpause>videoBusPayload.data);
			break;
		case VideoBusInputCmd.INIT:
			VideoWorkerEngine.initialize(self, <VideoBusInputCmdInit>videoBusPayload.data);
			break;
		case VideoBusInputCmd.KEY:
			InputsCalcEngine.inputKey(<KeyAction>videoBusPayload.data);
			break;
		case VideoBusInputCmd.MAP_LOAD:
			VideoWorkerEngine.inputMapLoad(<VideoBusInputCmdMapLoad>videoBusPayload.data);
			break;
		case VideoBusInputCmd.MAP_LOAD_BY_ID:
			VideoWorkerEngine.inputMapLoadById(<VideoBusInputCmdMapLoadById>videoBusPayload.data);
			break;
		case VideoBusInputCmd.MOUSE:
			InputsCalcEngine.inputMouse(<MouseAction>videoBusPayload.data);
			break;
		case VideoBusInputCmd.RESIZE:
			VideoWorkerEngine.inputGamePause({ reason: VideoBusInputCmdGamePauseReason.RESIZE });
			VideoWorkerEngine.inputResize(<VideoBusInputCmdResize>videoBusPayload.data);
			break;
		case VideoBusInputCmd.SETTINGS:
			VideoWorkerEngine.inputSettings(<VideoBusInputCmdSettings>videoBusPayload.data);
			break;
		case VideoBusInputCmd.TOUCH:
			InputsCalcEngine.inputTouch(<TouchAction>videoBusPayload.data);
			break;
	}
};

class VideoWorkerEngine {
	private static assetManifestMaster: AssetManifestMaster;
	private static audioTransactionCache: { [key: number]: (status: boolean) => void } = {};
	private static audioTransactionCacheKey: number = 0;
	private static canvasOffscreenBackground: OffscreenCanvas; // Z-2
	private static canvasOffscreenBackgroundContext: OffscreenCanvasRenderingContext2D;
	private static canvasOffscreenForeground: OffscreenCanvas; // Z-4
	private static canvasOffscreenForegroundContext: OffscreenCanvasRenderingContext2D;
	private static canvasOffscreenOverlay: OffscreenCanvas; // Z-5
	private static canvasOffscreenOverlayContext: OffscreenCanvasRenderingContext2D;
	private static canvasOffscreenPrimary: OffscreenCanvas; // Z-3
	private static canvasOffscreenPrimaryContext: OffscreenCanvasRenderingContext2D;
	private static canvasOffscreenSecondary: OffscreenCanvas; // Z-3
	private static canvasOffscreenSecondaryContext: OffscreenCanvasRenderingContext2D;
	private static canvasOffscreenUnderlay: OffscreenCanvas; // Z-1
	private static canvasOffscreenUnderlayContext: OffscreenCanvasRenderingContext2D;
	private static canvasOffscreenVanishing: OffscreenCanvas; // Z-1
	private static canvasOffscreenVanishingContext: OffscreenCanvasRenderingContext2D;
	private static gameModeEdit: boolean;
	private static gameStarted: boolean;
	private static initialized: boolean;
	private static self: Window & typeof globalThis;

	public static async initialize(self: Window & typeof globalThis, data: VideoBusInputCmdInit): Promise<void> {
		if (VideoWorkerEngine.initialized) {
			console.error('VideoWorkerEngine > initialize: already initialized');
			return;
		}
		VideoWorkerEngine.initialized = true;
		let timestamp: number = performance.now();

		// Assign
		VideoWorkerEngine.assetManifestMaster = AssetEngine.compileMasterManifest(data.assetDeclarations.manifest || <any>{});
		VideoWorkerEngine.canvasOffscreenBackground = data.canvasOffscreenBackground;
		VideoWorkerEngine.canvasOffscreenForeground = data.canvasOffscreenForeground;
		VideoWorkerEngine.canvasOffscreenPrimary = data.canvasOffscreenPrimary;
		VideoWorkerEngine.canvasOffscreenSecondary = data.canvasOffscreenSecondary;
		VideoWorkerEngine.canvasOffscreenOverlay = data.canvasOffscreenOverlay;
		VideoWorkerEngine.canvasOffscreenUnderlay = data.canvasOffscreenUnderlay;
		VideoWorkerEngine.canvasOffscreenVanishing = data.canvasOffscreenVanishing;
		VideoWorkerEngine.self = self;

		// Get contexts
		VideoWorkerEngine.canvasOffscreenBackgroundContext = <any>VideoWorkerEngine.canvasOffscreenBackground.getContext('2d');
		VideoWorkerEngine.canvasOffscreenForegroundContext = <any>VideoWorkerEngine.canvasOffscreenForeground.getContext('2d');
		VideoWorkerEngine.canvasOffscreenOverlayContext = <any>VideoWorkerEngine.canvasOffscreenOverlay.getContext('2d');
		VideoWorkerEngine.canvasOffscreenPrimaryContext = <any>VideoWorkerEngine.canvasOffscreenPrimary.getContext('2d');
		VideoWorkerEngine.canvasOffscreenSecondaryContext = <any>VideoWorkerEngine.canvasOffscreenSecondary.getContext('2d');
		VideoWorkerEngine.canvasOffscreenUnderlayContext = <any>(
			VideoWorkerEngine.canvasOffscreenUnderlay.getContext('2d', { alpha: false })
		);
		VideoWorkerEngine.canvasOffscreenVanishingContext = <any>VideoWorkerEngine.canvasOffscreenVanishing.getContext('2d');

		// Engines
		await AssetEngine.initialize(data.assetDeclarations, AssetCollection.VIDEO);
		await AssetEngine.load();
		await CameraEngine.initialize();
		await KernelEngine.initialize(
			VideoWorkerEngine.canvasOffscreenBackgroundContext,
			VideoWorkerEngine.canvasOffscreenForegroundContext,
			VideoWorkerEngine.canvasOffscreenOverlayContext,
			VideoWorkerEngine.canvasOffscreenPrimaryContext,
			VideoWorkerEngine.canvasOffscreenSecondaryContext,
			VideoWorkerEngine.canvasOffscreenUnderlayContext,
			VideoWorkerEngine.canvasOffscreenVanishingContext,
		);
		await LightingEngine.initialize();
		await MapEngine.initialize();
		await MapEditEngine.initialize(false);

		// Config
		CameraEngine.setCallback((camera: Camera) => {
			VideoWorkerEngine.outputEditCameraUpdate(camera);
		});
		ClockCalcEngine.setCallbackHourOfDay((hourOfDayEff: number) => {
			VideoWorkerEngine.outputHourOfDayEff(hourOfDayEff);
		});
		KernelEngine.setCallbackFPS((fps: number) => {
			VideoWorkerEngine.outputFPS(fps);
		});
		VideoWorkerEngine.inputResize(data);
		VideoWorkerEngine.inputSettings(data);

		// Done
		VideoWorkerEngine.post([
			{
				cmd: VideoBusOutputCmd.STATUS_INITIALIZED,
				data: {
					durationInMs: performance.now() - timestamp,
				},
			},
		]);
	}

	public static inputAudioBufferIds(audioBufferIds: VideoBusInputCmdAudioBufferIds): void {
		let audioTransactionCache: { [key: number]: (status: boolean) => void } = VideoWorkerEngine.audioTransactionCache,
			bufferIds: { [key: number]: number | undefined } = audioBufferIds.bufferIds,
			caller = (transactionId: number) => {
				setTimeout(() => {
					audioTransactionCache[transactionId](bufferIds[transactionId] !== undefined);
				});
			};

		for (let transactionId in bufferIds) {
			caller(Number(transactionId));
			delete audioTransactionCache[transactionId];
		}
	}

	public static inputGameModeEdit(modeEdit: VideoBusInputCmdGameModeEdit): void {
		console.log('VideoBusWorker > modeEdit', modeEdit);
		VideoWorkerEngine.gameModeEdit = modeEdit.edit;
	}

	public static inputGameModeEditApply(apply: VideoBusInputCmdGameModeEditApply): void {
		MapEditEngine.apply(apply);
		VideoWorkerEngine.post([
			{
				cmd: VideoBusOutputCmd.EDIT_COMPLETE,
				data: null,
			},
		]);
	}

	public static inputGameModeEditApplyGroup(group: boolean): void {
		MapEditEngine.setApplyGroup(group);
		VideoWorkerEngine.post([
			{
				cmd: VideoBusOutputCmd.EDIT_COMPLETE,
				data: null,
			},
		]);
	}

	public static inputGameModeEditDraw(apply: VideoBusInputCmdGameModeEditDraw): void {
		MapDrawEngineBus.setVanishingEnable(apply.vanishingEnable);
		ImageBlockDrawEngine.setEditing(apply.editing);
		KernelEngine.draw(apply);
		VideoWorkerEngine.post([
			{
				cmd: VideoBusOutputCmd.EDIT_COMPLETE,
				data: null,
			},
		]);
	}

	public static inputGameModeEditRedo(): void {
		MapEditEngine.historyRedo();
		VideoWorkerEngine.post([
			{
				cmd: VideoBusOutputCmd.EDIT_COMPLETE,
				data: null,
			},
		]);
	}

	public static inputGameModeEditSettings(mapConfig: MapConfig): void {
		MapEditEngine.updateMapSettings(mapConfig);
		VideoWorkerEngine.post([
			{
				cmd: VideoBusOutputCmd.EDIT_COMPLETE,
				data: null,
			},
		]);
	}

	public static inputGameModeEditTimeForced(enable: boolean): void {
		MapDrawEngineBus.outputTimeForced(enable);
		LightingEngine.setTimeForced(enable);
		VideoWorkerEngine.post([
			{
				cmd: VideoBusOutputCmd.EDIT_COMPLETE,
				data: null,
			},
		]);
	}

	public static inputGameModeEditUndo(): void {
		MapEditEngine.historyUndo();
		VideoWorkerEngine.post([
			{
				cmd: VideoBusOutputCmd.EDIT_COMPLETE,
				data: null,
			},
		]);
	}

	public static inputGamePause(pause: VideoBusInputCmdGamePause): void {
		if (pause.reason !== VideoBusInputCmdGamePauseReason.RESIZE) {
			if (!KernelEngine.isPaused() && KernelEngine.isRunning()) {
				KernelEngine.pause();
			}
		}
	}

	public static inputGameSave(save: VideoBusInputCmdGameSave): void {
		if (KernelEngine.isModeEdit()) {
			VideoWorkerEngine.outputMapSave(MapEditEngine.getMapActiveCloneNormalized());
		} else {
			console.log('save current game state', save);
		}
	}

	/**
	 * Start the game (company intro complete)
	 */
	public static inputGameStart(start: VideoBusInputCmdGameStart): void {
		if (!VideoWorkerEngine.initialized) {
			console.error('Video > gameStart: not initialized');
			return;
		} else if (VideoWorkerEngine.gameStarted) {
			console.error('Video > gameStart: already started');
			return;
		}
		VideoWorkerEngine.gameStarted = true;
		VideoWorkerEngine.gameModeEdit = start.modeEdit;

		// Last
		KernelEngine.setModeEdit(start.modeEdit);
	}

	public static inputGameUnpause(unpause: VideoBusInputCmdGameUnpause): void {
		if (KernelEngine.isPaused() && KernelEngine.isRunning()) {
			KernelEngine.resume();
		}
	}

	public static async inputMapLoad(videoBusInputCmdMapLoad: VideoBusInputCmdMapLoad): Promise<void> {
		let map: Map,
			mapActive: MapActive,
			status: boolean = true;

		try {
			map = UtilEngine.mapDecode(await AssetEngine.unzip(videoBusInputCmdMapLoad.data));

			if (map) {
				for (let i in map.grids) {
					map.grids[i] = new Grid(JSON.parse(<any>map.grids[i]));
				}

				mapActive = MapEngine.loadFromFile(map);
				await MapEditEngine.load(mapActive); // Also starts Kernel
			} else {
				status = false;
			}
		} catch (error: any) {
			status = false;
		}

		VideoWorkerEngine.post([
			{
				cmd: VideoBusOutputCmd.MAP_LOAD_STATUS,
				data: {
					status: status,
				},
			},
		]);
	}

	public static async inputMapLoadById(videoBusInputCmdMapLoadById: VideoBusInputCmdMapLoadById): Promise<void> {
		let mapActive: MapActive | undefined, mapAsset: AssetMap;

		try {
			if (!videoBusInputCmdMapLoadById.id) {
				mapActive = MapEngine.default();
			} else {
				mapAsset = VideoWorkerEngine.assetManifestMaster.maps[videoBusInputCmdMapLoadById.id];
				mapActive = await MapEngine.load(mapAsset);
			}

			if (mapActive) {
				await MapEditEngine.load(mapActive); // Also starts Kernel
			}
		} catch (error: any) {
			console.error('Video > inputMapLoadById', error);
		}

		VideoWorkerEngine.post([
			{
				cmd: VideoBusOutputCmd.MAP_ASSET,
				data: {
					mapActive: mapActive
						? UtilEngine.mapEncode(MapEditEngine.gridBlockTableDeflate(MapEditEngine.getMapActiveCloneNormalized(mapActive)))
						: undefined,
				},
			},
		]);
	}

	/**
	 * Supports high dpi screens
	 */
	public static inputResize(resize: VideoBusInputCmdResize): void {
		let devicePixelRatio: number = resize.devicePixelRatio,
			height: number = Math.floor(resize.height * devicePixelRatio),
			width: number = Math.floor(resize.width * devicePixelRatio);

		UtilEngine.renderOverflowPEff = Math.round(UtilEngine.renderOverflowP * devicePixelRatio * 1000) / 1000;
		KernelEngine.setDimension(height, width);

		MapDrawEngine.scaler = resize.scaler;
		MapDrawEngine.devicePixelRatio = devicePixelRatio;
		MapDrawEngine.devicePixelRatioEff = Math.round((1 / devicePixelRatio) * 1000) / 1000;

		VideoWorkerEngine.canvasOffscreenBackground.height = height;
		VideoWorkerEngine.canvasOffscreenBackground.width = width;
		VideoWorkerEngine.canvasOffscreenForeground.height = height;
		VideoWorkerEngine.canvasOffscreenForeground.width = width;
		VideoWorkerEngine.canvasOffscreenOverlay.height = height;
		VideoWorkerEngine.canvasOffscreenOverlay.width = width;
		VideoWorkerEngine.canvasOffscreenPrimary.height = height;
		VideoWorkerEngine.canvasOffscreenPrimary.width = width;
		VideoWorkerEngine.canvasOffscreenSecondary.height = height;
		VideoWorkerEngine.canvasOffscreenSecondary.width = width;
		VideoWorkerEngine.canvasOffscreenUnderlay.height = height;
		VideoWorkerEngine.canvasOffscreenUnderlay.width = width;
		VideoWorkerEngine.canvasOffscreenVanishing.height = height;
		VideoWorkerEngine.canvasOffscreenVanishing.width = width;
	}

	public static inputSettings(settings: VideoBusInputCmdSettings): void {
		settings.darknessMax = Math.round(Math.max(0, Math.min(1, settings.darknessMax)) * 1000) / 1000;
		settings.gamma = Math.round(Math.max(-0.2, Math.min(1.5, settings.gamma)) * 1000) / 1000;
		settings.vanishingPercentageOfViewport = Math.round(Math.max(0, Math.min(2, settings.vanishingPercentageOfViewport)) * 1000) / 1000;

		KernelEngine.updateSettings(settings);
	}

	public static outputAudio(assetId: string, audioOptions?: AudioOptions, callback?: (status: boolean) => void): void {
		let audioTransactionCache: { [key: number]: (status: boolean) => void } = VideoWorkerEngine.audioTransactionCache,
			transactionId: number | undefined;

		if (callback) {
			transactionId = VideoWorkerEngine.audioTransactionCacheKey++;
			if (VideoWorkerEngine.audioTransactionCacheKey >= 0xff) {
				VideoWorkerEngine.audioTransactionCacheKey %= 0xff;
			}

			audioTransactionCache[transactionId] = callback;
		}

		VideoWorkerEngine.post([
			{
				cmd: VideoBusOutputCmd.AUDIO_PLAY,
				data: {
					id: assetId,
					audioOptions: audioOptions,
					transactionId: transactionId,
				},
			},
		]);
	}

	/**
	 * Play a stack of audio at once
	 */
	public static outputAudioBatch(
		assetIds: string[],
		audioOptions: (AudioOptions | undefined)[],
		callbacks: (((status: boolean) => void) | undefined)[],
	): void {
		let audioTransactionCache: { [key: number]: (status: boolean) => void } = VideoWorkerEngine.audioTransactionCache,
			transactionId: number | undefined,
			payloads: VideoBusWorkerPayload[] = [];

		for (let i in assetIds) {
			if (callbacks[i]) {
				transactionId = VideoWorkerEngine.audioTransactionCacheKey++;
				if (VideoWorkerEngine.audioTransactionCacheKey >= 0xff) {
					VideoWorkerEngine.audioTransactionCacheKey %= 0xff;
				}

				audioTransactionCache[transactionId] = callbacks[i];
			}

			payloads.push({
				cmd: VideoBusOutputCmd.AUDIO_PLAY,
				data: {
					id: assetIds[i],
					audioOptions: audioOptions[i],
					transactionId: transactionId,
				},
			});

			transactionId = undefined;
		}

		VideoWorkerEngine.post(payloads);
	}

	public static outputAudioFade(bufferId: number, durationInMs: number, volumePercentage: number): void {
		VideoWorkerEngine.post([
			{
				cmd: VideoBusOutputCmd.AUDIO_FADE,
				data: {
					durationInMs: durationInMs,
					bufferId: bufferId,
					volumePercentage: volumePercentage,
				},
			},
		]);
	}

	public static outputAudioPause(bufferId: number): void {
		VideoWorkerEngine.post([
			{
				cmd: VideoBusOutputCmd.AUDIO_PAUSE,
				data: {
					bufferId: bufferId,
				},
			},
		]);
	}

	public static outputAudioStop(bufferId: number): void {
		VideoWorkerEngine.post([
			{
				cmd: VideoBusOutputCmd.AUDIO_STOP,
				data: {
					bufferId: bufferId,
				},
			},
		]);
	}

	public static outputAudioUnpause(bufferId: number): void {
		VideoWorkerEngine.post([
			{
				cmd: VideoBusOutputCmd.AUDIO_UNPAUSE,
				data: {
					bufferId: bufferId,
				},
			},
		]);
	}

	public static outputEditCameraUpdate(camera: Camera): void {
		if (VideoWorkerEngine.gameModeEdit) {
			VideoWorkerEngine.post([
				{
					cmd: VideoBusOutputCmd.EDIT_CAMERA_UPDATE,
					data: {
						gInPh: camera.gInPh,
						gInPw: camera.gInPw,
						gx: camera.gx,
						gy: camera.gy,
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

	public static outputFPS(fps: number): void {
		VideoWorkerEngine.post([
			{
				cmd: VideoBusOutputCmd.FPS,
				data: fps,
			},
		]);
	}

	public static outputHourOfDayEff(hourOfDayEff: number): void {
		VideoWorkerEngine.post([
			{
				cmd: VideoBusOutputCmd.MAP_HOUR_OF_DAY_EFF,
				data: hourOfDayEff,
			},
		]);
	}

	public static outputRumble(enable: boolean, durationInMS: number, intensity: number): void {
		VideoWorkerEngine.post([
			{
				cmd: VideoBusOutputCmd.RUMBLE,
				data: {
					enable: enable,
					durationInMS: Math.max(0, Math.min(10000, durationInMS)),
					intensity: Math.max(1, Math.min(10, intensity)),
				},
			},
		]);
	}

	public static outputMapSave(map: Map): void {
		VideoWorkerEngine.post([
			{
				cmd: VideoBusOutputCmd.MAP_SAVE,
				data: {
					data: UtilEngine.mapEncode(
						MapEditEngine.gridBlockTableDeflate(MapEditEngine.getMapActiveCloneNormalized(<MapActive>map)),
					),
					name: map.name,
				},
			},
		]);
	}

	private static post(VideoBusWorkerPayloads: VideoBusWorkerPayload[]): void {
		VideoWorkerEngine.self.postMessage({
			payloads: VideoBusWorkerPayloads,
		});
	}
}
