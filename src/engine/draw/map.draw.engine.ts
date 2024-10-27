import { Camera } from '../models/camera.model';
import { CameraEngine } from '../camera.engine';
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
	private static cacheCameraLinesHashP: number;
	private static cacheHashCheckG: number;
	private static cacheHashCheckP: number;
	private static cacheZoom: number;
	private static ctxOverlay: OffscreenCanvasRenderingContext2D;
	private static initialized: boolean;
	private static mapActive: MapActive;
	private static mapActiveCamera: Camera;
	private static mapActiveGrid: Grid;
	private static windowPhEff: number;
	private static windowPhEffZero: number;
	private static windowPwEff: number;
	private static windowPwEffZero: number;
	// private static count: number = 0;
	// private static sum: number = 0;

	public static async initialize(
		ctx: OffscreenCanvasRenderingContext2D,
		ctxBackground: OffscreenCanvasRenderingContext2D,
		ctxForeground: OffscreenCanvasRenderingContext2D,
		ctxOverlay: OffscreenCanvasRenderingContext2D,
	): Promise<void> {
		if (MapDrawEngine.initialized) {
			console.error('MapDrawEngine > initialize: already initialized');
			return;
		}
		MapDrawEngine.initialized = true;
		MapDrawEngine.ctxOverlay = ctxOverlay;
	}

	public static moveToPx(px: number, py: number): void {
		let xRel: number = Math.round(((px - MapDrawEngine.windowPwEffZero) / MapDrawEngine.windowPwEff) * 1000),
			yRel: number = Math.round(((py - MapDrawEngine.windowPhEffZero) / MapDrawEngine.windowPhEff) * 1000);

		CameraEngine.moveG(Math.round(MapDrawEngine.mapActiveGrid.gWidth * xRel) / 1000, Math.round(MapDrawEngine.mapActiveGrid.gHeight * yRel) / 1000);
	}

	public static start(): void {
		let start: number = performance.now();

		// calcs
		let camera: Camera = MapDrawEngine.mapActiveCamera;
		MapDrawEngine.windowPhEff = Math.round(camera.windowPh * 0.175);
		MapDrawEngine.windowPhEffZero = camera.viewPortPy + 20;
		MapDrawEngine.windowPwEff = Math.round(camera.windowPw * 0.175);
		MapDrawEngine.windowPwEffZero = camera.windowPw - MapDrawEngine.windowPwEff - 20 - camera.viewPortPx;

		/*
		 * Background
		 */
		MapDrawEngine.cacheHashCheckP = UtilEngine.pixelHashTo(MapDrawEngine.mapActiveCamera.windowPw, MapDrawEngine.mapActiveCamera.windowPh);
		if (MapDrawEngine.cacheHashCheckP !== MapDrawEngine.cacheBackgroundHashP) {
			// Draw from scratch
			let cacheCanvas: OffscreenCanvas,
				ctx: OffscreenCanvasRenderingContext2D,
				windowPhEff: number = MapDrawEngine.windowPhEff,
				windowPwEff: number = MapDrawEngine.windowPwEff;

			// Canvas
			cacheCanvas = new OffscreenCanvas(windowPwEff, windowPhEff);
			ctx = <OffscreenCanvasRenderingContext2D>cacheCanvas.getContext('2d');

			// TODO, get bitmap from ctxBackground and paste it in here

			// Background
			ctx.beginPath();
			ctx.fillStyle = 'rgba(0,0,0,.9)';
			ctx.lineWidth = 1;
			ctx.rect(0, 0, windowPwEff, windowPhEff);
			ctx.strokeStyle = 'white';
			ctx.fill();
			ctx.stroke();

			// Cache it
			MapDrawEngine.cacheBackground = cacheCanvas.transferToImageBitmap();
			MapDrawEngine.cacheBackgroundHashP = MapDrawEngine.cacheHashCheckP;
		}
		// Draw from cache
		MapDrawEngine.ctxOverlay.drawImage(MapDrawEngine.cacheBackground, MapDrawEngine.windowPwEffZero, MapDrawEngine.windowPhEffZero);

		/*
		 * Camera Lines
		 */
		MapDrawEngine.cacheHashCheckG = UtilEngine.gridHashTo(MapDrawEngine.mapActiveCamera.viewPortGx, MapDrawEngine.mapActiveCamera.viewPortGy);
		if (
			MapDrawEngine.cacheHashCheckG !== MapDrawEngine.cacheCameraLinesHashG ||
			MapDrawEngine.cacheHashCheckP !== MapDrawEngine.cacheCameraLinesHashP ||
			MapDrawEngine.cacheZoom !== MapDrawEngine.mapActiveCamera.zoom
		) {
			// Draw from scratch
			let cacheCanvas: OffscreenCanvas,
				ctx: OffscreenCanvasRenderingContext2D,
				mapActive: MapActive = MapDrawEngine.mapActive,
				grid: Grid = mapActive.gridActive,
				gh: number = grid.gHeight,
				gw: number = grid.gWidth,
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
				windowPhEff: number = MapDrawEngine.windowPhEff,
				windowPwEff: number = MapDrawEngine.windowPwEff;

			// Canvas
			cacheCanvas = new OffscreenCanvas(windowPwEff, windowPhEff);
			ctx = <OffscreenCanvasRenderingContext2D>cacheCanvas.getContext('2d');

			// Calc
			ghRelScaled = windowPhEff * (camera.viewPortGhEff / gh);
			gwRelScaled = windowPwEff * (camera.viewPortGwEff / gw);
			gxRelScaled = windowPwEff * (camera.viewPortGx / gw);
			gyRelScaled = windowPhEff * (camera.viewPortGy / gh);

			// Calc eff
			ghRelScaledEffB = gyRelScaled + Math.round(ghRelScaled * 0.3);
			ghRelScaledEffL = gxRelScaled + Math.round(gwRelScaled * 0.2);
			ghRelScaledEffR = gxRelScaled + Math.round(gwRelScaled * 0.8);
			ghRelScaledEffT = gyRelScaled + Math.round(ghRelScaled * 0.7);
			gxRelScaledEff = gxRelScaled + gwRelScaled;
			gyRelScaledEff = gyRelScaled + ghRelScaled;

			/*
			 * Viewport within Window
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
		MapDrawEngine.ctxOverlay.drawImage(MapDrawEngine.cacheCameraLines, MapDrawEngine.windowPwEffZero, MapDrawEngine.windowPhEffZero);

		// MapDrawEngine.count++;
		// MapDrawEngine.sum += performance.now() - start;
		// console.log('MapDrawEngine(perf)', Math.round(MapDrawEngine.sum / MapDrawEngine.count * 1000) / 1000);
	}

	public static isPixelInMap(px: number, py: number): boolean {
		if (
			px >= MapDrawEngine.windowPwEffZero &&
			py >= MapDrawEngine.windowPhEffZero &&
			px <= MapDrawEngine.windowPwEffZero + MapDrawEngine.windowPwEff &&
			py <= MapDrawEngine.windowPhEffZero + MapDrawEngine.windowPhEff
		) {
			return true;
		} else {
			return false;
		}
	}

	public static setMapActive(mapActive: MapActive) {
		MapDrawEngine.mapActive = mapActive;
		MapDrawEngine.mapActiveCamera = mapActive.camera;
		MapDrawEngine.mapActiveGrid = mapActive.gridActive;
	}
}
