import { AssetCache, AssetEngine } from './asset.engine';
import { AssetImage, AssetImageType, AssetImageSrcQuality } from '../models/asset.model';
import { ClockCalcEngine } from '../calc/clock.calc.engine';
import { Grid, GridImageBlockReference, GridBlockTable, GridLight } from '../models/grid.model';
import { LightingCalcEngineBus } from '../calc/buses/lighting.calc.engine.bus';
import { LightingCalcBusOutputDecompressed } from '../calc/buses/lighting.calc.engine.model';
import { MapActive } from '../models/map.model';
import { MapDrawEngineBus } from '../draw/buses/map.draw.engine.bus';
import { MapDrawBusInputPlayloadAsset } from '../draw/buses/map.draw.model.bus';
import { UnderlayDrawEngineBus } from '../draw/buses/underlay.draw.engine.bus';
import { UtilEngine } from './util.engine';
import { VideoBusInputCmdGameModeEditApplyZ } from '../engines/buses/video.model.bus';

/**
 * @author tknight-dev
 */

export interface LightingCacheInstance {
	gHeight: number;
	gWidth: number;
	image: ImageBitmap;
}

export class LightingEngine {
	private static cache: { [key: string]: LightingCacheInstance } = {}; // key is assetImageId
	private static cacheOutsideDay: { [key: string]: ImageBitmap[] } = {}; // key is assetImageId
	private static cacheOutsideNight: { [key: string]: ImageBitmap[] } = {}; // key is assetImageId
	private static darknessMax: number;
	private static disableShading: boolean;
	private static gamma: number;
	private static hourPreciseOfDayEff: number = 0;
	private static initialized: boolean;
	private static lightingByHashByGrid: { [key: string]: { [key: number]: LightingCalcBusOutputDecompressed } } = {};
	private static lightingByHashByGridPrevious: { [key: string]: { [key: number]: LightingCalcBusOutputDecompressed } } | undefined;
	private static lightingByHashByGridPreviousHour: number;
	private static mapActive: MapActive;
	private static imageQuality: AssetImageSrcQuality;
	private static timeForced: boolean;

	private static buildBinaries(assetIds?: string[]): void {
		let assetImage: AssetImage,
			assetImages: { [key: string]: AssetImage } = AssetEngine.getAssetManifestMaster().images,
			cacheInstance: LightingCacheInstance | undefined,
			imageQuality: AssetImageSrcQuality = LightingEngine.imageQuality;

		if (!assetIds) {
			assetIds = LightingEngine.buildBinariesCollectAssetIds();

			for (let i in assetImages) {
				if (assetImages[i].type === AssetImageType.SYSTEM) {
					assetIds.push(assetImages[i].id);
				}
			}
		}

		for (let i in assetIds) {
			assetImage = assetImages[assetIds[i]];
			cacheInstance = undefined;

			if (!assetImage.srcs.length) {
				console.error("LightingEngine > buildBinaries: image asset '" + assetImage.id + "' missing a source");
				continue;
			}

			// Try to load target quality
			for (let j in assetImage.srcs) {
				if (assetImage.srcs[j].quality === imageQuality) {
					try {
						cacheInstance = {
							gHeight: assetImage.gHeight || 1,
							gWidth: assetImage.gWidth || 1,
							image: <ImageBitmap>(<AssetCache>AssetEngine.getAsset(assetImage.srcs[j].src)).imageBitmap,
						};
						break;
					} catch (error: any) {
						console.error(
							"LightingEngine > buildBinaries: failed to load '" +
								assetImage.id +
								"' [quality=" +
								AssetImageSrcQuality[imageQuality] +
								']',
						);
					}
				}
			}

			// Fill with lowest quality if target quality is missing
			if (!cacheInstance) {
				cacheInstance = {
					gHeight: assetImage.gHeight || 1,
					gWidth: assetImage.gWidth || 1,
					image: <ImageBitmap>(<AssetCache>AssetEngine.getAsset(assetImage.srcs[0].src)).imageBitmap,
				};
			}

			LightingEngine.cache[assetImage.id] = cacheInstance;
		}
	}

	private static buildBinariesCollectAssetIds(): string[] {
		let assetIds: { [key: string]: null } = {},
			grid: Grid,
			grids: { [key: string]: Grid } = LightingEngine.mapActive.grids,
			processor = (imageBlockReferences: { [key: number]: GridImageBlockReference }) => {
				for (let i in imageBlockReferences) {
					if (!imageBlockReferences[i].block.extends) {
						assetIds[imageBlockReferences[i].block.assetId] = null;
					}
				}
			},
			processorLights = (imageLights: { [key: number]: GridLight }) => {
				for (let i in imageLights) {
					if (!imageLights[i].extends) {
						assetIds[imageLights[i].assetId] = null;
					}
				}
			};

		for (let i in grids) {
			grid = grids[i];

			processor(grid.imageBlocksBackgroundReference.hashes);
			processor(grid.imageBlocksForegroundReference.hashes);
			processor(grid.imageBlocksPrimaryReference.hashes);
			processor(grid.imageBlocksSecondaryReference.hashes);
			processor(grid.imageBlocksVanishingReference.hashes);

			processorLights(grid.lightsForeground.hashes);
			processorLights(grid.lightsPrimary.hashes);
		}

		return Object.keys(assetIds);
	}

