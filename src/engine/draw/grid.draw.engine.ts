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
	public static ctxDimensionHeight: number;
	public static ctxDimensionWidth: number;
	public static ctxOverlay: OffscreenCanvasRenderingContext2D;
	public static mapActive: MapActive;
	// private static count: number = 0;
	// private static sum: number = 0;

	public static start(): void {
		let start: number = performance.now();

		GridDrawEngine.cacheHashCheckG = UtilEngine.gridHashTo(GridDrawEngine.mapActive.camera.gx, GridDrawEngine.mapActive.camera.gy);
		GridDrawEngine.cacheHashCheckP = UtilEngine.gridHashTo(GridDrawEngine.ctxDimensionWidth, GridDrawEngine.ctxDimensionHeight);
		if (
			GridDrawEngine.cacheHashCheckG !== GridDrawEngine.cacheHashG ||
			GridDrawEngine.cacheHashCheckP !== GridDrawEngine.cacheHashP ||
			GridDrawEngine.cacheZoom !== GridDrawEngine.mapActive.camera.zoom
		) {
			// Draw from scratch
			let mapActive: MapActive = GridDrawEngine.mapActive,
				cacheCanvas: OffscreenCanvas = new OffscreenCanvas(GridDrawEngine.ctxDimensionWidth, GridDrawEngine.ctxDimensionHeight),
				camera: Camera = mapActive.camera,
				ctx = <OffscreenCanvasRenderingContext2D>cacheCanvas.getContext('2d'),
				gEff: number,
				gInPh: number = camera.gInPh,
				gInPw: number = camera.gInPw,
				viewPortGyEff: number = ((camera.viewPortGy * gInPh) % gInPh) - gInPh,
				viewPortGxEff: number = (camera.viewPortGx * gInPw) % gInPw;

			ctx.beginPath();
			ctx.lineWidth = 1;
			ctx.strokeStyle = 'white';
			ctx.fillStyle = 'cyan';
			ctx.font = 'bold 10px Arial';

			// Horizontal
			for (let g = 0; g < camera.viewPortGh; g++) {
				gEff = g * gInPh - viewPortGyEff;
				ctx.moveTo(0, gEff);
				ctx.lineTo(GridDrawEngine.ctxDimensionWidth, gEff);
				ctx.fillText(String(g + Math.floor(camera.viewPortGy)).padStart(3, ' '), 5 * gInPw, gEff);
			}

			// Vertical
			for (let g = 0; g < camera.viewPortGw; g++) {
				gEff = g * gInPw - viewPortGxEff;
				ctx.moveTo(gEff, 0);
				ctx.lineTo(gEff, GridDrawEngine.ctxDimensionHeight);
				ctx.fillText(String(g + Math.floor(camera.viewPortGx)).padStart(3, ' '), gEff, 5 * gInPh);
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
}
