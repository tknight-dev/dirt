import { DoubleLinkedList } from '../models/double-linked-list.model';
import { Camera } from '../models/camera.model';
import {
	Grid,
	GridAnimation,
	GridAudioBlock,
	GridAudioTag,
	GridAudioTagType,
	GridBlockPipelineAsset,
	GridBlockTable,
	GridBlockTableComplex,
	GridConfig,
	GridCoordinate,
	GridImageBlock,
	GridImageBlockReference,
	GridLight,
	GridImageBlockHalved,
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
	VideoBusInputCmdGameModeEditApplyAudioTag,
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
	public static readonly gHeightMax: number = 135; // 0xff (8bits)
	public static readonly gWidthMax: number = 240; // 0xff (8bits)
	private static initialized: boolean;
	private static mapActiveUI: MapActive;
	private static mapHistoryLength: number = 20;
	private static mapHistoryRedo: DoubleLinkedList<MapActive> = new DoubleLinkedList<MapActive>();
	private static mapHistoryUndo: DoubleLinkedList<MapActive> = new DoubleLinkedList<MapActive>();
	private static modeUI: boolean; // indicates thread context
	public static uiChanged: boolean;
	public static uiLoaded: boolean;

	public static apply(apply: VideoBusInputCmdGameModeEditApply): void {
		switch (apply.applyType) {
			case VideoBusInputCmdGameModeEditApplyType.AUDIO_BLOCK:
				MapEditEngine.applyAudioBlock(<VideoBusInputCmdGameModeEditApplyAudioBlock>apply);
				break;
			case VideoBusInputCmdGameModeEditApplyType.AUDIO_TAG:
				MapEditEngine.applyAudioTag(<VideoBusInputCmdGameModeEditApplyAudioTag>apply);
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
		let blocks: { [key: number]: GridAudioBlock } = {},
			gCoordinate: GridCoordinate,
			gHash: number,
			gHashes: number[] = apply.gHashes,
			grid: Grid,
			mapActive: MapActive,
			properties: any = JSON.parse(JSON.stringify(apply));

		if (!MapEditEngine.modeUI) {
			mapActive = KernelEngine.getMapActive();
		} else {
			mapActive = MapEditEngine.mapActiveUI;
		}
		grid = mapActive.gridActive;
		blocks = grid.audioInteractiveBlocks.hashes;

		// Clean
		delete properties.applyType;
		delete properties.gHashes;
		delete properties.z;

		properties.objectType = GridObjectType.AUDIO_TAG;

		// Apply
		for (let i = 0; i < gHashes.length; i++) {
			gHash = gHashes[i];
			gCoordinate = UtilEngine.gridHashFrom(gHash);

			// Origin block
			properties.hash = gHash;
			properties.gx = gCoordinate.gx;
			properties.gy = gCoordinate.gy;

			blocks[gHash] = JSON.parse(JSON.stringify(properties));
		}

		MapEditEngine.gridBlockTableInflateInstance(grid.audioInteractiveBlocks);
		MapEditEngine.gridBlockTableInflatePipelines(grid);
	}

	private static applyAudioTag(apply: VideoBusInputCmdGameModeEditApplyAudioTag): void {
		let blocks: { [key: number]: GridAudioTag } = {},
			gCoordinate: GridCoordinate,
			gHash: number,
			gHashes: number[] = apply.gHashes,
			grid: Grid,
			mapActive: MapActive,
			properties: any = JSON.parse(JSON.stringify(apply));

		if (!MapEditEngine.modeUI) {
			mapActive = KernelEngine.getMapActive();
		} else {
			mapActive = MapEditEngine.mapActiveUI;
		}
		grid = mapActive.gridActive;
		blocks = grid.audioInteractiveTags.hashes;

		// Clean
		delete properties.applyType;
		delete properties.gHashes;
		delete properties.z;

		properties.objectType = GridObjectType.AUDIO_TAG;

		// Apply
		for (let i = 0; i < gHashes.length; i++) {
			gHash = gHashes[i];
			gCoordinate = UtilEngine.gridHashFrom(gHash);

			// Origin block
			properties.hash = gHash;
			properties.gx = gCoordinate.gx;
			properties.gy = gCoordinate.gy;

			blocks[gHash] = JSON.parse(JSON.stringify(properties));
		}

		MapEditEngine.gridBlockTableInflateInstance(grid.audioInteractiveTags);
		MapEditEngine.gridBlockTableInflatePipelines(grid);
	}

	private static applyErase(apply: VideoBusInputCmdGameModeEditApplyErase, quick?: boolean): void {
		let blocks: GridBlockTable<GridObject> = <any>{},
			blockHashes: { [key: number]: GridObject } = {},
			gCoordinate: GridCoordinate,
			gHash: number,
			gHashes: number[] = apply.gHashes,
			grid: Grid,
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

		switch (apply.type) {
			case VideoBusInputCmdGameModeEditApplyType.AUDIO_BLOCK:
				blocks = grid.audioInteractiveBlocks;
				blockHashes = blocks.hashes;
				break;
			case VideoBusInputCmdGameModeEditApplyType.AUDIO_TAG:
				blocks = grid.audioInteractiveTags;
				blockHashes = blocks.hashes;
				break;
			case VideoBusInputCmdGameModeEditApplyType.IMAGE_BLOCK_FOLIAGE:
			case VideoBusInputCmdGameModeEditApplyType.IMAGE_BLOCK_LIQUID:
			case VideoBusInputCmdGameModeEditApplyType.IMAGE_BLOCK_SOLID:
				referenceMode = true;
				switch (apply.z) {
					case VideoBusInputCmdGameModeEditApplyZ.BACKGROUND1:
						reference = grid.imageBlocksBackground1Reference;
						break;
					case VideoBusInputCmdGameModeEditApplyZ.BACKGROUND2:
						reference = grid.imageBlocksBackground2Reference;
						break;
					case VideoBusInputCmdGameModeEditApplyZ.FOREGROUND1:
						reference = grid.imageBlocksForeground1Reference;
						break;
					case VideoBusInputCmdGameModeEditApplyZ.FOREGROUND2:
						reference = grid.imageBlocksForeground2Reference;
						break;
					case VideoBusInputCmdGameModeEditApplyZ.INTERACTIVE:
						reference = grid.imageBlocksInteractiveReference;
						break;
					case VideoBusInputCmdGameModeEditApplyZ.MIDDLEGROUND:
						reference = grid.imageBlocksMiddlegroundReference;
						break;
					case VideoBusInputCmdGameModeEditApplyZ.VANISHING:
						reference = grid.imageBlocksVanishingReference;
						break;
				}
				referenceHashes = reference.hashes;
				break;
			case VideoBusInputCmdGameModeEditApplyType.LIGHT:
				switch (apply.z) {
					case VideoBusInputCmdGameModeEditApplyZ.FOREGROUND1:
						blocks = grid.lightsForeground1;
						break;
					case VideoBusInputCmdGameModeEditApplyZ.INTERACTIVE:
						blocks = grid.lightsInteractive;
						break;
				}
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

				gCoordinate = UtilEngine.gridHashFrom(gridObject.hash);

				// Delete blocks
				for (x = 0; x < gridObject.gSizeW; x++) {
					for (y = 0; y < gridObject.gSizeH; y++) {
						gHash = UtilEngine.gridHashTo(gCoordinate.gx + x, gCoordinate.gy + y);

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

		if (!quick) {
			if (referenceMode) {
				MapEditEngine.gridBlockTableInflateInstance(reference);
			} else {
				MapEditEngine.gridBlockTableInflateInstance(blocks);
			}
			MapEditEngine.gridBlockTableInflatePipelines(grid);

			if (!MapEditEngine.modeUI) {
				KernelEngine.updateMap();
			}
		}
	}

	private static applyImageBlock(apply: VideoBusInputCmdGameModeEditApplyImageBlock): void {
		let blocks: { [key: number]: GridImageBlock } = {},
			erase: number[] = [],
			gCoordinate: GridCoordinate,
			gHash: number,
			gHashEff: number,
			gHashes: number[] = apply.gHashes,
			grid: Grid,
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

		switch (apply.z) {
			case VideoBusInputCmdGameModeEditApplyZ.BACKGROUND1:
				reference = grid.imageBlocksBackground1Reference;
				switch (apply.applyType) {
					case VideoBusInputCmdGameModeEditApplyType.IMAGE_BLOCK_FOLIAGE:
						blocks = grid.imageBlocksBackground1Foliage;
						break;
					case VideoBusInputCmdGameModeEditApplyType.IMAGE_BLOCK_LIQUID:
						blocks = grid.imageBlocksBackground1Liquid;
						break;
					case VideoBusInputCmdGameModeEditApplyType.IMAGE_BLOCK_SOLID:
						blocks = grid.imageBlocksBackground1Solid;
						break;
				}
				break;
			case VideoBusInputCmdGameModeEditApplyZ.BACKGROUND2:
				reference = grid.imageBlocksBackground2Reference;
				switch (apply.applyType) {
					case VideoBusInputCmdGameModeEditApplyType.IMAGE_BLOCK_FOLIAGE:
						blocks = grid.imageBlocksBackground2Foliage;
						break;
					case VideoBusInputCmdGameModeEditApplyType.IMAGE_BLOCK_LIQUID:
						blocks = grid.imageBlocksBackground2Liquid;
						break;
					case VideoBusInputCmdGameModeEditApplyType.IMAGE_BLOCK_SOLID:
						blocks = grid.imageBlocksBackground2Solid;
						break;
				}
				break;
			case VideoBusInputCmdGameModeEditApplyZ.FOREGROUND1:
				reference = grid.imageBlocksForeground1Reference;
				switch (apply.applyType) {
					case VideoBusInputCmdGameModeEditApplyType.IMAGE_BLOCK_FOLIAGE:
						blocks = grid.imageBlocksForeground1Foliage;
						break;
					case VideoBusInputCmdGameModeEditApplyType.IMAGE_BLOCK_LIQUID:
						blocks = grid.imageBlocksForeground1Liquid;
						break;
					case VideoBusInputCmdGameModeEditApplyType.IMAGE_BLOCK_SOLID:
						blocks = grid.imageBlocksForeground1Solid;
						break;
				}
				break;
			case VideoBusInputCmdGameModeEditApplyZ.FOREGROUND2:
				reference = grid.imageBlocksForeground2Reference;
				switch (apply.applyType) {
					case VideoBusInputCmdGameModeEditApplyType.IMAGE_BLOCK_FOLIAGE:
						blocks = grid.imageBlocksForeground2Foliage;
						break;
					case VideoBusInputCmdGameModeEditApplyType.IMAGE_BLOCK_LIQUID:
						blocks = grid.imageBlocksForeground2Liquid;
						break;
					case VideoBusInputCmdGameModeEditApplyType.IMAGE_BLOCK_SOLID:
						blocks = grid.imageBlocksForeground2Solid;
						break;
				}
				break;
			case VideoBusInputCmdGameModeEditApplyZ.INTERACTIVE:
				reference = grid.imageBlocksInteractiveReference;
				switch (apply.applyType) {
					case VideoBusInputCmdGameModeEditApplyType.IMAGE_BLOCK_FOLIAGE:
						blocks = grid.imageBlocksInteractiveFoliage;
						break;
					case VideoBusInputCmdGameModeEditApplyType.IMAGE_BLOCK_LIQUID:
						blocks = grid.imageBlocksInteractiveLiquid;
						break;
					case VideoBusInputCmdGameModeEditApplyType.IMAGE_BLOCK_SOLID:
						blocks = grid.imageBlocksInteractiveSolid;
						break;
				}
				break;
			case VideoBusInputCmdGameModeEditApplyZ.MIDDLEGROUND:
				reference = grid.imageBlocksMiddlegroundReference;
				switch (apply.applyType) {
					case VideoBusInputCmdGameModeEditApplyType.IMAGE_BLOCK_FOLIAGE:
						blocks = grid.imageBlocksMiddlegroundFoliage;
						break;
					case VideoBusInputCmdGameModeEditApplyType.IMAGE_BLOCK_LIQUID:
						blocks = grid.imageBlocksMiddlegroundLiquid;
						break;
					case VideoBusInputCmdGameModeEditApplyType.IMAGE_BLOCK_SOLID:
						blocks = grid.imageBlocksMiddlegroundSolid;
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

		// Erase
		for (let i = 0; i < gHashes.length; i++) {
			gHash = gHashes[i];

			// Overwrite, delete all blocks associated with
			if (properties.gSizeH === 1 && properties.gSizeW === 1) {
				if (referenceHashes[gHash]) {
					erase.push(gHash);
				}
			} else {
				gCoordinate = UtilEngine.gridHashFrom(gHash);
				for (x = 0; x < properties.gSizeW; x++) {
					for (y = 0; y < properties.gSizeH; y++) {
						gHashEff = UtilEngine.gridHashTo(gCoordinate.gx + x, gCoordinate.gy + y);

						if (referenceHashes[gHashEff]) {
							erase.push(gHash);
						}
					}
				}
			}
		}
		if (erase.length) {
			MapEditEngine.applyErase(
				<any>{
					gHashes: erase,
					type: apply.applyType,
					z: z,
				},
				true,
			);
		}

		// Clean
		delete properties.applyType;
		delete properties.gHashes;
		delete properties.z;

		// Apply
		for (let i = 0; i < gHashes.length; i++) {
			gHash = gHashes[i];
			gCoordinate = UtilEngine.gridHashFrom(gHash);

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
					gHashEff = UtilEngine.gridHashTo(gCoordinate.gx + x, gCoordinate.gy + y);
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

		MapEditEngine.gridBlockTableInflateInstance(reference);
		MapEditEngine.gridBlockTableInflatePipelines(grid);

		if (!MapEditEngine.modeUI) {
			let assetAnimation: GridAnimation = (<any>apply).assetAnimation,
				assetId: string = (<any>apply).assetId,
				assetIdDamaged: string = (<any>apply).assetIdDamaged,
				assetUpdate: { [key: string]: LightingCacheInstance } = {};

			if (assetAnimation) {
				for (let i in assetAnimation.assetIds) {
					assetId = assetAnimation.assetIds[i];

					if (assetUpdate[assetId] === undefined) {
						assetUpdate[assetId] = LightingEngine.getCacheInstance(assetId);
					}
				}
			} else {
				assetUpdate[assetId] = LightingEngine.getCacheInstance(assetId);
			}

			if (assetIdDamaged) {
				assetUpdate[assetIdDamaged] = LightingEngine.getCacheInstance(assetIdDamaged);
			}

			LightingEngine.cacheAdd(Object.keys(assetUpdate));

			MapDrawEngineBus.outputAssets(assetUpdate);
			KernelEngine.updateMap();
		}
	}

	private static applyLight(apply: VideoBusInputCmdGameModeEditApplyLight): void {
		let blockHashes: { [key: number]: GridLight },
			blocks: GridBlockTable<GridLight>,
			erase: number[] = [],
			gCoordinate: GridCoordinate,
			gHash: number,
			gHashEff: number,
			gHashes: number[] = apply.gHashes,
			mapActive: MapActive,
			objectType: GridObjectType,
			properties: any = JSON.parse(JSON.stringify(apply)),
			x: number,
			y: number,
			z: VideoBusInputCmdGameModeEditApplyZ = apply.z;

		if (!MapEditEngine.modeUI) {
			mapActive = KernelEngine.getMapActive();
		} else {
			mapActive = MapEditEngine.mapActiveUI;
		}

		if (z === VideoBusInputCmdGameModeEditApplyZ.INTERACTIVE) {
			blocks = mapActive.gridActive.lightsInteractive;
		} else {
			blocks = mapActive.gridActive.lightsForeground1;
		}
		blockHashes = blocks.hashes;

		// Erase
		for (let i = 0; i < gHashes.length; i++) {
			gHash = gHashes[i];

			if (blockHashes[gHash]) {
				erase.push(gHash);
			}
		}
		if (erase.length) {
			MapEditEngine.applyErase(
				<any>{
					gHashes: erase,
					type: apply.applyType,
					z: z,
				},
				true,
			);
		}

		// Clean
		delete properties.applyType;
		delete properties.gHashes;
		delete properties.z;

		// Apply
		for (let i = 0; i < gHashes.length; i++) {
			gHash = gHashes[i];
			gCoordinate = UtilEngine.gridHashFrom(gHash);

			// Origin block
			properties.hash = gHash;
			properties.gx = gCoordinate.gx;
			properties.gy = gCoordinate.gy;

			blockHashes[gHash] = properties;
			objectType = properties.objectType;

			// Extended blocks
			for (x = 0; x < properties.gSizeW; x++) {
				for (y = 0; y < properties.gSizeH; y++) {
					if (x === 0 && y === 0) {
						// origin block
						continue;
					}
					gHashEff = UtilEngine.gridHashTo(gCoordinate.gx + x, gCoordinate.gy + y);
					blockHashes[gHashEff] = <any>{
						extends: gHash,
						gx: gCoordinate.gx + x,
						gy: gCoordinate.gy + y,
						objectType: objectType,
					};
				}
			}
		}

		MapEditEngine.gridBlockTableInflateInstance(blocks);
		MapEditEngine.gridBlockTableInflatePipelines(mapActive.gridActive);

		if (!MapEditEngine.modeUI) {
			let assetAnimation: GridAnimation = (<any>apply).assetAnimation,
				assetId: string = (<any>apply).assetId,
				assetIdDamaged: string = (<any>apply).assetIdDamaged,
				assetUpdate: { [key: string]: LightingCacheInstance } = {};

			if (assetAnimation) {
				for (let i in assetAnimation.assetIds) {
					assetId = assetAnimation.assetIds[i];

					if (assetUpdate[assetId] === undefined) {
						assetUpdate[assetId] = LightingEngine.getCacheInstance(assetId);
					}
				}
			} else {
				assetUpdate[assetId] = LightingEngine.getCacheInstance(assetId);
			}

			if (assetIdDamaged) {
				assetUpdate[assetIdDamaged] = LightingEngine.getCacheInstance(assetIdDamaged);
			}

			LightingEngine.cacheAdd(Object.keys(assetUpdate));

			MapDrawEngineBus.outputAssets(assetUpdate);
			KernelEngine.updateMap();
		}
	}

	public static gridBlockTableDeflate(map: MapActive): MapActive {
		Object.values(map.grids).forEach((grid: Grid) => {
			MapEditEngine.gridBlockTableDeflateInstance(grid.audioInteractiveBlocks || {});
			MapEditEngine.gridBlockTableDeflateInstance(grid.audioInteractiveTags || {});

			delete (<any>grid).imageBlocksCalcPipelineAnimations;
			delete (<any>grid).imageBlocksRenderPipelineAssetsByGyByGx;
			delete (<any>grid).imageBlocksRenderPipelineGy;

			delete (<any>grid).imageBlocksBackground1Reference;
			delete (<any>grid).imageBlocksBackground2Reference;
			delete (<any>grid).imageBlocksForeground1Reference;
			delete (<any>grid).imageBlocksForeground2Reference;
			delete (<any>grid).imageBlocksInteractiveReference;
			delete (<any>grid).imageBlocksMiddlegroundReference;
			delete (<any>grid).imageBlocksVanishingReference;

			MapEditEngine.gridBlockTableDeflateInstance(grid.lightsForeground1 || {});
			MapEditEngine.gridBlockTableDeflateInstance(grid.lightsInteractive || {});
		});
		return map;
	}

	private static gridBlockTableDeflateInstance(gridBlockTable: GridBlockTable<any>): void {
		delete gridBlockTable.gx;
		delete gridBlockTable.hashesGyByGx;
	}

	public static gridBlockTableInflate(map: MapActive): MapActive {
		let reference: { [key: number]: GridImageBlockReference };

		// Prepare
		map.gridActive = map.grids[map.gridActiveId];
		map.gridConfigActive = map.gridConfigs[map.gridActiveId];

		Object.values(map.grids).forEach((grid: Grid) => {
			// Default values
			grid.audioInteractiveBlocks = grid.audioInteractiveBlocks || {};
			grid.audioInteractiveTags = grid.audioInteractiveTags || {};
			grid.imageBlocksBackground1Foliage = grid.imageBlocksBackground1Foliage || {};
			grid.imageBlocksBackground1Liquid = grid.imageBlocksBackground1Liquid || {};
			grid.imageBlocksBackground1Solid = grid.imageBlocksBackground1Solid || {};
			grid.imageBlocksBackground2Foliage = grid.imageBlocksBackground2Foliage || {};
			grid.imageBlocksBackground2Liquid = grid.imageBlocksBackground2Liquid || {};
			grid.imageBlocksBackground2Solid = grid.imageBlocksBackground2Solid || {};
			grid.imageBlocksForeground1Foliage = grid.imageBlocksForeground1Foliage || {};
			grid.imageBlocksForeground1Liquid = grid.imageBlocksForeground1Liquid || {};
			grid.imageBlocksForeground1Solid = grid.imageBlocksForeground1Solid || {};
			grid.imageBlocksForeground2Foliage = grid.imageBlocksForeground2Foliage || {};
			grid.imageBlocksForeground2Liquid = grid.imageBlocksForeground2Liquid || {};
			grid.imageBlocksForeground2Solid = grid.imageBlocksForeground2Solid || {};
			grid.imageBlocksInteractiveFoliage = grid.imageBlocksInteractiveFoliage || {};
			grid.imageBlocksInteractiveLiquid = grid.imageBlocksInteractiveLiquid || {};
			grid.imageBlocksInteractiveSolid = grid.imageBlocksInteractiveSolid || {};
			grid.imageBlocksMiddlegroundFoliage = grid.imageBlocksMiddlegroundFoliage || {};
			grid.imageBlocksMiddlegroundLiquid = grid.imageBlocksMiddlegroundLiquid || {};
			grid.imageBlocksMiddlegroundSolid = grid.imageBlocksMiddlegroundSolid || {};
			grid.imageBlocksVanishingFoliage = grid.imageBlocksVanishingFoliage || {};
			grid.imageBlocksVanishingLiquid = grid.imageBlocksVanishingLiquid || {};
			grid.imageBlocksVanishingSolid = grid.imageBlocksVanishingSolid || {};
			grid.lightsForeground1 = grid.lightsForeground1 || {};
			grid.lightsInteractive = grid.lightsInteractive || {};

			// Parse
			MapEditEngine.gridBlockTableInflateInstance(grid.audioInteractiveBlocks);
			MapEditEngine.gridBlockTableInflateInstance(grid.audioInteractiveTags);

			reference = <any>new Object();
			MapEditEngine.gridBlockTableInflateReference(grid.imageBlocksBackground1Foliage, reference);
			MapEditEngine.gridBlockTableInflateReference(grid.imageBlocksBackground1Liquid, reference);
			MapEditEngine.gridBlockTableInflateReference(grid.imageBlocksBackground1Solid, reference);
			grid.imageBlocksBackground1Reference = {
				hashes: reference,
			};
			MapEditEngine.gridBlockTableInflateInstance(grid.imageBlocksBackground1Reference);

			reference = <any>new Object();
			MapEditEngine.gridBlockTableInflateReference(grid.imageBlocksBackground2Foliage, reference);
			MapEditEngine.gridBlockTableInflateReference(grid.imageBlocksBackground2Liquid, reference);
			MapEditEngine.gridBlockTableInflateReference(grid.imageBlocksBackground2Solid, reference);
			grid.imageBlocksBackground2Reference = {
				hashes: reference,
			};
			MapEditEngine.gridBlockTableInflateInstance(grid.imageBlocksBackground2Reference);

			reference = <any>new Object();
			MapEditEngine.gridBlockTableInflateReference(grid.imageBlocksForeground1Foliage, reference);
			MapEditEngine.gridBlockTableInflateReference(grid.imageBlocksForeground1Liquid, reference);
			MapEditEngine.gridBlockTableInflateReference(grid.imageBlocksForeground1Solid, reference);
			grid.imageBlocksForeground1Reference = {
				hashes: reference,
			};
			MapEditEngine.gridBlockTableInflateInstance(grid.imageBlocksForeground1Reference);

			reference = <any>new Object();
			MapEditEngine.gridBlockTableInflateReference(grid.imageBlocksForeground2Foliage, reference);
			MapEditEngine.gridBlockTableInflateReference(grid.imageBlocksForeground2Liquid, reference);
			MapEditEngine.gridBlockTableInflateReference(grid.imageBlocksForeground2Solid, reference);
			grid.imageBlocksForeground2Reference = {
				hashes: reference,
			};
			MapEditEngine.gridBlockTableInflateInstance(grid.imageBlocksForeground2Reference);

			reference = <any>new Object();
			MapEditEngine.gridBlockTableInflateReference(grid.imageBlocksInteractiveFoliage, reference);
			MapEditEngine.gridBlockTableInflateReference(grid.imageBlocksInteractiveLiquid, reference);
			MapEditEngine.gridBlockTableInflateReference(grid.imageBlocksInteractiveSolid, reference);
			grid.imageBlocksInteractiveReference = {
				hashes: reference,
			};
			MapEditEngine.gridBlockTableInflateInstance(grid.imageBlocksInteractiveReference);

			reference = <any>new Object();
			MapEditEngine.gridBlockTableInflateReference(grid.imageBlocksMiddlegroundFoliage, reference);
			MapEditEngine.gridBlockTableInflateReference(grid.imageBlocksMiddlegroundLiquid, reference);
			MapEditEngine.gridBlockTableInflateReference(grid.imageBlocksMiddlegroundSolid, reference);
			grid.imageBlocksMiddlegroundReference = {
				hashes: reference,
			};
			MapEditEngine.gridBlockTableInflateInstance(grid.imageBlocksMiddlegroundReference);

			reference = <any>new Object();
			MapEditEngine.gridBlockTableInflateReference(grid.imageBlocksVanishingFoliage, reference);
			MapEditEngine.gridBlockTableInflateReference(grid.imageBlocksVanishingLiquid, reference);
			MapEditEngine.gridBlockTableInflateReference(grid.imageBlocksVanishingSolid, reference);
			grid.imageBlocksVanishingReference = {
				hashes: reference,
			};
			MapEditEngine.gridBlockTableInflateInstance(grid.imageBlocksVanishingReference);

			MapEditEngine.gridBlockTableInflateInstance(grid.lightsForeground1);
			MapEditEngine.gridBlockTableInflateInstance(grid.lightsInteractive);

			// Last
			MapEditEngine.gridBlockTableInflatePipelines(grid);
		});
		return map;
	}

	public static gridBlockTableInflateInstance(gridBlockTable: GridBlockTable<any>): void {
		let gCoordinate: GridCoordinate,
			gx: number[],
			hash: number,
			hashes: string[],
			hashesGyByGx: { [key: number]: GridBlockTableComplex[] } = {};

		if (!gridBlockTable.hashes) {
			gridBlockTable.hashes = {};
		}
		hashes = Object.keys(gridBlockTable.hashes);

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

	private static gridBlockTableInflatePipelines(grid: Grid): void {
		if (MapEditEngine.modeUI) {
			return;
		}
		let animationsCalcPipelineAnimations: DoubleLinkedList<GridAnimation> = new DoubleLinkedList<GridAnimation>(),
			blockTable: GridBlockTable<GridObject>,
			blockTableHashes: { [key: number]: GridObject },
			blockTables: GridBlockTable<GridObject>[] = [
				grid.audioInteractiveBlocks,
				grid.audioInteractiveTags,
				grid.lightsForeground1,
				grid.lightsInteractive,
			],
			complex: GridBlockTableComplex,
			complexes: GridBlockTableComplex[],
			gridAnimation: GridAnimation,
			gridObject: GridObject,
			gridImageBlockReference: GridImageBlockReference,
			gridLight: GridLight,
			gx: number,
			gxString: string,
			gy: number,
			hashes: { [key: number]: GridImageBlockReference },
			hashesGyByGx: { [key: number]: GridBlockTableComplex[] },
			i: string,
			j: string,
			reference: GridBlockTable<GridImageBlockReference>,
			references: GridBlockTable<GridImageBlockReference>[] = [
				grid.imageBlocksBackground1Reference,
				grid.imageBlocksBackground2Reference,
				grid.imageBlocksMiddlegroundReference,
				grid.imageBlocksInteractiveReference,
				grid.imageBlocksForeground1Reference,
				grid.imageBlocksForeground2Reference,
				grid.imageBlocksVanishingReference,
			],
			referencesLength: number = references.length,
			pipelineAssetsByGy: { [key: number]: GridBlockPipelineAsset[] },
			pipelineAssetsByGyByGx: { [key: number]: { [key: number]: GridBlockPipelineAsset[] } } = {},
			pipelineGy: { [key: number]: number[] } = {},
			pipelineGyInstance: { [key: number]: null } = {},
			pipelineGyByGx: { [key: number]: { [key: number]: null } } = {},
			z: number;

		/**
		 * References
		 */
		for (i in references) {
			reference = references[i];
			hashes = reference.hashes;
			hashesGyByGx = <any>reference.hashesGyByGx;

			for (gxString in hashesGyByGx) {
				complexes = hashesGyByGx[gxString];

				if (pipelineAssetsByGyByGx[gxString] === undefined) {
					pipelineAssetsByGyByGx[gxString] = {};
					pipelineGyByGx[gxString] = {};
				}
				pipelineAssetsByGy = pipelineAssetsByGyByGx[gxString];
				pipelineGyInstance = pipelineGyByGx[gxString];

				for (j in complexes) {
					complex = complexes[j];
					gridImageBlockReference = hashes[complex.hash];
					gy = complex.value;

					if (gridImageBlockReference.block.extends) {
						continue;
					}

					pipelineGyInstance[gy] = null;
					if (pipelineAssetsByGy[gy] === undefined) {
						pipelineAssetsByGy[gy] = new Array(referencesLength);
					}
					pipelineAssetsByGy[gy][i] = {
						asset: gridImageBlockReference.block,
					};

					// Animation logic here
					if (gridImageBlockReference.block.assetAnimation) {
						gridAnimation = <GridAnimation>gridImageBlockReference.block.assetAnimation;
						gridAnimation.calc = {
							count: 0,
							durationInMs: 0,
							ended: false,
							index: gridAnimation.indexInitial || 0,
						};
						animationsCalcPipelineAnimations.pushEnd(gridAnimation);
					}

					// Extension logic here
					if (gridImageBlockReference.block.gSizeH !== 1 || gridImageBlockReference.block.gSizeW !== 1) {
						pipelineAssetsByGy[gy][i].assetLarge = true;
						gx = gridImageBlockReference.block.gx + gridImageBlockReference.block.gSizeW;
						gy = gridImageBlockReference.block.gy + gridImageBlockReference.block.gSizeH;

						if (
							pipelineAssetsByGyByGx[gx] !== undefined &&
							pipelineAssetsByGyByGx[gx][gy] !== undefined &&
							pipelineAssetsByGyByGx[gx][gy][i] !== undefined
						) {
							// Already extended
							continue;
						}

						if (pipelineAssetsByGyByGx[gx] === undefined) {
							pipelineAssetsByGyByGx[gx] = {};
							pipelineAssetsByGyByGx[gx][gy] = new Array(referencesLength);
							pipelineGyByGx[gx] = {};
						} else if (pipelineAssetsByGyByGx[gx][gy] === undefined) {
							pipelineAssetsByGyByGx[gx][gy] = new Array(referencesLength);
						}

						if (pipelineAssetsByGyByGx[gx][gy][i] === undefined) {
							pipelineAssetsByGyByGx[gx][gy][i] = {
								asset: gridImageBlockReference.block,
								extends: true,
							};
						} else {
							pipelineAssetsByGyByGx[gx][gy][i].asset = gridImageBlockReference.block;
							pipelineAssetsByGyByGx[gx][gy][i].extends = true;
						}
						pipelineGyByGx[gx][gy] = null;
					}
				}
			}
		}

		/**
		 * Blocks
		 */
		for (i in blockTables) {
			blockTable = blockTables[i];

			blockTableHashes = blockTable.hashes;
			hashesGyByGx = <any>blockTable.hashesGyByGx;

			for (gxString in hashesGyByGx) {
				complexes = hashesGyByGx[gxString];

				if (pipelineAssetsByGyByGx[gxString] === undefined) {
					pipelineAssetsByGyByGx[gxString] = {};
					pipelineGyByGx[gxString] = {};
				}
				pipelineAssetsByGy = pipelineAssetsByGyByGx[gxString];
				pipelineGyInstance = pipelineGyByGx[gxString];

				for (j in complexes) {
					complex = complexes[j];
					gridObject = blockTableHashes[complex.hash];
					gy = complex.value;

					if (gridObject.extends) {
						continue;
					}

					pipelineGyInstance[gy] = null;
					if (pipelineAssetsByGy[gy] === undefined) {
						pipelineAssetsByGy[gy] = new Array(referencesLength);
					}

					if (i === '0') {
						// 3 is interactive
						if (pipelineAssetsByGy[gy][3] === undefined) {
							pipelineAssetsByGy[gy][3] = {
								audioBlock: <GridAudioBlock>gridObject,
							};
						} else {
							pipelineAssetsByGy[gy][3].audioBlock = <GridAudioBlock>gridObject;
						}
					} else if (i === '1') {
						// 3 is interactive
						if (pipelineAssetsByGy[gy][3] === undefined) {
							pipelineAssetsByGy[gy][3] = {
								audioTag: <GridAudioTag>gridObject,
							};
						} else {
							pipelineAssetsByGy[gy][3].audioTag = <GridAudioTag>gridObject;
						}
					} else {
						gridLight = <GridLight>gridObject;

						if (i === '2') {
							// 4 is foreground1
							z = 4;
						} else {
							// 3 is interactive
							z = 3;
						}

						if (pipelineAssetsByGy[gy][z] === undefined) {
							pipelineAssetsByGy[gy][z] = {
								light: gridLight,
							};
						} else {
							pipelineAssetsByGy[gy][z].light = gridLight;
						}

						// Animation logic here
						if (gridLight.assetAnimation) {
							gridAnimation = <GridAnimation>gridLight.assetAnimation;
							gridAnimation.calc = {
								count: 0,
								durationInMs: 0,
								ended: false,
								index: gridAnimation.indexInitial || 0,
							};
							animationsCalcPipelineAnimations.pushEnd(gridAnimation);
						}

						// Extension logic here
						if (gridLight.gSizeH !== 1 || gridLight.gSizeW !== 1) {
							pipelineAssetsByGy[gy][z].lightLarge = true;
							gx = gridLight.gx + gridLight.gSizeW;
							gy = gridLight.gy + gridLight.gSizeH;

							if (
								pipelineAssetsByGyByGx[gx] !== undefined &&
								pipelineAssetsByGyByGx[gx][gy] !== undefined &&
								pipelineAssetsByGyByGx[gx][gy][z] !== undefined
							) {
								// Already extended
								continue;
							}

							if (pipelineAssetsByGyByGx[gx] === undefined) {
								pipelineAssetsByGyByGx[gx] = {};
								pipelineAssetsByGyByGx[gx][gy] = new Array(referencesLength);
								pipelineGyByGx[gx] = {};
							} else if (pipelineAssetsByGyByGx[gx][gy] === undefined) {
								pipelineAssetsByGyByGx[gx][gy] = new Array(referencesLength);
							}

							if (pipelineAssetsByGyByGx[gx][gy][z] === undefined) {
								pipelineAssetsByGyByGx[gx][gy][z] = {
									light: gridLight,
									lightExtends: true,
								};
							} else {
								pipelineAssetsByGyByGx[gx][gy][z].light = gridLight;
								pipelineAssetsByGyByGx[gx][gy][z].lightExtends = true;
							}
							pipelineGyByGx[gx][gy] = null;
						}
					}
				}
			}
		}

		/**
		 * GY Sort
		 */
		for (gxString in pipelineGyByGx) {
			pipelineGy[gxString] = Object.keys(pipelineGyByGx[gxString])
				.map((v) => Number(v))
				.sort((a: number, b: number) => a - b);
		}

		grid.imageBlocksCalcPipelineAnimations = animationsCalcPipelineAnimations;
		grid.imageBlocksRenderPipelineAssetsByGyByGx = pipelineAssetsByGyByGx;
		grid.imageBlocksRenderPipelineGy = pipelineGy;
	}

	private static historyAdd(): void {
		let mapActiveClone: MapActive = MapEditEngine.getMapActiveCloneNormalized();

		// Rebuild references (async)
		// This may not be the best option on larger maps... perhaps deep cloning?
		setTimeout(() => {
			mapActiveClone = MapEditEngine.gridBlockTableInflate(mapActiveClone);
		});

		MapEditEngine.mapHistoryUndo.pushEnd(mapActiveClone);

		MapEditEngine.mapHistoryRedo.clear();

		if (MapEditEngine.mapHistoryUndo.length > MapEditEngine.mapHistoryLength) {
			MapEditEngine.mapHistoryUndo.popStart();
		}
	}

	/**
	 * UI: call directly and pass call to the comunication bus
	 *
	 * Video: only call directly on bus communication
	 */
	public static historyRedo(): MapActive | undefined {
		if (!MapEditEngine.mapHistoryRedo.length) {
			return;
		}
		let mapActive: MapActive = <MapActive>MapEditEngine.mapHistoryRedo.popEnd();

		if (!MapEditEngine.modeUI) {
			MapEditEngine.mapHistoryUndo.pushEnd(KernelEngine.getMapActive());
			KernelEngine.historyUpdate(mapActive);
		} else {
			MapEditEngine.mapHistoryUndo.pushEnd(MapEditEngine.mapActiveUI);
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
		if (!MapEditEngine.mapHistoryUndo.length) {
			return;
		}
		let mapActive: MapActive = <MapActive>MapEditEngine.mapHistoryUndo.popEnd();

		if (!MapEditEngine.modeUI) {
			MapEditEngine.mapHistoryRedo.pushEnd(KernelEngine.getMapActive());
			KernelEngine.historyUpdate(mapActive);
		} else {
			MapEditEngine.mapHistoryRedo.pushEnd(MapEditEngine.mapActiveUI);
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
	public static uiCameraUpdate(videoBusOutputCmdEditCameraUpdate: VideoBusOutputCmdEditCameraUpdate) {
		MapEditEngine.mapActiveUI.camera = Object.assign(MapEditEngine.mapActiveUI.camera, videoBusOutputCmdEditCameraUpdate);
	}

	/**
	 * UI only, the video thread sent a clock update through the bus to the UI. So the UI has to update it's cache of the map's clock.
	 */
	public static uiClockUpdate(hourOfDayEff: number) {
		MapEditEngine.mapActiveUI.hourOfDayEff = hourOfDayEff;
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
			case VideoBusInputCmdGameModeEditApplyType.AUDIO_TAG:
				apply = MapEditEngine.uiApplyAudioTag(gHashes, properties, z);
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

	private static uiApplyAudioBlock(
		gHashes: number[],
		properties: VideoBusInputCmdGameModeEditApply,
		z: VideoBusInputCmdGameModeEditApplyZ,
	): VideoBusInputCmdGameModeEditApplyAudioBlock {
		let data: any = <VideoBusInputCmdGameModeEditApplyAudioBlock>properties;

		// Set base configs outside of the properties object
		data.objectType = GridObjectType.AUDIO_BLOCK;
		data.gHashes = gHashes;
		data.gSizeH = 1;
		data.gSizeW = 1;
		data.z = z;

		return data;
	}

	private static uiApplyAudioTag(
		gHashes: number[],
		properties: VideoBusInputCmdGameModeEditApply,
		z: VideoBusInputCmdGameModeEditApplyZ,
	): VideoBusInputCmdGameModeEditApplyAudioTag {
		let data: any = <VideoBusInputCmdGameModeEditApplyAudioTag>properties;

		if (data.type === GridAudioTagType.EFFECT) {
			if (data.activation) {
				delete data.alwaysOn;
			}
			if (data.alwaysOn) {
				delete data.activation;
			}
			if (!data.oneshot) {
				delete data.oneshot;
			}
		} else {
			if (!data.alwaysOn) {
				delete data.alwaysOn;
			}
		}

		if (data.gRadius === 0) {
			delete data.gRadius;
		}
		if (!data.panIgnored) {
			delete data.panIgnored;
		}
		if (data.tagId === '') {
			delete data.tagId;
		}

		// Set base configs outside of the properties object
		data.objectType = GridObjectType.AUDIO_TAG;
		data.gHashes = gHashes;
		data.gSizeH = 1;
		data.gSizeW = 1;
		data.z = z;

		return data;
	}

	private static uiApplyImageBlockFoliage(
		gHashes: number[],
		properties: VideoBusInputCmdGameModeEditApply,
		z: VideoBusInputCmdGameModeEditApplyZ,
	): VideoBusInputCmdGameModeEditApplyImageBlockFoliage {
		let data: VideoBusInputCmdGameModeEditApplyImageBlockFoliage = <VideoBusInputCmdGameModeEditApplyImageBlockFoliage>properties;

		if (!data.assetAnimation || data.assetAnimation.assetIds.length < 2) {
			delete data.assetAnimation;
		} else {
			delete data.assetAnimation.calc;
			if (!data.assetAnimation.finishOnLastFrame) {
				delete data.assetAnimation.finishOnLastFrame;
			}
			if (!data.assetAnimation.indexInitial) {
				delete data.assetAnimation.indexInitial;
			}
			if (!data.assetAnimation.loopCount) {
				delete data.assetAnimation.loopCount;
			}
			if (!data.assetAnimation.reverse) {
				delete data.assetAnimation.reverse;
			}
			for (let i in data.assetAnimation.assetOptions) {
				if (!data.assetAnimation.assetOptions[i].flipH) {
					delete data.assetAnimation.assetOptions[i].flipH;
				}
				if (!data.assetAnimation.assetOptions[i].flipV) {
					delete data.assetAnimation.assetOptions[i].flipV;
				}
				if (!data.assetAnimation.assetOptions[i].halved) {
					delete data.assetAnimation.assetOptions[i].halved;
				}
			}
		}
		delete data.extends; // calculated field only
		if (z === VideoBusInputCmdGameModeEditApplyZ.INTERACTIVE) {
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
		if (data.halved === undefined || data.halved === GridImageBlockHalved.NONE) {
			delete data.halved;
		}
		if (!data.flipH) {
			delete data.flipH;
		}
		if (!data.flipV) {
			delete data.flipV;
		}
		if (data.assetId === 'null') {
			data.null = true;
		} else {
			data.null = false;
		}
		if (!data.passthroughCharacter) {
			delete data.passthroughCharacter;
		}
		if (!data.passthroughLight) {
			delete data.passthroughLight;
		}
		if (!data.transparency) {
			delete data.transparency;
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

		if (!data.assetAnimation || data.assetAnimation.assetIds.length < 2) {
			delete data.assetAnimation;
		} else {
			delete data.assetAnimation.calc;
			if (!data.assetAnimation.finishOnLastFrame) {
				delete data.assetAnimation.finishOnLastFrame;
			}
			if (!data.assetAnimation.indexInitial) {
				delete data.assetAnimation.indexInitial;
			}
			if (!data.assetAnimation.loopCount) {
				delete data.assetAnimation.loopCount;
			}
			if (!data.assetAnimation.reverse) {
				delete data.assetAnimation.reverse;
			}
			for (let i in data.assetAnimation.assetOptions) {
				if (!data.assetAnimation.assetOptions[i].flipH) {
					delete data.assetAnimation.assetOptions[i].flipH;
				}
				if (!data.assetAnimation.assetOptions[i].flipV) {
					delete data.assetAnimation.assetOptions[i].flipV;
				}
				if (!data.assetAnimation.assetOptions[i].halved) {
					delete data.assetAnimation.assetOptions[i].halved;
				}
			}
		}
		if (z !== VideoBusInputCmdGameModeEditApplyZ.INTERACTIVE) {
			delete data.assetIdAudioEffectSwim;
			delete data.assetIdAudioEffectTread;
		}
		if (data.halved === undefined || data.halved === GridImageBlockHalved.NONE) {
			delete data.halved;
		}
		if (!data.flipH) {
			delete data.flipH;
		}
		if (!data.flipV) {
			delete data.flipV;
		}

		if (data.assetId === 'null') {
			data.null = true;
		} else {
			data.null = false;
		}
		if (!data.passthroughLight) {
			delete data.passthroughLight;
		}
		if (!data.transparency) {
			delete data.transparency;
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

		if (!data.assetAnimation || data.assetAnimation.assetIds.length < 2) {
			delete data.assetAnimation;
		} else {
			delete data.assetAnimation.calc;
			if (!data.assetAnimation.finishOnLastFrame) {
				delete data.assetAnimation.finishOnLastFrame;
			}
			if (!data.assetAnimation.indexInitial) {
				delete data.assetAnimation.indexInitial;
			}
			if (!data.assetAnimation.loopCount) {
				delete data.assetAnimation.loopCount;
			}
			if (!data.assetAnimation.reverse) {
				delete data.assetAnimation.reverse;
			}
			for (let i in data.assetAnimation.assetOptions) {
				if (!data.assetAnimation.assetOptions[i].flipH) {
					delete data.assetAnimation.assetOptions[i].flipH;
				}
				if (!data.assetAnimation.assetOptions[i].flipV) {
					delete data.assetAnimation.assetOptions[i].flipV;
				}
				if (!data.assetAnimation.assetOptions[i].halved) {
					delete data.assetAnimation.assetOptions[i].halved;
				}
			}
		}
		delete data.extends; // calculated field only
		if (z === VideoBusInputCmdGameModeEditApplyZ.INTERACTIVE) {
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
		if (data.halved === undefined || data.halved === GridImageBlockHalved.NONE) {
			delete data.halved;
		}
		if (!data.flipH) {
			delete data.flipH;
		}
		if (!data.flipV) {
			delete data.flipV;
		}

		if (data.assetId === 'null') {
			data.null = true;
		} else {
			data.null = false;
		}
		if (!data.passthroughCharacter) {
			delete data.passthroughCharacter;
		}
		if (!data.passthroughLight) {
			delete data.passthroughLight;
		}
		if (!data.transparency) {
			delete data.transparency;
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
		let data: VideoBusInputCmdGameModeEditApplyLight = <VideoBusInputCmdGameModeEditApplyLight>properties;

		delete data.extends; // calculated field only
		if (z === VideoBusInputCmdGameModeEditApplyZ.INTERACTIVE) {
			// Clean
			if (!data.destructible) {
				delete data.destructible;
				delete data.strengthToDestroyInN;
			}
		} else {
			// These cannot apply to foreground and vanishing z's
			delete data.destructible;
			delete data.strengthToDestroyInN;
		}

		if (!data.assetAnimation || data.assetAnimation.assetIds.length < 2) {
			delete data.assetAnimation;
		} else {
			delete data.assetAnimation.calc;
			if (!data.assetAnimation.finishOnLastFrame) {
				delete data.assetAnimation.finishOnLastFrame;
			}
			if (!data.assetAnimation.indexInitial) {
				delete data.assetAnimation.indexInitial;
			}
			if (!data.assetAnimation.loopCount) {
				delete data.assetAnimation.loopCount;
			}
			if (!data.assetAnimation.reverse) {
				delete data.assetAnimation.reverse;
			}
			for (let i in data.assetAnimation.assetOptions) {
				if (!data.assetAnimation.assetOptions[i].flipH) {
					delete data.assetAnimation.assetOptions[i].flipH;
				}
				if (!data.assetAnimation.assetOptions[i].flipV) {
					delete data.assetAnimation.assetOptions[i].flipV;
				}
				if (!data.assetAnimation.assetOptions[i].halved) {
					delete data.assetAnimation.assetOptions[i].halved;
				}
			}
		}
		if (!data.assetIdAudioEffectAmbient) {
			delete data.assetIdAudioEffectAmbient;
		}
		if (!data.assetIdAudioEffectDestroyed) {
			delete data.assetIdAudioEffectDestroyed;
		}
		if (!data.assetIdAudioEffectSwitchOff) {
			delete data.assetIdAudioEffectSwitchOff;
		}
		if (!data.assetIdAudioEffectSwitchOn) {
			delete data.assetIdAudioEffectSwitchOn;
		}
		if (data.directionOmni) {
			delete data.directions;
			data.directionOmniBrightness = Math.max(1, Math.min(6, Math.round(data.directionOmniBrightness || 0)));
			data.directionOmniGRadius = Math.max(1, data.directionOmniGRadius || 0);
		} else {
			if (!data.directions || !data.directions.length) {
				delete data.directions;
				data.directionOmni = true;
				data.directionOmniBrightness = Math.max(1, Math.min(6, Math.round(data.directionOmniBrightness || 0)));
				data.directionOmniGRadius = Math.max(1, data.directionOmniGRadius || 0);
			} else {
				delete data.directionOmni;
				delete data.directionOmniBrightness;
				delete data.directionOmniGRadius;

				for (let i in data.directions) {
					data.directions[i].brightness = Math.max(1, Math.min(6, Math.round(data.directions[i].brightness || 0)));
				}
			}
		}

		if (data.assetId === 'null') {
			data.assetId = 'null2';
			data.null = true;
		} else {
			data.null = false;
		}
		if (!data.gRadiusAudioEffect) {
			delete data.gRadiusAudioEffect;
		}
		if (!data.nightOnly) {
			delete data.nightOnly;
		}
		if (!data.rounded) {
			delete data.rounded;
		}

		// Set base configs outside of the properties object
		data.gHashes = gHashes;
		data.objectType = GridObjectType.LIGHT;
		data.z = z;

		return data;
	}

	/**
	 * Only for initial grid block positions (precision 0)
	 */
	public static uiRelXYToGBlockHash(action: MouseAction | TouchAction): number {
		let camera: Camera = MapEditEngine.mapActiveUI.camera,
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

	public static getMapActiveCloneNormalized(mapActive?: MapActive, deep?: boolean): MapActive {
		if (!mapActive) {
			if (MapEditEngine.modeUI) {
				mapActive = MapEditEngine.mapActiveUI;
			} else {
				mapActive = KernelEngine.getMapActive();
			}
		}

		return UtilEngine.mapClone(mapActive, deep);
	}

	public static getGridActive(): Grid {
		if (!MapEditEngine.modeUI) {
			return KernelEngine.getMapActive().gridActive;
		} else {
			return MapEditEngine.mapActiveUI.gridActive;
		}
	}

	public static getGridConfigActive(): GridConfig {
		if (!MapEditEngine.modeUI) {
			return KernelEngine.getMapActive().gridConfigActive;
		} else {
			return MapEditEngine.mapActiveUI.gridConfigActive;
		}
	}

	public static getGridProperty(
		gHash: number,
		view: VideoBusInputCmdGameModeEditApplyView,
		z: VideoBusInputCmdGameModeEditApplyZ,
	): GridObject[] {
		let blocks: GridBlockTable<GridObject>, reference: GridBlockTable<GridImageBlockReference>, mapActive: MapActive;

		if (!MapEditEngine.modeUI) {
			mapActive = KernelEngine.getMapActive();
		} else {
			mapActive = MapEditEngine.mapActiveUI;
		}

		switch (view) {
			case VideoBusInputCmdGameModeEditApplyView.AUDIO:
				let data: any[] = [];

				blocks = mapActive.gridActive.audioInteractiveBlocks;
				if (blocks.hashes[gHash]) {
					data.push(blocks.hashes[gHash]);
				}

				blocks = mapActive.gridActive.audioInteractiveTags;
				if (blocks.hashes[gHash]) {
					data.push(blocks.hashes[gHash]);
				}

				return data;
			case VideoBusInputCmdGameModeEditApplyView.IMAGE:
				if (z === VideoBusInputCmdGameModeEditApplyZ.BACKGROUND1) {
					reference = mapActive.gridActive.imageBlocksBackground1Reference;
				} else if (z === VideoBusInputCmdGameModeEditApplyZ.BACKGROUND2) {
					reference = mapActive.gridActive.imageBlocksBackground2Reference;
				} else if (z === VideoBusInputCmdGameModeEditApplyZ.FOREGROUND1) {
					reference = mapActive.gridActive.imageBlocksForeground1Reference;
				} else if (z === VideoBusInputCmdGameModeEditApplyZ.FOREGROUND2) {
					reference = mapActive.gridActive.imageBlocksForeground2Reference;
				} else if (z === VideoBusInputCmdGameModeEditApplyZ.INTERACTIVE) {
					reference = mapActive.gridActive.imageBlocksInteractiveReference;
				} else if (z === VideoBusInputCmdGameModeEditApplyZ.MIDDLEGROUND) {
					reference = mapActive.gridActive.imageBlocksMiddlegroundReference;
				} else {
					reference = mapActive.gridActive.imageBlocksVanishingReference;
				}

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
				if (z === VideoBusInputCmdGameModeEditApplyZ.INTERACTIVE) {
					blocks = mapActive.gridActive.lightsInteractive;
				} else {
					blocks = mapActive.gridActive.lightsForeground1;
				}

				if (blocks.hashes[gHash]) {
					if (blocks.hashes[gHash].extends) {
						return [blocks.hashes[blocks.hashes[gHash].extends]];
					} else {
						return [blocks.hashes[gHash]];
					}
				} else {
					return [];
				}
		}
	}

	public static getHistoryRedoLength(): number {
		return MapEditEngine.mapHistoryRedo.length;
	}

	public static getHistoryUndoLength(): number {
		return MapEditEngine.mapHistoryUndo.length;
	}
}
