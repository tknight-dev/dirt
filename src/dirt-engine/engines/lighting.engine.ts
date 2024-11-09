import { AssetCache, AssetEngine } from './asset.engine';
import { AssetImage, AssetImageSrcResolution } from '../models/asset.model';
import { ClockCalcEngine } from '../calc/clock.calc.engine';
import { Grid, GridImageBlock } from '../models/grid.model';
import { Camera } from '../models/camera.model';
import { MapActive } from '../models/map.model';
import { MapDrawEngineBus } from '../draw/buses/map.draw.engine.bus';
import { MapDrawBusInputPlayloadAsset } from '../draw/buses/map.draw.model.bus';

/**
 * @author tknight-dev
 */

interface CacheInstance {
	gHeight: number;
	gWidth: number;
	image: ImageBitmap;
}

export class LightingEngine {
	private static cache: { [key: string]: CacheInstance } = {}; // key is assetImageId
	private static cacheZoomed: { [key: string]: ImageBitmap } = {}; // key is assetImageId
	private static cacheZoomedLit: { [key: string]: ImageBitmap } = {}; // key is assetImageId
	private static cacheZoomedUnlit: { [key: string]: ImageBitmap[] } = {}; // key is assetImageId
	public static readonly cacheZoomedUnlitLength: number = 4;
	private static cacheZoomedValue: number;
	private static darknessMax: number;
	private static initialized: boolean;
	private static hourPreciseOfDayEff: number = 0;
	private static mapActive: MapActive;
	private static resolution: AssetImageSrcResolution;
	private static timeForced: boolean;

	private static buildBinaries(assetIds?: string[]): void {
		let assetImage: AssetImage,
			assetImages: { [key: string]: AssetImage } = AssetEngine.getAssetManifestMaster().images,
			cacheInstance: CacheInstance | undefined,
			resolution: AssetImageSrcResolution = LightingEngine.resolution;

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

			// Try to load target resolution
			for (let j in assetImage.srcs) {
				if (assetImage.srcs[j].resolution === resolution) {
					cacheInstance = {
						gHeight: assetImage.gHeight || 1,
						gWidth: assetImage.gWidth || 1,
						image: <ImageBitmap>(<AssetCache>AssetEngine.getAsset(assetImage.srcs[j].src)).imageBitmap,
					};
					break;
				}
			}

			// Fill with lowest resolution if target resolution is missing
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
			processor = (imageBlocks: { [key: number]: GridImageBlock }) => {
				for (let i in imageBlocks) {
					assetIds[imageBlocks[i].assetId] = null;
				}
			};

		for (let i in grids) {
			grid = grids[i];

			processor(grid.imageBlocksBackground.hashes);
			processor(grid.imageBlocksForeground.hashes);
			processor(grid.imageBlocksPrimary.hashes);
		}

		return Object.keys(assetIds);
	}

	public static cacheAdd(assetImageId: string) {
		if (!LightingEngine.cache[assetImageId]) {
			// Build the cache(s)
			LightingEngine.buildBinaries([assetImageId]);
			LightingEngine.updateZoom(assetImageId);

			setTimeout(() => {
				MapDrawEngineBus.outputAssets(<{ [key: string]: MapDrawBusInputPlayloadAsset }>LightingEngine.cache);
			});
		}
	}

	public static cacheReset() {
		// Clear the cache(s)
		LightingEngine.cache = <any>new Object();
		LightingEngine.cacheZoomed = <any>new Object();
		LightingEngine.cacheZoomedLit = <any>new Object();
		LightingEngine.cacheZoomedUnlit = <any>new Object();

		// Build the cache(s)
		LightingEngine.buildBinaries();
		LightingEngine.updateZoom(undefined, true);

		setTimeout(() => {
			MapDrawEngineBus.outputAssets(<{ [key: string]: MapDrawBusInputPlayloadAsset }>LightingEngine.cache);
		});
	}

	public static cacheWorkerImport(assets: { [key: string]: MapDrawBusInputPlayloadAsset }) {
		LightingEngine.cache = <{ [key: string]: CacheInstance }>assets;
	}

	/**
	 * Only call from workers when outside of this class
	 */
	public static clock(hourPreciseOfDayEff: number): void {
		/**
		 * Only update this value when the time difference is 10% of an hour
		 */
		if (hourPreciseOfDayEff - 0.1 > LightingEngine.hourPreciseOfDayEff % 23) {
			LightingEngine.hourPreciseOfDayEff = hourPreciseOfDayEff;

			if (LightingEngine.cacheZoomedValue !== undefined) {
				LightingEngine.updateLighting();
			}
		}
	}

