import { Camera } from '../models/camera.model';
import { GridConfig } from '../models/grid.model';
import { MapActive } from '../models/map.model';

/**
 * @author tknight-dev
 */

export class CameraDrawEngine {
	private static cache: ImageBitmap;
	private static cacheCanvas: OffscreenCanvas;
	private static cacheGInP: number;
	private static cachePositionHashGx: number;
	private static cachePositionHashGy: number;
	private static cachePositionHashPw: number;
	private static cachePositionHashPh: number;
	private static cacheZoom: number;
	private static ctx: OffscreenCanvasRenderingContext2D;
	private static ctxInteractive: OffscreenCanvasRenderingContext2D;
	private static initialized: boolean;
	private static mapActive: MapActive;
	private static mapActiveCamera: Camera;

	public static async initialize(ctxInteractive: OffscreenCanvasRenderingContext2D): Promise<void> {
		if (CameraDrawEngine.initialized) {
			console.error('CameraDrawEngine > initialize: already initialized');
			return;
		}
		CameraDrawEngine.initialized = true;
		CameraDrawEngine.ctxInteractive = ctxInteractive;

		CameraDrawEngine.cacheCanvas = new OffscreenCanvas(0, 0);
		CameraDrawEngine.ctx = <OffscreenCanvasRenderingContext2D>CameraDrawEngine.cacheCanvas.getContext('2d');
		CameraDrawEngine.ctx.imageSmoothingEnabled = false;

		// Last
		CameraDrawEngine.startBind();
	}

	public static cacheReset(): void {
		CameraDrawEngine.cachePositionHashGx = -1;
		CameraDrawEngine.cachePositionHashGy = -1;
		CameraDrawEngine.cachePositionHashPw = -1;
		CameraDrawEngine.cachePositionHashPh = -1;
		CameraDrawEngine.cacheZoom = -1;
	}

	// Function set by binder, this is just a placeholder
	public static start(): void {}

	/**
	 * This binding structure greatly reduces GC build up
	 */
	private static startBind(): void {
		let cacheCanvas: OffscreenCanvas = CameraDrawEngine.cacheCanvas,
			cachePositionPx: number,
			cachePositionPy: number,
			ctx: OffscreenCanvasRenderingContext2D = CameraDrawEngine.ctx,
			ctxInteractive: OffscreenCanvasRenderingContext2D = CameraDrawEngine.ctxInteractive,
			camera: Camera,
			gridConfig: GridConfig,
			height: number,
			sizeEff: number;

		CameraDrawEngine.start = () => {
			camera = CameraDrawEngine.mapActiveCamera;

			if (!CameraDrawEngine.cache || CameraDrawEngine.cacheGInP !== camera.gInPh) {
				// Draw from scratch
				sizeEff = (camera.gInPh / 4) | 0;

				// Canvas
				height = Math.max(1, sizeEff * 2);
				if (cacheCanvas.height !== height) {
					cacheCanvas.height = height;
					cacheCanvas.width = height;
				}

				ctx.beginPath();
				ctx.lineWidth = 2;
				ctx.fillStyle = 'rgba(255,255,255,.25)';
				ctx.strokeStyle = 'white';
				ctx.arc(sizeEff, sizeEff, (sizeEff / 2) | 0, 0, 2 * Math.PI);
				ctx.fill();
				ctx.stroke();

				// Cache It
				CameraDrawEngine.cache = cacheCanvas.transferToImageBitmap();
				CameraDrawEngine.cacheGInP = camera.gInPh;
			}

			if (
				CameraDrawEngine.cachePositionHashGx !== camera.gx ||
				CameraDrawEngine.cachePositionHashGy !== camera.gy ||
				CameraDrawEngine.cachePositionHashPh !== camera.windowPh ||
				CameraDrawEngine.cachePositionHashPw !== camera.windowPw ||
				CameraDrawEngine.cacheZoom !== camera.zoom
			) {
				// Calc from scratch
				gridConfig = CameraDrawEngine.mapActive.gridConfigActive;
				sizeEff = (camera.gInPh / 4) | 0;

				if (camera.viewportGx === 0) {
					// Left
					cachePositionPx = camera.gx * camera.gInPw;
				} else if (camera.viewportGx + camera.viewportGwEff === gridConfig.gWidth) {
					// Right
					cachePositionPx =
						camera.viewportPx +
						camera.viewportPw / 2 +
						(camera.gx - (camera.viewportGx + camera.viewportGwEff / 2)) * camera.gInPw;
				} else {
					cachePositionPx = camera.viewportPx + camera.viewportPw / 2;
				}
				cachePositionPx = (cachePositionPx - sizeEff) | 0; // Offset to circle center

				if (camera.viewportGy === 0) {
					cachePositionPy = camera.gy * camera.gInPh;
				} else if (camera.viewportGy + camera.viewportGhEff === gridConfig.gHeight) {
					cachePositionPy =
						camera.viewportPy +
						camera.viewportPh / 2 +
						(camera.gy - (camera.viewportGy + camera.viewportGhEff / 2)) * camera.gInPh;
				} else {
					cachePositionPy = camera.viewportPy + camera.viewportPh / 2;
				}
				cachePositionPy = (cachePositionPy - sizeEff) | 0; // Offset to circle center

				CameraDrawEngine.cachePositionHashGx = camera.gx;
				CameraDrawEngine.cachePositionHashGy = camera.gy;
				CameraDrawEngine.cachePositionHashPh = camera.windowPh;
				CameraDrawEngine.cachePositionHashPw = camera.windowPw;
				CameraDrawEngine.cacheZoom = camera.zoom;
			}

			ctxInteractive.drawImage(CameraDrawEngine.cache, cachePositionPx, cachePositionPy);
		};
	}

	public static setMapActive(mapActive: MapActive) {
		CameraDrawEngine.mapActive = mapActive;
		CameraDrawEngine.mapActiveCamera = mapActive.camera;
	}
}
