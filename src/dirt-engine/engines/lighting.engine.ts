import { AssetCache, AssetEngine } from './asset.engine';
import { AssetImage, AssetImageSrcQuality } from '../models/asset.model';
import { ClockCalcEngine } from '../calc/clock.calc.engine';
import { Grid, GridImageBlockReference, GridBlockTable } from '../models/grid.model';
import { Camera } from '../models/camera.model';
import { LightingCalcEngineBus } from '../calc/buses/lighting.calc.engine.bus';
import { LightingCalcBusOutputDecompressed } from '../calc/buses/lighting.calc.engine.model';
import { MapActive } from '../models/map.model';
import { MapDrawEngineBus } from '../draw/buses/map.draw.engine.bus';
import { MapDrawBusInputPlayloadAsset } from '../draw/buses/map.draw.model.bus';
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
	private static darknessMaxNew: boolean;
	private static hourPreciseOfDayEff: number = 0;
	private static initialized: boolean;
	private static lightingByHashByGrid: { [key: string]: { [key: number]: LightingCalcBusOutputDecompressed } } = {};
	private static mapActive: MapActive;
	private static quality: AssetImageSrcQuality;
	private static timeForced: boolean;

	private static buildBinaries(assetIds?: string[]): void {
		let assetImage: AssetImage,
			assetImages: { [key: string]: AssetImage } = AssetEngine.getAssetManifestMaster().images,
			cacheInstance: LightingCacheInstance | undefined,
			quality: AssetImageSrcQuality = LightingEngine.quality;

		if (!assetIds) {
			assetIds = LightingEngine.buildBinariesCollectAssetIds();
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
				if (assetImage.srcs[j].quality === quality) {
					cacheInstance = {
						gHeight: assetImage.gHeight || 1,
						gWidth: assetImage.gWidth || 1,
						image: <ImageBitmap>(<AssetCache>AssetEngine.getAsset(assetImage.srcs[j].src)).imageBitmap,
					};
					break;
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
			};

		for (let i in grids) {
			grid = grids[i];

			processor(grid.imageBlocksBackgroundReference.hashes);
			processor(grid.imageBlocksForegroundReference.hashes);
			processor(grid.imageBlocksPrimaryReference.hashes);
			processor(grid.imageBlocksVanishingReference.hashes);
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

	public static cacheWorkerImport(assets: { [key: string]: MapDrawBusInputPlayloadAsset }, camera?: Camera) {
		LightingEngine.cache = Object.assign(LightingEngine.cache || {}, assets);
	}

	private static draw(assetImageId?: string): void {
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
				brightness = 'brightness(' + value + ')';

				ctx.filter = brightness;
				ctx.drawImage(imageOriginal, 0, 0);
				cacheOutsideDayInstance[j] = canvas.transferToImageBitmap();
			}

			/*
			 * Outside Night
			 */
			for (j = 0; j < 5; j++) {
				value = Math.round(scale(j, 4, 0, 0.5, 1 - darknessMax) * 1000) / 1000;
				brightness = 'brightness(' + value + ')';

				value = Math.round(scale(j, 4, 0, 0.6, 0.15) * 1000) / 1000;
				grayscale = 'grayscale(' + value + ')';

				ctx.filter = `${brightness} ${grayscale}`;
				ctx.drawImage(imageOriginal, 0, 0);
				ctx.filter = 'none';

				value = Math.round(scale(j, 4, 0, 0.09, 0) * 1000) / 1000;
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

	public static async initialize(worker?: boolean): Promise<void> {
		if (LightingEngine.initialized) {
			console.error('LightingEngine > initialize: already initialized');
			return;
		}
		LightingEngine.initialized = true;
		LightingCalcEngineBus.initialize();
		LightingCalcEngineBus.setCallback((gridId: number, lightingByHash: { [key: number]: LightingCalcBusOutputDecompressed }) => {
			let decompressed: { [key: number]: LightingCalcBusOutputDecompressed } = LightingEngine.lightingByHashByGrid[gridId];

			for (let hash in lightingByHash) {
				decompressed[hash] = lightingByHash[hash];
			}
		});

		if (worker !== true) {
			LightingEngine.draw();
			ClockCalcEngine.setCallbackMinuteOfDay((hourOfDayEff: number, minuteOfDayEff: number) => {
				if (minuteOfDayEff % 5 == 0) {
					// Only update very 5min in game
					LightingEngine.hourPreciseOfDayEff = hourOfDayEff + Math.round((minuteOfDayEff / 60) * 100) / 100;

					if (LightingEngine.darknessMaxNew) {
						LightingEngine.draw();
						LightingEngine.darknessMaxNew = false;
					}
				}
			});
		}
	}

	public static getCacheInstance(assetImageId: string): LightingCacheInstance {
		return LightingEngine.cache[assetImageId];
	}

	public static getCacheLit(
		assetImageId: string,
		gridId: string,
		hash: number,
		outside: boolean,
		z: VideoBusInputCmdGameModeEditApplyZ,
	): ImageBitmap {
		if (LightingEngine.timeForced) {
			return LightingEngine.cache[assetImageId].image;
		}
		let decompressed: LightingCalcBusOutputDecompressed = LightingEngine.lightingByHashByGrid[gridId][hash] || {},
			brightness: number,
			brightnessOutside: number;

		if (z === VideoBusInputCmdGameModeEditApplyZ.BACKGROUND) {
			brightness = decompressed.backgroundBrightness || 0;
			brightnessOutside = decompressed.backgroundBrightnessOutside || 0;
		} else {
			brightness = decompressed.groupBrightness || 0;
			brightnessOutside = decompressed.groupBrightnessOutside || 0;
		}

		if (outside) {
			let hourOfDayEff: number = Math.round(LightingEngine.hourPreciseOfDayEff);

			if (hourOfDayEff < 5 || hourOfDayEff > 22) {
				// Night
				if (brightness !== 0) {
					return LightingEngine.cacheOutsideDay[assetImageId][Math.min(6, brightness)];
				} else {
					//console.log('N', Math.min(3, brightnessOutside));
					return LightingEngine.cacheOutsideNight[assetImageId][Math.min(3, brightnessOutside)];
				}
			} else {
				// Day
				//console.log('D', Math.min(6, brightnessOutside));
				return LightingEngine.cacheOutsideDay[assetImageId][Math.min(6, brightnessOutside + brightness)];
			}
		} else {
			// Assume as dark as possible, unless lit by something other than the sun/moon
			return LightingEngine.cacheOutsideDay[assetImageId][brightness];
		}
	}

	public static setDarknessMax(darknessMax: number): void {
		LightingEngine.darknessMax = darknessMax;
		LightingEngine.darknessMaxNew = true;
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
		for (let id in mapActive.grids) {
			grid = mapActive.grids[id];

			LightingEngine.setMapActiveInflate(id, grid.imageBlocksBackgroundReference);
			LightingEngine.setMapActiveInflate(id, grid.imageBlocksForegroundReference);
			LightingEngine.setMapActiveInflate(id, grid.imageBlocksPrimaryReference);
			LightingEngine.setMapActiveInflate(id, grid.imageBlocksVanishingReference);
		}

		LightingCalcEngineBus.outputGrids(mapActive.grids, mapActive.gridConfigs);
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

	public static setResolution(quality: AssetImageSrcQuality) {
		LightingEngine.quality = quality;
	}

	public static setTimeForced(timeForced: boolean) {
		LightingEngine.timeForced = timeForced;
	}
}
