import { DoubleLinkedList } from '../../models/double-linked-list.model';
import {
	Grid,
	GridBlockTable,
	GridConfig,
	GridCoordinate,
	GridImageBlockReference,
	GridImageBlockFoliage,
	GridBlockTableComplex,
	GridObjectType,
} from '../../models/grid.model';
import {
	LightingCalcBusInputCmd,
	LightingCalcBusInputPlayload,
	LightingCalcBusInputPlayloadFlash,
	LightingCalcBusInputPlayloadGridActive,
	LightingCalcBusInputPlayloadGrids,
	LightingCalcBusInputPlayloadHourOfDayEff,
} from '../buses/lighting.calc.engine.model';
import { MapActive } from '../../models/map.model';
import { MapEditEngine } from '../../engines/map-edit.engine';
import { UtilEngine } from '../../engines/util.engine';
import { VideoBusInputCmdGameModeEditApplyZ } from '../../engines/buses/video.model.bus';

/**
 * Brightness: between 0 and 4
 *
 * Brightness Outside: between 0 and 4
 *
 * @author tknight-dev
 */

interface GridBlockTableComplexExtended extends GridBlockTableComplex {
	blocks: { [key: number]: GridImageBlockFoliage };
}

self.onmessage = (event: MessageEvent) => {
	let payload: LightingCalcBusInputPlayload = event.data;

	switch (payload.cmd) {
		case LightingCalcBusInputCmd.FLASH:
			LightingCalcWorkerEngine.inputFlash(<LightingCalcBusInputPlayloadFlash>payload.data);
			break;
		case LightingCalcBusInputCmd.INITIALIZE:
			LightingCalcWorkerEngine.initialize(self);
			break;
		case LightingCalcBusInputCmd.SET_GRID_ACTIVE:
			LightingCalcWorkerEngine.inputGridActive(<LightingCalcBusInputPlayloadGridActive>payload.data);
			break;
		case LightingCalcBusInputCmd.SET_GRIDS:
			LightingCalcWorkerEngine.inputGridSet(<LightingCalcBusInputPlayloadGrids>payload.data);
			break;
		case LightingCalcBusInputCmd.SET_HOUR_OF_DAY_EFF:
			LightingCalcWorkerEngine.inputHourOfDayEff(<LightingCalcBusInputPlayloadHourOfDayEff>payload.data);
			break;
	}
};

class LightingCalcWorkerEngine {
	private static delta: number;
	private static flashes: DoubleLinkedList<LightingCalcBusInputPlayloadFlash> = new DoubleLinkedList<LightingCalcBusInputPlayloadFlash>();
	private static gridActiveId: string;
	private static grids: { [key: string]: Grid };
	private static gridConfigs: { [key: string]: GridConfig };
	private static hashesBackground: { [key: number]: number } = {};
	private static hashesGroup: { [key: number]: number } = {};
	private static hourOfDayEff: number;
	private static initialized: boolean;
	private static firstByGridId: { [key: string]: boolean } = {};
	private static now: number = performance.now();
	private static self: Window & typeof globalThis;
	private static then: number = performance.now();
	private static zGroup: VideoBusInputCmdGameModeEditApplyZ[] = [
		VideoBusInputCmdGameModeEditApplyZ.BACKGROUND,
		VideoBusInputCmdGameModeEditApplyZ.PRIMARY, // Last
	];

	public static async initialize(self: Window & typeof globalThis): Promise<void> {
		if (LightingCalcWorkerEngine.initialized) {
			console.error('LightingCalcWorkerEngine > initialize: already initialized');
			return;
		}
		LightingCalcWorkerEngine.initialized = true;
		LightingCalcWorkerEngine.self = self;
	}

	public static inputFlash(data: LightingCalcBusInputPlayloadFlash): void {
		data.then = LightingCalcWorkerEngine.now;
		LightingCalcWorkerEngine.flashes.pushEnd(data);
	}

	public static inputGridActive(data: LightingCalcBusInputPlayloadGridActive): void {
		LightingCalcWorkerEngine.gridActiveId = data.id;
		LightingCalcWorkerEngine._calc();
	}

