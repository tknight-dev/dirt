import { Camera } from '../models/camera.model';
import { LightingEngine } from '../engines/lighting.engine';
import { Grid, GridBlockTableComplex } from '../models/grid.model';
import { MapActive } from '../models/map.model';
import { UtilEngine } from '../engines/util.engine';

/**
 * Leverage global lighting thread to create 24 darkened/lightened images to represent the day cycle
 *
 * @author tknight-dev
 */

export class ImageBlockDrawEngine {
	private static cache: ImageBitmap;
	private static cacheHashG: number;
	private static cacheHashP: number;
	private static cacheHashCheckG: number;
	private static cacheHashCheckP: number;
	private static cacheHourCheck: number;
	private static cacheZoom: number;
	private static ctxBackground: OffscreenCanvasRenderingContext2D;
	private static ctxForeground: OffscreenCanvasRenderingContext2D;
	private static initialized: boolean;
	private static mapActive: MapActive;
	private static mapActiveCamera: Camera;
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
	}

	public static cacheReset(): void {
		ImageBlockDrawEngine.cacheZoom = -1;
	}

	private static test: boolean;
	public static start(): void {
		//let start: number = performance.now();

		let camera: Camera = ImageBlockDrawEngine.mapActiveCamera,
			grid: Grid = ImageBlockDrawEngine.mapActive.gridActive,
			hash: GridBlockTableComplex,
			hashes: GridBlockTableComplex[],
			gInPh: number = camera.gInPh,
			gInPw: number = camera.gInPw,
			startGx: number = camera.viewportGx,
			startGy: number = camera.viewportGy,
			stopGx: number = startGx + camera.viewportGwEff,
			stopGy: number = startGy + camera.viewportGwEff;

		hashes = UtilEngine.gridBlockTableSliceHashes(grid.imageBlocksBackground, startGx, startGy, stopGx, stopGy);

		if (!ImageBlockDrawEngine.test) {
			ImageBlockDrawEngine.test = true;
			console.log('gx,gy:', hashes[0].gx, hashes[0].gy);
		}

		for (let i in hashes) {
			hash = hashes[i];

			ImageBlockDrawEngine.ctxBackground.beginPath();
			ImageBlockDrawEngine.ctxBackground.fillStyle = 'rgba(255,0,0,.25)';
			ImageBlockDrawEngine.ctxBackground.strokeStyle = 'red';
			ImageBlockDrawEngine.ctxBackground.lineWidth = 1;
			ImageBlockDrawEngine.ctxBackground.rect(
				(<any>hash.gx - startGx) * gInPw,
				(<any>hash.gy - startGy) * gInPh,
				gInPw,
				gInPh,
			);
			ImageBlockDrawEngine.ctxBackground.fill();
			ImageBlockDrawEngine.ctxBackground.stroke();
		}

		// A: pull asset based on resolution settings
		// B: draw image and cache at resolution
		// C: resize image for zoom level and cache
		// D: if camera moves re-draw, if not cache

		// MapDrawEngine.count++;
		// MapDrawEngine.sum += performance.now() - start;
		// console.log('MapDrawEngine(perf)', Math.round(MapDrawEngine.sum / MapDrawEngine.count * 1000) / 1000);
	}

	public static setMapActive(mapActive: MapActive) {
		ImageBlockDrawEngine.mapActive = mapActive;
		ImageBlockDrawEngine.mapActiveCamera = mapActive.camera;
	}
}
