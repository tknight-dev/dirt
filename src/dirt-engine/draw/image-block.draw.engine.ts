import { AssetImage } from '../models/asset.model';
import { Camera } from '../models/camera.model';
import { LightingCalcBusOutputDecompressed } from '../calc/buses/lighting.calc.engine.model';
import { LightingEngine } from '../engines/lighting.engine';
import { Grid, GridBlockTable, GridBlockTableComplex, GridImageBlockReference, GridConfig, GridImageBlock } from '../models/grid.model';
import { MapActive } from '../models/map.model';
import { MapDrawEngineBus } from './buses/map.draw.engine.bus';
import { UtilEngine } from '../engines/util.engine';
import { VideoBusInputCmdGameModeEditApplyZ } from '../engines/buses/video.model.bus';
import { AssetEngine } from '../engines/asset.engine';

/**
 * @author tknight-dev
 */

interface ZGroup {
	ctx: OffscreenCanvasRenderingContext2D;
	z: VideoBusInputCmdGameModeEditApplyZ;
}

export class ImageBlockDrawEngine {
	private static assetImages: { [key: string]: AssetImage };
	private static cacheBackground: ImageBitmap;
	private static cacheForeground: ImageBitmap;
	private static cachePrimary: ImageBitmap;
	private static cacheVanishing: ImageBitmap;
	private static cacheHashGx: number;
	private static cacheHashGy: number;
	private static cacheHashPh: number;
	private static cacheHashPw: number;
	private static cacheHourPreciseCheck: number;
	private static cacheZoom: number;
	private static ctxBackground: OffscreenCanvasRenderingContext2D;
	private static ctxForeground: OffscreenCanvasRenderingContext2D;
	private static ctxPrimary: OffscreenCanvasRenderingContext2D;
	private static ctxVanishing: OffscreenCanvasRenderingContext2D;
	private static drawNull: boolean;
	private static initialized: boolean;
	private static mapActive: MapActive;
	private static mapActiveCamera: Camera;
	private static vanishingEnable: boolean;
	private static vanishingPercentageOfViewport: number;
	private static zGroup: VideoBusInputCmdGameModeEditApplyZ[];
	// private static count: number = 0;
	// private static sum: number = 0;

	public static async initialize(
		ctxBackground: OffscreenCanvasRenderingContext2D,
		ctxForeground: OffscreenCanvasRenderingContext2D,
		ctxOverlay: OffscreenCanvasRenderingContext2D,
		ctxPrimary: OffscreenCanvasRenderingContext2D,
		ctxUnderlay: OffscreenCanvasRenderingContext2D,
		ctxVanishing: OffscreenCanvasRenderingContext2D,
	): Promise<void> {
		if (ImageBlockDrawEngine.initialized) {
			console.error('ImageBlockDrawEngine > initialize: already initialized');
			return;
		}
		ImageBlockDrawEngine.assetImages = AssetEngine.getAssetManifestMaster().images;
		ImageBlockDrawEngine.initialized = true;
		ImageBlockDrawEngine.ctxBackground = ctxBackground;
		ImageBlockDrawEngine.ctxForeground = ctxForeground;
		ImageBlockDrawEngine.ctxPrimary = ctxPrimary;
		ImageBlockDrawEngine.ctxVanishing = ctxVanishing;

		ImageBlockDrawEngine.zGroup = [
			VideoBusInputCmdGameModeEditApplyZ.BACKGROUND,
			VideoBusInputCmdGameModeEditApplyZ.FOREGROUND,
			VideoBusInputCmdGameModeEditApplyZ.PRIMARY, // After foreground
			VideoBusInputCmdGameModeEditApplyZ.VANISHING,
		];
	}

	public static cacheReset(): void {
		ImageBlockDrawEngine.cacheZoom = -1;
	}

