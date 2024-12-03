import { Camera } from '../models/camera.model';
import { CameraEngine } from '../engines/camera.engine';
import { GridConfig } from '../models/grid.model';
import { MapActive } from '../models/map.model';
import { MapDrawEngineBus } from './buses/map.draw.engine.bus';
import { UtilEngine } from '../engines/util.engine';

/**
 * @author tknight-dev
 */

export class MapDrawEngine {
	private static readonly backgroundRatio: number = 0.175;
	private static backgroundPh: number;
	private static backgroundPw: number;
	private static backgroundPx: number;
	private static backgroundPy: number;
	private static cacheBackground: ImageBitmap;
	private static cacheBackgroundHashPh: number;
	private static cacheBackgroundHashPw: number;
	private static cacheCameraLines: ImageBitmap;
	private static cacheCameraLinesHashGx: number;
	private static cacheCameraLinesHashGy: number;
	private static cacheCameraLinesHashPh: number;
	private static cacheCameraLinesHashPw: number;
	private static cacheHashCheckG: number;
	private static cacheZoom: number;
	private static ctxOverlay: OffscreenCanvasRenderingContext2D;
	private static initialized: boolean;
	private static mapImage: ImageBitmap;
	private static mapActive: MapActive;
	private static mapActiveCamera: Camera;
	public static resolution: null | number;
	public static scaler: number;
	public static devicePixelRatio: number;
	public static devicePixelRatioEff: number;

	public static async initialize(ctxOverlay: OffscreenCanvasRenderingContext2D): Promise<void> {
		if (MapDrawEngine.initialized) {
			console.error('MapDrawEngine > initialize: already initialized');
			return;
		}
		MapDrawEngine.initialized = true;
		MapDrawEngine.ctxOverlay = ctxOverlay;
		await MapDrawEngineBus.initialize();
		MapDrawEngineBus.setCallbackBitmap((imageBitmap: ImageBitmap) => {
			MapDrawEngine.mapImage = imageBitmap;
			MapDrawEngine.cacheBackgroundHashPh = -1;
			MapDrawEngine.cacheBackgroundHashPw = -1;
		});
	}

	public static cacheReset(): void {
		MapDrawEngine.cacheBackgroundHashPh = -1;
		MapDrawEngine.cacheBackgroundHashPw = -1;
		MapDrawEngine.cacheCameraLinesHashGx = -1;
		MapDrawEngine.cacheCameraLinesHashGy = -1;
		MapDrawEngine.cacheCameraLinesHashPh = -1;
		MapDrawEngine.cacheCameraLinesHashPw = -1;
		MapDrawEngine.cacheZoom = -1;
	}

	public static moveToPx(xRel: number, yRel: number): void {
		let camera: Camera = MapDrawEngine.mapActiveCamera,
			px: number = Math.round((camera.viewportPx + camera.viewportPw * xRel) * MapDrawEngine.devicePixelRatioEff),
			py: number = Math.round((camera.viewportPy + camera.viewportPh * yRel) * MapDrawEngine.devicePixelRatioEff);

		xRel = (px - MapDrawEngine.backgroundPx) / MapDrawEngine.backgroundPw;
		yRel = (py - MapDrawEngine.backgroundPy) / MapDrawEngine.backgroundPh;

		CameraEngine.moveG(
			Math.round(MapDrawEngine.mapActive.gridConfigActive.gWidth * xRel * 1000) / 1000,
			Math.round(MapDrawEngine.mapActive.gridConfigActive.gHeight * yRel * 1000) / 1000,
		);
	}

