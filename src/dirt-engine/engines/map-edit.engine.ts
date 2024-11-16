import { DoubleLinkedList } from '../models/double-linked-list.model';
import { Camera } from '../models/camera.model';
import {
	Grid,
	GridBlockTable,
	GridBlockTableComplex,
	GridConfig,
	GridCoordinate,
	GridImageBlock,
	GridImageBlockReference,
	GridObject,
	GridObjectType,
} from '../models/grid.model';
import { KernelEngine } from './kernel.engine';
import { MapActive, MapConfig } from '../models/map.model';
import { MapDrawEngineBus } from '../draw/buses/map.draw.engine.bus';
import { MouseAction } from './mouse.engine';
import { TouchAction } from './touch.engine';
import {
	VideoBusInputCmdGameModeEditApply,
	VideoBusInputCmdGameModeEditApplyAudioBlock,
	VideoBusInputCmdGameModeEditApplyAudioTrigger,
	VideoBusInputCmdGameModeEditApplyErase,
	VideoBusInputCmdGameModeEditApplyImageBlock,
	VideoBusInputCmdGameModeEditApplyImageBlockFoliage,
	VideoBusInputCmdGameModeEditApplyImageBlockLiquid,
	VideoBusInputCmdGameModeEditApplyImageBlockSolid,
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
	public static readonly gHeightMax: number = 18431; // 0xffff
	public static readonly gWidthMax: number = 32767; // 0xffff
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
			case VideoBusInputCmdGameModeEditApplyType.AUDIO_TRIGGER:
				MapEditEngine.applyAudioTrigger(<VideoBusInputCmdGameModeEditApplyAudioTrigger>apply);
				break;
			case VideoBusInputCmdGameModeEditApplyType.ERASE:
				MapEditEngine.applyErase(<VideoBusInputCmdGameModeEditApplyErase>apply);
				break;
			case VideoBusInputCmdGameModeEditApplyType.IMAGE_BLOCK_FOLIAGE:
			case VideoBusInputCmdGameModeEditApplyType.IMAGE_BLOCK_LIQUID:
			case VideoBusInputCmdGameModeEditApplyType.IMAGE_BLOCK_SOLID:
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

	private static applyAudioTrigger(apply: VideoBusInputCmdGameModeEditApplyAudioTrigger): void {
		console.warn('MapEditEngine > applyAudioTrigger: not yet implemented');
	}

	private static applyErase(apply: VideoBusInputCmdGameModeEditApplyErase): void {
		let blocks: GridBlockTable<GridObject> = <any>{},
			blockHashes: { [key: number]: GridObject } = {},
			gCoordinate: GridCoordinate,
			gHash: number,
			gHashes: number[] = apply.gHashes,
			gHashPrecision: number,
			grid: Grid,
			gridConfig: GridConfig,
			gridObject: GridObject,
			mapActive: MapActive,
			reference: GridBlockTable<GridImageBlockReference> = {
				hashes: {},
			},
			referenceHashes: { [key: number]: GridImageBlockReference } = reference.hashes,
			referenceMode: boolean = false,
			x: number,
			y: number;

		if (!MapEditEngine.modeUI) {
			mapActive = KernelEngine.getMapActive();
		} else {
			mapActive = MapEditEngine.mapActiveUI;
		}
		grid = mapActive.gridActive;
		gridConfig = mapActive.gridConfigActive;
		gHashPrecision = gridConfig.gHashPrecision;

		switch (apply.type) {
			case VideoBusInputCmdGameModeEditApplyType.AUDIO_BLOCK:
				blocks = grid.audioBlocks;
				blockHashes = blocks.hashes;
				break;
			case VideoBusInputCmdGameModeEditApplyType.AUDIO_TRIGGER:
				blocks = grid.audioTagTriggers;
				blockHashes = blocks.hashes;
				break;
			case VideoBusInputCmdGameModeEditApplyType.IMAGE_BLOCK_FOLIAGE:
			case VideoBusInputCmdGameModeEditApplyType.IMAGE_BLOCK_LIQUID:
			case VideoBusInputCmdGameModeEditApplyType.IMAGE_BLOCK_SOLID:
				referenceMode = true;
				switch (apply.z) {
					case VideoBusInputCmdGameModeEditApplyZ.BACKGROUND:
						reference = grid.imageBlocksBackgroundReference;
						break;
					case VideoBusInputCmdGameModeEditApplyZ.FOREGROUND:
						reference = grid.imageBlocksForegroundReference;
						break;
					case VideoBusInputCmdGameModeEditApplyZ.PRIMARY:
						reference = grid.imageBlocksPrimaryReference;
						break;
					case VideoBusInputCmdGameModeEditApplyZ.VANISHING:
						reference = grid.imageBlocksVanishingReference;
						break;
				}
				referenceHashes = reference.hashes;
				break;
			case VideoBusInputCmdGameModeEditApplyType.LIGHT:
				blocks = grid.lights;
				blockHashes = blocks.hashes;
				break;
		}

		// Apply
		for (let i = 0; i < gHashes.length; i++) {
			gridObject = referenceMode ? (referenceHashes[gHashes[i]] || {}).block : blockHashes[gHashes[i]];

			// Maybe it was already deleted as part of a larger group
			if (gridObject !== undefined) {
				if (referenceMode) {
					blockHashes = referenceHashes[gHashes[i]].blocks;
				}

				// Snap to parent hash (top left) to delete all associated hashes
				if (gridObject.extends) {
					gridObject = referenceMode ? referenceHashes[gridObject.extends].block : blockHashes[gridObject.extends];
				}

				gCoordinate = UtilEngine.gridHashFrom(gridObject.hash, gHashPrecision);

				// Delete blocks
				for (x = 0; x < gridObject.gSizeW; x++) {
					for (y = 0; y < gridObject.gSizeH; y++) {
						gHash = UtilEngine.gridHashTo(gCoordinate.gx + x, gCoordinate.gy + y, gHashPrecision);

						if (referenceMode) {
							delete blockHashes[gHash];
							delete reference.hashes[gHash];
						} else {
							delete blockHashes[gHash];
						}
					}
				}
			}
		}

		if (referenceMode) {
			MapEditEngine.gridBlockTableInflateInstance(reference, gHashPrecision);
		} else {
			MapEditEngine.gridBlockTableInflateInstance(blocks, gHashPrecision);
		}

		if (!MapEditEngine.modeUI) {
			KernelEngine.updateMap();
		}
	}

	private static applyImageBlock(apply: VideoBusInputCmdGameModeEditApplyImageBlock): void {
		let blocks: { [key: number]: GridImageBlock } = {},
			gCoordinate: GridCoordinate,
			gHash: number,
			gHashEff: number,
			gHashes: number[] = apply.gHashes,
			gHashesOverwritten: number[],
			gHashPrecision: number,
			grid: Grid,
			gridConfig: GridConfig,
			mapActive: MapActive,
			objectType: GridObjectType,
			properties: any = JSON.parse(JSON.stringify(apply)),
			reference: GridBlockTable<GridImageBlockReference> = {
				hashes: {},
			},
			referenceHashes: { [key: number]: GridImageBlockReference },
			x: number,
			y: number,
			z: VideoBusInputCmdGameModeEditApplyZ = apply.z;

		if (!MapEditEngine.modeUI) {
			mapActive = KernelEngine.getMapActive();
		} else {
			mapActive = MapEditEngine.mapActiveUI;
		}
		grid = mapActive.gridActive;
		gridConfig = mapActive.gridConfigActive;
		gHashPrecision = gridConfig.gHashPrecision;

		switch (apply.z) {
			case VideoBusInputCmdGameModeEditApplyZ.BACKGROUND:
				reference = grid.imageBlocksBackgroundReference;
				switch (apply.applyType) {
					case VideoBusInputCmdGameModeEditApplyType.IMAGE_BLOCK_FOLIAGE:
						blocks = grid.imageBlocksBackgroundFoliage;
						break;
					case VideoBusInputCmdGameModeEditApplyType.IMAGE_BLOCK_LIQUID:
						blocks = grid.imageBlocksBackgroundLiquid;
						break;
					case VideoBusInputCmdGameModeEditApplyType.IMAGE_BLOCK_SOLID:
						blocks = grid.imageBlocksBackgroundSolid;
						break;
				}
				break;
			case VideoBusInputCmdGameModeEditApplyZ.FOREGROUND:
				reference = grid.imageBlocksForegroundReference;
				switch (apply.applyType) {
					case VideoBusInputCmdGameModeEditApplyType.IMAGE_BLOCK_FOLIAGE:
						blocks = grid.imageBlocksForegroundFoliage;
						break;
					case VideoBusInputCmdGameModeEditApplyType.IMAGE_BLOCK_LIQUID:
						blocks = grid.imageBlocksForegroundLiquid;
						break;
					case VideoBusInputCmdGameModeEditApplyType.IMAGE_BLOCK_SOLID:
						blocks = grid.imageBlocksForegroundSolid;
						break;
				}
				break;
			case VideoBusInputCmdGameModeEditApplyZ.PRIMARY:
				reference = grid.imageBlocksPrimaryReference;
				switch (apply.applyType) {
					case VideoBusInputCmdGameModeEditApplyType.IMAGE_BLOCK_FOLIAGE:
						blocks = grid.imageBlocksPrimaryFoliage;
						break;
					case VideoBusInputCmdGameModeEditApplyType.IMAGE_BLOCK_LIQUID:
						blocks = grid.imageBlocksPrimaryLiquid;
						break;
					case VideoBusInputCmdGameModeEditApplyType.IMAGE_BLOCK_SOLID:
						blocks = grid.imageBlocksPrimarySolid;
						break;
				}
				break;
			case VideoBusInputCmdGameModeEditApplyZ.VANISHING:
				reference = grid.imageBlocksVanishingReference;
				switch (apply.applyType) {
					case VideoBusInputCmdGameModeEditApplyType.IMAGE_BLOCK_FOLIAGE:
						blocks = grid.imageBlocksVanishingFoliage;
						break;
					case VideoBusInputCmdGameModeEditApplyType.IMAGE_BLOCK_LIQUID:
						blocks = grid.imageBlocksVanishingLiquid;
						break;
					case VideoBusInputCmdGameModeEditApplyType.IMAGE_BLOCK_SOLID:
						blocks = grid.imageBlocksVanishingSolid;
						break;
				}
				break;
		}

		// Select object
		if (reference.hashes === undefined) {
			reference.hashes = <any>new Object();
		}
		referenceHashes = reference.hashes;

		// Clean
		delete properties.applyType;
		delete properties.gHashes;
		delete properties.z;

		// Apply
		for (let i = 0; i < gHashes.length; i++) {
			gHash = gHashes[i];
			gCoordinate = UtilEngine.gridHashFrom(gHash, gHashPrecision);

			// Overwrite, delete all blocks associated with
			if (properties.gSizeH === 1 && properties.gSizeW === 1) {
				if (referenceHashes[gHash]) {
					MapEditEngine.applyErase(<any>{
						gHashes: [gHash],
						type: apply.applyType,
						z: z,
					});
				}
			} else {
				gHashesOverwritten = new Array();

				for (x = 0; x < properties.gSizeW; x++) {
					for (y = 0; y < properties.gSizeH; y++) {
						gHashEff = UtilEngine.gridHashTo(gCoordinate.gx + x, gCoordinate.gy + y, gHashPrecision);

						if (referenceHashes[gHashEff]) {
							gHashesOverwritten.push(gHashEff);
						}
					}
				}

				if (gHashesOverwritten.length) {
					MapEditEngine.applyErase(<any>{
						gHashes: gHashesOverwritten,
						type: apply.applyType,
						z: z,
					});
				}
			}

			// Origin block
			properties.hash = gHash;
			properties.gx = gCoordinate.gx;
			properties.gy = gCoordinate.gy;

			blocks[gHash] = JSON.parse(JSON.stringify(properties));

			objectType = properties.objectType;
			referenceHashes[gHash] = <any>{
				block: blocks[gHash],
				blocks: blocks,
				hash: gHash,
				objectType: objectType,
			};

			// Extended blocks
			for (x = 0; x < properties.gSizeW; x++) {
				for (y = 0; y < properties.gSizeH; y++) {
					if (x === 0 && y === 0) {
						// origin block
						continue;
					}
					gHashEff = UtilEngine.gridHashTo(gCoordinate.gx + x, gCoordinate.gy + y, gHashPrecision);
					blocks[gHashEff] = <any>{
						extends: gHash,
						gx: gCoordinate.gx + x,
						gy: gCoordinate.gy + y,
						objectType: objectType,
					};
					reference.hashes[gHashEff] = <any>{
						block: blocks[gHashEff],
						blocks: blocks,
						hash: gHashEff,
						objectType: objectType,
					};
				}
			}
		}

		MapEditEngine.gridBlockTableInflateInstance(reference, gHashPrecision);

		if (!MapEditEngine.modeUI) {
			let assetId: string = (<any>apply).assetId,
				assetIdDamaged: string = (<any>apply).assetIdDamaged,
				assetUpdate: { [key: string]: LightingCacheInstance } = {};

			LightingEngine.cacheAdd(assetId);
			assetUpdate[assetId] = LightingEngine.getCacheInstance(assetId);

			if (assetIdDamaged) {
				LightingEngine.cacheAdd(assetIdDamaged);
				assetUpdate[assetIdDamaged] = LightingEngine.getCacheInstance(assetIdDamaged);
			}

			MapDrawEngineBus.outputAssets(assetUpdate);
			KernelEngine.updateMap();
		}
	}

	public static gridBlockTableDeflate(map: MapActive): MapActive {
		Object.values(map.grids).forEach((grid: Grid) => {
			MapEditEngine.gridBlockTableDeflateInstance(grid.audioBlocks);
			MapEditEngine.gridBlockTableDeflateInstance(grid.audioTagTriggers);

			delete (<any>grid).imageBlocksBackgroundReference;
			delete (<any>grid).imageBlocksForegroundReference;
			delete (<any>grid).imageBlocksPrimaryReference;
			delete (<any>grid).imageBlocksVanishingReference;

			MapEditEngine.gridBlockTableDeflateInstance(grid.lights);
		});
		return map;
	}

	private static gridBlockTableDeflateInstance(gridBlockTable: GridBlockTable<any>): void {
		delete gridBlockTable.gx;
		delete gridBlockTable.hashesGyByGx;
	}

	public static gridBlockTableInflate(map: MapActive): MapActive {
		let gHashPrecision: number, reference: { [key: number]: GridImageBlockReference };

		// Clean
		for (let i in map.grids) {
			map.grids[i] = new Grid(map.grids[i]);
		}

		// Prepare
		map.gridActive = map.grids[map.gridActiveId];
		map.gridConfigActive = map.gridConfigs[map.gridActiveId];

		Object.values(map.grids).forEach((grid: Grid) => {
			gHashPrecision = map.gridConfigs[grid.id].gHashPrecision;

			// LightingCalcWorkerEngine filters these out
			grid.audioBlocks && MapEditEngine.gridBlockTableInflateInstance(grid.audioBlocks, gHashPrecision);
			grid.audioTagTriggers && MapEditEngine.gridBlockTableInflateInstance(grid.audioTagTriggers, gHashPrecision);

			reference = <any>new Object();
			MapEditEngine.gridBlockTableInflateReference(grid.imageBlocksBackgroundFoliage, reference);
			MapEditEngine.gridBlockTableInflateReference(grid.imageBlocksBackgroundLiquid, reference);
			MapEditEngine.gridBlockTableInflateReference(grid.imageBlocksBackgroundSolid, reference);
			grid.imageBlocksBackgroundReference = {
				hashes: reference,
			};
			MapEditEngine.gridBlockTableInflateInstance(grid.imageBlocksBackgroundReference, gHashPrecision);

			reference = <any>new Object();
			MapEditEngine.gridBlockTableInflateReference(grid.imageBlocksForegroundFoliage, reference);
			MapEditEngine.gridBlockTableInflateReference(grid.imageBlocksForegroundLiquid, reference);
			MapEditEngine.gridBlockTableInflateReference(grid.imageBlocksForegroundSolid, reference);
			grid.imageBlocksForegroundReference = {
				hashes: reference,
			};
			MapEditEngine.gridBlockTableInflateInstance(grid.imageBlocksForegroundReference, gHashPrecision);

			reference = <any>new Object();
			MapEditEngine.gridBlockTableInflateReference(grid.imageBlocksPrimaryFoliage, reference);
			MapEditEngine.gridBlockTableInflateReference(grid.imageBlocksPrimaryLiquid, reference);
			MapEditEngine.gridBlockTableInflateReference(grid.imageBlocksPrimarySolid, reference);
			grid.imageBlocksPrimaryReference = {
				hashes: reference,
			};
			MapEditEngine.gridBlockTableInflateInstance(grid.imageBlocksPrimaryReference, gHashPrecision);

			reference = <any>new Object();
			MapEditEngine.gridBlockTableInflateReference(grid.imageBlocksVanishingFoliage, reference);
			MapEditEngine.gridBlockTableInflateReference(grid.imageBlocksVanishingLiquid, reference);
			MapEditEngine.gridBlockTableInflateReference(grid.imageBlocksVanishingSolid, reference);
			grid.imageBlocksVanishingReference = {
				hashes: reference,
			};
			MapEditEngine.gridBlockTableInflateInstance(grid.imageBlocksVanishingReference, gHashPrecision);

			MapEditEngine.gridBlockTableInflateInstance(grid.lights, gHashPrecision);
		});
		return map;
	}

	public static gridBlockTableInflateInstance(gridBlockTable: GridBlockTable<any>, gHashPrecision: number): void {
		let gCoordinate: GridCoordinate,
			gx: number[],
			hash: number,
			hashes: string[] = Object.keys(gridBlockTable.hashes || {}),
			hashesGyByGx: { [key: number]: GridBlockTableComplex[] } = {};

		for (let i in hashes) {
			hash = Number(hashes[i]);
			gCoordinate = UtilEngine.gridHashFrom(Number(hash), gHashPrecision);

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
			hashesGyByGx[gx[i]] = hashesGyByGx[gx[i]].sort((a: GridBlockTableComplex, b: GridBlockTableComplex) => a.value - b.value);
		}

		gridBlockTable.gx = gx;
		gridBlockTable.hashesGyByGx = hashesGyByGx;
	}

	private static gridBlockTableInflateReference(
		blocks: { [key: number]: GridImageBlock },
		reference: { [key: number]: GridImageBlockReference },
	): void {
		for (let i in blocks) {
			reference[i] = <any>{
				block: blocks[i],
				blocks: blocks,
				hash: Number(i),
				type: blocks[i].objectType,
			};
		}
	}

	private static applyLight(apply: VideoBusInputCmdGameModeEditApplyLight): void {
		console.warn('MapEditEngine > applyLight: not yet implemented');
	}

	private static historyAdd(): void {
		let mapActiveClone: MapActive = MapEditEngine.getMapActiveCloneNormalized();
		MapEditEngine.mapHistoryUndo.pushEnd(mapActiveClone);

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

		// Rebuild references
		for (let i in mapActive.grids) {
			mapActive.grids[i] = JSON.parse(<any>mapActive.grids[i]);
		}
		mapActive = MapEditEngine.gridBlockTableInflate(mapActive);

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

		// Rebuild references
		for (let i in mapActive.grids) {
			mapActive.grids[i] = JSON.parse(<any>mapActive.grids[i]);
		}
		mapActive = MapEditEngine.gridBlockTableInflate(mapActive);

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
		MapEditEngine.gridBlockTableInflate(mapActive);

		// Apply
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
		eraseType?: VideoBusInputCmdGameModeEditApplyType,
	): VideoBusInputCmdGameModeEditApply | undefined {
		let apply: VideoBusInputCmdGameModeEditApply;

		MapEditEngine.uiChanged = true;

		switch (type) {
			case VideoBusInputCmdGameModeEditApplyType.AUDIO_BLOCK:
				apply = MapEditEngine.uiApplyAudioBlock(gHashes, properties, z);
				break;
			case VideoBusInputCmdGameModeEditApplyType.AUDIO_TRIGGER:
				apply = MapEditEngine.uiApplyAudioTriggerEffect(gHashes, properties, z);
				break;
			case VideoBusInputCmdGameModeEditApplyType.ERASE:
				apply = <VideoBusInputCmdGameModeEditApplyErase>{
					gHashes: gHashes,
					type: eraseType,
					z: z,
				};
				break;
			case VideoBusInputCmdGameModeEditApplyType.IMAGE_BLOCK_FOLIAGE:
				apply = MapEditEngine.uiApplyImageBlockFoliage(gHashes, properties, z);
				break;
			case VideoBusInputCmdGameModeEditApplyType.IMAGE_BLOCK_LIQUID:
				apply = MapEditEngine.uiApplyImageBlockLiquid(gHashes, properties, z);
				break;
			case VideoBusInputCmdGameModeEditApplyType.IMAGE_BLOCK_SOLID:
				apply = MapEditEngine.uiApplyImageBlockSolid(gHashes, properties, z);
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
	): VideoBusInputCmdGameModeEditApplyAudioTrigger {
		return <any>{};
	}

	private static uiApplyImageBlockFoliage(
		gHashes: number[],
		properties: VideoBusInputCmdGameModeEditApply,
		z: VideoBusInputCmdGameModeEditApplyZ,
	): VideoBusInputCmdGameModeEditApplyImageBlockFoliage {
		let data: VideoBusInputCmdGameModeEditApplyImageBlockFoliage = <VideoBusInputCmdGameModeEditApplyImageBlockFoliage>properties;

		delete data.extends; // calculated field only
		if (z === VideoBusInputCmdGameModeEditApplyZ.PRIMARY) {
			if (!data.damageable) {
				delete data.assetIdDamaged;
				delete data.damageable;
				delete data.strengthToDamangeInN;
			}

			if (!data.destructible) {
				delete data.destructible;
				delete data.strengthToDestroyInN;
			}
		} else {
			// These cannot apply to background and foreground z's
			delete data.assetIdDamaged;
			delete data.damageable;
			delete data.strengthToDamangeInN;
			delete data.destructible;
			delete data.strengthToDestroyInN;
		}

		// Set base configs outside of the properties object
		data.objectType = GridObjectType.IMAGE_BLOCK_FOLIAGE;
		data.gHashes = gHashes;
		data.z = z;

		return data;
	}

	private static uiApplyImageBlockLiquid(
		gHashes: number[],
		properties: VideoBusInputCmdGameModeEditApply,
		z: VideoBusInputCmdGameModeEditApplyZ,
	): VideoBusInputCmdGameModeEditApplyImageBlockLiquid {
		let data: VideoBusInputCmdGameModeEditApplyImageBlockLiquid = <VideoBusInputCmdGameModeEditApplyImageBlockLiquid>properties;

		if (z !== VideoBusInputCmdGameModeEditApplyZ.PRIMARY) {
			delete data.assetIdAudioEffectSwim;
			delete data.assetIdAudioEffectTread;
		}

		// Set base configs outside of the properties object
		data.gHashes = gHashes;
		data.objectType = GridObjectType.IMAGE_BLOCK_LIQUID;
		data.z = z;

		return data;
	}

	private static uiApplyImageBlockSolid(
		gHashes: number[],
		properties: VideoBusInputCmdGameModeEditApply,
		z: VideoBusInputCmdGameModeEditApplyZ,
	): VideoBusInputCmdGameModeEditApplyImageBlockSolid {
		let data: VideoBusInputCmdGameModeEditApplyImageBlockSolid = <VideoBusInputCmdGameModeEditApplyImageBlockSolid>properties;

		delete data.extends; // calculated field only
		if (z === VideoBusInputCmdGameModeEditApplyZ.PRIMARY) {
			// Clean
			if (!data.damageable) {
				delete data.assetIdDamaged;
				delete data.assetIdAudioEffectWalkedOnDamaged;
				delete data.damageable;
				delete data.strengthToDamangeInN;
			}

			if (!data.destructible) {
				delete data.destructible;
				delete data.strengthToDestroyInN;
			}
		} else {
			// These cannot apply to background and foreground z's
			delete data.assetIdDamaged;
			delete data.assetIdAudioEffectWalkedOn;
			delete data.assetIdAudioEffectWalkedOnDamaged;
			delete data.damageable;
			delete data.destructible;
			delete data.strengthToDamangeInN;
			delete data.strengthToDestroyInN;
		}

		// Set base configs outside of the properties object
		data.gHashes = gHashes;
		data.objectType = GridObjectType.IMAGE_BLOCK_SOLID;
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
	public static uiRelXYToGBlockHash(action: MouseAction | TouchAction): number {
		let camera: Camera = MapEditEngine.mapActiveUI.camera,
			gHashPrecision: number = MapEditEngine.mapActiveUI.gridConfigActive.gHashPrecision,
			position: any;

		if ((<TouchAction>action).positions) {
			position = (<TouchAction>action).positions[0];
		} else {
			position = (<MouseAction>action).position;
		}

		return UtilEngine.gridHashTo(
			Math.floor(
				(camera.viewportPx + camera.viewportPw * position.xRel) / camera.gInPw / window.devicePixelRatio + camera.viewportGx,
			),
			Math.floor(
				(camera.viewportPy + camera.viewportPh * position.yRel) / camera.gInPh / window.devicePixelRatio + camera.viewportGy,
			),
			gHashPrecision,
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

	public static getMapActiveCloneNormalized(): MapActive {
		let grid: Grid, mapActiveClone: MapActive;

		if (MapEditEngine.modeUI) {
			mapActiveClone = JSON.parse(JSON.stringify(MapEditEngine.mapActiveUI));
		} else {
			mapActiveClone = JSON.parse(JSON.stringify(KernelEngine.getMapActive()));
		}

		delete (<any>mapActiveClone).gridActive;
		delete (<any>mapActiveClone).gridConfigActive;

		return mapActiveClone;
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
		let reference: GridBlockTable<GridImageBlockReference>, mapActive: MapActive;

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
					reference = mapActive.gridActive.imageBlocksBackgroundReference;
				} else if (z === VideoBusInputCmdGameModeEditApplyZ.FOREGROUND) {
					reference = mapActive.gridActive.imageBlocksForegroundReference;
				} else if (z === VideoBusInputCmdGameModeEditApplyZ.PRIMARY) {
					reference = mapActive.gridActive.imageBlocksPrimaryReference;
				} else {
					reference = mapActive.gridActive.imageBlocksVanishingReference;
				}

				console.log('mapActive.gridActive.imageBlocksBackgroundReference', mapActive.gridActive.imageBlocksBackgroundReference);

				if (reference.hashes[gHash]) {
					if (reference.hashes[gHash].block.extends) {
						return [reference.hashes[reference.hashes[gHash].block.extends].block];
					} else {
						return [reference.hashes[gHash].block];
					}
				} else {
					return [];
				}
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
