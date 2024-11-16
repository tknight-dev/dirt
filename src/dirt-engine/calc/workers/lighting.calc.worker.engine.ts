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
 * Brightness: between 0 and 8 with 4 being neutral
 *
 * Brightness Outside: between 0 and 4
 *
 * TODO: https://stackoverflow.com/questions/19152772/how-to-pass-large-data-to-web-workers
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

		// Calc interval
		UtilEngine.setInterval(() => {
			LightingCalcWorkerEngine._calc();
		}, 5000);
	}

	public static inputFlash(data: LightingCalcBusInputPlayloadFlash): void {
		data.then = LightingCalcWorkerEngine.now;
		LightingCalcWorkerEngine.flashes.pushEnd(data);
	}

	public static inputGridActive(data: LightingCalcBusInputPlayloadGridActive): void {
		LightingCalcWorkerEngine.gridActiveId = data.id;
	}

	public static inputGridSet(data: LightingCalcBusInputPlayloadGrids): void {
		let grids: { [key: string]: Grid } = {};

		for (let i in data.grids) {
			grids[i] = JSON.parse(data.grids[i]);
		}

		let mapActive: MapActive = MapEditEngine.gridBlockTableInflate(<MapActive>{
			gridConfigs: data.gridConfigs,
			grids: grids,
		});
		LightingCalcWorkerEngine.grids = mapActive.grids;
		LightingCalcWorkerEngine.gridConfigs = mapActive.gridConfigs;
	}

	public static inputHourOfDayEff(data: LightingCalcBusInputPlayloadHourOfDayEff): void {
		LightingCalcWorkerEngine.hourOfDayEff = data.hourOfDayEff;
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
	 * @return 44bits
	 */
	public static hashMergeG(hash: number, hashStack: number): number {
		return ((hashStack & 0xfff) << 32) | (hash & 0xffffffff);
	}

	/**
	 * Merge two z brightness numbers into single number
	 *
	 * @return 12bits
	 */
	public static hashStackBrightness(hashBrightnessBackground: number, hashBrightnessGroup: number): number {
		return ((hashBrightnessGroup & 0x3f) << 6) | (hashBrightnessBackground & 0x3f);
	}

	public static output(data: number[]): void {
		LightingCalcWorkerEngine.self.postMessage(data);
	}

	private static _calc(): void {
		LightingCalcWorkerEngine.now = performance.now();

		// Max is 15
		//console.log('_calc', LightingCalcWorkerEngine.now - LightingCalcWorkerEngine.then);

		try {
			let brightnessByHash: { [key: number]: number } = {},
				brightnessOutsideByHash: { [key: number]: number } = {},
				brightnessOutsideMax: number = 4,
				complex: GridBlockTableComplex,
				complexExtended: GridBlockTableComplexExtended,
				complexes: GridBlockTableComplex[],
				complexesExtended: GridBlockTableComplexExtended[],
				complexesByGxNoFoliage: { [key: number]: GridBlockTableComplex[] },
				foliageGy: GridBlockTableComplexExtended[],
				foliageGyByGx: { [key: number]: GridBlockTableComplexExtended[] } = {},
				foliageGyByGxAll: { [key: number]: GridBlockTableComplexExtended[] }[] = [],
				grid: Grid = LightingCalcWorkerEngine.grids[LightingCalcWorkerEngine.gridActiveId],
				gridConfig: GridConfig = LightingCalcWorkerEngine.gridConfigs[LightingCalcWorkerEngine.gridActiveId],
				gridCoordinate: GridCoordinate,
				gridImageBlockFoliage: GridImageBlockFoliage,
				gSizeH: number,
				gSizeW: number,
				gWidth: number = gridConfig.gWidth,
				gx: number,
				gxString: string,
				gy: number,
				hash: number,
				hashString: string,
				hashesBackground: { [key: number]: number } = {},
				hashesChangesBackground: { [key: number]: number } = {},
				hashesChangesGroup: { [key: number]: number } = {},
				hashesChangesFinal: { [key: number]: number } = {},
				hashesChangesFinalOutput: number[] = [],
				hashesGroup: { [key: number]: number } = {},
				gHashPrecision: number = gridConfig.gHashPrecision,
				referenceNoFoliage: GridBlockTable<GridImageBlockReference> = <any>{},
				hourOfDayEff: number = LightingCalcWorkerEngine.hourOfDayEff,
				hourOfDayEffOutsideModifier: number = hourOfDayEff % 6,
				j: string,
				k: number,
				z: VideoBusInputCmdGameModeEditApplyZ,
				zGroup: VideoBusInputCmdGameModeEditApplyZ[] = LightingCalcWorkerEngine.zGroup;

			hourOfDayEffOutsideModifier = hourOfDayEff % 12;
			if (hourOfDayEff < 7) {
				// Small hours
				hourOfDayEffOutsideModifier = Math.min(brightnessOutsideMax, 6 - hourOfDayEff);
			} else if (hourOfDayEff < 13) {
				// Morning
				hourOfDayEffOutsideModifier = Math.min(brightnessOutsideMax, hourOfDayEff - 6);
			} else if (hourOfDayEff < 19) {
				// Afternoon
				hourOfDayEffOutsideModifier = Math.min(brightnessOutsideMax, 19 - hourOfDayEff);
			} else {
				// Dusk
				hourOfDayEffOutsideModifier = Math.min(brightnessOutsideMax, hourOfDayEff - 19);
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
							gHashPrecision,
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
							gHashPrecision,
							GridObjectType.IMAGE_BLOCK_FOLIAGE,
						);
						break;
				}
				complexesByGxNoFoliage = <any>referenceNoFoliage.hashesGyByGx;

				for (gxString in complexesByGxNoFoliage) {
					complexes = complexesByGxNoFoliage[gxString];

					for (k = 0; k < complexes.length; k++) {
						brightnessOutsideByHash[complexes[k].hash] = Math.max(0, hourOfDayEffOutsideModifier - k);
					}
				}

				/*
				 * Day/Night Shadows for Foliage
				 */
				switch (z) {
					case VideoBusInputCmdGameModeEditApplyZ.BACKGROUND:
						foliageGyByGxAll = [
							LightingCalcWorkerEngine._calcProcessFoliage(grid.imageBlocksBackgroundFoliage, gHashPrecision),
						];
						break;
					case VideoBusInputCmdGameModeEditApplyZ.PRIMARY:
						foliageGyByGxAll = [
							LightingCalcWorkerEngine._calcProcessFoliage(grid.imageBlocksPrimaryFoliage, gHashPrecision),
							LightingCalcWorkerEngine._calcProcessFoliage(grid.imageBlocksPrimaryFoliage, gHashPrecision),
							LightingCalcWorkerEngine._calcProcessFoliage(grid.imageBlocksVanishingFoliage, gHashPrecision),
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

							gx = Number(gxString);
							gy = gridImageBlockFoliage.gy;

							gSizeH = gridImageBlockFoliage.gSizeH + gy;
							gSizeW = gridImageBlockFoliage.gSizeW + gx;

							// Extra shadow to the left
							if (gx !== 0 && 15 < hourOfDayEff && hourOfDayEff < 19) {
								// Is there something blocking the sun above the foliage on this gx column?
								if (!complexesByGxNoFoliage[gx] || complexesByGxNoFoliage[gx][0].value <= gy) {
									// Hash is ground below foliage
									hash = UtilEngine.gridHashTo(gx - 1, gSizeH, gHashPrecision);

									// Apply shadow
									if (brightnessOutsideByHash[hash]) {
										brightnessOutsideByHash[hash] = Math.max(0, brightnessOutsideByHash[hash] - 1);
									}
								}
							} else if (gSizeW + 1 <= gWidth && 6 < hourOfDayEff && hourOfDayEff < 10) {
								// Extra shadow to the right

								// Is there something blocking the sun above the foliage on this gx column?
								if (!complexesByGxNoFoliage[gx] || complexesByGxNoFoliage[gx][0].value <= gy) {
									// Hash is ground below foliage
									hash = UtilEngine.gridHashTo(gSizeW + 1, gSizeH, gHashPrecision);

									// Apply shadow
									if (brightnessOutsideByHash[hash]) {
										brightnessOutsideByHash[hash] = Math.max(0, brightnessOutsideByHash[hash] || 0 - 1);
									}
								}
							}

							// Iterate across foliage from origin
							for (; gx < gSizeW; gx++) {
								// Is there something blocking the sun above the foliage on this gx column?
								if (!complexesByGxNoFoliage[gx] || complexesByGxNoFoliage[gx][0].value <= gy) {
									// Hash is ground below foliage
									hash = UtilEngine.gridHashTo(gx, gSizeH, gHashPrecision);

									// Apply shadow
									if (brightnessOutsideByHash[hash]) {
										brightnessOutsideByHash[hash] = Math.max(0, brightnessOutsideByHash[hash] - 2);
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

						for (hashString in hashesBackground) {
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
					hashesChangesGroup[hashString],
				);
			}
			for (hashString in hashesChangesGroup) {
				if (hashesChangesFinal[hashString] !== undefined) {
					hashesChangesFinal[hashString] = LightingCalcWorkerEngine.hashStackBrightness(
						hashesChangesBackground[hashString],
						hashesChangesGroup[hashString],
					);
				}
			}

			// Merge hash stacks into g hash to fully optimize bus data throughput
			for (hashString in hashesChangesFinal) {
				hashesChangesFinalOutput.push(LightingCalcWorkerEngine.hashMergeG(Number(hashString), hashesChangesFinal[hashString]));
			}

			if (hashesChangesFinalOutput.length) {
				LightingCalcWorkerEngine.output(hashesChangesFinalOutput);
			}
		} catch (error: any) {
			//console.error('LightingCalcWorkerEngine > _calc: error', error);
		}

		LightingCalcWorkerEngine.then = LightingCalcWorkerEngine.now;
	}

	private static _calcProcessFoliage(
		a: { [key: number]: GridImageBlockFoliage },
		gHashPrecision: number,
	): { [key: number]: GridBlockTableComplexExtended[] } {
		let gridCoordinate: GridCoordinate,
			gyByGx: { [key: number]: { [key: number]: number } } = {},
			gyByGxFinal: { [key: number]: GridBlockTableComplexExtended[] } = {};

		for (let hash in a) {
			if (a[hash].extends) {
				continue;
			}
			gridCoordinate = UtilEngine.gridHashFrom(Number(hash), gHashPrecision);

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
		gHashPrecision: number,
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
					if (a[hash].objectType !== filter) {
						b[hash] = a[hash];
					}
				} else {
					b[hash] = a[hash];
				}
			}
		}

		MapEditEngine.gridBlockTableInflateInstance(reference, gHashPrecision);

		return reference;
	}
}
