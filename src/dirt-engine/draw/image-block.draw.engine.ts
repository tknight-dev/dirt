import { AssetImage } from '../models/asset.model';
import { Camera } from '../models/camera.model';
import { LightingEngine } from '../engines/lighting.engine';
import { Grid, GridBlockTable, GridBlockTableComplex, GridConfig, GridImageBlock } from '../models/grid.model';
import { MapActive } from '../models/map.model';
import { MapDrawEngineBus } from './buses/map.draw.engine.bus';
import { UtilEngine } from '../engines/util.engine';
import { VideoBusInputCmdGameModeEditApplyZ } from '../engines/buses/video.model.bus';
import { AssetEngine } from '../engines/asset.engine';

/**
 * Leverage global lighting thread to create 24 darkened/lightened images to represent the day cycle
 *
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
	private static cacheHashG: number;
	private static cacheHashP: number;
	private static cacheHashCheckG: number;
	private static cacheHashCheckP: number;
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
		let camera: Camera = ImageBlockDrawEngine.mapActiveCamera;
		//let start: number = performance.now();

		ImageBlockDrawEngine.cacheHashCheckG = UtilEngine.gridHashTo(camera.gx, camera.gy);
		ImageBlockDrawEngine.cacheHashCheckP = UtilEngine.gridHashTo(camera.windowPw, camera.windowPh);
		if (
			ImageBlockDrawEngine.cacheHashG !== ImageBlockDrawEngine.cacheHashCheckG ||
			ImageBlockDrawEngine.cacheHashP !== ImageBlockDrawEngine.cacheHashCheckP ||
			ImageBlockDrawEngine.cacheHourPreciseCheck !== LightingEngine.getHourPreciseOfDayEff() ||
			ImageBlockDrawEngine.cacheZoom !== camera.zoom
		) {
			// Draw cache
			let assetId: string,
				assetImage: AssetImage,
				canvas: OffscreenCanvas = new OffscreenCanvas(camera.windowPw, camera.windowPh),
				ctx: OffscreenCanvasRenderingContext2D = <OffscreenCanvasRenderingContext2D>canvas.getContext('2d'),
				complex: GridBlockTableComplex,
				complexes: GridBlockTableComplex[],
				complexesByGx: { [key: number]: GridBlockTableComplex[] },
				extended: boolean,
				extendedHash: { [key: number]: null },
				extendedHashBackground: { [key: number]: null } = {},
				extendedHashForeground: { [key: number]: null } = {},
				extendedHashPrimary: { [key: number]: null } = {},
				extendedHashVanishing: { [key: number]: null } = {},
				getAssetImageLit: any = LightingEngine.getAssetImageLit,
				getAssetImageUnlit: any = LightingEngine.getAssetImageUnlit,
				getAssetImageUnlitMax: any = LightingEngine.cacheZoomedUnlitLength - 1,
				gInPh: number = camera.gInPh,
				gInPw: number = camera.gInPw,
				gradient: CanvasGradient,
				grid: Grid = ImageBlockDrawEngine.mapActive.gridActive,
				gridConfig: GridConfig = ImageBlockDrawEngine.mapActive.gridConfigActive,
				gridImageBlock: GridImageBlock,
				gx: number,
				gy: number,
				gyMin: number,
				hashesGyByGx: { [key: number]: GridBlockTableComplex[] },
				hashesGyByGxForeground: { [key: number]: GridBlockTableComplex[] } = {},
				imageBitmap: ImageBitmap,
				imageBitmaps: ImageBitmap[],
				imageBlocks: GridBlockTable<GridImageBlock>,
				imageBlockHashes: { [key: number]: GridImageBlock },
				j: string,
				k: number,
				outside: boolean = ImageBlockDrawEngine.mapActive.gridConfigActive.outside,
				oversized: boolean,
				radius: number,
				radius2: number,
				scratch: number,
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
						imageBlocks = grid.imageBlocksBackground;
						break;
					case VideoBusInputCmdGameModeEditApplyZ.FOREGROUND:
						extendedHash = extendedHashForeground;
						imageBlocks = grid.imageBlocksForeground;
						break;
					case VideoBusInputCmdGameModeEditApplyZ.PRIMARY:
						extendedHash = extendedHashPrimary;
						imageBlocks = grid.imageBlocksPrimary;
						break;
					case VideoBusInputCmdGameModeEditApplyZ.VANISHING:
						extendedHash = extendedHashVanishing;
						imageBlocks = grid.imageBlocksVanishing;
						break;
				}
				imageBlockHashes = imageBlocks.hashes;

				// Prepare
				ctx.clearRect(0, 0, camera.windowPw, camera.windowPh);

				// Applicable hashes
				complexesByGx = UtilEngine.gridBlockTableSliceHashes(imageBlocks, startGx, startGy, stopGx, stopGy);
				hashesGyByGx = <any>imageBlocks.hashesGyByGx;

				if (z === VideoBusInputCmdGameModeEditApplyZ.FOREGROUND) {
					hashesGyByGxForeground = hashesGyByGx;
				}

				for (j in complexesByGx) {
					complexes = complexesByGx[j];

					if (z === VideoBusInputCmdGameModeEditApplyZ.PRIMARY) {
						if (hashesGyByGxForeground[Number(j)] !== undefined) {
							gyMin = hashesGyByGxForeground[Number(j)][0].value;
						} else {
							gyMin = Infinity;
						}
					} else {
						gyMin = hashesGyByGx[Number(j)][0].value;
					}

					for (k = 0; k < complexes.length; k++) {
						complex = complexes[k];
						assetId = imageBlockHashes[complex.hash].assetId;

						// Null check
						if (!ImageBlockDrawEngine.drawNull && (assetId === 'null' || assetId === 'null2')) {
							continue;
						}

						// Extended check
						gridImageBlock = imageBlockHashes[complex.hash];
						if (gridImageBlock.extends || gridImageBlock.gSizeH !== 1 || gridImageBlock.gSizeW !== 1) {
							if (gridImageBlock.extends) {
								// extention block
								gridImageBlock = imageBlockHashes[gridImageBlock.extends];
								assetId = gridImageBlock.assetId;
							}

							if (extendedHash[gridImageBlock.hash] === null) {
								// Skip block as its hash parent's image has already drawn over it
								continue;
							} else {
								// Draw large block
								extended = true;
								extendedHash[gridImageBlock.hash] = null;
								gx = <number>gridImageBlock.gx;
								gy = <number>gridImageBlock.gy;
							}
						} else {
							extended = false;
							gx = <number>complex.gx;
							gy = <number>complex.gy;
						}

						// Grab global illumination images if outside
						if (outside) {
							scratch = gy - gyMin;

							if (scratch > 2) {
								imageBitmaps = getAssetImageUnlit(assetId);
								imageBitmap = imageBitmaps[Math.min(scratch - 3, getAssetImageUnlitMax)];
							} else {
								imageBitmap = getAssetImageLit(assetId);
							}
						} else {
							imageBitmap = getAssetImageUnlit(assetId)[getAssetImageUnlitMax];
						}

						assetImage = ImageBlockDrawEngine.assetImages[assetId];
						if ((assetImage.gHeight || 1) !== 1 || (assetImage.gWidth || 1) !== 1) {
							oversized = true;
						} else {
							oversized = false;
						}

						// Use draw resize overload for image blocks larger than 1x1
						if (extended || oversized) {
							ctx.drawImage(
								imageBitmap,
								0,
								0,
								imageBitmap.width,
								imageBitmap.height,
								Math.round((gx - startGx) * gInPw),
								Math.round((gy - startGy) * gInPh),
								gInPw * gridImageBlock.gSizeW + 2, // Make sure we fill the grid
								gInPh * gridImageBlock.gSizeH + 2, // Make sure we fill the grid
							);
						} else {
							ctx.drawImage(imageBitmap, Math.round((gx - startGx) * gInPw), Math.round((gy - startGy) * gInPh));
						}
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
			ImageBlockDrawEngine.cacheHashG = ImageBlockDrawEngine.cacheHashCheckG;
			ImageBlockDrawEngine.cacheHashP = ImageBlockDrawEngine.cacheHashCheckP;
			ImageBlockDrawEngine.cacheHourPreciseCheck = LightingEngine.getHourPreciseOfDayEff();
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

	public static setDrawNull(drawNull: boolean) {
		ImageBlockDrawEngine.drawNull = drawNull;
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
