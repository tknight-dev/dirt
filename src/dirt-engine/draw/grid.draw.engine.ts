import { Camera } from '../models/camera.model';
import { MapActive } from '../models/map.model';

/**
 * Known: grid number can flicker off by one due to rounding issue
 *
 * @author tknight-dev
 */

export class GridDrawEngine {
	private static cache: ImageBitmap;
	private static cacheCanvas: OffscreenCanvas;
	private static cacheHashGx: number;
	private static cacheHashGy: number;
	private static cacheHashPh: number;
	private static cacheHashPw: number;
	private static cacheZoom: number;
	private static ctx: OffscreenCanvasRenderingContext2D;
	private static ctxOverlay: OffscreenCanvasRenderingContext2D;
	private static enable: boolean = true;
	private static initialized: boolean;
	private static mapActiveCamera: Camera;

	public static async initialize(ctxOverlay: OffscreenCanvasRenderingContext2D): Promise<void> {
		if (GridDrawEngine.initialized) {
			console.error('GridDrawEngine > initialize: already initialized');
			return;
		}
		GridDrawEngine.initialized = true;
		GridDrawEngine.ctxOverlay = ctxOverlay;

		GridDrawEngine.cacheCanvas = new OffscreenCanvas(0, 0);
		GridDrawEngine.ctx = <OffscreenCanvasRenderingContext2D>GridDrawEngine.cacheCanvas.getContext('2d');
		GridDrawEngine.ctx.imageSmoothingEnabled = false;

		// Last
		GridDrawEngine.startBind();
	}

	public static cacheReset(): void {
		GridDrawEngine.cacheHashGx = -1;
		GridDrawEngine.cacheHashGy = -1;
		GridDrawEngine.cacheHashPh = -1;
		GridDrawEngine.cacheHashPw = -1;
		GridDrawEngine.cacheZoom = -1;
	}

	// Function set by binder, this is just a placeholder
	public static start(): void {}

	/**
	 * This binding structure greatly reduces GC build up
	 */
	private static startBind(): void {
		let cacheCanvas: OffscreenCanvas = GridDrawEngine.cacheCanvas,
			camera: Camera,
			ctx: OffscreenCanvasRenderingContext2D = GridDrawEngine.ctx,
			ctxOverlay: OffscreenCanvasRenderingContext2D = GridDrawEngine.ctxOverlay,
			g: number,
			gEff: number,
			gInPh: number,
			gInPw: number,
			viewportGx: number,
			viewportGy: number,
			viewportGhEff: number,
			viewportGwEff: number,
			viewportPxEff: number,
			viewportPyEff: number,
			windowPh: number,
			windowPw: number;

		GridDrawEngine.start = () => {
			camera = GridDrawEngine.mapActiveCamera;

			if (GridDrawEngine.enable) {
				if (
					GridDrawEngine.cacheHashGx !== camera.gx ||
					GridDrawEngine.cacheHashGy !== camera.gy ||
					GridDrawEngine.cacheHashPh !== camera.windowPh ||
					GridDrawEngine.cacheHashPw !== camera.windowPw ||
					GridDrawEngine.cacheZoom !== camera.zoom
				) {
					// Draw from scratch
					gInPh = camera.gInPh;
					gInPw = camera.gInPw;
					viewportGx = camera.viewportGx;
					viewportGy = camera.viewportGy;
					viewportGhEff = camera.viewportGhEff;
					viewportGwEff = camera.viewportGwEff + 1;
					viewportPxEff = (viewportGx * gInPw) % gInPw;
					viewportPyEff = ((viewportGy * gInPh) % gInPh) - gInPh;
					windowPh = camera.windowPh;
					windowPw = camera.windowPw;

					// Canvas
					if (cacheCanvas.height !== windowPh || cacheCanvas.width !== windowPw) {
						cacheCanvas.height = windowPh;
						cacheCanvas.width = windowPw;
					}

					// Perimeter
					ctx.beginPath();
					ctx.fillStyle = 'cyan';
					ctx.font = 'bold 10px Arial';
					ctx.lineWidth = 1;
					ctx.strokeStyle = 'rgba(255,255,255,.25)';

					// Horizontal
					for (g = 0; g < viewportGhEff; g++) {
						gEff = (g * gInPh - viewportPyEff) | 0;
						ctx.moveTo(0, gEff);
						ctx.lineTo(windowPw, gEff);
						ctx.fillText(String((g + viewportGy) | 0), 5 * gInPw, gEff);
					}

					// Vertical
					for (g = 0; g < viewportGwEff; g++) {
						gEff = (g * gInPw - viewportPxEff) | 0;
						ctx.moveTo(gEff, 0);
						ctx.lineTo(gEff, windowPh);
						ctx.fillText(String((g + viewportGx) | 0), gEff, 5 * gInPh);
					}
					ctx.stroke();

					// Cache it
					GridDrawEngine.cache = cacheCanvas.transferToImageBitmap();
					GridDrawEngine.cacheHashGx = camera.gx;
					GridDrawEngine.cacheHashGy = camera.gy;
					GridDrawEngine.cacheHashPh = windowPh;
					GridDrawEngine.cacheHashPw = windowPw;
					GridDrawEngine.cacheZoom = camera.zoom;
				}

				ctxOverlay.drawImage(GridDrawEngine.cache, 0, 0);
			}
		};
	}

	public static setEnable(enable: boolean) {
		GridDrawEngine.enable = enable;
	}

	public static setMapActive(mapActive: MapActive) {
		GridDrawEngine.mapActiveCamera = mapActive.camera;
	}
}
