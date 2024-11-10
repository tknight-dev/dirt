import { DoubleLinkedList } from '../models/double-linked-list.model';
import { Camera } from '../models/camera.model';
import {
	Grid,
	GridBlockTable,
	GridBlockTableComplex,
	GridConfig,
	GridCoordinate,
	GridImageBlock,
	GridImageBlockType,
	GridObject,
} from '../models/grid.model';
import { KernelEngine } from './kernel.engine';
import { MapActive, MapConfig } from '../models/map.model';
import { MapDrawEngineBus } from '../draw/buses/map.draw.engine.bus';
import { MouseAction } from './mouse.engine';
import {
	VideoBusInputCmdGameModeEditApply,
	VideoBusInputCmdGameModeEditApplyAudioBlock,
	VideoBusInputCmdGameModeEditApplyAudioTriggerEffect,
	VideoBusInputCmdGameModeEditApplyAudioTriggerMusic,
	VideoBusInputCmdGameModeEditApplyAudioTriggerMusicFade,
	VideoBusInputCmdGameModeEditApplyAudioTriggerMusicPause,
	VideoBusInputCmdGameModeEditApplyAudioTriggerMusicUnpause,
	VideoBusInputCmdGameModeEditApplyErase,
	VideoBusInputCmdGameModeEditApplyImageBlock,
	VideoBusInputCmdGameModeEditApplyLight,
	VideoBusInputCmdGameModeEditApplyType,
	VideoBusInputCmdGameModeEditApplyView,
	VideoBusInputCmdGameModeEditApplyZ,
	VideoBusOutputCmdEditCameraUpdate,
} from '../engines/buses/video.model.bus';
import { UtilEngine } from './util.engine';
import { LightingCacheInstance, LightingEngine } from './lighting.engine';

/**
 * Mainted by UI and Video threads for map editing. Allows for full object restores, and minimizes bus communication.
 *
 * @author tknight-dev
 */

export class MapEditEngine {
	public static applyGroup: boolean;
	public static readonly gHeightMax: number = 36301;
	public static readonly gWidthMax: number = 0xffff - 1000;
	private static initialized: boolean;
	private static mapActiveUI: MapActive;
	private static mapHistoryLength: number = 50;
	private static mapHistoryRedo: DoubleLinkedList<MapActive> = new DoubleLinkedList<MapActive>();
	private static mapHistoryUndo: DoubleLinkedList<MapActive> = new DoubleLinkedList<MapActive>();
	private static modeUI: boolean; // indicates thread context
	public static uiChanged: boolean;
	public static uiLoaded: boolean;

	public static apply(apply: VideoBusInputCmdGameModeEditApply): void {
		// MapEditEngine.historyAdd();
		// console.log('applyGroup', MapEditEngine.applyGroup);

		switch (apply.applyType) {
			case VideoBusInputCmdGameModeEditApplyType.AUDIO_BLOCK:
				MapEditEngine.applyAudioBlock(<VideoBusInputCmdGameModeEditApplyAudioBlock>apply);
				break;
			case VideoBusInputCmdGameModeEditApplyType.AUDIO_TRIGGER_EFFECT:
				MapEditEngine.applyAudioTriggerEffect(<VideoBusInputCmdGameModeEditApplyAudioTriggerEffect>apply);
				break;
			case VideoBusInputCmdGameModeEditApplyType.AUDIO_TRIGGER_MUSIC:
				MapEditEngine.applyAudioTriggerMusic(<VideoBusInputCmdGameModeEditApplyAudioTriggerMusic>apply);
				break;
			case VideoBusInputCmdGameModeEditApplyType.AUDIO_TRIGGER_MUSIC_FADE:
				MapEditEngine.applyAudioTriggerMusicFade(<VideoBusInputCmdGameModeEditApplyAudioTriggerMusicFade>apply);
				break;
			case VideoBusInputCmdGameModeEditApplyType.AUDIO_TRIGGER_MUSIC_PAUSE:
				MapEditEngine.applyAudioTriggerMusicPause(<VideoBusInputCmdGameModeEditApplyAudioTriggerMusicPause>apply);
				break;
			case VideoBusInputCmdGameModeEditApplyType.AUDIO_TRIGGER_MUSIC_UNPAUSE:
				MapEditEngine.applyAudioTriggerMusicUnpause(<VideoBusInputCmdGameModeEditApplyAudioTriggerMusicUnpause>apply);
				break;
			case VideoBusInputCmdGameModeEditApplyType.ERASE:
				MapEditEngine.applyErase(<VideoBusInputCmdGameModeEditApplyErase>apply);
				break;
			case VideoBusInputCmdGameModeEditApplyType.IMAGE_BLOCK:
				MapEditEngine.applyImageBlock(<VideoBusInputCmdGameModeEditApplyImageBlock>apply);
				break;
			case VideoBusInputCmdGameModeEditApplyType.LIGHT:
				MapEditEngine.applyLight(<VideoBusInputCmdGameModeEditApplyLight>apply);
				break;
		}
	}

