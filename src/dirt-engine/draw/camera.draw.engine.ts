import { Camera } from '../models/camera.model';
import { MapActive } from '../models/map.model';
import { UtilEngine } from '../engines/util.engine';

/**
 * @author tknight-dev
 */

export class CameraDrawEngine {
	private static cache: ImageBitmap;
	private static cacheGInP: number;
	private static cacheGInPCheck: number;
	private static cachePositionHashG: number;
	private static cachePositionHashPw: number;
	private static cachePositionHashPh: number;
	private static cachePositionHashCheckG: number;
	private static cachePositionPx: number;
	private static cachePositionPy: number;
	private static cacheZoom: number;
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
			sizeEff = Math.round((camera.gInPh / 4) * 1000) / 1000;
			let cacheCanvas: OffscreenCanvas = new OffscreenCanvas(Math.max(1, sizeEff * 2), Math.max(1, sizeEff * 2)),
				ctx: OffscreenCanvasRenderingContext2D = <OffscreenCanvasRenderingContext2D>cacheCanvas.getContext('2d');
			ctx.imageSmoothingEnabled = false;

			ctx.beginPath();
			ctx.lineWidth = 2;
			ctx.fillStyle = 'rgba(255,255,255,.25)';
			ctx.strokeStyle = 'white';
			ctx.arc(sizeEff, sizeEff, sizeEff / 2, 0, 2 * Math.PI);
			ctx.fill();
			ctx.stroke();

			// Cache It
			CameraDrawEngine.cache = cacheCanvas.transferToImageBitmap();
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
			let viewportGx: number = camera.viewportGx,
				viewportGy: number = camera.viewportGy;

			if (!sizeEff) {
				sizeEff = Math.round((camera.gInPh / 4) * 1000) / 1000;
			}

			if (viewportGx === 0) {
				// Left
				CameraDrawEngine.cachePositionPx = Math.round(camera.gx * camera.gInPw);
			} else if (viewportGx + camera.viewportGwEff === CameraDrawEngine.mapActive.gridConfigActive.gWidth) {
				// Right
				CameraDrawEngine.cachePositionPx = Math.round(
					camera.viewportPx + camera.viewportPw / 2 + (camera.gx - (viewportGx + camera.viewportGwEff / 2)) * camera.gInPw,
				);
			} else {
				CameraDrawEngine.cachePositionPx = Math.round(camera.viewportPx + camera.viewportPw / 2);
			}
			CameraDrawEngine.cachePositionPx -= sizeEff; // Offset to circle center

			if (viewportGy === 0) {
				CameraDrawEngine.cachePositionPy = Math.round(camera.gy * camera.gInPh);
			} else if (viewportGy + camera.viewportGhEff === CameraDrawEngine.mapActive.gridConfigActive.gHeight) {
				CameraDrawEngine.cachePositionPy = Math.round(
					camera.viewportPy + camera.viewportPh / 2 + (camera.gy - (viewportGy + camera.viewportGhEff / 2)) * camera.gInPh,
				);
			} else {
				CameraDrawEngine.cachePositionPy = Math.round(camera.viewportPy + camera.viewportPh / 2);
			}
			CameraDrawEngine.cachePositionPy -= sizeEff; // Offset to circle center

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
