import { AssetCollection, AssetImageSrcQuality, AssetManifestMaster, AssetMap } from '../../models/asset.model';
import { AssetEngine } from '../asset.engine';
import { ClockCalcEngine } from '../../calc/clock.calc.engine';
import { Grid } from '../../models/grid.model';
import { Camera } from '../../models/camera.model';
import { CameraEngine } from '../camera.engine';
import { KernelEngine } from '../kernel.engine';
import { KeyAction } from '../keyboard.engine';
import { LightingCalcEngineBus } from '../../calc/buses/lighting.calc.engine.bus';
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
	VideoBusOutputCmdAudioEffect,
	VideoBusWorkerPayload,
} from '../../engines/buses/video.model.bus';

/**
 * @author tknight-dev
 */

self.onmessage = (event: MessageEvent) => {
	let videoBusPayload: VideoBusPayload = event.data;

	switch (videoBusPayload.cmd) {
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
			KernelEngine.inputKey(<KeyAction>videoBusPayload.data);
			break;
		case VideoBusInputCmd.MAP_LOAD:
			VideoWorkerEngine.inputMapLoad(<VideoBusInputCmdMapLoad>videoBusPayload.data);
			break;
		case VideoBusInputCmd.MAP_LOAD_BY_ID:
			VideoWorkerEngine.inputMapLoadById(<VideoBusInputCmdMapLoadById>videoBusPayload.data);
			break;
		case VideoBusInputCmd.MOUSE:
			KernelEngine.inputMouse(<MouseAction>videoBusPayload.data);
			break;
		case VideoBusInputCmd.RESIZE:
			VideoWorkerEngine.inputGamePause({ reason: VideoBusInputCmdGamePauseReason.RESIZE });
			VideoWorkerEngine.inputResize(<VideoBusInputCmdResize>videoBusPayload.data);
			break;
		case VideoBusInputCmd.SETTINGS:
			VideoWorkerEngine.inputSettings(<VideoBusInputCmdSettings>videoBusPayload.data);
			break;
		case VideoBusInputCmd.TOUCH:
			KernelEngine.inputTouch(<TouchAction>videoBusPayload.data);
			break;
	}
};

class VideoWorkerEngine {
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
	private static canvasOffscreenVanishing: OffscreenCanvas; // Z-1
	private static canvasOffscreenVanishingContext: OffscreenCanvasRenderingContext2D;
	private static gameModeEdit: boolean;
	private static gameStarted: boolean;
	private static initialized: boolean;
	private static quality: AssetImageSrcQuality;
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
		VideoWorkerEngine.canvasOffscreenOverlay = data.canvasOffscreenOverlay;
		VideoWorkerEngine.canvasOffscreenUnderlay = data.canvasOffscreenUnderlay;
		VideoWorkerEngine.canvasOffscreenVanishing = data.canvasOffscreenVanishing;
		VideoWorkerEngine.quality = data.quality;
		VideoWorkerEngine.self = self;

		// Get contexts
		VideoWorkerEngine.canvasOffscreenBackgroundContext = <any>VideoWorkerEngine.canvasOffscreenBackground.getContext('2d');
		VideoWorkerEngine.canvasOffscreenForegroundContext = <any>VideoWorkerEngine.canvasOffscreenForeground.getContext('2d');
		VideoWorkerEngine.canvasOffscreenOverlayContext = <any>VideoWorkerEngine.canvasOffscreenOverlay.getContext('2d');
		VideoWorkerEngine.canvasOffscreenPrimaryContext = <any>VideoWorkerEngine.canvasOffscreenPrimary.getContext('2d');
		VideoWorkerEngine.canvasOffscreenUnderlayContext = <any>VideoWorkerEngine.canvasOffscreenUnderlay.getContext('2d');
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
			LightingCalcEngineBus.outputHourOfDayEff(hourOfDayEff);
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
		if (pause.reason === VideoBusInputCmdGamePauseReason.FULLSCREEN || pause.reason === VideoBusInputCmdGamePauseReason.VISIBILITY) {
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
					mapActive: mapActive,
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
		VideoWorkerEngine.canvasOffscreenUnderlay.height = height;
		VideoWorkerEngine.canvasOffscreenUnderlay.width = width;
		VideoWorkerEngine.canvasOffscreenVanishing.height = height;
		VideoWorkerEngine.canvasOffscreenVanishing.width = width;
	}

	public static inputSettings(settings: VideoBusInputCmdSettings): void {
		console.log('VideoBusWorker > settings', settings);

		settings.darknessMax = Math.round(Math.max(0, Math.min(1, settings.darknessMax)) * 1000) / 1000;
		settings.gamma = Math.round(Math.max(-0.5, Math.min(1.5, settings.gamma)) * 1000) / 1000;
		settings.vanishingPercentageOfViewport = Math.round(Math.max(0, Math.min(2, settings.vanishingPercentageOfViewport)) * 1000) / 1000;

		KernelEngine.updateSettings(settings);
	}

	/**
	 * @param pan between -1 left and 1 right (precision 3)
	 * @param volumePercentage between 0 and 1 (precision 3)
	 */
	public static outputAudioEffect(assetId: string, modulationId: string, pan: number, volumePercentage: number): void {
		VideoWorkerEngine.post([
			{
				cmd: VideoBusOutputCmd.AUDIO_EFFECT,
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
	public static outputAudioEffectBatch(effects: VideoBusOutputCmdAudioEffect[]): void {
		let effect: VideoBusOutputCmdAudioEffect,
			payloads: VideoBusWorkerPayload[] = [];

		for (let i in effects) {
			effect = effects[i];

			payloads.push({
				cmd: VideoBusOutputCmd.AUDIO_EFFECT,
				data: {
					id: effect.id,
					modulationId: effect.modulationId,
					pan: Math.round(Math.max(-1, Math.min(1, effect.pan)) * 1000) / 1000,
					volumePercentage: Math.round(Math.max(0, Math.min(1, effect.volumePercentage)) * 1000) / 1000,
				},
			});
		}

		VideoWorkerEngine.post(payloads);
	}

	/**
	 * @param durationInMs min 100 (precision 0)
	 * @param volumePercentage between 0 and 1 (precision 3)
	 */
	public static outputAudioMusicFade(assetId: string, durationInMs: number, volumePercentage: number): void {
		VideoWorkerEngine.post([
			{
				cmd: VideoBusOutputCmd.AUDIO_MUSIC_FADE,
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
		VideoWorkerEngine.post([
			{
				cmd: VideoBusOutputCmd.AUDIO_MUSIC_PLAY,
				data: {
					id: assetId,
					timeInS: Math.round(timeInS),
					volumePercentage: Math.round(Math.max(0, Math.min(1, volumePercentage)) * 1000) / 1000,
				},
			},
		]);
	}

	public static outputAudioMusicPause(assetId: string): void {
		VideoWorkerEngine.post([
			{
				cmd: VideoBusOutputCmd.AUDIO_MUSIC_PAUSE,
				data: {
					id: assetId,
				},
			},
		]);
	}

	public static outputAudioMusicUnpause(assetId: string): void {
		VideoWorkerEngine.post([
			{
				cmd: VideoBusOutputCmd.AUDIO_MUSIC_UNPAUSE,
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
		VideoWorkerEngine.post([
			{
				cmd: VideoBusOutputCmd.AUDIO_VOLUME,
				data: {
					id: assetId,
					volumePercentage: Math.round(Math.max(0, Math.min(1, volumePercentage)) * 1000) / 1000,
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
					data: UtilEngine.mapEncode(MapEditEngine.gridBlockTableDeflate(<MapActive>map)),
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