	public static cacheAdd(assetImageId: string) {
		if (!LightingEngine.cache[assetImageId]) {
			// Build the cache(s)
			LightingEngine.buildBinaries([assetImageId]);
			LightingEngine.draw(assetImageId);

			setTimeout(() => {
				MapDrawEngineBus.outputAssets(<{ [key: string]: MapDrawBusInputPlayloadAsset }>LightingEngine.cache);
			});
		}
	}

	public static cacheReset() {
		// Clear the cache(s)
		LightingEngine.cache = <any>new Object();
		LightingEngine.cacheOutsideDay = <any>new Object();
		LightingEngine.cacheOutsideNight = <any>new Object();

		// Build the cache(s)
		LightingEngine.buildBinaries();
		LightingEngine.draw();

		setTimeout(() => {
			MapDrawEngineBus.outputAssets(<{ [key: string]: MapDrawBusInputPlayloadAsset }>LightingEngine.cache);
		});
	}

	public static cacheWorkerImport(assets: { [key: string]: MapDrawBusInputPlayloadAsset }) {
		LightingEngine.cache = Object.assign(LightingEngine.cache || {}, assets);
	}

	private static draw(assetImageId?: string): void {
		if (LightingEngine.disableShading) {
			return;
		}

		let assetId: string,
			assetIds: string[] = assetImageId ? [assetImageId] : Object.keys(LightingEngine.cache),
			brightness: string,
			cache: { [key: string]: LightingCacheInstance } = LightingEngine.cache,
			cacheOutsideDay: { [key: string]: ImageBitmap[] } = LightingEngine.cacheOutsideDay,
			cacheOutsideDayInstance: ImageBitmap[],
			cacheOutsideNight: { [key: string]: ImageBitmap[] } = LightingEngine.cacheOutsideNight,
			cacheOutsideNightInstance: ImageBitmap[],
			canvas: OffscreenCanvas = new OffscreenCanvas(0, 0),
			ctx: OffscreenCanvasRenderingContext2D = <OffscreenCanvasRenderingContext2D>canvas.getContext('2d'),
			darknessMax: number = LightingEngine.darknessMax,
			gamma: number = LightingEngine.gamma,
			grayscale: string,
			imageOriginal: ImageBitmap,
			j: number,
			scale = UtilEngine.scale,
			value: number;

		for (let i in assetIds) {
			assetId = assetIds[i];
			cacheOutsideDayInstance = new Array(7);
			cacheOutsideNightInstance = new Array(4);
			imageOriginal = cache[assetId].image;

			if (imageOriginal.height !== canvas.height || imageOriginal.width !== canvas.width) {
				canvas.height = imageOriginal.height;
				canvas.width = imageOriginal.width;
			}

			/*
			 * Outside Day
			 */
			for (j = 0; j < 7; j++) {
				value = Math.round(scale(j, 7, 0, 1, 1 - darknessMax) * 1000) / 1000;
				brightness = 'brightness(' + Math.max(0, value + gamma) + ')';

				ctx.filter = brightness;
				ctx.drawImage(imageOriginal, 0, 0);
				cacheOutsideDayInstance[j] = canvas.transferToImageBitmap();
			}

			/*
			 * Outside Night
			 */
			for (j = 0; j < 5; j++) {
				value = Math.round(scale(j, 3, 0, 0.375, 1 - darknessMax) * 1000) / 1000;
				brightness = 'brightness(' + Math.max(0, value + gamma) + ')';

				value = Math.round(scale(j, 3, 0, 0.45, 0.15) * 1000) / 1000;
				grayscale = 'grayscale(' + value + ')';

				ctx.filter = `${brightness} ${grayscale}`;
				ctx.drawImage(imageOriginal, 0, 0);
				ctx.filter = 'none';

				value = Math.round(scale(j, 3, 0, 0.065, 0) * 1000) / 1000;
				ctx.globalCompositeOperation = 'source-atop';
				ctx.fillStyle = 'rgba(47,132,199,' + value + ')'; // Moonlight
				ctx.fillRect(0, 0, canvas.width, canvas.height);
				cacheOutsideNightInstance[j] = canvas.transferToImageBitmap();

				// Done
				ctx.globalCompositeOperation = 'source-over';
			}

			cacheOutsideDay[assetId] = cacheOutsideDayInstance;
			cacheOutsideNight[assetId] = cacheOutsideNightInstance;
		}
	}

