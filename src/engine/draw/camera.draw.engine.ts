import { Camera } from '../models/camera.model';
import { Grid } from '../models/grid.model';
import { MapActive } from '../models/map.model';
import { UtilEngine } from '../util.engine';

/**
 * @author tknight-dev
 */

export class CameraDrawEngine {
	private static cache: ImageBitmap;
	private static cachePositionPx: number;
	private static cachePositionPy: number;
	private static cachePositionHashG: number;
	private static cachePositionHashCheckG: number;
	private static ctxOverlay: OffscreenCanvasRenderingContext2D;
	private static initialized: boolean;
	private static mapActive: MapActive;
	private static mapActiveCamera: Camera;
	// private static count: number = 0;
	// private static sum: number = 0;

	public static async initialize(
		ctx: OffscreenCanvasRenderingContext2D,
		ctxBackground: OffscreenCanvasRenderingContext2D,
		ctxForeground: OffscreenCanvasRenderingContext2D,
		ctxOverlay: OffscreenCanvasRenderingContext2D,
	): Promise<void> {
		if (CameraDrawEngine.initialized) {
			console.error('CameraDrawEngine > initialize: already initialized');
			return;
		}
		CameraDrawEngine.initialized = true;
		CameraDrawEngine.ctxOverlay = ctxOverlay;
	}

	public static start(): void {
		//let start: number = performance.now();

		if (!CameraDrawEngine.cache) {
			// Draw from scratch
			let cacheCanvas: OffscreenCanvas = new OffscreenCanvas(24, 24),
				ctx: OffscreenCanvasRenderingContext2D = <OffscreenCanvasRenderingContext2D>cacheCanvas.getContext('2d');

			ctx.beginPath();
			ctx.lineWidth = 2;
			ctx.fillStyle = 'rgba(255,255,255,.25)';
			ctx.strokeStyle = 'white';
			ctx.arc(12, 12, 10, 0, 2 * Math.PI);
			ctx.fill();
			ctx.stroke();

			// Cache It
			CameraDrawEngine.cache = cacheCanvas.transferToImageBitmap();
		}

		CameraDrawEngine.cachePositionHashCheckG = UtilEngine.gridHashTo(CameraDrawEngine.mapActiveCamera.gx, CameraDrawEngine.mapActiveCamera.gy);
		if (CameraDrawEngine.cachePositionHashG !== CameraDrawEngine.cachePositionHashCheckG) {
			// Calc from scratch
			let camera: Camera = CameraDrawEngine.mapActiveCamera,
				viewPortGx: number = camera.viewPortGx,
				viewPortGy: number = camera.viewPortGy;

			if (viewPortGx === 0) {
				CameraDrawEngine.cachePositionPx = Math.round(camera.gx * camera.gInPw);
			} else if (viewPortGx + camera.viewPortGw === CameraDrawEngine.mapActive.gridActive.gWidth) {
				CameraDrawEngine.cachePositionPx = Math.round(
					camera.viewPortPx + camera.viewPortPw / 2 + (camera.gx - (viewPortGx + camera.viewPortGw / 2)) * camera.gInPw,
				);
			} else {
				CameraDrawEngine.cachePositionPx = Math.round(camera.viewPortPx + camera.viewPortPw / 2);
			}
			CameraDrawEngine.cachePositionPx -= 10; // Offset to circle center

			if (viewPortGy === 0) {
				CameraDrawEngine.cachePositionPy = Math.round(camera.gy * camera.gInPh);
			} else if (viewPortGy + camera.viewPortGh === CameraDrawEngine.mapActive.gridActive.gHeight) {
				CameraDrawEngine.cachePositionPy = Math.round(
					camera.viewPortPy + camera.viewPortPh / 2 + (camera.gy - (viewPortGy + camera.viewPortGh / 2)) * camera.gInPh,
				);
			} else {
				CameraDrawEngine.cachePositionPy = Math.round(camera.viewPortPy + camera.viewPortPh / 2);
			}
			CameraDrawEngine.cachePositionPy -= 10; // Offset to circle center

			CameraDrawEngine.cachePositionHashG = CameraDrawEngine.cachePositionHashCheckG;
		}

		CameraDrawEngine.ctxOverlay.drawImage(CameraDrawEngine.cache, CameraDrawEngine.cachePositionPx, CameraDrawEngine.cachePositionPy);
	}

	public static setMapActive(mapActive: MapActive) {
		CameraDrawEngine.mapActive = mapActive;
		CameraDrawEngine.mapActiveCamera = mapActive.camera;
	}
}