	public static start(): void {
		// calcs
		let camera: Camera = MapDrawEngine.mapActiveCamera;

		MapDrawEngine.backgroundPh = Math.round(camera.viewportPh * MapDrawEngine.backgroundRatio);
		MapDrawEngine.backgroundPw = Math.round(camera.viewportPw * MapDrawEngine.backgroundRatio);
		MapDrawEngine.backgroundPx = Math.round(
			camera.viewportPx2 - MapDrawEngine.backgroundPw - UtilEngine.renderOverflowPEff / MapDrawEngine.scaler,
		);
		MapDrawEngine.backgroundPy = Math.round(camera.viewportPy + UtilEngine.renderOverflowPEff / MapDrawEngine.scaler);

		/*
		 * Background
		 */
		if (MapDrawEngine.cacheBackgroundHashPh !== camera.windowPh || MapDrawEngine.cacheBackgroundHashPw !== camera.windowPw) {
			MapDrawEngineBus.outputResolution(MapDrawEngine.backgroundPh, MapDrawEngine.backgroundPw);

			// Draw from scratch
			let cacheCanvas: OffscreenCanvas, ctx: OffscreenCanvasRenderingContext2D;

			// Canvas
			cacheCanvas = new OffscreenCanvas(MapDrawEngine.backgroundPw, MapDrawEngine.backgroundPh);
			ctx = <OffscreenCanvasRenderingContext2D>cacheCanvas.getContext('2d');
			ctx.imageSmoothingEnabled = false;

			// Background
			ctx.fillStyle = 'rgba(0,0,0,.5)';
			ctx.fillRect(0, 0, MapDrawEngine.backgroundPw, MapDrawEngine.backgroundPh);
			if (MapDrawEngine.mapImage) {
				ctx.drawImage(MapDrawEngine.mapImage, 0, 0);
			}

			// Background Border
			ctx.lineWidth = 1;
			ctx.rect(0, 0, MapDrawEngine.backgroundPw, MapDrawEngine.backgroundPh);
			ctx.strokeStyle = 'white';
			ctx.stroke();

			// Cache it
			MapDrawEngine.cacheBackground = cacheCanvas.transferToImageBitmap();
			MapDrawEngine.cacheBackgroundHashPh = camera.windowPh;
			MapDrawEngine.cacheBackgroundHashPw = camera.windowPw;
		}
		// Draw from cache
		MapDrawEngine.ctxOverlay.drawImage(MapDrawEngine.cacheBackground, MapDrawEngine.backgroundPx, MapDrawEngine.backgroundPy);

		/*
		 * Camera Lines
		 */
		MapDrawEngine.cacheHashCheckG = UtilEngine.gridHashTo(camera.viewportGx, camera.viewportGy);
		if (
			MapDrawEngine.cacheCameraLinesHashGx !== camera.gx ||
			MapDrawEngine.cacheCameraLinesHashGy !== camera.gy ||
			MapDrawEngine.cacheCameraLinesHashPh !== camera.windowPh ||
			MapDrawEngine.cacheCameraLinesHashPw !== camera.windowPw ||
			MapDrawEngine.cacheZoom !== camera.zoom
		) {
			// Draw from scratch
			let cacheCanvas: OffscreenCanvas,
				ctx: OffscreenCanvasRenderingContext2D,
				gridConfig: GridConfig = MapDrawEngine.mapActive.gridConfigActive,
				ghRelScaled: number,
				ghRelScaledEffB: number,
				ghRelScaledEffL: number,
				ghRelScaledEffR: number,
				ghRelScaledEffT: number,
				gwRelScaled: number,
				gxRelScaled: number,
				gxRelScaledEff: number,
				gyRelScaled: number,
				gyRelScaledEff: number;

			// Canvas
			cacheCanvas = new OffscreenCanvas(MapDrawEngine.backgroundPw, MapDrawEngine.backgroundPh);
			ctx = <OffscreenCanvasRenderingContext2D>cacheCanvas.getContext('2d');
			ctx.imageSmoothingEnabled = false;

			// Calc
			ghRelScaled = MapDrawEngine.backgroundPh * (camera.viewportGhEff / gridConfig.gHeight);
			gwRelScaled = MapDrawEngine.backgroundPw * (camera.viewportGwEff / gridConfig.gWidth);
			gxRelScaled = MapDrawEngine.backgroundPw * (camera.viewportGx / gridConfig.gWidth);
			gyRelScaled = MapDrawEngine.backgroundPh * (camera.viewportGy / gridConfig.gHeight);

			// Calc eff
			ghRelScaledEffB = gyRelScaled + Math.round(ghRelScaled * 0.3);
			ghRelScaledEffL = gxRelScaled + Math.round(gwRelScaled * 0.16875);
			ghRelScaledEffR = gxRelScaled + Math.round(gwRelScaled * 0.83125);
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
			MapDrawEngine.cacheCameraLinesHashGx = camera.gx;
			MapDrawEngine.cacheCameraLinesHashGy = camera.gy;
			MapDrawEngine.cacheCameraLinesHashPh = camera.windowPh;
			MapDrawEngine.cacheCameraLinesHashPw = camera.windowPw;
			MapDrawEngine.cacheZoom = camera.zoom;
		}
		MapDrawEngine.ctxOverlay.drawImage(MapDrawEngine.cacheCameraLines, MapDrawEngine.backgroundPx, MapDrawEngine.backgroundPy);
	}

	public static isPixelInMap(xRel: number, yRel: number): boolean {
		let camera: Camera = MapDrawEngine.mapActiveCamera,
			px: number = Math.round((camera.viewportPx + camera.viewportPw * xRel) * MapDrawEngine.devicePixelRatioEff),
			py: number = Math.round((camera.viewportPy + camera.viewportPh * yRel) * MapDrawEngine.devicePixelRatioEff);

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

		MapDrawEngineBus.outputGrids(mapActive.grids, mapActive.gridConfigs);
	}
}
