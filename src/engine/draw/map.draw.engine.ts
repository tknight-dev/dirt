import { Camera } from '../models/camera.model';
import { Grid } from '../models/grid.model';
import { MapActive } from '../models/map.model';
import { UtilEngine } from '../util.engine';

/**
 * @author tknight-dev
 */

export class MapDrawEngine {
	private static cacheBackground: ImageBitmap;
	private static cacheBackgroundHashP: number;
	private static cacheCameraLines: ImageBitmap;
	private static cacheCameraLinesHashG: number;
	private static cacheHashCheckG: number;
	private static cacheHashCheckP: number;
	private static cacheZoom: number;
	public static ctxDimensionHeight: number;
	public static ctxDimensionWidth: number;
	public static ctxOverlay: OffscreenCanvasRenderingContext2D;
	public static mapActive: MapActive;
	public static modeEdit: boolean;
	private static count: number = 0;
	private static sum: number = 0;

	public static start(): void {
		// let start: number = performance.now();

		/*
		 * Background
		 */
		let windowHeightEff: number = Math.round(MapDrawEngine.ctxDimensionHeight * 0.175),
			windowHeightEffZero: number = 20 + UtilEngine.renderOverflowP,
			windowWidthEff: number = Math.round(MapDrawEngine.ctxDimensionWidth * 0.175),
			windowWidthEffZero: number = MapDrawEngine.ctxDimensionWidth - windowWidthEff - 20 - UtilEngine.renderOverflowP;
		MapDrawEngine.cacheHashCheckP = UtilEngine.pixelHashTo(MapDrawEngine.ctxDimensionWidth, MapDrawEngine.ctxDimensionHeight);
		if (MapDrawEngine.cacheHashCheckP !== MapDrawEngine.cacheBackgroundHashP) {
			// Draw from scratch
			let cacheCanvas: OffscreenCanvas = new OffscreenCanvas(windowWidthEff, windowHeightEff),
				ctx: OffscreenCanvasRenderingContext2D = <OffscreenCanvasRenderingContext2D>cacheCanvas.getContext('2d');

			ctx.beginPath();
			ctx.fillStyle = 'rgba(0,255,0,.9)';
			ctx.lineWidth = 1;
			ctx.rect(0, 0, windowWidthEff, windowHeightEff);
			ctx.strokeStyle = 'rgb(0,255,0)';
			ctx.fill();
			ctx.stroke();

			// Cache it
			MapDrawEngine.cacheBackground = cacheCanvas.transferToImageBitmap();
			MapDrawEngine.cacheBackgroundHashP = MapDrawEngine.cacheHashCheckP;
		}
		// Draw from cache
		MapDrawEngine.ctxOverlay.drawImage(MapDrawEngine.cacheBackground, windowWidthEffZero, windowHeightEffZero);

		/*
		 * Camera Lines
		 */
		MapDrawEngine.cacheHashCheckG = UtilEngine.gridHashTo(MapDrawEngine.mapActive.camera.viewPortGx, MapDrawEngine.mapActive.camera.viewPortGy);
		if (MapDrawEngine.cacheHashCheckG !== MapDrawEngine.cacheCameraLinesHashG || MapDrawEngine.cacheZoom !== MapDrawEngine.mapActive.camera.zoom) {
			// Draw from scratch
			let cacheCanvas: OffscreenCanvas = new OffscreenCanvas(windowWidthEff, windowHeightEff),
				ctx: OffscreenCanvasRenderingContext2D = <OffscreenCanvasRenderingContext2D>cacheCanvas.getContext('2d'),
				mapActive: MapActive = MapDrawEngine.mapActive,
				camera: Camera = MapDrawEngine.mapActive.camera,
				grid: Grid = mapActive.gridActive;

			//let x: number = UtilEngine.scale(camera.x * camera.f);

			let gh: number = grid.gHeight;
			let gw: number = grid.gWidth;

			let cameraGh: number = camera.viewPortGh;
			let cameraGw: number = camera.viewPortGw;
			let cameraGx: number = camera.viewPortGx;
			let cameraGy: number = camera.viewPortGy;

			let ghRel: number = cameraGh / gh;
			let gwRel: number = cameraGw / gw;
			let gxRel: number = cameraGx / gw;
			let gyRel: number = cameraGy / gh;

			let ghRelScaled: number = windowHeightEff * ghRel;
			let gwRelScaled: number = windowWidthEff * gwRel;
			let gxRelScaled: number = windowWidthEff * gxRel;
			let gyRelScaled: number = windowHeightEff * gyRel;

			//console.log('x', cameraGx, gxRel, gxRelScaled, windowWidthEff);

			// Horizontal
			ctx.beginPath();
			ctx.lineWidth = 1;
			ctx.strokeStyle = 'red';

			// top
			ctx.moveTo(gxRelScaled, gyRelScaled);
			ctx.lineTo(gxRelScaled + gwRelScaled, gyRelScaled);

			// right
			ctx.lineTo(gxRelScaled + gwRelScaled, gyRelScaled + ghRelScaled);

			// bottom
			ctx.lineTo(gxRelScaled, gyRelScaled + ghRelScaled);

			// left
			ctx.closePath();
			ctx.stroke();

			// Cache it
			MapDrawEngine.cacheCameraLines = cacheCanvas.transferToImageBitmap();
			MapDrawEngine.cacheCameraLinesHashG = MapDrawEngine.cacheHashCheckG;
			MapDrawEngine.cacheZoom = camera.zoom;
		}
		MapDrawEngine.ctxOverlay.drawImage(MapDrawEngine.cacheCameraLines, windowWidthEffZero, windowHeightEffZero);

		// MapDrawEngine.count++;
		// MapDrawEngine.sum += performance.now() - start;
		// console.log('MapDrawEngine(perf)', Math.round(MapDrawEngine.sum / MapDrawEngine.count * 1000) / 1000);
	}
}