	private static applyAudioBlock(apply: VideoBusInputCmdGameModeEditApplyAudioBlock): void {
		console.warn('MapEditEngine > applyAudioArea: not yet implemented');
	}

	private static applyAudioTriggerEffect(apply: VideoBusInputCmdGameModeEditApplyAudioTriggerEffect): void {
		console.warn('MapEditEngine > applyAudioTriggerEffect: not yet implemented');
	}

	private static applyAudioTriggerMusic(apply: VideoBusInputCmdGameModeEditApplyAudioTriggerMusic): void {
		console.warn('MapEditEngine > applyAudioTriggerMusic: not yet implemented');
	}

	private static applyAudioTriggerMusicFade(apply: VideoBusInputCmdGameModeEditApplyAudioTriggerMusicFade): void {
		console.warn('MapEditEngine > applyAudioTriggerMusicFade: not yet implemented');
	}

	private static applyAudioTriggerMusicPause(apply: VideoBusInputCmdGameModeEditApplyAudioTriggerMusicPause): void {
		console.warn('MapEditEngine > applyAudioTriggerMusicPause: not yet implemented');
	}

	private static applyAudioTriggerMusicUnpause(apply: VideoBusInputCmdGameModeEditApplyAudioTriggerMusicUnpause): void {
		console.warn('MapEditEngine > applyAudioTriggerMusicUnpause: not yet implemented');
	}

	private static applyErase(apply: VideoBusInputCmdGameModeEditApplyErase): void {
		let gHashes: number[] = apply.gHashes,
			grid: Grid,
			imageBlocks: GridBlockTable<GridImageBlock>,
			z: VideoBusInputCmdGameModeEditApplyZ = apply.z;

		if (!MapEditEngine.modeUI) {
			grid = KernelEngine.getMapActive().gridActive;
		} else {
			grid = MapEditEngine.mapActiveUI.gridActive;
		}

		// Select object
		if (z === VideoBusInputCmdGameModeEditApplyZ.BACKGROUND) {
			imageBlocks = grid.imageBlocksBackground;
		} else if (z === VideoBusInputCmdGameModeEditApplyZ.FOREGROUND) {
			imageBlocks = grid.imageBlocksForeground;
		} else {
			imageBlocks = grid.imageBlocksPrimary;
		}

		// Apply
		for (let i = 0; i < gHashes.length; i++) {
			if (imageBlocks.hashes) {
				delete imageBlocks.hashes[gHashes[i]];
			}
		}

		MapEditEngine.gridBlockTableInflateInstance(imageBlocks);

		if (!MapEditEngine.modeUI) {
			KernelEngine.updateMap();
		}
	}