	public static async initialize(worker?: boolean): Promise<void> {
		if (LightingEngine.initialized) {
			console.error('LightingEngine > initialize: already initialized');
			return;
		}
		LightingEngine.initialized = true;

		if (worker !== true) {
			let hourPreciseOfDayEff: number;
			ClockCalcEngine.setCallbackMinuteOfDay((hourOfDayEff: number, minuteOfDayEff: number) => {
				hourPreciseOfDayEff =
					LightingEngine.mapActive.hourOfDayEff +
					Math.round((LightingEngine.mapActive.minuteOfHourEff / 60) * 100) / 100;

				LightingEngine.clock(hourPreciseOfDayEff);
			});
		}
	}

	private static updateLighting(assetImageId?: string, zoomChanged?: boolean): void {
		let camera: Camera = LightingEngine.mapActive.camera,
			assetImageIds: string[],
			cacheInstance: CacheInstance,
			canvas: OffscreenCanvas,
			ctx: OffscreenCanvasRenderingContext2D,
			darkness: string,
			darknessMax: number = LightingEngine.darknessMax,
			gInPh: number = camera.gInPh,
			gInPw: number = camera.gInPw,
			hourPreciseOfDayEff: number = LightingEngine.hourPreciseOfDayEff,
			id: string,
			imageBitmaps: ImageBitmap[],
			j: number,
			k: number,
			litAlgApplied: boolean = false,
			litAlgDarknessEvening: string | undefined,
			litAlgDarknessMorning: string | undefined,
			litAlgDarknessNight: string | undefined,
			litAlgGolden: string | undefined,
			unlitLength: number = LightingEngine.cacheZoomedUnlitLength,
			scratch: number;

		if (LightingEngine.timeForced) {
			hourPreciseOfDayEff = 12;
			litAlgApplied = true;
		}

		/*
		 * Lit algorithm: config
		 */
		if (hourPreciseOfDayEff < 4 || hourPreciseOfDayEff > 23) {
			// 11pm > time < 4am
			litAlgApplied = true;
			litAlgDarknessNight = 'rgba(0,0,0,' + darknessMax + ')';
		} else if (hourPreciseOfDayEff < 10) {
			// 10pm
			scratch = Math.min(darknessMax, Math.round(((6 - (hourPreciseOfDayEff - 4)) / 6) * 1000) / 1000);

			litAlgApplied = true;
			litAlgDarknessMorning = 'rgba(0,0,0,' + scratch + ')';
		} else if (hourPreciseOfDayEff > 18) {
			// 6pm
			scratch = Math.min(darknessMax, Math.round(((hourPreciseOfDayEff - 18) / 6) * 1000) / 1000);

			litAlgApplied = true;
			litAlgDarknessEvening = 'rgba(0,0,0,' + scratch + ')';
		}

		if (
			(hourPreciseOfDayEff > 7 && hourPreciseOfDayEff < 8) ||
			(hourPreciseOfDayEff > 18 && hourPreciseOfDayEff < 19)
		) {
			scratch = hourPreciseOfDayEff - Math.floor(hourPreciseOfDayEff);

			if (scratch >= 0.5) {
				scratch = 0.5 - (scratch - 0.5);
			}

			litAlgApplied = true;
			litAlgGolden = 'saturate(' + Math.round(scratch * 750 + 1000) / 1000 + ')';
		}

		/*
		 * Apply
		 */
		if (litAlgApplied || zoomChanged) {
			assetImageIds = assetImageId ? [assetImageId] : Object.keys(LightingEngine.cache);
			canvas = new OffscreenCanvas(0, 0);
			ctx = <OffscreenCanvasRenderingContext2D>canvas.getContext('2d');
			darkness = 'rgba(0,0,0,' + Math.round((darknessMax / (unlitLength * 1.75)) * 1000) / 1000 + ')';

			for (let i in assetImageIds) {
				id = assetImageIds[i];
				cacheInstance = LightingEngine.cache[id];

				canvas.height = cacheInstance.gHeight * gInPh + 2;
				canvas.width = cacheInstance.gWidth * gInPw + 2;

				/*
				 * Lit algorithm
				 */
				if (litAlgGolden) {
					ctx.filter = litAlgGolden;
				} else {
					ctx.filter = 'none';
				}

				ctx.drawImage(cacheInstance.image, 0, 0, canvas.width, canvas.height);

				if (litAlgDarknessNight) {
					// 11pm > time < 4am
					ctx.fillStyle = litAlgDarknessNight;
					ctx.fillRect(0, 0, canvas.width, canvas.height);
				} else if (litAlgDarknessMorning) {
					// 12pm
					ctx.fillStyle = litAlgDarknessMorning;
					ctx.fillRect(0, 0, canvas.width, canvas.height);
				} else if (litAlgDarknessEvening) {
					// 6pm
					ctx.fillStyle = litAlgDarknessEvening;
					ctx.fillRect(0, 0, canvas.width, canvas.height);
				}

				LightingEngine.cacheZoomedLit[id] = canvas.transferToImageBitmap();

				/*
				 * Unlit algorithm (shades of darkness only)
				 */
				ctx.clearRect(0, 0, canvas.width, canvas.height);
				imageBitmaps = new Array(unlitLength);

				if (litAlgGolden) {
					ctx.filter = litAlgGolden;
				} else {
					ctx.filter = 'none';
				}

				for (j = 0; j < unlitLength; j++) {
					ctx.drawImage(cacheInstance.image, 0, 0, canvas.width, canvas.height);

					// Match brightest darkness
					if (litAlgDarknessNight) {
						// 11pm > time < 4am
						ctx.fillStyle = litAlgDarknessNight;
					} else if (litAlgDarknessMorning) {
						// 12pm
						ctx.fillStyle = litAlgDarknessMorning;
					} else if (litAlgDarknessEvening) {
						// 6pm
						ctx.fillStyle = litAlgDarknessEvening;
					} else {
						ctx.fillStyle = darkness;
					}
					ctx.fillRect(0, 0, canvas.width, canvas.height);

					// Make it darker
					ctx.fillStyle = darkness;

					for (k = 0; k < j * 2 + 1; k++) {
						ctx.fillRect(0, 0, canvas.width, canvas.height);
					}

					imageBitmaps[j] = canvas.transferToImageBitmap();
				}

				LightingEngine.cacheZoomedUnlit[id] = imageBitmaps;
			}
		}
	}