	public static async initialize(disableShading?: boolean, worker?: boolean): Promise<void> {
		if (LightingEngine.initialized) {
			console.error('LightingEngine > initialize: already initialized');
			return;
		}
		LightingEngine.initialized = true;
		LightingEngine.disableShading = !!disableShading;
		LightingCalcEngineBus.initialize();
		LightingCalcEngineBus.setCallback(
			(
				gridId: number,
				hourPreciseOfDayEff: number,
				lightingByHash: { [key: number]: LightingCalcBusOutputDecompressed },
				lightingByHashLength: number,
			) => {
				let decompressed: { [key: number]: LightingCalcBusOutputDecompressed },
					hourOfDayEff: number = Math.floor(hourPreciseOfDayEff);

				// Store the previous unique hour's lighting calculations
				if (LightingEngine.lightingByHashByGridPreviousHour !== hourOfDayEff) {
					LightingEngine.lightingByHashByGridPreviousHour = hourOfDayEff;
					LightingEngine.lightingByHashByGridPrevious = structuredClone(LightingEngine.lightingByHashByGrid);
				}

				if (lightingByHashLength) {
					decompressed = LightingEngine.lightingByHashByGrid[gridId];
					for (let hash in lightingByHash) {
						decompressed[hash] = lightingByHash[hash];
					}
				}
			},
		);

		if (worker !== true) {
			LightingEngine.draw();
			ClockCalcEngine.setCallbackMinuteOfDay((hourOfDayEff: number, minuteOfDayEff: number) => {
				if (minuteOfDayEff % 5 == 0) {
					// Only update very 5min in game
					LightingEngine.hourPreciseOfDayEff = hourOfDayEff + Math.round((minuteOfDayEff / 60) * 100) / 100;

					// Prevent blending OLD calculations
					if (LightingEngine.lightingByHashByGridPreviousHour < hourOfDayEff) {
						LightingEngine.lightingByHashByGridPrevious = undefined;
					} else if (hourOfDayEff === 0 && LightingEngine.lightingByHashByGridPreviousHour === 23) {
						LightingEngine.lightingByHashByGridPrevious = undefined;
					}
					LightingCalcEngineBus.outputHourPreciseOfDayEff(LightingEngine.hourPreciseOfDayEff);
					UnderlayDrawEngineBus.outputHourPreciseOfDayEff(LightingEngine.hourPreciseOfDayEff);
				}
			});
		}
	}

	public static settings(darknessMax: number, gamma: number, imageQuality: AssetImageSrcQuality): void {
		let changed: boolean = false;

		if (LightingEngine.darknessMax !== darknessMax) {
			LightingEngine.darknessMax = darknessMax;
			changed = true;
		}
		if (LightingEngine.gamma !== gamma) {
			LightingEngine.gamma = gamma;
			changed = true;
		}
		if (LightingEngine.imageQuality !== imageQuality) {
			LightingEngine.imageQuality = imageQuality;
			changed = true;
		}

		changed && LightingEngine.draw();
	}

	public static getCacheBrightness(gridId: string, hash: number, z: VideoBusInputCmdGameModeEditApplyZ): number {
		// Vanishing has no brightness
		if (z === VideoBusInputCmdGameModeEditApplyZ.VANISHING) {
			return 0;
		} else {
			let decompressed: LightingCalcBusOutputDecompressed = LightingEngine.lightingByHashByGrid[gridId][hash] || {};

			if (z === VideoBusInputCmdGameModeEditApplyZ.BACKGROUND) {
				return decompressed.backgroundBrightness || 0;
			} else {
				return decompressed.groupBrightness || 0;
			}
		}
	}

	public static getCacheInstance(assetImageId: string): LightingCacheInstance {
		return LightingEngine.cache[assetImageId];
	}