	private static applyImageBlock(apply: VideoBusInputCmdGameModeEditApplyImageBlock): void {
		let gCoordinate: GridCoordinate,
			gHash: number,
			gHashes: number[] = apply.gHashes,
			grid: Grid,
			imageBlocks: GridBlockTable<GridImageBlock>,
			properties: any = JSON.parse(JSON.stringify(apply)),
			z: VideoBusInputCmdGameModeEditApplyZ = apply.z;

		if (!MapEditEngine.modeUI) {
			grid = KernelEngine.getMapActive().gridActive;
		} else {
			grid = MapEditEngine.mapActiveUI.gridActive;
		}

		// Select object
		if (z === VideoBusInputCmdGameModeEditApplyZ.BACKGROUND) {
			imageBlocks = grid.imageBlocksBackground;
		} else if (z === VideoBusInputCmdGameModeEditApplyZ.FOREGROUND) {
			imageBlocks = grid.imageBlocksForeground;
		} else {
			imageBlocks = grid.imageBlocksPrimary;
		}

		if (imageBlocks.hashes === undefined) {
			imageBlocks.hashes = <any>new Object();
		}

		// Clean
		delete (<any>properties).gHashes;
		delete (<any>properties).z;

		// Apply
		for (let i = 0; i < gHashes.length; i++) {
			gHash = gHashes[i];

			gCoordinate = UtilEngine.gridHashFrom(gHash);
			properties.hash = gHash;
			properties.gx = gCoordinate.gx;
			properties.gy = gCoordinate.gy;
			imageBlocks.hashes[gHash] = JSON.parse(JSON.stringify(properties));
		}

		MapEditEngine.gridBlockTableInflateInstance(imageBlocks);

		if (!MapEditEngine.modeUI) {
			let assetUpdate: { [key: string]: LightingCacheInstance } = {};

			LightingEngine.cacheAdd(apply.assetId);
			assetUpdate[apply.assetId] = LightingEngine.getCacheInstance(apply.assetId);

			if (apply.assetIdDamagedImage) {
				LightingEngine.cacheAdd(apply.assetIdDamagedImage);
				assetUpdate[apply.assetIdDamagedImage] = LightingEngine.getCacheInstance(apply.assetIdDamagedImage);
			}

			MapDrawEngineBus.outputAssets(assetUpdate);
			KernelEngine.updateMap();
		}
	}

	public static gridBlockTableDeflate(map: MapActive): MapActive {
		Object.values(map.grids).forEach((grid: Grid) => {
			MapEditEngine.gridBlockTableDeflateInstance(grid.audioBlocks);
			MapEditEngine.gridBlockTableDeflateInstance(grid.audioTagTriggersEffect);
			MapEditEngine.gridBlockTableDeflateInstance(grid.audioTagTriggersMusic);
			MapEditEngine.gridBlockTableDeflateInstance(grid.audioTagTriggersMusicFade);
			MapEditEngine.gridBlockTableDeflateInstance(grid.audioTagTriggersMusicPause);
			MapEditEngine.gridBlockTableDeflateInstance(grid.audioTagTriggersMusicUnpause);
			MapEditEngine.gridBlockTableDeflateInstance(grid.imageBlocksBackground);
			MapEditEngine.gridBlockTableDeflateInstance(grid.imageBlocksForeground);
			MapEditEngine.gridBlockTableDeflateInstance(grid.imageBlocksPrimary);
		});
		return map;
	}

	private static gridBlockTableDeflateInstance(gridBlockTable: GridBlockTable<any>): void {
		delete gridBlockTable.gx;
		delete gridBlockTable.hashesGyByGx;
	}

