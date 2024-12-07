import { Camera } from '../models/camera.model';
import { MapActive } from '../models/map.model';
import { UtilEngine } from '../engines/util.engine';

/**
 * @author tknight-dev
 */

export class CameraDrawEngine {
	private static cache: ImageBitmap;
	private static cacheCanvas: OffscreenCanvas;
	private static cacheGInP: number;
	private static cacheGInPCheck: number;
	private static cachePositionHashG: number;
	private static cachePositionHashPw: number;
	private static cachePositionHashPh: number;
	private static cachePositionHashCheckG: number;
	private static cachePositionPx: number;
	private static cachePositionPy: number;
	private static cacheZoom: number;
	private static ctx: OffscreenCanvasRenderingContext2D;
	private static ctxPrimary: OffscreenCanvasRenderingContext2D;
	private static initialized: boolean;
	private static mapActive: MapActive;
	private static mapActiveCamera: Camera;

	public static async initialize(ctxPrimary: OffscreenCanvasRenderingContext2D): Promise<void> {
		if (CameraDrawEngine.initialized) {
			console.error('CameraDrawEngine > initialize: already initialized');
			return;
		}
		CameraDrawEngine.initialized = true;
		CameraDrawEngine.ctxPrimary = ctxPrimary;

		CameraDrawEngine.cacheCanvas = new OffscreenCanvas(0, 0);
		CameraDrawEngine.ctx = <OffscreenCanvasRenderingContext2D>CameraDrawEngine.cacheCanvas.getContext('2d');
		CameraDrawEngine.ctx.imageSmoothingEnabled = false;
	}

	public static cacheReset(): void {
		CameraDrawEngine.cachePositionPx = -1;
		CameraDrawEngine.cachePositionPy = -1;
		CameraDrawEngine.cachePositionHashG = -1;
		CameraDrawEngine.cachePositionHashPw = -1;
		CameraDrawEngine.cachePositionHashPh = -1;
		CameraDrawEngine.cacheZoom = -1;
	}

	public static start(): void {
		let camera: Camera = CameraDrawEngine.mapActiveCamera,
			sizeEff: number = 0;

		CameraDrawEngine.cacheGInPCheck = camera.gInPh;
		if (!CameraDrawEngine.cache || CameraDrawEngine.cacheGInP !== CameraDrawEngine.cacheGInPCheck) {
			// Draw from scratch
			sizeEff = (camera.gInPh / 4) | 0;
			let ctx: OffscreenCanvasRenderingContext2D = CameraDrawEngine.ctx;

			// Canvas
			CameraDrawEngine.cacheCanvas.height = Math.max(1, sizeEff * 2);
			CameraDrawEngine.cacheCanvas.width = CameraDrawEngine.cacheCanvas.height;

			ctx.beginPath();
			ctx.lineWidth = 2;
			ctx.fillStyle = 'rgba(255,255,255,.25)';
			ctx.strokeStyle = 'white';
			ctx.arc(sizeEff, sizeEff, (sizeEff / 2) | 0, 0, 2 * Math.PI);
			ctx.fill();
			ctx.stroke();

			// Cache It
			CameraDrawEngine.cache = CameraDrawEngine.cacheCanvas.transferToImageBitmap();
			CameraDrawEngine.cacheGInP = CameraDrawEngine.cacheGInPCheck;
		}

		CameraDrawEngine.cachePositionHashCheckG = UtilEngine.gridHashTo(camera.gx, camera.gy);
		if (
			CameraDrawEngine.cachePositionHashG !== CameraDrawEngine.cachePositionHashCheckG ||
			CameraDrawEngine.cachePositionHashPh !== camera.windowPh ||
			CameraDrawEngine.cachePositionHashPw !== camera.windowPw ||
			CameraDrawEngine.cacheZoom !== camera.zoom
		) {
			// Calc from scratch
			if (!sizeEff) {
				sizeEff = (camera.gInPh / 4) | 0;
			}

			if (camera.viewportGx === 0) {
				// Left
				CameraDrawEngine.cachePositionPx = camera.gx * camera.gInPw;
			} else if (camera.viewportGx + camera.viewportGwEff === CameraDrawEngine.mapActive.gridConfigActive.gWidth) {
				// Right
				CameraDrawEngine.cachePositionPx =
					camera.viewportPx + camera.viewportPw / 2 + (camera.gx - (camera.viewportGx + camera.viewportGwEff / 2)) * camera.gInPw;
			} else {
				CameraDrawEngine.cachePositionPx = camera.viewportPx + camera.viewportPw / 2;
			}
			CameraDrawEngine.cachePositionPx = (CameraDrawEngine.cachePositionPx - sizeEff) | 0; // Offset to circle center

			if (camera.viewportGy === 0) {
				CameraDrawEngine.cachePositionPy = camera.gy * camera.gInPh;
			} else if (camera.viewportGy + camera.viewportGhEff === CameraDrawEngine.mapActive.gridConfigActive.gHeight) {
				CameraDrawEngine.cachePositionPy =
					camera.viewportPy + camera.viewportPh / 2 + (camera.gy - (camera.viewportGy + camera.viewportGhEff / 2)) * camera.gInPh;
			} else {
				CameraDrawEngine.cachePositionPy = camera.viewportPy + camera.viewportPh / 2;
			}
			CameraDrawEngine.cachePositionPy = (CameraDrawEngine.cachePositionPy - sizeEff) | 0; // Offset to circle center

			CameraDrawEngine.cachePositionHashG = CameraDrawEngine.cachePositionHashCheckG;
			CameraDrawEngine.cachePositionHashPh = camera.windowPh;
			CameraDrawEngine.cachePositionHashPw = camera.windowPw;
			CameraDrawEngine.cacheZoom = camera.zoom;
		}

		CameraDrawEngine.ctxPrimary.drawImage(CameraDrawEngine.cache, CameraDrawEngine.cachePositionPx, CameraDrawEngine.cachePositionPy);
	}

	public static setMapActive(mapActive: MapActive) {
		CameraDrawEngine.mapActive = mapActive;
		CameraDrawEngine.mapActiveCamera = mapActive.camera;
	}
}
