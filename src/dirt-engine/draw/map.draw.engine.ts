import { Camera } from '../models/camera.model';
import { CameraEngine } from '../engines/camera.engine';
import { GridConfig } from '../models/grid.model';
import { MapActive } from '../models/map.model';
import { UtilEngine } from '../engines/util.engine';

/**
 * @author tknight-dev
 */

export class MapDrawEngine {
	private static cacheBackground: ImageBitmap;
	private static cacheBackgroundHashP: number;
	private static cacheCameraLines: ImageBitmap;
	private static cacheCameraLinesHashG: number;
	private static cacheCameraLinesHashP: number;
	private static cacheHashCheckG: number;
	private static cacheHashCheckP: number;
	private static cacheZoom: number;
	private static ctxOverlay: OffscreenCanvasRenderingContext2D;
	private static initialized: boolean;
	private static mapActive: MapActive;
	private static mapActiveCamera: Camera;
	private static mapActiveGridConfig: GridConfig;
	private static readonly backgroundRatio: number = 0.175;
	private static backgroundPh: number;
	private static backgroundPw: number;
	private static backgroundPx: number;
	private static backgroundPy: number;
	// private static count: number = 0;
	// private static sum: number = 0;

	public static async initialize(
		ctxBackground: OffscreenCanvasRenderingContext2D,
		ctxForeground: OffscreenCanvasRenderingContext2D,
		ctxOverlay: OffscreenCanvasRenderingContext2D,
		ctxPrimary: OffscreenCanvasRenderingContext2D,
		ctxUnderlay: OffscreenCanvasRenderingContext2D,
	): Promise<void> {
		if (MapDrawEngine.initialized) {
			console.error('MapDrawEngine > initialize: already initialized');
			return;
		}
		MapDrawEngine.initialized = true;
		MapDrawEngine.ctxOverlay = ctxOverlay;
	}

	public static moveToPx(px: number, py: number): void {
		let xRel: number = Math.round(
				((px - MapDrawEngine.backgroundPx + UtilEngine.renderOverflowPEff) / MapDrawEngine.backgroundPw) * 1000,
			),
			yRel: number = Math.round(
				((py - MapDrawEngine.backgroundPy + UtilEngine.renderOverflowPEff) / MapDrawEngine.backgroundPh) * 1000,
			);

		CameraEngine.moveG(
			Math.round(MapDrawEngine.mapActiveGridConfig.gWidth * xRel) / 1000,
			Math.round(MapDrawEngine.mapActiveGridConfig.gHeight * yRel) / 1000,
		);
	}