	public static start(): void {
		let camera: Camera = ImageBlockDrawEngine.mapActiveCamera,
			hourPreciseOfDayEff: number = LightingEngine.getHourPreciseOfDayEff();
		//let start: number = performance.now();

		if (
			ImageBlockDrawEngine.cacheHashGx !== camera.gx ||
			ImageBlockDrawEngine.cacheHashGy !== camera.gy ||
			ImageBlockDrawEngine.cacheHashPh !== camera.windowPh ||
			ImageBlockDrawEngine.cacheHashPw !== camera.windowPw ||
			ImageBlockDrawEngine.cacheHourPreciseCheck !== hourPreciseOfDayEff ||
			ImageBlockDrawEngine.cacheZoom !== camera.zoom
		) {
			// Draw cache
			let assetId: string,
				canvas: OffscreenCanvas = new OffscreenCanvas(camera.windowPw, camera.windowPh),
				ctx: OffscreenCanvasRenderingContext2D = <OffscreenCanvasRenderingContext2D>canvas.getContext('2d'),
				complex: GridBlockTableComplex,
				complexes: GridBlockTableComplex[],
				complexesByGx: { [key: number]: GridBlockTableComplex[] },
				drawGx: number,
				extendedHash: { [key: number]: null },
				extendedHashBackground: { [key: number]: null } = {},
				extendedHashForeground: { [key: number]: null } = {},
				extendedHashPrimary: { [key: number]: null } = {},
				extendedHashVanishing: { [key: number]: null } = {},
				getCacheLit = LightingEngine.getCacheLit,
				gInPh: number = camera.gInPh,
				gInPw: number = camera.gInPw,
				gradient: CanvasGradient,
				grid: Grid = ImageBlockDrawEngine.mapActive.gridActive,
				gridConfig: GridConfig = ImageBlockDrawEngine.mapActive.gridConfigActive,
				gridImageBlock: GridImageBlock,
				gx: number,
				gy: number,
				imageBitmap: ImageBitmap,
				j: string,
				k: number,
				outside: boolean = gridConfig.outside,
				radius: number,
				radius2: number,
				reference: GridBlockTable<GridImageBlockReference>,
				referenceHashes: { [key: number]: GridImageBlockReference },
				startGx: number = camera.viewportGx,
				startGy: number = camera.viewportGy,
				stopGx: number = startGx + camera.viewportGwEff,
				stopGy: number = startGy + camera.viewportGwEff,
				x: number,
				y: number,
				z: VideoBusInputCmdGameModeEditApplyZ,
				zGroup: VideoBusInputCmdGameModeEditApplyZ[] = ImageBlockDrawEngine.zGroup;

			// Config
			ctx.imageSmoothingEnabled = false;
			ctx.filter = 'brightness(' + gridConfig.lightIntensityGlobal + ')';
			radius = Math.round(((camera.viewportPh / 2) * ImageBlockDrawEngine.vanishingPercentageOfViewport) / camera.zoom);
			radius2 = radius * 2;

			/*
			 * Iterate through z layers
			 */
			for (let i in zGroup) {
				// Config
				z = zGroup[i];
				switch (z) {
					case VideoBusInputCmdGameModeEditApplyZ.BACKGROUND:
						extendedHash = extendedHashBackground;
						reference = grid.imageBlocksBackgroundReference;
						break;
					case VideoBusInputCmdGameModeEditApplyZ.FOREGROUND:
						extendedHash = extendedHashForeground;
						reference = grid.imageBlocksForegroundReference;
						break;
					case VideoBusInputCmdGameModeEditApplyZ.PRIMARY:
						extendedHash = extendedHashPrimary;
						reference = grid.imageBlocksPrimaryReference;
						break;
					case VideoBusInputCmdGameModeEditApplyZ.VANISHING:
						extendedHash = extendedHashVanishing;
						reference = grid.imageBlocksVanishingReference;
						break;
				}
				referenceHashes = reference.hashes;

				// Applicable hashes
				complexesByGx = UtilEngine.gridBlockTableSliceHashes(reference, startGx, startGy, stopGx, stopGy);

				for (j in complexesByGx) {
					complexes = complexesByGx[j];
					gx = Number(j);
					drawGx = Math.round((gx - startGx) * gInPw);

					for (k = 0; k < complexes.length; k++) {
						complex = complexes[k];
						gridImageBlock = referenceHashes[complex.hash].block;
						assetId = gridImageBlock.assetId;

						// Extended check
						gridImageBlock = referenceHashes[complex.hash].block;
						if (gridImageBlock.extends || gridImageBlock.gSizeH !== 1 || gridImageBlock.gSizeW !== 1) {
							if (gridImageBlock.extends) {
								// extention block
								gridImageBlock = referenceHashes[gridImageBlock.extends].block;
								assetId = gridImageBlock.assetId;
							}

							if (extendedHash[gridImageBlock.hash] === null) {
								// Skip block as its hash parent's image has already drawn over it
								continue;
							} else {
								// Draw large block
								extendedHash[gridImageBlock.hash] = null;

								if (gx !== <number>gridImageBlock.gx) {
									gx = <number>gridImageBlock.gx;
									drawGx = Math.round((gx - startGx) * gInPw);
								}
								gy = <number>gridImageBlock.gy;
							}
						} else {
							if (gx !== <number>gridImageBlock.gx) {
								gx = <number>complex.gx;
								drawGx = Math.round((gx - startGx) * gInPw);
							}
							gy = <number>complex.gy;
						}

						// Get pre-rendered asset variation based on hash
						imageBitmap = getCacheLit(assetId, grid.id, gridImageBlock.hash, outside, z);

						ctx.drawImage(
							imageBitmap,
							0,
							0,
							imageBitmap.width,
							imageBitmap.height,
							drawGx,
							Math.round((gy - startGy) * gInPh),
							gInPw * gridImageBlock.gSizeW + 1, // Make sure we fill the grid
							gInPh * gridImageBlock.gSizeH + 1, // Make sure we fill the grid
						);
					}
				}

				// CacheIt
				switch (z) {
					case VideoBusInputCmdGameModeEditApplyZ.BACKGROUND:
						ImageBlockDrawEngine.cacheBackground = canvas.transferToImageBitmap();
						break;
					case VideoBusInputCmdGameModeEditApplyZ.FOREGROUND:
						ImageBlockDrawEngine.cacheForeground = canvas.transferToImageBitmap();
						break;
					case VideoBusInputCmdGameModeEditApplyZ.PRIMARY:
						ImageBlockDrawEngine.cachePrimary = canvas.transferToImageBitmap();
						break;
					case VideoBusInputCmdGameModeEditApplyZ.VANISHING:
						if (ImageBlockDrawEngine.vanishingEnable) {
							x = Math.round((camera.gx - startGx) * gInPw);
							y = Math.round((camera.gy - startGy) * gInPh);

							gradient = ctx.createRadialGradient(x, y, 0, x, y, radius);
							gradient.addColorStop(0, 'white');
							gradient.addColorStop(0.75, 'white');
							gradient.addColorStop(1, 'transparent');

							ctx.globalCompositeOperation = 'destination-out';
							ctx.fillStyle = gradient;
							ctx.fillRect(x - radius, y - radius, radius2, radius2);
							ctx.globalCompositeOperation = 'source-over'; // restore default setting
						}

						ImageBlockDrawEngine.cacheVanishing = canvas.transferToImageBitmap();
						break;
				}
			}

			// Cache it
			ImageBlockDrawEngine.cacheHashGx = camera.gx;
			ImageBlockDrawEngine.cacheHashGy = camera.gy;
			ImageBlockDrawEngine.cacheHashPh = camera.windowPh;
			ImageBlockDrawEngine.cacheHashPw = camera.windowPw;
			ImageBlockDrawEngine.cacheHourPreciseCheck = hourPreciseOfDayEff;
			ImageBlockDrawEngine.cacheZoom = camera.zoom;
		}

		ImageBlockDrawEngine.ctxBackground.drawImage(ImageBlockDrawEngine.cacheBackground, 0, 0);
		ImageBlockDrawEngine.ctxForeground.drawImage(ImageBlockDrawEngine.cacheForeground, 0, 0);
		ImageBlockDrawEngine.ctxPrimary.drawImage(ImageBlockDrawEngine.cachePrimary, 0, 0);
		ImageBlockDrawEngine.ctxVanishing.drawImage(ImageBlockDrawEngine.cacheVanishing, 0, 0);

		// MapDrawEngine.count++;
		// MapDrawEngine.sum += performance.now() - start;
		// console.log('MapDrawEngine(perf)', Math.round(MapDrawEngine.sum / MapDrawEngine.count * 1000) / 1000);
	}

	public static setMapActive(mapActive: MapActive) {
		ImageBlockDrawEngine.mapActive = mapActive;
		ImageBlockDrawEngine.mapActiveCamera = mapActive.camera;
	}

	public static setVanishingEnable(vanishingEnable: boolean) {
		ImageBlockDrawEngine.vanishingEnable = vanishingEnable;
		MapDrawEngineBus.setVanishingEnable(vanishingEnable);
	}

	public static setVanishingPercentageOfViewport(vanishingPercentageOfViewport: number) {
		ImageBlockDrawEngine.vanishingPercentageOfViewport = vanishingPercentageOfViewport;
		MapDrawEngineBus.setVanishingPercentageOfViewport(ImageBlockDrawEngine.vanishingPercentageOfViewport);
	}
}
