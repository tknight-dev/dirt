import { Camera } from '../models/camera.model';
import { MapActive } from '../models/map.model';
import { UtilEngine } from '../engines/util.engine';

/**
 * @author tknight-dev
 */

export class ImageBlockPrimaryDrawEngine {
	private static cache: ImageBitmap;
	private static cacheHashG: number;
	private static cacheHashP: number;
	private static cacheHashCheckG: number;
	private static cacheHashCheckP: number;
	private static cacheModeEdit: boolean;
	private static cacheZoom: number;
	private static ctxPrimary: OffscreenCanvasRenderingContext2D;
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
		if (ImageBlockPrimaryDrawEngine.initialized) {
			console.error('ImageBlockPrimaryDrawEngine > initialize: already initialized');
			return;
		}
		ImageBlockPrimaryDrawEngine.initialized = true;
		ImageBlockPrimaryDrawEngine.ctxPrimary = ctxPrimary;
	}

	public static cacheReset(): void {
		ImageBlockPrimaryDrawEngine.cacheZoom = -1;
	}

	public static start(): void {
		//let start: number = performance.now();
		// A: pull asset based on resolution settings
		// B: draw image and cache at resolution
		// C: resize image for zoom level and cache
		// D: if camera moves re-draw, if not cache
		// MapDrawEngine.count++;
		// MapDrawEngine.sum += performance.now() - start;
		// console.log('MapDrawEngine(perf)', Math.round(MapDrawEngine.sum / MapDrawEngine.count * 1000) / 1000);
	}

	public static setMapActive(mapActive: MapActive) {
		ImageBlockPrimaryDrawEngine.mapActive = mapActive;
		ImageBlockPrimaryDrawEngine.mapActiveCamera = mapActive.camera;
	}
}