	public static gridBlockTableInflate(map: MapActive): MapActive {
		Object.values(map.grids).forEach((grid: Grid) => {
			MapEditEngine.gridBlockTableInflateInstance(grid.audioBlocks);
			MapEditEngine.gridBlockTableInflateInstance(grid.audioTagTriggersEffect);
			MapEditEngine.gridBlockTableInflateInstance(grid.audioTagTriggersMusic);
			MapEditEngine.gridBlockTableInflateInstance(grid.audioTagTriggersMusicFade);
			MapEditEngine.gridBlockTableInflateInstance(grid.audioTagTriggersMusicPause);
			MapEditEngine.gridBlockTableInflateInstance(grid.audioTagTriggersMusicUnpause);
			MapEditEngine.gridBlockTableInflateInstance(grid.imageBlocksBackground);
			MapEditEngine.gridBlockTableInflateInstance(grid.imageBlocksForeground);
			MapEditEngine.gridBlockTableInflateInstance(grid.imageBlocksPrimary);
		});
		return map;
	}

	private static gridBlockTableInflateInstance(gridBlockTable: GridBlockTable<any>): void {
		let gCoordinate: GridCoordinate,
			gx: number[],
			hash: number,
			hashes: string[] = Object.keys(gridBlockTable.hashes || {}),
			hashesGyByGx: { [key: number]: GridBlockTableComplex[] } = {};

		for (let i in hashes) {
			hash = Number(hashes[i]);
			gCoordinate = UtilEngine.gridHashFrom(Number(hash));

			if (hashesGyByGx[gCoordinate.gx] === undefined) {
				hashesGyByGx[gCoordinate.gx] = [
					{
						hash: hash,
						value: gCoordinate.gy,
					},
				];
			} else {
				hashesGyByGx[gCoordinate.gx].push({
					hash: hash,
					value: gCoordinate.gy,
				});
			}
		}

		gx = Object.keys(hashesGyByGx)
			.map((v) => Number(v))
			.sort();
		for (let i in gx) {
			hashesGyByGx[gx[i]] = hashesGyByGx[gx[i]].sort();
		}

		gridBlockTable.gx = gx;
		gridBlockTable.hashesGyByGx = hashesGyByGx;
	}

	private static applyLight(apply: VideoBusInputCmdGameModeEditApplyLight): void {
		console.warn('MapEditEngine > applyLight: not yet implemented');
	}

	private static historyAdd(): void {
		if (!MapEditEngine.modeUI) {
			MapEditEngine.mapHistoryUndo.pushEnd(JSON.parse(JSON.stringify(KernelEngine.getMapActive())));
		} else {
			MapEditEngine.mapHistoryUndo.pushEnd(JSON.parse(JSON.stringify(MapEditEngine.mapActiveUI)));
		}
		MapEditEngine.mapHistoryRedo.clear();

		if (MapEditEngine.mapHistoryUndo.getLength() > MapEditEngine.mapHistoryLength) {
			MapEditEngine.mapHistoryUndo.popStart();
		}
	}

	/**
	 * UI: call directly and pass call to the comunication bus
	 *
	 * Video: only call directly on bus communication
	 */
	public static historyRedo(): MapActive | undefined {
		if (!MapEditEngine.mapHistoryRedo.getLength()) {
			return;
		}
		let mapActive: MapActive = <MapActive>MapEditEngine.mapHistoryRedo.popEnd();

		if (!MapEditEngine.modeUI) {
			MapEditEngine.mapHistoryUndo.pushEnd(JSON.parse(JSON.stringify(KernelEngine.getMapActive())));
			KernelEngine.historyUpdate(mapActive);
		} else {
			MapEditEngine.mapHistoryUndo.pushEnd(JSON.parse(JSON.stringify(MapEditEngine.mapActiveUI)));
			MapEditEngine.mapActiveUI = mapActive;
		}

		return mapActive;
	}

	/**
	 * UI: call directly and pass call to bus
	 *
	 * Video: only call directly on bus communication
	 */
	public static historyUndo(): MapActive | undefined {
		if (!MapEditEngine.mapHistoryUndo.getLength()) {
			return;
		}
		let mapActive: MapActive = <MapActive>MapEditEngine.mapHistoryUndo.popEnd();

		if (!MapEditEngine.modeUI) {
			MapEditEngine.mapHistoryRedo.pushEnd(JSON.parse(JSON.stringify(KernelEngine.getMapActive())));
			KernelEngine.historyUpdate(mapActive);
		} else {
			MapEditEngine.mapHistoryRedo.pushEnd(JSON.parse(JSON.stringify(MapEditEngine.mapActiveUI)));
			MapEditEngine.mapActiveUI = mapActive;
		}

		return mapActive;
	}

