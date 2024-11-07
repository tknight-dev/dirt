import { Camera } from '../models/camera.model';
import { MapActive } from '../models/map.model';
import { UtilEngine } from '../engines/util.engine';

/**
 * Known: grid number can flicker off by one due to rounding issue
 *
 * @author tknight-dev
 */

export class GridDrawEngine {
	private static cache: ImageBitmap;
	private static cacheHashG: number;
	private static cacheHashP: number;
	private static cacheHashCheckG: number;
	private static cacheHashCheckP: number;
	private static cacheModeEdit: boolean;
	private static cacheZoom: number;
	private static ctxOverlay: OffscreenCanvasRenderingContext2D;
	private static enable: boolean = true;
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
		if (GridDrawEngine.initialized) {
			console.error('GridDrawEngine > initialize: already initialized');
			return;
		}
		GridDrawEngine.initialized = true;
		GridDrawEngine.ctxOverlay = ctxOverlay;
	}

	public static cacheReset(): void {
		GridDrawEngine.cacheHashG = -1;
		GridDrawEngine.cacheHashP = -1;
		GridDrawEngine.cacheZoom = -1;
	}

	public static start(): void {
		//let start: number = performance.now();

		if (GridDrawEngine.enable) {
			GridDrawEngine.cacheHashCheckG = UtilEngine.gridHashTo(
				GridDrawEngine.mapActiveCamera.gx,
				GridDrawEngine.mapActiveCamera.gy,
			);
			GridDrawEngine.cacheHashCheckP = UtilEngine.gridHashTo(
				GridDrawEngine.mapActiveCamera.windowPw,
				GridDrawEngine.mapActiveCamera.windowPh,
			);
			if (
				GridDrawEngine.cacheHashCheckG !== GridDrawEngine.cacheHashG ||
				GridDrawEngine.cacheHashCheckP !== GridDrawEngine.cacheHashP ||
				GridDrawEngine.cacheZoom !== GridDrawEngine.mapActiveCamera.zoom
			) {
				// Draw from scratch
				let cacheCanvas: OffscreenCanvas,
					camera: Camera = GridDrawEngine.mapActiveCamera,
					ctx: OffscreenCanvasRenderingContext2D,
					gEff: number,
					gInPh: number = camera.gInPh,
					gInPw: number = camera.gInPw,
					viewportGx: number = camera.viewportGx,
					viewportGy: number = camera.viewportGy,
					viewportGhEff: number = camera.viewportGhEff,
					viewportGwEff: number = camera.viewportGwEff + 1,
					viewportPxEff: number = (viewportGx * gInPw) % gInPw,
					viewportPyEff: number = ((viewportGy * gInPh) % gInPh) - gInPh,
					windowPh: number = camera.windowPh,
					windowPw: number = camera.windowPw;

				// Canvas
				cacheCanvas = new OffscreenCanvas(windowPw, windowPh);
				ctx = <OffscreenCanvasRenderingContext2D>cacheCanvas.getContext('2d');

				// Perimeter
				ctx.beginPath();
				ctx.fillStyle = 'cyan';
				ctx.font = 'bold 10px Arial';
				ctx.lineWidth = 1;
				ctx.strokeStyle = 'rgba(255,255,255,.25)';

				// Horizontal
				for (let g = 0; g < viewportGhEff; g++) {
					gEff = g * gInPh - viewportPyEff;
					ctx.moveTo(0, gEff);
					ctx.lineTo(windowPw, gEff);
					ctx.fillText(String(Math.floor(g + viewportGy)).padStart(3, ' '), 5 * gInPw, gEff);
				}

				// Vertical
				for (let g = 0; g < viewportGwEff; g++) {
					gEff = g * gInPw - viewportPxEff;
					ctx.moveTo(gEff, 0);
					ctx.lineTo(gEff, windowPh);
					ctx.fillText(String(Math.floor(g + viewportGx - 0.001)).padStart(3, ' '), gEff, 5 * gInPh);
				}
				ctx.stroke();

				// Cache it
				GridDrawEngine.cache = cacheCanvas.transferToImageBitmap();
				GridDrawEngine.cacheHashG = GridDrawEngine.cacheHashCheckG;
				GridDrawEngine.cacheHashP = GridDrawEngine.cacheHashCheckP;
				GridDrawEngine.cacheZoom = camera.zoom;
			}

			GridDrawEngine.ctxOverlay.drawImage(GridDrawEngine.cache, 0, 0);
		}

		// MapDrawEngine.count++;
		// MapDrawEngine.sum += performance.now() - start;
		// console.log('MapDrawEngine(perf)', Math.round(MapDrawEngine.sum / MapDrawEngine.count * 1000) / 1000);
	}

	public static setEnable(enable: boolean) {
		GridDrawEngine.enable = enable;
	}

	public static setMapActive(mapActive: MapActive) {
		GridDrawEngine.mapActive = mapActive;
		GridDrawEngine.mapActiveCamera = mapActive.camera;
	}
}
