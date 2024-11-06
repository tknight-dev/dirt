import { Camera } from '../models/camera.model';
import { LightingEngine } from '../engines/lighting.engine';
import { Grid, GridBlockTable, GridBlockTableComplex, GridImageBlock } from '../models/grid.model';
import { MapActive } from '../models/map.model';
import { UtilEngine } from '../engines/util.engine';
import { VideoCmdGameModeEditApplyZ } from '../models/video-worker-cmds.model';

/**
 * Leverage global lighting thread to create 24 darkened/lightened images to represent the day cycle
 *
 * @author tknight-dev
 */

interface ZGroup {
	ctx: OffscreenCanvasRenderingContext2D;
	z: VideoCmdGameModeEditApplyZ;
}

export class ImageBlockDrawEngine {
	private static cacheBackground: ImageBitmap;
	private static cacheForeground: ImageBitmap;
	private static cachePrimary: ImageBitmap;
	private static cacheHashG: number;
	private static cacheHashP: number;
	private static cacheHashCheckG: number;
	private static cacheHashCheckP: number;
	private static cacheHourCheck: number;
	private static cacheZoom: number;
	private static ctxBackground: OffscreenCanvasRenderingContext2D;
	private static ctxForeground: OffscreenCanvasRenderingContext2D;
	private static ctxPrimary: OffscreenCanvasRenderingContext2D;
	private static initialized: boolean;
	private static mapActive: MapActive;
	private static mapActiveCamera: Camera;
	private static zGroup: VideoCmdGameModeEditApplyZ[];
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
			VideoCmdGameModeEditApplyZ.BACKGROUND,
			VideoCmdGameModeEditApplyZ.FOREGROUND,
			VideoCmdGameModeEditApplyZ.PRIMARY,
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
			ImageBlockDrawEngine.cacheHourCheck !== ImageBlockDrawEngine.mapActive.hourOfDayEff ||
			ImageBlockDrawEngine.cacheZoom !== camera.zoom
		) {
			// Draw cache
			let canvas: OffscreenCanvas = new OffscreenCanvas(camera.windowPw, camera.windowPh),
				ctx: OffscreenCanvasRenderingContext2D = <OffscreenCanvasRenderingContext2D>canvas.getContext('2d'),
				complex: GridBlockTableComplex,
				complexes: GridBlockTableComplex[],
				gInPh: number = camera.gInPh,
				gInPw: number = camera.gInPw,
				grid: Grid = ImageBlockDrawEngine.mapActive.gridActive,
				hourOfDayEff: number = ImageBlockDrawEngine.mapActive.hourOfDayEff, // 0-23
				imageBitmap: ImageBitmap,
				imageBlocks: GridBlockTable<GridImageBlock>,
				imageBlockHashes: { [key: number]: GridImageBlock },
				startGx: number = camera.viewportGx,
				startGy: number = camera.viewportGy,
				stopGx: number = startGx + camera.viewportGwEff,
				stopGy: number = startGy + camera.viewportGwEff,
				z: VideoCmdGameModeEditApplyZ,
				zGroup: VideoCmdGameModeEditApplyZ[] = ImageBlockDrawEngine.zGroup;

			/*
			 * Iterate through z layers
			 */
			for (let i in zGroup) {
				// Config
				z = zGroup[i];
				switch (z) {
					case VideoCmdGameModeEditApplyZ.BACKGROUND:
						imageBlocks = grid.imageBlocksBackground;
						ctx.globalAlpha = 1;
						break;
					case VideoCmdGameModeEditApplyZ.FOREGROUND:
						imageBlocks = grid.imageBlocksForeground;
						ctx.globalAlpha = 0.5;
						break;
					case VideoCmdGameModeEditApplyZ.PRIMARY:
						imageBlocks = grid.imageBlocksPrimary;
						ctx.globalAlpha = 1;
						break;
				}
				imageBlockHashes = imageBlocks.hashes;

				// Prepare
				ctx.clearRect(0, 0, camera.windowPw, camera.windowPh);

				// Applicable hashes
				complexes = UtilEngine.gridBlockTableSliceHashes(imageBlocks, startGx, startGy, stopGx, stopGy);

				for (let j in complexes) {
					complex = complexes[j];

					imageBitmap = LightingEngine.getAssetImage(imageBlockHashes[complex.hash].assetId, hourOfDayEff);
					ctx.drawImage(
						imageBitmap,
						(<any>complex.gx - startGx) * gInPw,
						(<any>complex.gy - startGy) * gInPh,
					);
				}

				// CacheIt
				switch (z) {
					case VideoCmdGameModeEditApplyZ.BACKGROUND:
						ImageBlockDrawEngine.cacheBackground = canvas.transferToImageBitmap();
						break;
					case VideoCmdGameModeEditApplyZ.FOREGROUND:
						ImageBlockDrawEngine.cacheForeground = canvas.transferToImageBitmap();
						break;
					case VideoCmdGameModeEditApplyZ.PRIMARY:
						ImageBlockDrawEngine.cachePrimary = canvas.transferToImageBitmap();
						break;
				}
			}

			// Cache it
			ImageBlockDrawEngine.cacheHashG = ImageBlockDrawEngine.cacheHashCheckG;
			ImageBlockDrawEngine.cacheHashP = ImageBlockDrawEngine.cacheHashCheckP;
			ImageBlockDrawEngine.cacheHourCheck = ImageBlockDrawEngine.mapActive.hourOfDayEff;
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
}