	public static async initialize(ui: boolean): Promise<void> {
		if (MapEditEngine.initialized) {
			console.error('MapEditEngine > initialize: already initialized');
			return;
		}
		MapEditEngine.initialized = true;
		MapEditEngine.modeUI = ui;
	}

	public static async load(mapActive: MapActive): Promise<void> {
		if (!MapEditEngine.modeUI) {
			// Restart the kernel with the new map
			if (KernelEngine.isRunning()) {
				KernelEngine.stop();
			}
			await KernelEngine.start(mapActive);
		}

		if (MapEditEngine.modeUI) {
			MapEditEngine.mapActiveUI = mapActive;
		}

		MapEditEngine.mapHistoryRedo.clear();
		MapEditEngine.mapHistoryUndo.clear();
		MapEditEngine.uiChanged = false;
		MapEditEngine.uiLoaded = true;
	}

	/**
	 * UI only, the video thread sent a camera update through the bus to the UI. So the UI has to update it's cache of the map's camera.
	 */
	public static uiCameraUpdate(VideoBusOutputCmdEditCameraUpdate: VideoBusOutputCmdEditCameraUpdate) {
		MapEditEngine.mapActiveUI.camera = Object.assign(MapEditEngine.mapActiveUI.camera, VideoBusOutputCmdEditCameraUpdate);
	}

	/**
	 * UI only, send the returned object to the communication bus
	 */
	public static uiApply(
		gHashes: number[],
		properties: VideoBusInputCmdGameModeEditApply,
		type: VideoBusInputCmdGameModeEditApplyType,
		z: VideoBusInputCmdGameModeEditApplyZ,
	): VideoBusInputCmdGameModeEditApply | undefined {
		let apply: VideoBusInputCmdGameModeEditApply;

		MapEditEngine.uiChanged = true;

		switch (type) {
			case VideoBusInputCmdGameModeEditApplyType.AUDIO_BLOCK:
				apply = MapEditEngine.uiApplyAudioBlock(gHashes, properties, z);
				break;
			case VideoBusInputCmdGameModeEditApplyType.AUDIO_TRIGGER_EFFECT:
				apply = MapEditEngine.uiApplyAudioTriggerEffect(gHashes, properties, z);
				break;
			case VideoBusInputCmdGameModeEditApplyType.AUDIO_TRIGGER_MUSIC:
				apply = MapEditEngine.uiApplyAudioTriggerMusic(gHashes, properties, z);
				break;
			case VideoBusInputCmdGameModeEditApplyType.AUDIO_TRIGGER_MUSIC_FADE:
				apply = MapEditEngine.uiApplyAudioTriggerMusicFade(gHashes, properties, z);
				break;
			case VideoBusInputCmdGameModeEditApplyType.AUDIO_TRIGGER_MUSIC_PAUSE:
				apply = MapEditEngine.uiApplyAudioTriggerMusicPause(gHashes, properties, z);
				break;
			case VideoBusInputCmdGameModeEditApplyType.AUDIO_TRIGGER_MUSIC_UNPAUSE:
				apply = MapEditEngine.uiApplyAudioTriggerMusicUnpause(gHashes, properties, z);
				break;
			case VideoBusInputCmdGameModeEditApplyType.ERASE:
				apply = <VideoBusInputCmdGameModeEditApplyErase>{
					gHashes: gHashes,
					z: z,
				};
				break;
			case VideoBusInputCmdGameModeEditApplyType.IMAGE_BLOCK:
				apply = MapEditEngine.uiApplyImageBlock(gHashes, properties, z);
				break;
			case VideoBusInputCmdGameModeEditApplyType.LIGHT:
				apply = MapEditEngine.uiApplyLight(gHashes, properties, z);
				break;
			default:
				console.error("MapEditEngine > uiApply: unknown type '" + type + "'");
				return undefined;
		}
		apply.applyType = type;

		MapEditEngine.apply(apply);
		return apply;
	}