	/**
	 * @return ImageBitmap[] - [0]: current image, [1]: previous image
	 */
	public static getCacheLitOutside(
		assetImageId: string,
		gridId: string,
		hash: number,
		z: VideoBusInputCmdGameModeEditApplyZ,
	): ImageBitmap[] {
		let images: ImageBitmap[] = [];
		if (LightingEngine.timeForced) {
			images.push(LightingEngine.cache[assetImageId].image);
			images.push(images[0]);
			return images;
		}
		let decompressed: LightingCalcBusOutputDecompressed = LightingEngine.lightingByHashByGrid[gridId][hash] || {},
			decompressedPrevious: LightingCalcBusOutputDecompressed,
			brightness: number,
			brightnessOutside: number,
			brightnessOutsidePrevious: number;

		// Look up brightness
		if (z === VideoBusInputCmdGameModeEditApplyZ.BACKGROUND) {
			brightness = decompressed.backgroundBrightness || 0;
			brightnessOutside = decompressed.backgroundBrightnessOutside || 0;
		} else {
			brightness = decompressed.groupBrightness || 0;
			brightnessOutside = decompressed.groupBrightnessOutside || 0;
		}

		if (LightingEngine.lightingByHashByGridPrevious) {
			decompressedPrevious = LightingEngine.lightingByHashByGridPrevious[gridId][hash] || {};

			if (z === VideoBusInputCmdGameModeEditApplyZ.BACKGROUND) {
				brightnessOutsidePrevious = decompressedPrevious.backgroundBrightnessOutside || 0;
			} else {
				brightnessOutsidePrevious = decompressedPrevious.groupBrightnessOutside || 0;
			}
		} else {
			brightnessOutsidePrevious = brightnessOutside;
			decompressedPrevious = decompressed;
		}

		// Vanishing has no brightness
		if (z === VideoBusInputCmdGameModeEditApplyZ.VANISHING) {
			brightness = 0;
		}

		// Look up image by brightness
		let hourPreciseOfDayEff: number = LightingEngine.hourPreciseOfDayEff;
		if (hourPreciseOfDayEff < 5 || hourPreciseOfDayEff > 22) {
			// Night
			if (brightness !== 0) {
				// Lit
				images.push(LightingEngine.cacheOutsideDay[assetImageId][brightness]);
				images.push(images[0]);
			} else {
				// Unlit
				images.push(LightingEngine.cacheOutsideNight[assetImageId][brightnessOutside]);
				images.push(LightingEngine.cacheOutsideNight[assetImageId][brightnessOutsidePrevious]);
			}
		} else {
			// Day
			images.push(LightingEngine.cacheOutsideDay[assetImageId][Math.min(6, brightnessOutside + brightness)]);

			if (LightingEngine.lightingByHashByGridPrevious) {
				images.push(LightingEngine.cacheOutsideDay[assetImageId][Math.min(6, brightnessOutsidePrevious + brightness)]);
			} else {
				images.push(images[0]);
			}
		}

		return images;
	}

	public static getCacheLitByBrightness(assetImageId: string, brightness: number = 0): ImageBitmap {
		return LightingEngine.cacheOutsideDay[assetImageId][brightness];
	}

	public static getHourPreciseOfDayEff(): number {
		return LightingEngine.hourPreciseOfDayEff;
	}

	public static getLightingByHashByGrid(): { [key: string]: { [key: number]: LightingCalcBusOutputDecompressed } } {
		return LightingEngine.lightingByHashByGrid;
	}

	public static setMapActive(mapActive: MapActive) {
		LightingEngine.hourPreciseOfDayEff = mapActive.hourOfDay;
		LightingEngine.mapActive = mapActive;

		// Inflate
		let grid: Grid;
		LightingEngine.lightingByHashByGrid = <any>new Object();
		LightingEngine.lightingByHashByGridPrevious = undefined;
		for (let id in mapActive.grids) {
			grid = mapActive.grids[id];

			LightingEngine.setMapActiveInflate(id, grid.imageBlocksBackgroundReference);
			LightingEngine.setMapActiveInflate(id, grid.imageBlocksForegroundReference);
			LightingEngine.setMapActiveInflate(id, grid.imageBlocksPrimaryReference);
			LightingEngine.setMapActiveInflate(id, grid.imageBlocksVanishingReference);
		}

		LightingCalcEngineBus.outputGrids(mapActive.grids, mapActive.gridConfigs);
		LightingCalcEngineBus.outputHourPreciseOfDayEff(mapActive.hourOfDayEff + mapActive.minuteOfHourEff);
		UnderlayDrawEngineBus.outputHourPreciseOfDayEffReset(mapActive.hourOfDayEff + mapActive.minuteOfHourEff);
	}

	private static setMapActiveInflate(gridId: string, reference: GridBlockTable<GridImageBlockReference>) {
		if (LightingEngine.lightingByHashByGrid[gridId] === undefined) {
			LightingEngine.lightingByHashByGrid[gridId] = {};
		}
		let decompressedByHash: { [key: number]: LightingCalcBusOutputDecompressed } = LightingEngine.lightingByHashByGrid[gridId];

		for (let hash in reference.hashes) {
			decompressedByHash[hash] = {
				backgroundBrightness: 0,
				backgroundBrightnessOutside: 0,
				groupBrightness: 0,
				groupBrightnessOutside: 0,
			};
		}
	}

	public static setTimeForced(timeForced: boolean) {
		LightingEngine.timeForced = timeForced;
	}
}