	public static inputGridSet(data: LightingCalcBusInputPlayloadGrids): void {
		let grids: { [key: string]: Grid } = {};

		LightingCalcWorkerEngine.firstByGridId = <any>new Object();

		for (let i in data.grids) {
			grids[i] = JSON.parse(data.grids[i]);
			LightingCalcWorkerEngine.firstByGridId[grids[i].id] = true;
		}

		let mapActive: MapActive = MapEditEngine.gridBlockTableInflate(<MapActive>{
			gridConfigs: data.gridConfigs,
			grids: grids,
		});
		LightingCalcWorkerEngine.grids = mapActive.grids;
		LightingCalcWorkerEngine.gridConfigs = mapActive.gridConfigs;
		LightingCalcWorkerEngine._calc();
	}

	public static inputHourOfDayEff(data: LightingCalcBusInputPlayloadHourOfDayEff): void {
		LightingCalcWorkerEngine.hourOfDayEff = data.hourOfDayEff;
		LightingCalcWorkerEngine._calc();
	}

	/**
	 * Merge brightness into single number
	 *
	 * @return 6bits
	 */
	public static hashBrightness(brightness: number, brightnessOutside: number): number {
		return ((brightnessOutside & 0x7) << 3) | (brightness & 0x7);
	}

	/**
	 * Merge stack onto gHash
	 *
	 * @return 28bits
	 */
	public static hashMergeG(hash: number, hashStack: number): number {
		return ((hashStack & 0xfff) << 16) | (hash & 0xffff);
	}

	/**
	 * Merge two z brightness numbers into single number
	 *
	 * @return 12bits
	 */
	public static hashStackBrightness(hashBrightnessBackground: number, hashBrightnessGroup: number): number {
		return ((hashBrightnessGroup & 0x3f) << 6) | (hashBrightnessBackground & 0x3f);
	}

	public static output(payload: number[]): void {
		let data = {
			gridId: LightingCalcWorkerEngine.gridActiveId,
			payload: payload,
		};
		LightingCalcWorkerEngine.self.postMessage(JSON.stringify(data));
	}