	public static start(): void {
		let start: number = performance.now();

		// calcs
		let camera: Camera = MapDrawEngine.mapActiveCamera;
		MapDrawEngine.backgroundPh = Math.round(camera.viewportPh * MapDrawEngine.backgroundRatio);
		MapDrawEngine.backgroundPw = Math.round(camera.viewportPw * MapDrawEngine.backgroundRatio);
		MapDrawEngine.backgroundPx = camera.viewportPx2 - MapDrawEngine.backgroundPw - UtilEngine.renderOverflowPEff;
		MapDrawEngine.backgroundPy = camera.viewportPy + UtilEngine.renderOverflowPEff;

		/*
		 * Background
		 */
		MapDrawEngine.cacheHashCheckP = UtilEngine.pixelHashTo(
			MapDrawEngine.mapActiveCamera.windowPw,
			MapDrawEngine.mapActiveCamera.windowPh,
		);
		if (MapDrawEngine.cacheHashCheckP !== MapDrawEngine.cacheBackgroundHashP) {
			// Draw from scratch
			let cacheCanvas: OffscreenCanvas,
				ctx: OffscreenCanvasRenderingContext2D,
				backgroundPh: number = MapDrawEngine.backgroundPh,
				backgroundPw: number = MapDrawEngine.backgroundPw;

			// Canvas
			cacheCanvas = new OffscreenCanvas(backgroundPw, backgroundPh);
			ctx = <OffscreenCanvasRenderingContext2D>cacheCanvas.getContext('2d');

			// Background
			ctx.beginPath();
			ctx.fillStyle = 'rgba(0,0,0,.9)';
			ctx.lineWidth = 1;
			ctx.rect(0, 0, backgroundPw, backgroundPh);
			ctx.strokeStyle = 'white';
			ctx.fill();
			ctx.stroke();

			// Cache it
			MapDrawEngine.cacheBackground = cacheCanvas.transferToImageBitmap();
			MapDrawEngine.cacheBackgroundHashP = MapDrawEngine.cacheHashCheckP;
		}
		// Draw from cache
		MapDrawEngine.ctxOverlay.drawImage(
			MapDrawEngine.cacheBackground,
			MapDrawEngine.backgroundPx,
			MapDrawEngine.backgroundPy,
		);

		/*
		 * Camera Lines
		 */
		MapDrawEngine.cacheHashCheckG = UtilEngine.gridHashTo(
			MapDrawEngine.mapActiveCamera.viewportGx,
			MapDrawEngine.mapActiveCamera.viewportGy,
		);
		if (
			MapDrawEngine.cacheHashCheckG !== MapDrawEngine.cacheCameraLinesHashG ||
			MapDrawEngine.cacheHashCheckP !== MapDrawEngine.cacheCameraLinesHashP ||
			MapDrawEngine.cacheZoom !== MapDrawEngine.mapActiveCamera.zoom
		) {
			// Draw from scratch
			let cacheCanvas: OffscreenCanvas,
				ctx: OffscreenCanvasRenderingContext2D,
				mapActive: MapActive = MapDrawEngine.mapActive,
				gridConfig: GridConfig = MapDrawEngine.mapActiveGridConfig,
				gh: number = gridConfig.gHeight,
				gw: number = gridConfig.gWidth,
				ghRelScaled: number,
				ghRelScaledEffB: number,
				ghRelScaledEffL: number,
				ghRelScaledEffR: number,
				ghRelScaledEffT: number,
				gwRelScaled: number,
				gxRelScaled: number,
				gxRelScaledEff: number,
				gyRelScaled: number,
				gyRelScaledEff: number,
				backgroundPh: number = MapDrawEngine.backgroundPh,
				backgroundPw: number = MapDrawEngine.backgroundPw;

			// Canvas
			cacheCanvas = new OffscreenCanvas(backgroundPw, backgroundPh);
			ctx = <OffscreenCanvasRenderingContext2D>cacheCanvas.getContext('2d');

			// Calc
			ghRelScaled = backgroundPh * (camera.viewportGhEff / gh);
			gwRelScaled = backgroundPw * (camera.viewportGwEff / gw);
			gxRelScaled = backgroundPw * (camera.viewportGx / gw);
			gyRelScaled = backgroundPh * (camera.viewportGy / gh);

			// Calc eff
			ghRelScaledEffB = gyRelScaled + Math.round(ghRelScaled * 0.3);
			ghRelScaledEffL = gxRelScaled + Math.round(gwRelScaled * 0.2);
			ghRelScaledEffR = gxRelScaled + Math.round(gwRelScaled * 0.8);
			ghRelScaledEffT = gyRelScaled + Math.round(ghRelScaled * 0.7);
			gxRelScaledEff = gxRelScaled + gwRelScaled;
			gyRelScaledEff = gyRelScaled + ghRelScaled;

			/*
			 * viewport within Window
			 */
			ctx.lineWidth = 1;
			ctx.strokeStyle = 'white';

			// top: left
			ctx.beginPath();
			ctx.moveTo(gxRelScaled, gyRelScaled);
			ctx.lineTo(ghRelScaledEffL, gyRelScaled);
			ctx.stroke();

			// top: right
			ctx.beginPath();
			ctx.lineTo(ghRelScaledEffR, gyRelScaled);
			ctx.lineTo(gxRelScaledEff, gyRelScaled);
			ctx.stroke();

			// right: top
			ctx.beginPath();
			ctx.lineTo(gxRelScaledEff, gyRelScaled);
			ctx.lineTo(gxRelScaledEff, ghRelScaledEffB);
			ctx.stroke();

			// right: bottom
			ctx.beginPath();
			ctx.lineTo(gxRelScaledEff, ghRelScaledEffT);
			ctx.lineTo(gxRelScaledEff, gyRelScaledEff);
			ctx.stroke();

			// bottom: right
			ctx.beginPath();
			ctx.lineTo(gxRelScaledEff, gyRelScaledEff);
			ctx.lineTo(ghRelScaledEffR, gyRelScaledEff);
			ctx.stroke();

			// bottom: left
			ctx.beginPath();
			ctx.lineTo(ghRelScaledEffL, gyRelScaledEff);
			ctx.lineTo(gxRelScaled, gyRelScaledEff);
			ctx.stroke();

			// left: bottom
			ctx.beginPath();
			ctx.lineTo(gxRelScaled, gyRelScaled);
			ctx.lineTo(gxRelScaled, ghRelScaledEffB);
			ctx.stroke();

			// left: top
			ctx.beginPath();
			ctx.lineTo(gxRelScaled, ghRelScaledEffT);
			ctx.lineTo(gxRelScaled, gyRelScaledEff);
			ctx.stroke();

			// Cache it
			MapDrawEngine.cacheCameraLines = cacheCanvas.transferToImageBitmap();
			MapDrawEngine.cacheCameraLinesHashG = MapDrawEngine.cacheHashCheckG;
			MapDrawEngine.cacheCameraLinesHashP = MapDrawEngine.cacheHashCheckP;
			MapDrawEngine.cacheZoom = camera.zoom;
		}
		MapDrawEngine.ctxOverlay.drawImage(
			MapDrawEngine.cacheCameraLines,
			MapDrawEngine.backgroundPx,
			MapDrawEngine.backgroundPy,
		);

		// MapDrawEngine.count++;
		// MapDrawEngine.sum += performance.now() - start;
		// console.log('MapDrawEngine(perf)', Math.round(MapDrawEngine.sum / MapDrawEngine.count * 1000) / 1000);
	}

	public static isPixelInMap(px: number, py: number): boolean {
		px += UtilEngine.renderOverflowPEff;
		py += UtilEngine.renderOverflowPEff;
		if (
			px >= MapDrawEngine.backgroundPx &&
			py >= MapDrawEngine.backgroundPy &&
			px <= MapDrawEngine.backgroundPx + MapDrawEngine.backgroundPw &&
			py <= MapDrawEngine.backgroundPy + MapDrawEngine.backgroundPh
		) {
			return true;
		} else {
			return false;
		}
	}

	public static setMapActive(mapActive: MapActive) {
		MapDrawEngine.mapActive = mapActive;
		MapDrawEngine.mapActiveCamera = mapActive.camera;
		MapDrawEngine.mapActiveGridConfig = mapActive.gridConfigActive;
	}
}
