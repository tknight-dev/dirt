import { Camera } from '../models/camera.model';
import { LightingEngine } from '../engines/lighting.engine';
import {
	Grid,
	GridBlockTable,
	GridBlockTableComplex,
	GridBlockTableComplexFull,
	GridImageBlock,
} from '../models/grid.model';
import { MapActive } from '../models/map.model';
import { MapDrawEngineBus } from './buses/map.draw.engine.bus';
import { UtilEngine } from '../engines/util.engine';
import { VideoBusInputCmdGameModeEditApplyZ } from '../engines/buses/video.model.bus';

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
	private static cacheBackground: ImageBitmap;
	private static cacheForeground: ImageBitmap;
	private static cachePrimary: ImageBitmap;
	private static cacheHashG: number;
	private static cacheHashP: number;
	private static cacheHashCheckG: number;
	private static cacheHashCheckP: number;
	private static cacheHourPreciseCheck: number;
	private static cacheZoom: number;
	private static ctxBackground: OffscreenCanvasRenderingContext2D;
	private static ctxForeground: OffscreenCanvasRenderingContext2D;
	private static ctxPrimary: OffscreenCanvasRenderingContext2D;
	private static foregroundViewerEnable: boolean = true;
	private static foregroundViewerPercentageOfViewport: number;
	private static initialized: boolean;
	private static mapActive: MapActive;
	private static mapActiveCamera: Camera;
	private static zGroup: VideoBusInputCmdGameModeEditApplyZ[];
	// private static count: number = 0;
	// private static sum: number = 0;

	public static async initialize(
		ctxBackground: OffscreenCanvasRenderingContext2D,
		ctxForeground: OffscreenCanvasRenderingContext2D,
		ctxOverlay: OffscreenCanvasRenderingContext2D,
		ctxPrimary: OffscreenCanvasRenderingContext2D,
		ctxUnderlay: OffscreenCanvasRenderingContext2D,
	): Promise<void> {
		if (ImageBlockDrawEngine.initialized) {
			console.error('ImageBlockDrawEngine > initialize: already initialized');
			return;
		}
		ImageBlockDrawEngine.initialized = true;
		ImageBlockDrawEngine.ctxBackground = ctxBackground;
		ImageBlockDrawEngine.ctxForeground = ctxForeground;
		ImageBlockDrawEngine.ctxPrimary = ctxPrimary;

		ImageBlockDrawEngine.zGroup = [
			VideoBusInputCmdGameModeEditApplyZ.PRIMARY, // Must be first
			VideoBusInputCmdGameModeEditApplyZ.BACKGROUND,
			VideoBusInputCmdGameModeEditApplyZ.FOREGROUND,
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
			let canvas: OffscreenCanvas = new OffscreenCanvas(camera.windowPw, camera.windowPh),
				ctx: OffscreenCanvasRenderingContext2D = <OffscreenCanvasRenderingContext2D>canvas.getContext('2d'),
				complex: GridBlockTableComplex,
				complexes: GridBlockTableComplex[],
				complexesByGx: { [key: number]: GridBlockTableComplex[] },
				getAssetImageLit: any = LightingEngine.getAssetImageLit,
				getAssetImageUnlit: any = LightingEngine.getAssetImageUnlit,
				getAssetImageUnlitMax: any = LightingEngine.cacheZoomedUnlitLength - 1,
				gInPh: number = camera.gInPh,
				gInPw: number = camera.gInPw,
				grid: Grid = ImageBlockDrawEngine.mapActive.gridActive,
				gridBlockTableComplexFull: GridBlockTableComplexFull,
				horizonLineGyByGxPrimary: { [key: number]: number } = {},
				imageBitmap: ImageBitmap,
				imageBitmaps: ImageBitmap[],
				imageBlocks: GridBlockTable<GridImageBlock>,
				imageBlockHashes: { [key: number]: GridImageBlock },
				j: string,
				k: number,
				outside: boolean = ImageBlockDrawEngine.mapActive.gridConfigActive.outside,
				scratch: number,
				startGx: number = camera.viewportGx,
				startGy: number = camera.viewportGy,
				stopGx: number = startGx + camera.viewportGwEff,
				stopGy: number = startGy + camera.viewportGwEff,
				z: VideoBusInputCmdGameModeEditApplyZ,
				zGroup: VideoBusInputCmdGameModeEditApplyZ[] = ImageBlockDrawEngine.zGroup;

			ctx.imageSmoothingEnabled = false;
			/*
			 * Iterate through z layers
			 */
			for (let i in zGroup) {
				// Config
				z = zGroup[i];
				switch (z) {
					case VideoBusInputCmdGameModeEditApplyZ.BACKGROUND:
						imageBlocks = grid.imageBlocksBackground;
						break;
					case VideoBusInputCmdGameModeEditApplyZ.FOREGROUND:
						imageBlocks = grid.imageBlocksForeground;
						break;
					case VideoBusInputCmdGameModeEditApplyZ.PRIMARY:
						imageBlocks = grid.imageBlocksPrimary;
						break;
				}
				imageBlockHashes = imageBlocks.hashes;

				// Prepare
				ctx.clearRect(0, 0, camera.windowPw, camera.windowPh);

				// Applicable hashes
				gridBlockTableComplexFull = UtilEngine.gridBlockTableSliceHashes(
					imageBlocks,
					startGx,
					startGy,
					stopGx,
					stopGy,
				);
				complexesByGx = gridBlockTableComplexFull.hashes;

				if (z === VideoBusInputCmdGameModeEditApplyZ.PRIMARY) {
					horizonLineGyByGxPrimary = gridBlockTableComplexFull.gyMinByGx;
				}

				for (j in complexesByGx) {
					complexes = complexesByGx[j];

					for (k = 0; k < complexes.length; k++) {
						complex = complexes[k];

						if (outside) {
							scratch = <number>complex.gy - horizonLineGyByGxPrimary[<number>complex.gx];

							if (scratch > 2) {
								imageBitmaps = getAssetImageUnlit(imageBlockHashes[complex.hash].assetId);
								imageBitmap = imageBitmaps[Math.min(scratch - 3, getAssetImageUnlitMax)];
							} else {
								imageBitmap = getAssetImageLit(imageBlockHashes[complex.hash].assetId);
							}
						} else {
							imageBitmap = getAssetImageUnlit(imageBlockHashes[complex.hash].assetId)[
								getAssetImageUnlitMax
							];
						}

						ctx.drawImage(
							imageBitmap,
							(<any>complex.gx - startGx) * gInPw,
							(<any>complex.gy - startGy) * gInPh,
						);
					}
				}

				// CacheIt
				switch (z) {
					case VideoBusInputCmdGameModeEditApplyZ.BACKGROUND:
						ImageBlockDrawEngine.cacheBackground = canvas.transferToImageBitmap();
						break;
					case VideoBusInputCmdGameModeEditApplyZ.FOREGROUND:
						// "Cut Out" viewport from foreground layer to make the under layers visible to the person
						if (ImageBlockDrawEngine.foregroundViewerEnable) {
							let gradient: CanvasGradient,
								radius: number =
									((camera.viewportPh / 2) *
										ImageBlockDrawEngine.foregroundViewerPercentageOfViewport) /
									camera.zoom,
								x: number = (camera.gx - startGx) * gInPw,
								y: number = (camera.gy - startGy) * gInPh;

							gradient = ctx.createRadialGradient(x, y, 0, x, y, radius);
							gradient.addColorStop(0, 'rgba(255,255,255,1)');
							gradient.addColorStop(0.75, 'rgba(255,255,255,1)');
							gradient.addColorStop(1, 'transparent');

							ctx.globalCompositeOperation = 'destination-out';
							ctx.fillStyle = gradient;
							ctx.fillRect(x - radius, y - radius, radius * 2, radius * 2);
							ctx.globalCompositeOperation = 'source-over'; // restore default setting
						}

						ImageBlockDrawEngine.cacheForeground = canvas.transferToImageBitmap();
						break;
					case VideoBusInputCmdGameModeEditApplyZ.PRIMARY:
						ImageBlockDrawEngine.cachePrimary = canvas.transferToImageBitmap();
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

		// MapDrawEngine.count++;
		// MapDrawEngine.sum += performance.now() - start;
		// console.log('MapDrawEngine(perf)', Math.round(MapDrawEngine.sum / MapDrawEngine.count * 1000) / 1000);
	}

	public static setMapActive(mapActive: MapActive) {
		ImageBlockDrawEngine.mapActive = mapActive;
		ImageBlockDrawEngine.mapActiveCamera = mapActive.camera;
	}

	public static setForegroundViewer(enable: boolean) {
		ImageBlockDrawEngine.cacheZoom = -1;
		ImageBlockDrawEngine.foregroundViewerEnable = enable;
		MapDrawEngineBus.setForegroundViewer(ImageBlockDrawEngine.foregroundViewerEnable);
	}

	public static setForegroundViewerSettings(foregroundViewerPercentageOfViewport: number) {
		ImageBlockDrawEngine.foregroundViewerPercentageOfViewport = foregroundViewerPercentageOfViewport;
		MapDrawEngineBus.setForegroundViewerPercentageOfViewport(
			ImageBlockDrawEngine.foregroundViewerPercentageOfViewport,
		);
	}
}