	private static _calc(): void {
		try {
			let brightnessByHash: { [key: number]: number } = {},
				brightnessOutsideByHash: { [key: number]: number } = {},
				brightnessOutsideDayMax: number = 6,
				brightnessOutsideNightMax: number = 4,
				complexExtended: GridBlockTableComplexExtended,
				complexes: GridBlockTableComplex[],
				complexesExtended: GridBlockTableComplexExtended[],
				complexesByGxNoFoliage: { [key: number]: GridBlockTableComplex[] },
				first: boolean = LightingCalcWorkerEngine.firstByGridId[LightingCalcWorkerEngine.gridActiveId],
				foliageGyByGx: { [key: number]: GridBlockTableComplexExtended[] } = {},
				foliageGyByGxAll: { [key: number]: GridBlockTableComplexExtended[] }[] = [],
				foliageShadowValue: number,
				grid: Grid = LightingCalcWorkerEngine.grids[LightingCalcWorkerEngine.gridActiveId],
				gridConfig: GridConfig = LightingCalcWorkerEngine.gridConfigs[LightingCalcWorkerEngine.gridActiveId],
				gridImageBlockFoliage: GridImageBlockFoliage,
				gSizeW: number,
				gHeight: number = gridConfig.gHeight,
				gWidth: number = gridConfig.gWidth,
				gx: number,
				gxEff: number,
				gxString: string,
				gy: number,
				gyEff: number,
				hash: number,
				hashString: string,
				hashesBackground: { [key: number]: number } = {},
				hashesChangesBackground: { [key: number]: number } = {},
				hashesChangesGroup: { [key: number]: number } = {},
				hashesChangesFinal: { [key: number]: number } = {},
				hashesChangesFinalOutput: number[] = [],
				hashesGroup: { [key: number]: number } = {},
				referenceNoFoliage: GridBlockTable<GridImageBlockReference> = <any>{},
				hourOfDayEff: number = LightingCalcWorkerEngine.hourOfDayEff,
				hourOfDayEffOutsideModifier: number = hourOfDayEff % 12,
				j: string,
				k: number,
				skip: boolean,
				z: VideoBusInputCmdGameModeEditApplyZ,
				zGroup: VideoBusInputCmdGameModeEditApplyZ[] = LightingCalcWorkerEngine.zGroup;

			if (!hourOfDayEff) {
				return;
			}

			if (hourOfDayEff < 2) {
				// Twilight
				hourOfDayEffOutsideModifier = Math.min(brightnessOutsideNightMax, 1 + hourOfDayEff);
			} else if (hourOfDayEff < 5) {
				// Small Hours
				hourOfDayEffOutsideModifier = Math.min(brightnessOutsideNightMax, 4 - hourOfDayEff);
			} else if (hourOfDayEff < 10) {
				// Morning
				hourOfDayEffOutsideModifier = Math.min(brightnessOutsideDayMax, hourOfDayEff - 4);
			} else if (hourOfDayEff < 18) {
				// Afternoon
				hourOfDayEffOutsideModifier = brightnessOutsideDayMax;
			} else if (hourOfDayEff < 23) {
				// Evening
				hourOfDayEffOutsideModifier = Math.min(brightnessOutsideDayMax, 23 - hourOfDayEff);
			} else {
				// Dusk
				hourOfDayEffOutsideModifier = Math.min(brightnessOutsideNightMax, hourOfDayEff - 23);
				hourOfDayEffOutsideModifier++; // Bias toward brighter pre-twilight hours
			}

			for (let i in zGroup) {
				z = zGroup[i];

				/*
				 * Day/Night Illumination (foliage ignored)
				 */
				switch (z) {
					case VideoBusInputCmdGameModeEditApplyZ.BACKGROUND:
						referenceNoFoliage = LightingCalcWorkerEngine._calcProcessReferences(
							[grid.imageBlocksBackgroundReference.hashes],
							GridObjectType.IMAGE_BLOCK_FOLIAGE,
						);
						break;
					case VideoBusInputCmdGameModeEditApplyZ.PRIMARY:
						referenceNoFoliage = LightingCalcWorkerEngine._calcProcessReferences(
							[
								grid.imageBlocksPrimaryReference.hashes,
								grid.imageBlocksForegroundReference.hashes,
								grid.imageBlocksVanishingReference.hashes,
							],
							GridObjectType.IMAGE_BLOCK_FOLIAGE,
						);
						break;
				}
				complexesByGxNoFoliage = <any>referenceNoFoliage.hashesGyByGx;
				skip = true;

				for (gxString in complexesByGxNoFoliage) {
					complexes = complexesByGxNoFoliage[gxString];

					for (k = 0; k < complexes.length; k++) {
						if (z === VideoBusInputCmdGameModeEditApplyZ.PRIMARY && hourOfDayEffOutsideModifier === brightnessOutsideDayMax) {
							// Brightest part of day
							if (skip) {
								// Skip the first to allow for a smoother transition to full brightness
								brightnessOutsideByHash[complexes[k].hash] = Math.max(0, hourOfDayEffOutsideModifier - k);
								skip = false;
							} else {
								brightnessOutsideByHash[complexes[k].hash] = Math.max(0, hourOfDayEffOutsideModifier - Math.max(k - 1));
							}
						} else {
							brightnessOutsideByHash[complexes[k].hash] = Math.max(0, hourOfDayEffOutsideModifier - k);
						}
					}
				}

				/*
				 * Day/Night Shadows for Foliage
				 */
				switch (z) {
					case VideoBusInputCmdGameModeEditApplyZ.BACKGROUND:
						foliageGyByGxAll = [LightingCalcWorkerEngine._calcProcessFoliage(grid.imageBlocksBackgroundFoliage)];
						break;
					case VideoBusInputCmdGameModeEditApplyZ.PRIMARY:
						foliageGyByGxAll = [
							LightingCalcWorkerEngine._calcProcessFoliage(grid.imageBlocksForegroundFoliage),
							LightingCalcWorkerEngine._calcProcessFoliage(grid.imageBlocksPrimaryFoliage),
							LightingCalcWorkerEngine._calcProcessFoliage(grid.imageBlocksVanishingFoliage),
						];
						break;
				}

				for (j in foliageGyByGxAll) {
					foliageGyByGx = foliageGyByGxAll[j];

					for (gxString in foliageGyByGx) {
						complexesExtended = foliageGyByGx[gxString];

						for (k = 0; k < complexesExtended.length; k++) {
							complexExtended = complexesExtended[k];
							gridImageBlockFoliage = complexExtended.blocks[complexExtended.hash];

							foliageShadowValue = 1;
							gx = Number(gxString);
							gy = gridImageBlockFoliage.gy;
							gyEff = gridImageBlockFoliage.gSizeW + gy;
							gSizeW = gridImageBlockFoliage.gSizeW + gx;

							/*
							 * Light Foliage
							 */
							if (k === 0) {
							}
							//brightnessOutsideByHash[complexes[k].hash] = Math.max(0, hourOfDayEffOutsideModifier - k);

							if (gyEff > gHeight) {
								// Shadow below map, some goof put a tree on the bottom of the map
								continue;
							}

							/*
							 * Foliage Shadow
							 */
							// Shift shadow by time of day (sun rise is east/right)
							if (15 < hourOfDayEff && hourOfDayEff < 23) {
								if (hourOfDayEff > 17) {
									// Long shadow, right
									if (gx === gWidth) {
										gxEff = gx;
										gSizeW = gx + 1;
									} else {
										gSizeW += 2;
										gxEff = gx + 1;
									}
									foliageShadowValue = 1;
								} else {
									// shadow, right
									if (gx === gWidth) {
										gxEff = gx;
										gSizeW = gx + 1;
									} else {
										gSizeW++;
										gxEff = gx + 1;
									}
									foliageShadowValue = 2;
								}
							} else if (4 < hourOfDayEff && hourOfDayEff < 10) {
								if (hourOfDayEff < 8) {
									// Long shadow, left
									if (gx === 0) {
										gxEff = gx;
									} else {
										gxEff = gx - 2;
									}
									gSizeW--;
									foliageShadowValue = 1;
								} else {
									// shadow, left
									if (gx === 0) {
										gxEff = gx;
									} else {
										gxEff = gx - 1;
									}
									foliageShadowValue = 2;
								}
							} else {
								// Shadow directly below
								if (9 < hourOfDayEff && hourOfDayEff < 23) {
									// Day
									foliageShadowValue = 3;
								} else {
									// Night
									foliageShadowValue = 1;
								}
								gxEff = gx;
							}

							for (; gxEff < gSizeW; gxEff++) {
								// Is there something blocking the sun above the foliage on this gx column?
								if (!complexesByGxNoFoliage[gx] || complexesByGxNoFoliage[gx][0].value >= gy) {
									// Hash is ground below foliage
									hash = UtilEngine.gridHashTo(gxEff, gyEff);

									// Apply shadow
									if (brightnessOutsideByHash[hash]) {
										brightnessOutsideByHash[hash] = Math.max(0, brightnessOutsideByHash[hash] - foliageShadowValue);
									}
								}
							}
						}
					}
				}

				/**
				 * Third pass: Points of light, current layer and layer below with smaller radius
				 */

				/**
				 * Fourth pass: Flash
				 */

				/**
				 * Done
				 */
				switch (z) {
					case VideoBusInputCmdGameModeEditApplyZ.BACKGROUND:
						// Merge hashes into single map
						for (hashString in brightnessByHash) {
							hashesBackground[hashString] = LightingCalcWorkerEngine.hashBrightness(
								brightnessByHash[hashString],
								brightnessOutsideByHash[hashString] || 0,
							);
						}
						for (hashString in brightnessOutsideByHash) {
							if (hashesBackground[hashString] === undefined) {
								hashesBackground[hashString] = LightingCalcWorkerEngine.hashBrightness(
									brightnessByHash[hashString] || 0,
									brightnessOutsideByHash[hashString],
								);
							}
						}

						for (hashString in hashesBackground) {
							if (LightingCalcWorkerEngine.hashesBackground[hashString] !== hashesBackground[hashString]) {
								LightingCalcWorkerEngine.hashesBackground[hashString] = hashesBackground[hashString];
								hashesChangesBackground[hashString] = hashesBackground[hashString];
							}
						}
						break;
					case VideoBusInputCmdGameModeEditApplyZ.PRIMARY:
						// Merge hashes into single map
						for (hashString in brightnessByHash) {
							hashesGroup[hashString] = LightingCalcWorkerEngine.hashBrightness(
								brightnessByHash[hashString],
								brightnessOutsideByHash[hashString] || 0,
							);
						}
						for (hashString in brightnessOutsideByHash) {
							if (hashesGroup[hashString] === undefined) {
								hashesGroup[hashString] = LightingCalcWorkerEngine.hashBrightness(
									brightnessByHash[hashString] || 0,
									brightnessOutsideByHash[hashString],
								);
							}
						}

						for (hashString in hashesGroup) {
							if (LightingCalcWorkerEngine.hashesGroup[hashString] !== hashesGroup[hashString]) {
								LightingCalcWorkerEngine.hashesGroup[hashString] = hashesGroup[hashString];
								hashesChangesGroup[hashString] = hashesGroup[hashString];
							}
						}
						break;
				}
			}

			/**
			 * Done
			 */
			for (hashString in hashesChangesBackground) {
				hashesChangesFinal[hashString] = LightingCalcWorkerEngine.hashStackBrightness(
					hashesChangesBackground[hashString],
					hashesChangesGroup[hashString] || 0,
				);
			}
			for (hashString in hashesChangesGroup) {
				if (hashesChangesFinal[hashString] === undefined) {
					hashesChangesFinal[hashString] = LightingCalcWorkerEngine.hashStackBrightness(
						hashesChangesBackground[hashString] || 0,
						hashesChangesGroup[hashString],
					);
				}
			}

			// Merge hash stacks into g hash to fully optimize bus data throughput
			for (hashString in hashesChangesFinal) {
				if (first && hashesChangesFinal[hashString] === 0) {
					// The other side of the bus instantiates values as zero
					// So skip the first time around, as change detection will
					// prevent duplicates in the future
					continue;
				}

				hashesChangesFinalOutput.push(LightingCalcWorkerEngine.hashMergeG(Number(hashString), hashesChangesFinal[hashString]));
			}

			if (hashesChangesFinalOutput.length) {
				LightingCalcWorkerEngine.output(hashesChangesFinalOutput);
			}
			if (first) {
				// console.log('hashesChangesFinalOutput', hashesChangesFinalOutput);
				LightingCalcWorkerEngine.firstByGridId[LightingCalcWorkerEngine.gridActiveId] = false;
			}
		} catch (error: any) {
			//console.error('LightingCalcWorkerEngine > _calc: error', error);
		}
	}