	// Try to have unique colors for every area tag.. maybe array of colors?
	private static uiApplyAudioBlock(
		gHashes: number[],
		properties: VideoBusInputCmdGameModeEditApply,
		z: VideoBusInputCmdGameModeEditApplyZ,
	): VideoBusInputCmdGameModeEditApplyAudioBlock {
		return <any>{};
	}

	private static uiApplyAudioTriggerEffect(
		gHashes: number[],
		properties: VideoBusInputCmdGameModeEditApply,
		z: VideoBusInputCmdGameModeEditApplyZ,
	): VideoBusInputCmdGameModeEditApplyAudioTriggerEffect {
		return <any>{};
	}

	private static uiApplyAudioTriggerMusic(
		gHashes: number[],
		properties: VideoBusInputCmdGameModeEditApply,
		z: VideoBusInputCmdGameModeEditApplyZ,
	): VideoBusInputCmdGameModeEditApplyAudioTriggerMusic {
		return <any>{};
	}

	private static uiApplyAudioTriggerMusicFade(
		gHashes: number[],
		properties: VideoBusInputCmdGameModeEditApply,
		z: VideoBusInputCmdGameModeEditApplyZ,
	): VideoBusInputCmdGameModeEditApplyAudioTriggerMusicFade {
		return <any>{};
	}

	private static uiApplyAudioTriggerMusicPause(
		gHashes: number[],
		properties: VideoBusInputCmdGameModeEditApply,
		z: VideoBusInputCmdGameModeEditApplyZ,
	): VideoBusInputCmdGameModeEditApplyAudioTriggerMusicPause {
		return <any>{};
	}

	private static uiApplyAudioTriggerMusicUnpause(
		gHashes: number[],
		properties: VideoBusInputCmdGameModeEditApply,
		z: VideoBusInputCmdGameModeEditApplyZ,
	): VideoBusInputCmdGameModeEditApplyAudioTriggerMusicUnpause {
		return <any>{};
	}

	private static uiApplyImageBlock(
		gHashes: number[],
		properties: VideoBusInputCmdGameModeEditApply,
		z: VideoBusInputCmdGameModeEditApplyZ,
	): VideoBusInputCmdGameModeEditApplyImageBlock {
		let data: VideoBusInputCmdGameModeEditApplyImageBlock = <VideoBusInputCmdGameModeEditApplyImageBlock>properties;

		if (z === VideoBusInputCmdGameModeEditApplyZ.PRIMARY) {
			// Clean
			if (!data.damageable) {
				delete data.assetIdDamagedImage;
				delete data.assetIdDamangedWalkedOnAudioEffect;
				delete data.strengthToDamangeInN;
			}

			if (!data.destructible) {
				delete data.strengthToDestroyInN;
			}

			if (data.type === GridImageBlockType.SOLID) {
				delete data.viscocity;
			}
		} else {
			// These cannot apply to background and foreground z's
			delete data.assetIdDamagedImage;
			delete data.assetIdDamangedWalkedOnAudioEffect;
			delete data.assetIdWalkedOnAudioEffect;
			delete data.damageable;
			delete data.destructible;
			delete data.strengthToDamangeInN;
			delete data.strengthToDestroyInN;
			delete data.viscocity;
		}

		// Set Defaults
		data.gHashes = gHashes;
		data.gSizeH = 1;
		data.gSizeW = 1;
		data.z = z;

		return data;
	}

	private static uiApplyLight(
		gHashes: number[],
		properties: VideoBusInputCmdGameModeEditApply,
		z: VideoBusInputCmdGameModeEditApplyZ,
	): VideoBusInputCmdGameModeEditApplyLight {
		return <any>{};
	}

