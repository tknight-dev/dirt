import { DoubleLinkedList } from '../../models/double-linked-list.model';
import {
	Grid,
	GridBlockTable,
	GridConfig,
	GridCoordinate,
	GridImageBlockReference,
	GridImageBlockFoliage,
	GridBlockTableComplex,
	GridLight,
	GridLightDirection,
	GridLightType,
	GridObjectType,
	GridObject,
	GridImageBlock,
	GridImageBlockLiquid,
	GridObjectActive,
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
	blocks: { [key: number]: GridObject };
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
		case LightingCalcBusInputCmd.SET_HOUR_PRECISE_OF_DAY_EFF:
			LightingCalcWorkerEngine.inputHourPreciseOfDayEff(<LightingCalcBusInputPlayloadHourOfDayEff>payload.data);
			break;
	}
};

class LightingCalcWorkerEngine {
	private static flashes: DoubleLinkedList<LightingCalcBusInputPlayloadFlash> = new DoubleLinkedList<LightingCalcBusInputPlayloadFlash>();
	private static gridActiveId: string;
	private static grids: { [key: string]: Grid };
	private static gridConfigs: { [key: string]: GridConfig };
	private static hashesBackground: { [key: number]: number } = {};
	private static hashesGroup: { [key: number]: number } = {};
	private static hourPreciseOfDayEff: number;
	private static initialized: boolean;
	private static firstByGridId: { [key: string]: boolean } = {};
	private static now: number = performance.now();
	private static self: Window & typeof globalThis;
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