	private static _calcProcessFoliage(a: { [key: number]: GridImageBlockFoliage }): { [key: number]: GridBlockTableComplexExtended[] } {
		let gridCoordinate: GridCoordinate,
			gyByGx: { [key: number]: { [key: number]: number } } = {},
			gyByGxFinal: { [key: number]: GridBlockTableComplexExtended[] } = {};

		for (let hash in a) {
			if (a[hash].extends) {
				continue;
			}
			gridCoordinate = UtilEngine.gridHashFrom(Number(hash));

			// Use hash to prevent duplicates during array merger
			if (gyByGx[gridCoordinate.gx] === undefined) {
				gyByGx[gridCoordinate.gx] = {};
			}

			gyByGx[gridCoordinate.gx][gridCoordinate.gy] = Number(hash);
		}

		// Sort array of foliage
		for (let gx in gyByGx) {
			gyByGxFinal[gx] = Object.keys(gyByGx[gx])
				.map(
					(v) =>
						<GridBlockTableComplexExtended>{
							blocks: a,
							hash: gyByGx[gx][Number(v)],
							value: Number(v),
						},
				)
				.sort();
		}

		return gyByGxFinal;
	}

	/**
	 * Removes foliage from reference and recomputes
	 *
	 * @param filter removes matching objectTypes
	 */
	private static _calcProcessReferences(
		array: { [key: number]: GridImageBlockReference }[],
		filter?: GridObjectType,
	): GridBlockTable<GridImageBlockReference> {
		let a: { [key: number]: GridImageBlockReference },
			b: { [key: number]: GridImageBlockReference } = {},
			hash: string,
			reference: GridBlockTable<GridImageBlockReference> = {
				hashes: b,
			};

		for (let i in array) {
			a = array[i];

			for (hash in a) {
				if (filter) {
					if (a[hash].block.objectType !== filter) {
						b[hash] = a[hash];
					}
				} else {
					b[hash] = a[hash];
				}
			}
		}

		MapEditEngine.gridBlockTableInflateInstance(reference);

		return reference;
	}
}