	/**
	 * Only for initial grid block positions (precision 0)
	 */
	public static uiRelXYToGBlockHash(mouseAction: MouseAction): number {
		let camera: Camera = MapEditEngine.mapActiveUI.camera;

		return UtilEngine.gridHashTo(
			Math.floor(
				(camera.viewportPx + camera.viewportPw * mouseAction.position.xRel) / camera.gInPw / window.devicePixelRatio +
					camera.viewportGx,
			),
			Math.floor(
				(camera.viewportPy + camera.viewportPh * mouseAction.position.yRel) / camera.gInPh / window.devicePixelRatio +
					camera.viewportGy,
			),
		);
	}

	public static updateUIHourOfDayEff(hourOfDayEff: number): void {
		MapEditEngine.mapActiveUI.hourOfDayEff = hourOfDayEff;
		MapEditEngine.mapActiveUI.minuteOfHourEff = 0;
	}

	public static updateMapSettings(mapConfig: MapConfig): void {
		let mapActive: MapActive;

		if (MapEditEngine.modeUI) {
			mapActive = MapEditEngine.mapActiveUI;
		} else {
			mapActive = KernelEngine.getMapActive();
		}

		// Apply new Config
		mapActive.clockSpeedRelativeToEarth = mapConfig.clockSpeedRelativeToEarth;
		mapActive.gridConfigs = mapConfig.gridConfigs;
		mapActive.hourOfDay = mapConfig.hourOfDay;
		mapActive.name = mapConfig.name;

		// Update active map values
		mapActive.clockTicker = 0;
		mapActive.durationInMS = 0;
		mapActive.hourOfDayEff = mapActive.hourOfDay;
		mapActive.minuteOfHourEff = 0;
	}

	public static setApplyGroup(applyGroup: boolean): void {
		if (MapEditEngine.applyGroup !== applyGroup) {
			MapEditEngine.applyGroup = applyGroup;

			if (applyGroup) {
				MapEditEngine.historyAdd();
			}
		}
	}

	public static getMapActive(): MapActive {
		if (MapEditEngine.modeUI) {
			return MapEditEngine.mapActiveUI;
		} else {
			return KernelEngine.getMapActive();
		}
	}

	public static getGridActive(): Grid {
		return MapEditEngine.mapActiveUI.gridActive;
	}

	public static getGridConfigActive(): GridConfig {
		return MapEditEngine.mapActiveUI.gridConfigActive;
	}

	public static getGridProperty(
		gHash: number,
		view: VideoBusInputCmdGameModeEditApplyView,
		z: VideoBusInputCmdGameModeEditApplyZ,
	): GridObject[] {
		let mapActive: MapActive;

		if (!MapEditEngine.modeUI) {
			mapActive = KernelEngine.getMapActive();
		} else {
			mapActive = MapEditEngine.mapActiveUI;
		}

		switch (view) {
			case VideoBusInputCmdGameModeEditApplyView.AUDIO:
				break;
			case VideoBusInputCmdGameModeEditApplyView.IMAGE:
				if (z === VideoBusInputCmdGameModeEditApplyZ.BACKGROUND) {
					return [mapActive.gridActive.imageBlocksBackground.hashes[gHash]];
				} else if (z === VideoBusInputCmdGameModeEditApplyZ.FOREGROUND) {
					return [mapActive.gridActive.imageBlocksForeground.hashes[gHash]];
				} else {
					return [mapActive.gridActive.imageBlocksPrimary.hashes[gHash]];
				}
				break;
			case VideoBusInputCmdGameModeEditApplyView.LIGHT:
				break;
		}

		return [];
	}

	public static getHistoryRedoLength(): number {
		return MapEditEngine.mapHistoryRedo.getLength();
	}

	public static getHistoryUndoLength(): number {
		return MapEditEngine.mapHistoryUndo.getLength();
	}
}