		UtilEngine.setInterval(() => {
			LightingCalcWorkerEngine._calc();
		}, 10);
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
			LightingCalcWorkerEngine.firstByGridId[grids[i].id] = true;
		}

		let mapActive: MapActive = MapEditEngine.gridBlockTableInflate(<MapActive>{
			gridConfigs: data.gridConfigs,
			grids: grids,
		});
		LightingCalcWorkerEngine.grids = mapActive.grids;
		LightingCalcWorkerEngine.gridConfigs = mapActive.gridConfigs;

		LightingCalcWorkerEngine.firstByGridId = <any>new Object();
		LightingCalcWorkerEngine.hashesBackground = <any>new Object();
		LightingCalcWorkerEngine.hashesGroup = <any>new Object();
	}

	public static inputHourPreciseOfDayEff(data: LightingCalcBusInputPlayloadHourOfDayEff): void {
		LightingCalcWorkerEngine.hourPreciseOfDayEff = data.hourPreciseOfDayEff;
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

	public static output(hourPreciseOfDayEff: number, payload: Uint32Array): void {
		let data = {
			gridId: LightingCalcWorkerEngine.gridActiveId,
			hourPreciseOfDayEff: hourPreciseOfDayEff,
			payload: payload,
		};
		(<any>LightingCalcWorkerEngine.self).postMessage(data, [payload.buffer]);
	}

	private static _calc(): void {
		try {
			let brightnessByHashBackground: { [key: number]: number } = {},
				brightnessByHashGroup: { [key: number]: number } = {},
				brightnessOutside: number,
				brightnessOutsideByHash: { [key: number]: number },
				brightnessOutsideByHashBackground: { [key: number]: number } = {},
				brightnessOutsideByHashGroup: { [key: number]: number } = {},
				brightnessOutsideDayMax: number = 6,
				brightnessOutsideNightMax: number = 3,
				complexExtended: GridBlockTableComplexExtended,
				complexes: GridBlockTableComplex[],
				complexesExtended: GridBlockTableComplexExtended[],
				complexesByGxNoFoliage: { [key: number]: GridBlockTableComplex[] },
				first: boolean = LightingCalcWorkerEngine.firstByGridId[LightingCalcWorkerEngine.gridActiveId],
				foliageGyByGx: { [key: number]: GridBlockTableComplexExtended[] },
				foliageGyByGxAll: { [key: number]: GridBlockTableComplexExtended[] }[] | undefined,
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
				hashesChangesFinalOutputCount: number = 0,
				hashesChangesFinalOutput: Uint32Array,
				hashesGroup: { [key: number]: number } = {},
				hourOfDayEff: number = Math.floor(LightingCalcWorkerEngine.hourPreciseOfDayEff) + 1, // +1 to offset previous hour image blending
				hourOfDayEffOutsideModifier: number = hourOfDayEff % 12,
				j: string,
				k: number,
				lightNight: boolean,
				referenceNoFoliage: GridBlockTable<GridImageBlockReference> = <any>{},
				skip: boolean,
				z: VideoBusInputCmdGameModeEditApplyZ,
				zGroup: VideoBusInputCmdGameModeEditApplyZ[] = LightingCalcWorkerEngine.zGroup,
				_calcProcessLights = LightingCalcWorkerEngine._calcProcessLights,
				_calcProcessFoliage = LightingCalcWorkerEngine._calcProcessFoliage,
				_calcProcessReferences = LightingCalcWorkerEngine._calcProcessReferences;

			if (hourOfDayEff < 8 || hourOfDayEff > 19) {
				lightNight = true;
			} else {
				lightNight = false;
			}

			if (hourOfDayEff === 1) {
				// Small Hours
				hourOfDayEffOutsideModifier = Math.min(brightnessOutsideNightMax, 2);
			} else if (hourOfDayEff < 6) {
				// Small Hours
				hourOfDayEffOutsideModifier = Math.min(brightnessOutsideNightMax, 5 - hourOfDayEff);
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
				hourOfDayEffOutsideModifier++;
			}

			//console.log(hourOfDayEff, hourOfDayEffOutsideModifier);

			for (let i in zGroup) {
				z = zGroup[i];

				/*
				 * Day/Night Illumination (foliage ignored)
				 */
				switch (z) {
					case VideoBusInputCmdGameModeEditApplyZ.BACKGROUND:
						brightnessOutsideByHash = brightnessOutsideByHashBackground;
						referenceNoFoliage = _calcProcessReferences(
							[grid.imageBlocksBackgroundReference.hashes],
							GridObjectType.IMAGE_BLOCK_FOLIAGE,
						);
						break;
					default:
					case VideoBusInputCmdGameModeEditApplyZ.PRIMARY:
						brightnessOutsideByHash = brightnessOutsideByHashGroup;
						referenceNoFoliage = _calcProcessReferences(
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
					gy = complexes[0].value;

					for (k = 0; k < complexes.length; k++) {
						if (hourOfDayEffOutsideModifier === brightnessOutsideDayMax) {
							// Brightest part of day
							if (skip) {
								// Skip the first to allow for a smoother transition to full brightness
								brightnessOutsideByHash[complexes[k].hash] = Math.max(
									0,
									hourOfDayEffOutsideModifier - (complexes[k].value - gy),
								);
								skip = false;
							} else {
								brightnessOutsideByHash[complexes[k].hash] = Math.max(
									0,
									hourOfDayEffOutsideModifier - Math.max(0, complexes[k].value - gy - 1),
								);
							}
						} else {
							// complexes[k].value - gy, shadows depend on distance from first, not consecutive blocks
							brightnessOutsideByHash[complexes[k].hash] = Math.max(
								0,
								hourOfDayEffOutsideModifier - (complexes[k].value - gy),
							);
						}
					}
				}

				/*
				 * Day/Night Shadows for Foliage
				 */
				if (foliageGyByGxAll === undefined) {
					foliageGyByGxAll = [
						_calcProcessFoliage(grid.imageBlocksBackgroundFoliage),
						_calcProcessFoliage(grid.imageBlocksPrimaryFoliage),
						_calcProcessFoliage(grid.imageBlocksForegroundFoliage),
						_calcProcessFoliage(grid.imageBlocksVanishingFoliage),
					];
				}

				for (j in foliageGyByGxAll) {
					foliageGyByGx = foliageGyByGxAll[j];

					for (gxString in foliageGyByGx) {
						complexesExtended = foliageGyByGx[gxString];

						for (k = 0; k < complexesExtended.length; k++) {
							complexExtended = complexesExtended[k];
							gridImageBlockFoliage = <GridImageBlockFoliage>complexExtended.blocks[complexExtended.hash];

							gy = gridImageBlockFoliage.gy;
							gyEff = gridImageBlockFoliage.gSizeH + gy;

							if (gyEff > gHeight) {
								// Shadow below map, some goof put a tree on the bottom of the map
								continue;
							}
							gx = Number(gxString);
							gSizeW = gridImageBlockFoliage.gSizeW + gx;

							/*
							 * Light Foliage
							 */
							if (k === 0) {
								if (!complexesByGxNoFoliage[gx] || complexesByGxNoFoliage[gx][0].value >= gy) {
									brightnessOutsideByHash[gridImageBlockFoliage.hash] = Math.max(0, hourOfDayEffOutsideModifier);
								}
							}

							/*
							 * Foliage Shadow
							 */
							// Shift shadow by time of day (sun rise is east/right)
							if (15 < hourOfDayEff && hourOfDayEff < 22) {
								if (hourOfDayEff > 17 && hourOfDayEff !== 21) {
									// Long shadow, right
									if (gx === gWidth) {
										gxEff = gx;
										gSizeW = gx + 1;
									} else {
										gxEff = gx + 1;
										gSizeW += 2;
									}
								} else {
									// shadow, right
									if (gx === gWidth) {
										gxEff = gx;
										gSizeW = gx + 1;
									} else {
										gxEff = gx;
										gSizeW++;
									}
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
								} else {
									// shadow, left
									if (gx === 0) {
										gxEff = gx;
									} else {
										gxEff = gx - 1;
									}
								}
							} else {
								// Shadow directly below
								gxEff = gx;
							}

							for (; gxEff < gSizeW; gxEff++) {
								// Is there something blocking the sun above the foliage on this gx column?
								if (!complexesByGxNoFoliage[gxEff] || complexesByGxNoFoliage[gxEff][0].value >= gy) {
									// Hash is ground below foliage
									hash = UtilEngine.gridHashTo(gxEff, gyEff);

									// Apply shadow
									brightnessOutside = brightnessOutsideByHash[hash];
									if (brightnessOutside === hourOfDayEffOutsideModifier) {
										// Shadows are not additive (prevents multiple shadow overlaps)
										brightnessOutsideByHash[hash] = Math.max(0, brightnessOutside - 2);
									} else if (brightnessOutside === hourOfDayEffOutsideModifier - 1) {
										// Shadows are not additive (prevents multiple shadow overlaps)
										brightnessOutsideByHash[hash] = Math.max(0, brightnessOutside - 1);
									}
								}
							}
						}
					}
				}
			}

			/**
			 * Third pass: Points of light, group layer and background layer with smaller radius
			 */
			_calcProcessLights(
				lightNight,
				grid.lightsPrimary,
				grid.imageBlocksPrimaryReference.hashes,
				brightnessByHashBackground,
				brightnessByHashGroup,
			);
			_calcProcessLights(
				lightNight,
				grid.lightsForeground,
				grid.imageBlocksForegroundReference.hashes,
				brightnessByHashBackground,
				brightnessByHashGroup,
			);

			/**
			 * Fourth pass: Flash
			 */

			/**
			 * Merge and check for changes
			 */
			// Merge hashes into single map: background
			for (hashString in brightnessByHashBackground) {
				hashesBackground[hashString] = LightingCalcWorkerEngine.hashBrightness(
					Math.min(brightnessOutsideDayMax, brightnessByHashBackground[hashString]),
					brightnessOutsideByHashBackground[hashString] || 0,
				);
			}
			for (hashString in brightnessOutsideByHashBackground) {
				if (hashesBackground[hashString] === undefined) {
					hashesBackground[hashString] = LightingCalcWorkerEngine.hashBrightness(
						Math.min(brightnessOutsideDayMax, brightnessByHashBackground[hashString] || 0),
						brightnessOutsideByHashBackground[hashString],
					);
				}
			}

			// Change detection: background
			for (hashString in hashesBackground) {
				if (LightingCalcWorkerEngine.hashesBackground[hashString] !== hashesBackground[hashString]) {
					LightingCalcWorkerEngine.hashesBackground[hashString] = hashesBackground[hashString];
					hashesChangesBackground[hashString] = hashesBackground[hashString];
				}
			}

			// Merge hashes into single map: group
			for (hashString in brightnessByHashGroup) {
				hashesGroup[hashString] = LightingCalcWorkerEngine.hashBrightness(
					Math.min(brightnessOutsideDayMax, brightnessByHashGroup[hashString]),
					brightnessOutsideByHashGroup[hashString] || 0,
				);
			}
			for (hashString in brightnessOutsideByHashGroup) {
				if (hashesGroup[hashString] === undefined) {
					hashesGroup[hashString] = LightingCalcWorkerEngine.hashBrightness(
						Math.min(brightnessOutsideDayMax, brightnessByHashGroup[hashString] || 0),
						brightnessOutsideByHashGroup[hashString],
					);
				}
			}

			// Change detection: group
			for (hashString in hashesGroup) {
				if (LightingCalcWorkerEngine.hashesGroup[hashString] !== hashesGroup[hashString]) {
					LightingCalcWorkerEngine.hashesGroup[hashString] = hashesGroup[hashString];
					hashesChangesGroup[hashString] = hashesGroup[hashString];
				}
			}

			/**
			 * Merge changes
			 */
			for (hashString in hashesChangesBackground) {
				hashesChangesFinal[hashString] = LightingCalcWorkerEngine.hashStackBrightness(
					hashesChangesBackground[hashString],
					LightingCalcWorkerEngine.hashesGroup[hashString] || 0,
				);
			}
			for (hashString in hashesChangesGroup) {
				if (hashesChangesFinal[hashString] === undefined) {
					hashesChangesFinal[hashString] = LightingCalcWorkerEngine.hashStackBrightness(
						LightingCalcWorkerEngine.hashesBackground[hashString] || 0,
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

				hashesChangesFinalOutputCount++;
			}

			// If data available create transferrable buffer
			hashesChangesFinalOutput = new Uint32Array(hashesChangesFinalOutputCount);
			if (hashesChangesFinalOutputCount) {
				hashesChangesFinalOutputCount = 0;
				for (hashString in hashesChangesFinal) {
					if (first && hashesChangesFinal[hashString] === 0) {
						continue;
					}

					hashesChangesFinalOutput[hashesChangesFinalOutputCount] = LightingCalcWorkerEngine.hashMergeG(
						Number(hashString),
						hashesChangesFinal[hashString],
					);
					hashesChangesFinalOutputCount++;
				}
			}
			// Report the original hour as the calc is for the next hour
			// That way images blended with the previous hour are correctly representing the current hour
			LightingCalcWorkerEngine.output(LightingCalcWorkerEngine.hourPreciseOfDayEff, hashesChangesFinalOutput);
			if (first) {
				// console.log('hashesChangesFinalOutput', hashesChangesFinalOutput);
				LightingCalcWorkerEngine.firstByGridId[LightingCalcWorkerEngine.gridActiveId] = false;
			}
		} catch (error: any) {
			//console.error('LightingCalcWorkerEngine > _calc: error', error);
		}
	}

	/**
	 * Sets hash brightnesses via light sources
	 */
	private static test: boolean;
	private static _calcProcessLights(
		lightNight: boolean,
		lightsBlockTable: GridBlockTable<GridLight>,
		blocks: { [key: number]: GridImageBlockReference },
		brightnessByHashBackground: { [key: number]: number },
		brightnessByHashGroup: { [key: number]: number },
	) {
		let brightness: number,
			brightnessByHashBackgroundTmp: { [key: number]: number },
			brightnessByHashGroupTmp: { [key: number]: number },
			complex: GridBlockTableComplexExtended,
			direction: GridLightDirection,
			directions: GridLightDirection[],
			gRadius: number,
			gxString: string,
			i: string,
			j: string,
			k: string,
			light: GridLight,
			lights: { [key: number]: GridLight } = lightsBlockTable.hashes,
			lightsGy: GridBlockTableComplexExtended[],
			lightsGyByGx: { [key: number]: GridBlockTableComplexExtended[] } = <any>lightsBlockTable.hashesGyByGx,
			_calcProcessLightsDown = LightingCalcWorkerEngine._calcProcessLightsDown,
			_calcProcessLightsLeft = LightingCalcWorkerEngine._calcProcessLightsLeft,
			_calcProcessLightsRight = LightingCalcWorkerEngine._calcProcessLightsRight,
			_calcProcessLightsUp = LightingCalcWorkerEngine._calcProcessLightsUp;

		for (gxString in lightsGyByGx) {
			lightsGy = lightsGyByGx[gxString];

			for (i in lightsGy) {
				complex = lightsGy[i];

				// Config
				light = lights[complex.hash];

				if (light.extends) {
					continue;
				} else if (light.nightOnly && !lightNight) {
					continue;
				}

				if (light.directionOmni) {
					brightness = <number>light.directionOmniBrightness;
					brightnessByHashBackgroundTmp = <any>new Object();
					brightnessByHashGroupTmp = <any>new Object();
					gRadius = <number>light.directionOmniGRadius;

					// Light beam
					try {
						_calcProcessLightsDown(blocks, brightness, gRadius, light, brightnessByHashBackgroundTmp, brightnessByHashGroupTmp);
						_calcProcessLightsLeft(blocks, brightness, gRadius, light, brightnessByHashBackgroundTmp, brightnessByHashGroupTmp);
						_calcProcessLightsRight(
							blocks,
							brightness,
							gRadius,
							light,
							brightnessByHashBackgroundTmp,
							brightnessByHashGroupTmp,
						);
						_calcProcessLightsUp(blocks, brightness, gRadius, light, brightnessByHashBackgroundTmp, brightnessByHashGroupTmp);

						// Remove on self additive values
						for (k in brightnessByHashBackgroundTmp) {
							brightnessByHashBackground[k] =
								(brightnessByHashBackground[k] || 0) + Math.min(brightness, brightnessByHashBackgroundTmp[k]);
						}
						for (k in brightnessByHashGroupTmp) {
							brightnessByHashGroup[k] = (brightnessByHashGroup[k] || 0) + Math.min(brightness, brightnessByHashGroupTmp[k]);
						}
					} catch (error) {
						if (!LightingCalcWorkerEngine.test) {
							console.error(error);
						}
						console.error(error);
					}
					LightingCalcWorkerEngine.test = true;
				} else {
					directions = <any>light.directions;

					for (j in directions) {
						direction = directions[j];

						brightness = direction.brightness;
						gRadius = direction.gRadius;

						// Light beam
						switch (direction.type) {
							case GridLightType.DOWN:
								_calcProcessLightsDown(
									blocks,
									brightness,
									gRadius,
									light,
									brightnessByHashBackground,
									brightnessByHashGroup,
								);
								break;
							case GridLightType.LEFT:
								_calcProcessLightsLeft(
									blocks,
									brightness,
									gRadius,
									light,
									brightnessByHashBackground,
									brightnessByHashGroup,
								);
								break;
							case GridLightType.RIGHT:
								_calcProcessLightsRight(
									blocks,
									brightness,
									gRadius,
									light,
									brightnessByHashBackground,
									brightnessByHashGroup,
								);
								break;
							case GridLightType.UP:
								_calcProcessLightsUp(blocks, brightness, gRadius, light, brightnessByHashBackground, brightnessByHashGroup);
								break;
						}
					}
				}
			}
		}
	}

	private static _calcProcessLightsDown(
		blocks: { [key: number]: GridImageBlockReference },
		brightness: number,
		gRadius: number,
		light: GridLight,
		brightnessByHashBackground: { [key: number]: number },
		brightnessByHashGroup: { [key: number]: number },
	): void {
		let brightnessByGyByGx: { [key: number]: { [key: number]: number } } = {},
			brightnessEff: number,
			brightnessLookup: number | undefined,
			extended: { [key: number]: null } = {},
			gridImageBlock: GridImageBlock,
			gx: number,
			gxStart: number = light.gx,
			gxStop: number = light.gx + (light.gSizeW - 1),
			gxStopEff: number,
			gyStart: number = light.gy + light.gSizeH - 1,
			gyStop: number = gyStart + gRadius + 1,
			hash: number;

		for (let gy = gyStart, i = 0; gy < gyStop; gy++, i++) {
			gxStopEff = gxStop + i + 1;
			for (gx = gxStart - i; gx < gxStopEff; gx++) {
				// Current positon hash
				hash = UtilEngine.gridHashTo(gx, gy);

				if (brightnessByGyByGx[gx] === undefined) {
					brightnessByGyByGx[gx] = {};
				}

				// Inheritence
				if (brightnessByGyByGx[gx][gy] !== undefined) {
					// Pre-defined inheritence
					brightnessEff = brightnessByGyByGx[gx][gy];
				} else {
					// Dynamic inheritence
					if (gx < gxStart) {
						// Left
						brightnessLookup = (brightnessByGyByGx[gx + 1] || {})[gy - 1];
					} else if (gx > gxStop) {
						// Right
						brightnessLookup = (brightnessByGyByGx[gx - 1] || {})[gy - 1];
					} else {
						// Vertical
						brightnessLookup = brightnessByGyByGx[gx][gy - 1];
					}
					brightnessEff = brightnessLookup !== undefined ? brightnessLookup : brightness;
					brightnessByGyByGx[gx][gy] = brightnessEff;
				}

				// Obstructions, pre-define inheritence for next block
				if (blocks[hash] !== undefined) {
					gridImageBlock = blocks[hash].block;

					// Left
					if (brightnessByGyByGx[gx - 1] === undefined) {
						brightnessByGyByGx[gx - 1] = {};
					}
					// Right
					if (brightnessByGyByGx[gx + 1] === undefined) {
						brightnessByGyByGx[gx + 1] = {};
					}

					// Map
					if (gridImageBlock.objectType === GridObjectType.IMAGE_BLOCK_SOLID) {
						// Block brightness in next block
						if (gx < gxStart) {
							brightnessByGyByGx[gx - 1][gy + 1] = 0; // Left
						} else if (gx > gxStop) {
							brightnessByGyByGx[gx + 1][gy + 1] = 0; // Right
						} else {
							if (gx - 1 < gxStart) {
								brightnessByGyByGx[gx - 1][gy + 1] = 0; // Left
							}
							if (gx + 1 > gxStop) {
								brightnessByGyByGx[gx + 1][gy + 1] = 0; // Right
							}
							brightnessByGyByGx[gx][gy + 1] = 0; // Vertical
						}
					} else {
						// Dim brightness in next block
						if (gx < gxStart) {
							brightnessByGyByGx[gx - 1][gy + 1] = Math.max(0, brightnessEff - 1); // Left
						} else if (gx > gxStop) {
							brightnessByGyByGx[gx + 1][gy + 1] = Math.max(0, brightnessEff - 1); // Right
						} else {
							if (gx - 1 > gxStart) {
								brightnessByGyByGx[gx - 1][gy + 1] = Math.max(0, brightnessEff - 1); // Left
							}
							if (gx + 1 < gxStop) {
								brightnessByGyByGx[gx + 1][gy + 1] = Math.max(0, brightnessEff - 1); // Right
							}
							brightnessByGyByGx[gx][gy + 1] = Math.max(0, brightnessEff - 1); // Vertical
						}
					}

					// Extensions
					if (gridImageBlock.extends) {
						gridImageBlock = blocks[gridImageBlock.extends].block;

						if (extended[gridImageBlock.hash] !== null) {
							extended[gridImageBlock.hash] = null;

							if (brightnessByGyByGx[gridImageBlock.gx] === undefined) {
								brightnessByGyByGx[gridImageBlock.gx] = {};
								brightnessByGyByGx[gridImageBlock.gx][gridImageBlock.gy] = brightnessEff;
							} else {
								if (brightnessByGyByGx[gridImageBlock.gx][gridImageBlock.gy] === undefined) {
									brightnessByGyByGx[gridImageBlock.gx][gridImageBlock.gy] = brightnessEff;
								}
							}

							// Assign brightness (additive)
							brightnessByHashGroup[gridImageBlock.hash] = (brightnessByHashGroup[gridImageBlock.hash] || 0) + brightnessEff;
						}
					}
				}

				// Assign brightness (additive)
				brightnessByHashBackground[hash] = (brightnessByHashBackground[hash] || 0) + brightnessEff;
				brightnessByHashGroup[hash] = (brightnessByHashGroup[hash] || 0) + brightnessEff;
			}
		}
	}

	private static _calcProcessLightsLeft(
		blocks: { [key: number]: GridImageBlockReference },
		brightness: number,
		gRadius: number,
		light: GridLight,
		brightnessByHashBackground: { [key: number]: number },
		brightnessByHashGroup: { [key: number]: number },
	): void {
		let brightnessByGyByGx: { [key: number]: { [key: number]: number } } = {},
			brightnessEff: number,
			brightnessLookup: number | undefined,
			extended: { [key: number]: null } = {},
			gridImageBlock: GridImageBlock,
			gxStart: number = light.gx,
			gxStop: number = gxStart - gRadius - 1,
			gy: number,
			gyCenterBottom: number = light.gy + (light.gSizeH - 1),
			gyCenterTop: number = light.gy,
			gyStart: number = light.gy - Math.round(gRadius / 2) + 2,
			gyStop: number = gyStart + light.gSizeH + Math.round(gRadius / 2) - 3,
			gyStopEff: number,
			hash: number;

		for (let gx = gxStart, i = 0; gx > gxStop; gx--, i++) {
			gyStopEff = gyStop + i + 1;
			for (gy = gyStart - i; gy < gyStopEff; gy++) {
				// Current positon hash
				hash = UtilEngine.gridHashTo(gx, gy);

				if (brightnessByGyByGx[gx] === undefined) {
					brightnessByGyByGx[gx] = {};
				}

				// Inheritence
				if (brightnessByGyByGx[gx][gy] !== undefined) {
					// Pre-defined inheritence
					brightnessEff = brightnessByGyByGx[gx][gy];
				} else {
					// Dynamic inheritence
					if (gy < gyCenterTop) {
						// Down
						brightnessLookup = (brightnessByGyByGx[gx + 1] || {})[gy + 1];
					} else if (gy > gyCenterBottom) {
						// Up
						brightnessLookup = (brightnessByGyByGx[gx + 1] || {})[gy - 1];
					} else {
						// Horizontal
						brightnessLookup = (brightnessByGyByGx[gx + 1] || {})[gy];
					}
					brightnessEff = brightnessLookup !== undefined ? brightnessLookup : brightness;
					brightnessByGyByGx[gx][gy] = brightnessEff;
				}

				// Obstructions, pre-define inheritence for next block
				if (blocks[hash] !== undefined) {
					gridImageBlock = blocks[hash].block;

					// Left
					if (brightnessByGyByGx[gx - 1] === undefined) {
						brightnessByGyByGx[gx - 1] = {};
					}

					// Map
					if (gridImageBlock.objectType === GridObjectType.IMAGE_BLOCK_SOLID) {
						// Block brightness in next block
						if (gy > gyCenterBottom) {
							brightnessByGyByGx[gx - 1][gy + 1] = 0; // Down
						} else if (gy < gyCenterTop) {
							brightnessByGyByGx[gx - 1][gy - 1] = 0; // Up
						} else {
							if (gy + 1 > gyCenterBottom) {
								brightnessByGyByGx[gx - 1][gy + 1] = 0; // Down
							}
							if (gy - 1 < gyCenterTop) {
								brightnessByGyByGx[gx - 1][gy - 1] = 0; // Up
							}
							brightnessByGyByGx[gx - 1][gy] = 0; // Horizontal
						}
					} else {
						// Dim brightness in next block
						if (gy > gyCenterBottom) {
							brightnessByGyByGx[gx - 1][gy + 1] = Math.max(0, brightnessEff - 1); // Down
						} else if (gy < gyCenterTop) {
							brightnessByGyByGx[gx - 1][gy - 1] = Math.max(0, brightnessEff - 1); // Up
						} else {
							if (gy + 1 > gyCenterBottom) {
								brightnessByGyByGx[gx - 1][gy + 1] = Math.max(0, brightnessEff - 1); // Down
							}
							if (gy - 1 < gyCenterTop) {
								brightnessByGyByGx[gx - 1][gy - 1] = Math.max(0, brightnessEff - 1); // Up
							}
							brightnessByGyByGx[gx - 1][gy] = Math.max(0, brightnessEff - 1); // Horizontal
						}
					}

					// Extensions
					if (gridImageBlock.extends) {
						gridImageBlock = blocks[gridImageBlock.extends].block;

						if (extended[gridImageBlock.hash] !== null) {
							extended[gridImageBlock.hash] = null;

							if (brightnessByGyByGx[gridImageBlock.gx] === undefined) {
								brightnessByGyByGx[gridImageBlock.gx] = {};
								brightnessByGyByGx[gridImageBlock.gx][gridImageBlock.gy] = brightnessEff;
							} else {
								if (brightnessByGyByGx[gridImageBlock.gx][gridImageBlock.gy] === undefined) {
									brightnessByGyByGx[gridImageBlock.gx][gridImageBlock.gy] = brightnessEff;
								}
							}

							// Assign brightness (additive)
							brightnessByHashGroup[gridImageBlock.hash] = (brightnessByHashGroup[gridImageBlock.hash] || 0) + brightnessEff;
						}
					}
				}

				// Assign brightness (additive)
				brightnessByHashBackground[hash] = (brightnessByHashBackground[hash] || 0) + brightnessEff;
				brightnessByHashGroup[hash] = (brightnessByHashGroup[hash] || 0) + brightnessEff;
			}
		}
	}

	private static _calcProcessLightsRight(
		blocks: { [key: number]: GridImageBlockReference },
		brightness: number,
		gRadius: number,
		light: GridLight,
		brightnessByHashBackground: { [key: number]: number },
		brightnessByHashGroup: { [key: number]: number },
	): void {
		let brightnessByGyByGx: { [key: number]: { [key: number]: number } } = {},
			brightnessEff: number,
			brightnessLookup: number | undefined,
			extended: { [key: number]: null } = {},
			gridImageBlock: GridImageBlock,
			gxStart: number = light.gx + (light.gSizeW - 1),
			gxStop: number = gxStart + gRadius + 1,
			gy: number,
			gyCenterBottom: number = light.gy + (light.gSizeH - 1),
			gyCenterTop: number = light.gy,
			gyStart: number = light.gy - Math.round(gRadius / 2) + 2,
			gyStop: number = gyStart + light.gSizeH + Math.round(gRadius / 2) - 3,
			gyStopEff: number,
			hash: number;

		for (let gx = gxStart, i = 0; gx < gxStop; gx++, i++) {
			gyStopEff = gyStop + i + 1;
			for (gy = gyStart - i; gy < gyStopEff; gy++) {
				// Current positon hash
				hash = UtilEngine.gridHashTo(gx, gy);

				if (brightnessByGyByGx[gx] === undefined) {
					brightnessByGyByGx[gx] = {};
				}

				// Inheritence
				if (brightnessByGyByGx[gx][gy] !== undefined) {
					// Pre-defined inheritence
					brightnessEff = brightnessByGyByGx[gx][gy];
				} else {
					// Dynamic inheritence
					if (gy < gyCenterTop) {
						// Down
						brightnessLookup = (brightnessByGyByGx[gx - 1] || {})[gy + 1];
					} else if (gy > gyCenterBottom) {
						// Up
						brightnessLookup = (brightnessByGyByGx[gx - 1] || {})[gy - 1];
					} else {
						// Horizontal
						brightnessLookup = (brightnessByGyByGx[gx - 1] || {})[gy];
					}
					brightnessEff = brightnessLookup !== undefined ? brightnessLookup : brightness;
					brightnessByGyByGx[gx][gy] = brightnessEff;
				}

				// Obstructions, pre-define inheritence for next block
				if (blocks[hash] !== undefined) {
					gridImageBlock = blocks[hash].block;

					// Right
					if (brightnessByGyByGx[gx + 1] === undefined) {
						brightnessByGyByGx[gx + 1] = {};
					}

					// Map
					if (gridImageBlock.objectType === GridObjectType.IMAGE_BLOCK_SOLID) {
						// Block brightness in next block
						if (gy > gyCenterBottom) {
							brightnessByGyByGx[gx + 1][gy + 1] = 0; // Down
						} else if (gy < gyCenterTop) {
							brightnessByGyByGx[gx + 1][gy - 1] = 0; // Up
						} else {
							if (gy + 1 > gyCenterBottom) {
								brightnessByGyByGx[gx + 1][gy + 1] = 0; // Down
							}
							if (gy - 1 < gyCenterTop) {
								brightnessByGyByGx[gx + 1][gy - 1] = 0; // Up
							}
							brightnessByGyByGx[gx + 1][gy] = 0; // Horizontal
						}
					} else {
						// Dim brightness in next block
						if (gy > gyCenterBottom) {
							brightnessByGyByGx[gx + 1][gy - 1] = Math.max(0, brightnessEff - 1); // Up
						} else if (gy < gyCenterTop) {
							brightnessByGyByGx[gx + 1][gy + 1] = Math.max(0, brightnessEff - 1); // Down
						} else {
							if (gy + 1 > gyCenterBottom) {
								brightnessByGyByGx[gx + 1][gy + 1] = Math.max(0, brightnessEff - 1); // Down
							}
							if (gy - 1 < gyCenterTop) {
								brightnessByGyByGx[gx + 1][gy - 1] = Math.max(0, brightnessEff - 1); // Up
							}
							brightnessByGyByGx[gx + 1][gy] = Math.max(0, brightnessEff - 1); // Horizontal
						}
					}

					// Extensions
					if (gridImageBlock.extends) {
						gridImageBlock = blocks[gridImageBlock.extends].block;

						if (extended[gridImageBlock.hash] !== null) {
							extended[gridImageBlock.hash] = null;

							if (brightnessByGyByGx[gridImageBlock.gx] === undefined) {
								brightnessByGyByGx[gridImageBlock.gx] = {};
								brightnessByGyByGx[gridImageBlock.gx][gridImageBlock.gy] = brightnessEff;
							} else {
								if (brightnessByGyByGx[gridImageBlock.gx][gridImageBlock.gy] === undefined) {
									brightnessByGyByGx[gridImageBlock.gx][gridImageBlock.gy] = brightnessEff;
								}
							}

							// Assign brightness (additive)
							brightnessByHashGroup[gridImageBlock.hash] = (brightnessByHashGroup[gridImageBlock.hash] || 0) + brightnessEff;
						}
					}
				}

				// Assign brightness (additive)
				brightnessByHashBackground[hash] = (brightnessByHashBackground[hash] || 0) + brightnessEff;
				brightnessByHashGroup[hash] = (brightnessByHashGroup[hash] || 0) + brightnessEff;
			}
		}
	}

	private static _calcProcessLightsUp(
		blocks: { [key: number]: GridImageBlockReference },
		brightness: number,
		gRadius: number,
		light: GridLight,
		brightnessByHashBackground: { [key: number]: number },
		brightnessByHashGroup: { [key: number]: number },
	): void {
		let brightnessByGyByGx: { [key: number]: { [key: number]: number } } = {},
			brightnessEff: number,
			brightnessLookup: number | undefined,
			extended: { [key: number]: null } = {},
			gridImageBlock: GridImageBlock,
			gx: number,
			gxStart: number = light.gx,
			gxStop: number = light.gx + (light.gSizeW - 1),
			gxStopEff: number,
			gyStart: number = light.gy,
			gyStop: number = gyStart - gRadius - 1,
			hash: number;

		for (let gy = gyStart, i = 0; gy > gyStop; gy--, i++) {
			gxStopEff = gxStop + i + 1;
			for (gx = gxStart - i; gx < gxStopEff; gx++) {
				// Current positon hash
				hash = UtilEngine.gridHashTo(gx, gy);

				if (brightnessByGyByGx[gx] === undefined) {
					brightnessByGyByGx[gx] = {};
				}

				// Inheritence
				if (brightnessByGyByGx[gx][gy] !== undefined) {
					// Pre-defined inheritence
					brightnessEff = brightnessByGyByGx[gx][gy];
				} else {
					// Dynamic inheritence
					if (gx < gxStart) {
						// Left
						brightnessLookup = (brightnessByGyByGx[gx + 1] || {})[gy + 1];
					} else if (gx > gxStop) {
						// Right
						brightnessLookup = (brightnessByGyByGx[gx - 1] || {})[gy + 1];
					} else {
						// Vertical
						brightnessLookup = brightnessByGyByGx[gx][gy + 1];
					}
					brightnessEff = brightnessLookup !== undefined ? brightnessLookup : brightness;
					brightnessByGyByGx[gx][gy] = brightnessEff;
				}

				// Obstructions, pre-define inheritence for next block
				if (blocks[hash] !== undefined) {
					gridImageBlock = blocks[hash].block;

					// Left
					if (brightnessByGyByGx[gx - 1] === undefined) {
						brightnessByGyByGx[gx - 1] = {};
					}
					// Right
					if (brightnessByGyByGx[gx + 1] === undefined) {
						brightnessByGyByGx[gx + 1] = {};
					}

					// Map
					if (gridImageBlock.objectType === GridObjectType.IMAGE_BLOCK_SOLID) {
						// Block brightness in next block
						if (gx < gxStart) {
							brightnessByGyByGx[gx - 1][gy - 1] = 0; // Left
						} else if (gx > gxStop) {
							brightnessByGyByGx[gx + 1][gy - 1] = 0; // Right
						} else {
							if (gx - 1 < gxStart) {
								brightnessByGyByGx[gx - 1][gy - 1] = 0; // Left
							}
							if (gx + 1 > gxStop) {
								brightnessByGyByGx[gx + 1][gy - 1] = 0; // Right
							}
							brightnessByGyByGx[gx][gy - 1] = 0; // Vertical
						}
					} else {
						// Dim brightness in next block
						if (gx < gxStart) {
							brightnessByGyByGx[gx - 1][gy - 1] = Math.max(0, brightnessEff - 1); // Left
						} else if (gx > gxStop) {
							brightnessByGyByGx[gx + 1][gy - 1] = Math.max(0, brightnessEff - 1); // Right
						} else {
							if (gx - 1 < gxStart) {
								brightnessByGyByGx[gx - 1][gy - 1] = Math.max(0, brightnessEff - 1); // Left
							}
							if (gx + 1 > gxStop) {
								brightnessByGyByGx[gx + 1][gy - 1] = Math.max(0, brightnessEff - 1); // Right
							}
							brightnessByGyByGx[gx][gy - 1] = Math.max(0, brightnessEff - 1); // Vertical
						}
					}

					// Extensions
					if (gridImageBlock.extends) {
						gridImageBlock = blocks[gridImageBlock.extends].block;

						if (extended[gridImageBlock.hash] !== null) {
							extended[gridImageBlock.hash] = null;

							if (brightnessByGyByGx[gridImageBlock.gx] === undefined) {
								brightnessByGyByGx[gridImageBlock.gx] = {};
								brightnessByGyByGx[gridImageBlock.gx][gridImageBlock.gy] = brightnessEff;
							} else {
								if (brightnessByGyByGx[gridImageBlock.gx][gridImageBlock.gy] === undefined) {
									brightnessByGyByGx[gridImageBlock.gx][gridImageBlock.gy] = brightnessEff;
								}
							}

							// Assign brightness (additive)
							brightnessByHashGroup[gridImageBlock.hash] = (brightnessByHashGroup[gridImageBlock.hash] || 0) + brightnessEff;
						}
					}
				}

				// Assign brightness (additive)
				brightnessByHashBackground[hash] = (brightnessByHashBackground[hash] || 0) + brightnessEff;
				brightnessByHashGroup[hash] = (brightnessByHashGroup[hash] || 0) + brightnessEff;
			}
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
