import { Camera } from '../models/camera.model';
import { MapActive } from '../models/map.model';
import { UtilEngine } from '../util.engine';

/**
 * @author tknight-dev
 */

export class GridDrawEngine {
	private static cache: ImageBitmap;
	private static cacheHashG: number;
	private static cacheHashP: number;
	private static cacheHashCheckG: number;
	private static cacheHashCheckP: number;
	private static cacheZoom: number;
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
		if (GridDrawEngine.initialized) {
			console.error('GridDrawEngine > initialize: already initialized');
			return;
		}
		GridDrawEngine.initialized = true;
		GridDrawEngine.ctxOverlay = ctxOverlay;
	}

	public static start(): void {
		//let start: number = performance.now();
		GridDrawEngine.cacheHashCheckG = UtilEngine.gridHashTo(GridDrawEngine.mapActiveCamera.gx, GridDrawEngine.mapActiveCamera.gy);
		GridDrawEngine.cacheHashCheckP = UtilEngine.gridHashTo(GridDrawEngine.mapActiveCamera.windowPw, GridDrawEngine.mapActiveCamera.windowPh);
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
				viewPortGx: number = camera.viewPortGx,
				viewPortGy: number = camera.viewPortGy,
				viewPortGxEff: number = (viewPortGx * gInPw) % gInPw,
				viewPortGyEff: number = ((viewPortGy * gInPh) % gInPh) - gInPh,
				viewPortGhEff: number = camera.viewPortGhEff,
				viewPortGwEff: number = camera.viewPortGwEff + 1,
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
			for (let g = 0; g < viewPortGhEff; g++) {
				gEff = g * gInPh - viewPortGyEff;
				ctx.moveTo(0, gEff);
				ctx.lineTo(windowPw, gEff);
				ctx.fillText(String(g + Math.floor(viewPortGy)).padStart(3, ' '), 5 * gInPw, gEff);
			}

			// Vertical
			for (let g = 0; g < viewPortGwEff; g++) {
				gEff = g * gInPw - viewPortGxEff;
				ctx.moveTo(gEff, 0);
				ctx.lineTo(gEff, windowPh);
				ctx.fillText(String(g + Math.floor(viewPortGx)).padStart(3, ' '), gEff, 5 * gInPh);
			}
			ctx.stroke();

			// Cache it
			GridDrawEngine.cache = cacheCanvas.transferToImageBitmap();
			GridDrawEngine.cacheHashG = GridDrawEngine.cacheHashCheckG;
			GridDrawEngine.cacheHashP = GridDrawEngine.cacheHashCheckP;
			GridDrawEngine.cacheZoom = camera.zoom;
		}

		GridDrawEngine.ctxOverlay.drawImage(GridDrawEngine.cache, 0, 0);

		// MapDrawEngine.count++;
		// MapDrawEngine.sum += performance.now() - start;
		// console.log('MapDrawEngine(perf)', Math.round(MapDrawEngine.sum / MapDrawEngine.count * 1000) / 1000);
	}

	public static setMapActive(mapActive: MapActive) {
		GridDrawEngine.mapActive = mapActive;
		GridDrawEngine.mapActiveCamera = mapActive.camera;
	}
}
