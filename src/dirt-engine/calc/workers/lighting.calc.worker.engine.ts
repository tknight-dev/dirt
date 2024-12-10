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
	private static calcIntervalInMs: number = 10;
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
		VideoBusInputCmdGameModeEditApplyZ.BACKGROUND1,
		VideoBusInputCmdGameModeEditApplyZ.INTERACTIVE, // Last
	];

	public static async initialize(self: Window & typeof globalThis): Promise<void> {
		if (LightingCalcWorkerEngine.initialized) {
			console.error('LightingCalcWorkerEngine > initialize: already initialized');
			return;
		}
		LightingCalcWorkerEngine.initialized = true;
		LightingCalcWorkerEngine.self = self;
		LightingCalcWorkerEngine._calc();
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
		let brightnessByHashBackground: { [key: number]: number },
			brightnessByHashGroup: { [key: number]: number },
			brightnessOutside: number,
			brightnessOutsideByHash: { [key: number]: number },
			brightnessOutsideByHashBackground: { [key: number]: number },
			brightnessOutsideByHashGroup: { [key: number]: number },
			brightnessOutsideDayMax: number = 6,
			brightnessOutsideNightMax: number = 3,
			complexExtended: GridBlockTableComplexExtended,
			complexes: GridBlockTableComplex[],
			complexesExtended: GridBlockTableComplexExtended[],
			complexesByGxNoFoliage: { [key: number]: GridBlockTableComplex[] },
			first: boolean,
			foliageGyByGx: { [key: number]: GridBlockTableComplexExtended[] },
			foliageGyByGxAll: { [key: number]: GridBlockTableComplexExtended[] }[] | undefined,
			grid: Grid,
			gridConfig: GridConfig,
			gridImageBlock: GridImageBlock,
			gridImageBlockFoliage: GridImageBlockFoliage,
			gSizeW: number,
			gHeight: number,
			gWidth: number,
			gx: number,
			gxEff: number,
			gxString: string,
			gy: number,
			gyEff: number,
			hash: number,
			hashString: string,
			hashesBackground: { [key: number]: number },
			hashesChangesBackground: { [key: number]: number },
			hashesChangesGroup: { [key: number]: number },
			hashesChangesFinal: { [key: number]: number },
			hashesChangesFinalOutputCount: number,
			hashesChangesFinalOutput: Uint32Array,
			hashesGroup: { [key: number]: number },
			hourOfDayEff: number,
			hourOfDayEffOutsideModifier: number,
			j: string,
			k: number,
			lightNight: boolean,
			referenceNoFoliage: GridBlockTable<GridImageBlockReference>,
			skip: boolean,
			z: VideoBusInputCmdGameModeEditApplyZ,
			zGroup: VideoBusInputCmdGameModeEditApplyZ[] = LightingCalcWorkerEngine.zGroup,
			_calcProcessLights = LightingCalcWorkerEngine._calcProcessLights,
			_calcProcessFoliage = LightingCalcWorkerEngine._calcProcessFoliage,
			_calcProcessReferences = LightingCalcWorkerEngine._calcProcessReferences;

		UtilEngine.setInterval(() => {
			try {
				brightnessByHashBackground = <any>new Object();
				brightnessByHashGroup = <any>new Object();
				brightnessOutsideByHashBackground = <any>new Object();
				brightnessOutsideByHashGroup = <any>new Object();
				first = LightingCalcWorkerEngine.firstByGridId[LightingCalcWorkerEngine.gridActiveId];
				grid = LightingCalcWorkerEngine.grids[LightingCalcWorkerEngine.gridActiveId];
				gridConfig = LightingCalcWorkerEngine.gridConfigs[LightingCalcWorkerEngine.gridActiveId];
				gHeight = gridConfig.gHeight;
				gWidth = gridConfig.gWidth;
				hashesBackground = <any>new Object();
				hashesChangesBackground = <any>new Object();
				hashesChangesGroup = <any>new Object();
				hashesChangesFinal = <any>new Object();
				hashesChangesFinalOutputCount = 0;
				hashesGroup = <any>new Object();
				hourOfDayEff = Math.floor(LightingCalcWorkerEngine.hourPreciseOfDayEff) + 1; // +1 to offset previous hour image blending
				hourOfDayEffOutsideModifier = hourOfDayEff % 12;
				referenceNoFoliage = <any>new Object();

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
						case VideoBusInputCmdGameModeEditApplyZ.BACKGROUND1:
						case VideoBusInputCmdGameModeEditApplyZ.BACKGROUND2:
							brightnessOutsideByHash = brightnessOutsideByHashBackground;
							referenceNoFoliage = _calcProcessReferences(
								[grid.imageBlocksBackground1Reference.hashes, grid.imageBlocksBackground2Reference.hashes],
								GridObjectType.IMAGE_BLOCK_FOLIAGE,
							);
							break;
						default:
						case VideoBusInputCmdGameModeEditApplyZ.INTERACTIVE:
							brightnessOutsideByHash = brightnessOutsideByHashGroup;
							referenceNoFoliage = _calcProcessReferences(
								[
									grid.imageBlocksInteractiveReference.hashes,
									grid.imageBlocksForeground1Reference.hashes,
									grid.imageBlocksForeground2Reference.hashes,
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

						// Check for light interaction
						gridImageBlock = referenceNoFoliage.hashes[complexes[0].hash].block;
						if (gridImageBlock.passthroughLight) {
							for (k = 1; k < complexes.length; k++) {
								gridImageBlock = referenceNoFoliage.hashes[complexes[k].hash].block;

								if (!gridImageBlock.passthroughLight) {
									break;
								}
							}
						}
						if (gridImageBlock.passthroughLight) {
							continue; // no light interacting blocks on this gx column
						}

						// Shade
						gy = gridImageBlock.gy;
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
							_calcProcessFoliage(grid.imageBlocksBackground1Foliage),
							_calcProcessFoliage(grid.imageBlocksBackground2Foliage),
							_calcProcessFoliage(grid.imageBlocksInteractiveFoliage),
							_calcProcessFoliage(grid.imageBlocksForeground1Foliage),
							_calcProcessFoliage(grid.imageBlocksForeground2Foliage),
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

								if (gridImageBlockFoliage.passthroughLight) {
									continue;
								}

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
					grid.lightsInteractive,
					grid.imageBlocksInteractiveReference.hashes,
					brightnessByHashBackground,
					brightnessByHashGroup,
				);
				_calcProcessLights(
					lightNight,
					grid.lightsForeground1,
					grid.imageBlocksForeground1Reference.hashes,
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

				// Change detection: groups
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
		}, LightingCalcWorkerEngine.calcIntervalInMs);
	}

	/**
	 * Sets hash brightnesses via light sources
	 */
	private static _calcProcessLights(
		lightNight: boolean,
		lightsBlockTable: GridBlockTable<GridLight>,
		blocks: { [key: number]: GridImageBlockReference },
		brightnessByHashBackground: { [key: number]: number },
		brightnessByHashGroup: { [key: number]: number },
	) {
		let brightness: number,
			brightnessByGyByGx: { [key: number]: { [key: number]: number } },
			brightnessByGyByGxs: { [key: number]: { [key: number]: number } }[],
			brightnessByHashBackgroundTmp: { [key: number]: number },
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
			_calcProcessLightsFinal = LightingCalcWorkerEngine._calcProcessLightsFinal,
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
					gRadius = <number>light.directionOmniGRadius;

					// Light beam
					brightnessByGyByGxs = [
						_calcProcessLightsDown(blocks, brightness, gRadius, light, brightnessByHashBackgroundTmp),
						_calcProcessLightsLeft(blocks, brightness, gRadius, light, brightnessByHashBackgroundTmp),
						_calcProcessLightsRight(blocks, brightness, gRadius, light, brightnessByHashBackgroundTmp),
						_calcProcessLightsUp(blocks, brightness, gRadius, light, brightnessByHashBackgroundTmp),
					];

					// Remove on-self additive values for extended blocks
					for (k in brightnessByHashBackgroundTmp) {
						brightnessByHashBackground[k] =
							(brightnessByHashBackground[k] || 0) + Math.min(brightness, brightnessByHashBackgroundTmp[k]);
					}

					_calcProcessLightsFinal(
						brightness,
						brightnessByGyByGxs,
						brightnessByHashBackground,
						brightnessByHashGroup,
						gRadius,
						light,
					);
				} else {
					directions = <any>light.directions;

					for (j in directions) {
						direction = directions[j];

						brightness = direction.brightness;
						gRadius = direction.gRadius;

						// Light beam
						switch (direction.type) {
							case GridLightType.DOWN:
								brightnessByGyByGx = _calcProcessLightsDown(blocks, brightness, gRadius, light, brightnessByHashBackground);
								break;
							case GridLightType.LEFT:
								brightnessByGyByGx = _calcProcessLightsLeft(blocks, brightness, gRadius, light, brightnessByHashBackground);
								break;
							case GridLightType.RIGHT:
								brightnessByGyByGx = _calcProcessLightsRight(
									blocks,
									brightness,
									gRadius,
									light,
									brightnessByHashBackground,
								);
								break;
							case GridLightType.UP:
								brightnessByGyByGx = _calcProcessLightsUp(blocks, brightness, gRadius, light, brightnessByHashBackground);
								break;
						}

						_calcProcessLightsFinal(
							brightness,
							[brightnessByGyByGx],
							brightnessByHashBackground,
							brightnessByHashGroup,
							gRadius,
							light,
							direction.type,
						);
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
		brightnessByHashGroup: { [key: number]: number },
	): { [key: number]: { [key: number]: number } } {
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

					if (!gridImageBlock.passthroughLight) {
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
								brightnessByHashGroup[gridImageBlock.hash] =
									(brightnessByHashGroup[gridImageBlock.hash] || 0) + brightnessEff;
							}
						}
					}
				}
			}
		}

		return brightnessByGyByGx;
	}

	private static _calcProcessLightsFinal(
		brightness: number,
		brightnessByGyByGxs: { [key: number]: { [key: number]: number } }[],
		brightnessByHashBackground: { [key: number]: number },
		brightnessByHashGroup: { [key: number]: number },
		gRadius: number,
		light: GridLight,
		lightType?: GridLightType,
	): void {
		let brightnessByGy: { [key: number]: number },
			brightnessByGyByGx: { [key: number]: { [key: number]: number } },
			brightnessByGyByGxFinal: { [key: number]: { [key: number]: number } } = {},
			brightnessEff: number,
			gxString: string,
			gySortedByGx: { [key: number]: number[] } = {},
			gyString: string,
			hash: number,
			i: number,
			iString: string,
			j: number;

		// Union brightness
		if (brightnessByGyByGxs.length === 1) {
			brightnessByGyByGxFinal = brightnessByGyByGxs[0];
		} else {
			for (iString in brightnessByGyByGxs) {
				brightnessByGyByGx = brightnessByGyByGxs[iString];

				for (gxString in brightnessByGyByGx) {
					brightnessByGy = brightnessByGyByGx[gxString];

					if (brightnessByGyByGxFinal[gxString] === undefined) {
						brightnessByGyByGxFinal[gxString] = {};
					}

					for (gyString in brightnessByGy) {
						// Remove on-self additive values
						brightnessByGyByGxFinal[gxString][gyString] = brightnessByGy[gyString];
					}
				}
			}
		}

		// Effects
		if (gRadius !== 1) {
			let brightnessByGy2: { [key: number]: number },
				gx1: number,
				gx2: number,
				gxs: number[],
				gy1: number,
				gy2: number,
				gys1: number[],
				gys2: number[],
				gysLength: number,
				scratch: number,
				trimMax: number = gRadius - 1;

			// Sort
			gxs = Object.keys(brightnessByGyByGxFinal)
				.map((v) => Number(v))
				.sort((a: number, b: number) => a - b);
			for (gxString in brightnessByGyByGxFinal) {
				gySortedByGx[gxString] = Object.keys(brightnessByGyByGxFinal[gxString])
					.map((v) => Number(v))
					.sort((a: number, b: number) => a - b);
			}

			// Trim & Falloff
			if (!!light.rounded) {
				if (lightType === undefined || lightType === GridLightType.DOWN || lightType === GridLightType.UP) {
					for (i = 0; i < trimMax; i++) {
						gx1 = gxs[i];
						gx2 = gxs[gxs.length - (i + 1)];
						gys1 = gySortedByGx[gx1];
						gys2 = gySortedByGx[gx2];

						brightnessByGy = brightnessByGyByGxFinal[gx1];
						brightnessByGy2 = brightnessByGyByGxFinal[gx2];
						gysLength = gys1.length;

						if (lightType === undefined || lightType === GridLightType.DOWN) {
							// Bottom-Left,Right
							scratch = gysLength - trimMax + i;
							for (j = scratch; j < gysLength; j++) {
								gy1 = gys1[j];
								gy2 = gys2[j];

								if (j === scratch) {
									brightnessByGy[gy1] = Math.round(brightnessByGy[gy1] / 2);
									brightnessByGy2[gy2] = Math.round(brightnessByGy[gy1] / 2);
								} else {
									delete brightnessByGy[gy1];
									delete brightnessByGy2[gy2];
								}
							}
						}

						if (lightType === undefined || lightType === GridLightType.UP) {
							// Top-Left,Right
							scratch = trimMax - i;
							for (j = 0; j < scratch; j++) {
								gy1 = gys1[j];
								gy2 = gys2[j];

								if (j === scratch - 1) {
									brightnessByGy[gy1] = Math.round(brightnessByGy[gy1] / 2);
									brightnessByGy2[gy2] = Math.round(brightnessByGy[gy1] / 2);
								} else {
									delete brightnessByGy[gy1];
									delete brightnessByGy2[gy2];
								}
							}
						}
					}
				}

				if (lightType === GridLightType.LEFT || lightType === GridLightType.RIGHT) {
					for (i = 0; i < trimMax; i++) {
						if (lightType === GridLightType.LEFT) {
							gx1 = gxs[i];
							gys1 = gySortedByGx[gx1];

							brightnessByGy = brightnessByGyByGxFinal[gx1];
							gysLength = gys1.length;

							// Left-Bottom, Top
							scratch = trimMax - i * 2;
							for (j = 0; j < scratch; j++) {
								gy1 = gys1[j];
								gy2 = gys1[gysLength - j - 1];

								if (j === scratch - 1) {
									brightnessByGy[gy1] = Math.round(brightnessByGy[gy1] / 2);
									brightnessByGy[gy2] = Math.round(brightnessByGy[gy1] / 2);
								} else {
									delete brightnessByGy[gy1];
									delete brightnessByGy[gy2];
								}
							}
						}

						if (lightType === GridLightType.RIGHT) {
							gx1 = gxs[gxs.length - i - 1];
							gys1 = gySortedByGx[gx1];

							brightnessByGy = brightnessByGyByGxFinal[gx1];
							gysLength = gys1.length;

							// Right-Bottom, Top
							scratch = trimMax - i * 2;
							for (j = 0; j < scratch; j++) {
								gy1 = gys1[j];
								gy2 = gys1[gysLength - j - 1];

								if (j === scratch - 1) {
									brightnessByGy[gy1] = Math.round(brightnessByGy[gy1] / 2);
									brightnessByGy[gy2] = Math.round(brightnessByGy[gy1] / 2);
								} else {
									delete brightnessByGy[gy1];
									delete brightnessByGy[gy2];
								}
							}
						}
					}
				}
			} else {
				// Square Falloff
				for (i = 0; i < gxs.length; i++) {
					gx1 = gxs[i];
					gys1 = gySortedByGx[gx1];

					brightnessByGy = brightnessByGyByGxFinal[gx1];
					gysLength = gys1.length;
					scratch = Math.max(1, Math.round(brightness / 2));

					if (i === 0 || i === gxs.length - 1) {
						// Bottom + Top
						for (j = 0; j < gys1.length; j++) {
							gy1 = gys1[j];
							brightnessByGy[gy1] = Math.min(brightnessByGy[gy1], scratch);
						}
					} else if (gRadius !== 2) {
						// Left + Right
						gy1 = gys1[0];
						brightnessByGy[gy1] = Math.min(brightnessByGy[gy1], scratch);

						gy1 = gys1[gys1.length - 1];
						brightnessByGy[gy1] = Math.min(brightnessByGy[gy1], scratch);
					}
				}
			}
		}

		// Apply
		for (gxString in brightnessByGyByGxFinal) {
			brightnessByGy = brightnessByGyByGxFinal[gxString];

			for (gyString in brightnessByGy) {
				brightnessEff = brightnessByGy[gyString];

				if (brightnessEff !== 0) {
					hash = UtilEngine.gridHashTo(Number(gxString), Number(gyString));

					// Assign brightness (additive)
					brightnessByHashBackground[hash] = (brightnessByHashBackground[hash] || 0) + brightnessEff;
					brightnessByHashGroup[hash] = (brightnessByHashGroup[hash] || 0) + brightnessEff;
				}
			}
		}
	}

	private static _calcProcessLightsLeft(
		blocks: { [key: number]: GridImageBlockReference },
		brightness: number,
		gRadius: number,
		light: GridLight,
		brightnessByHashGroup: { [key: number]: number },
	): { [key: number]: { [key: number]: number } } {
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

					if (!gridImageBlock.passthroughLight) {
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
								brightnessByHashGroup[gridImageBlock.hash] =
									(brightnessByHashGroup[gridImageBlock.hash] || 0) + brightnessEff;
							}
						}
					}
				}
			}
		}

		return brightnessByGyByGx;
	}

	private static _calcProcessLightsRight(
		blocks: { [key: number]: GridImageBlockReference },
		brightness: number,
		gRadius: number,
		light: GridLight,
		brightnessByHashGroup: { [key: number]: number },
	): { [key: number]: { [key: number]: number } } {
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

					if (!gridImageBlock.passthroughLight) {
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
								brightnessByHashGroup[gridImageBlock.hash] =
									(brightnessByHashGroup[gridImageBlock.hash] || 0) + brightnessEff;
							}
						}
					}
				}
			}
		}

		return brightnessByGyByGx;
	}

	private static _calcProcessLightsUp(
		blocks: { [key: number]: GridImageBlockReference },
		brightness: number,
		gRadius: number,
		light: GridLight,
		brightnessByHashGroup: { [key: number]: number },
	): { [key: number]: { [key: number]: number } } {
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

					if (!gridImageBlock.passthroughLight) {
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
								brightnessByHashGroup[gridImageBlock.hash] =
									(brightnessByHashGroup[gridImageBlock.hash] || 0) + brightnessEff;
							}
						}
					}
				}
			}
		}

		return brightnessByGyByGx;
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