	public static updateZoom(assetImageId?: string, force?: boolean): void {
		let camera: Camera = LightingEngine.mapActive.camera,
			zoom: number = camera.zoom;

		/**
		 * gInPh/gInPw +2 to fix the rounding issue
		 */
		if (assetImageId || LightingEngine.cacheZoomedValue !== zoom || force) {
			let assetImageIds: string[] = assetImageId ? [assetImageId] : Object.keys(LightingEngine.cache),
				cacheInstance: CacheInstance,
				canvas: OffscreenCanvas = new OffscreenCanvas(0, 0),
				ctx: OffscreenCanvasRenderingContext2D = <OffscreenCanvasRenderingContext2D>canvas.getContext('2d'),
				gInPh: number = camera.gInPh,
				gInPw: number = camera.gInPw,
				id: string;

			for (let i in assetImageIds) {
				id = assetImageIds[i];
				cacheInstance = LightingEngine.cache[id];

				canvas.height = cacheInstance.gHeight * gInPh + 2;
				canvas.width = cacheInstance.gWidth * gInPw + 2;
				ctx.drawImage(cacheInstance.image, 0, 0, canvas.width, canvas.height);
				LightingEngine.cacheZoomed[id] = canvas.transferToImageBitmap();
			}

			LightingEngine.cacheZoomedValue = zoom;
			LightingEngine.updateLighting(assetImageId, true);
		}
	}

	public static getAssetImage(assetImageId: string): ImageBitmap {
		return LightingEngine.cacheZoomed[assetImageId];
	}

	public static getAssetImageLit(assetImageId: string): ImageBitmap {
		return LightingEngine.cacheZoomedLit[assetImageId];
	}

	public static getAssetImageUnlit(assetImageId: string): ImageBitmap[] {
		return LightingEngine.cacheZoomedUnlit[assetImageId];
	}

	public static setDarknessMax(darknessMax: number): void {
		LightingEngine.darknessMax = darknessMax;
	}

	public static getHourPreciseOfDayEff(): number {
		return LightingEngine.hourPreciseOfDayEff;
	}

	public static setMapActive(mapActive: MapActive) {
		LightingEngine.hourPreciseOfDayEff = mapActive.hourOfDay;
		LightingEngine.mapActive = mapActive;
	}

	public static setResolution(resolution: AssetImageSrcResolution) {
		LightingEngine.resolution = resolution;
	}

	public static setTimeForced(timeForced: boolean) {
		LightingEngine.timeForced = timeForced;
	}
}
