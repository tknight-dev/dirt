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
	private static cacheBackgroundCanvas: OffscreenCanvas;
	private static cacheBackgroundSky: ImageBitmap;
	private static cacheBackgroundStarfield: ImageBitmap;
	private static cacheBackgroundSkyNew: boolean;
	private static cacheBackgroundHashPh: number;
	private static cacheBackgroundHashPw: number;
	private static cacheCameraLinesCanvas: OffscreenCanvas;
	private static cacheCameraLinesHashGx: number;
	private static cacheCameraLinesHashGy: number;
	private static cacheCameraLinesHashPh: number;
	private static cacheCameraLinesHashPw: number;
	private static cacheZoom: number;
	private static ctxBackground: OffscreenCanvasRenderingContext2D;
	private static ctxCameraLines: OffscreenCanvasRenderingContext2D;
	private static ctxOverlay: OffscreenCanvasRenderingContext2D;
	private static initialized: boolean;
	private static mapImage: ImageBitmap;
	private static mapImageNew: boolean;
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

		MapDrawEngine.cacheBackgroundCanvas = new OffscreenCanvas(0, 0);
		MapDrawEngine.ctxBackground = <OffscreenCanvasRenderingContext2D>MapDrawEngine.cacheBackgroundCanvas.getContext('2d');
		MapDrawEngine.ctxBackground.imageSmoothingEnabled = false;

		MapDrawEngine.cacheCameraLinesCanvas = new OffscreenCanvas(0, 0);
		MapDrawEngine.ctxCameraLines = <OffscreenCanvasRenderingContext2D>MapDrawEngine.cacheCameraLinesCanvas.getContext('2d');
		MapDrawEngine.ctxCameraLines.imageSmoothingEnabled = false;

		await MapDrawEngineBus.initialize();
		MapDrawEngineBus.setCallbackBitmap((imageBitmap: ImageBitmap) => {
			MapDrawEngine.mapImage = imageBitmap;
			MapDrawEngine.mapImageNew = true;
		});

		// Last
		MapDrawEngine.startBind();
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
			px: number = ((camera.viewportPx + camera.viewportPw * xRel) * MapDrawEngine.devicePixelRatioEff) | 0,
			py: number = ((camera.viewportPy + camera.viewportPh * yRel) * MapDrawEngine.devicePixelRatioEff) | 0;

		xRel = (px - MapDrawEngine.backgroundPx) / MapDrawEngine.backgroundPw;
		yRel = (py - MapDrawEngine.backgroundPy) / MapDrawEngine.backgroundPh;

		CameraEngine.moveG(
			Math.round(MapDrawEngine.mapActive.gridConfigActive.gWidth * xRel * 1000) / 1000,
			Math.round(MapDrawEngine.mapActive.gridConfigActive.gHeight * yRel * 1000) / 1000,
		);
	}

	// Function set by binder, this is just a placeholder
	public static start(): void {}

	/**
	 * This binding structure greatly reduces GC build up
	 */
	private static startBind(): void {
		let backgroundRatio: number = MapDrawEngine.backgroundRatio,
			cacheBackgroundCanvas: OffscreenCanvas = MapDrawEngine.cacheBackgroundCanvas,
			cacheCameraLinesCanvas: OffscreenCanvas = MapDrawEngine.cacheCameraLinesCanvas,
			camera: Camera,
			ctxBackground: OffscreenCanvasRenderingContext2D = MapDrawEngine.ctxBackground,
			ctxCameraLines: OffscreenCanvasRenderingContext2D = MapDrawEngine.ctxCameraLines,
			ctxOverlay: OffscreenCanvasRenderingContext2D = MapDrawEngine.ctxOverlay,
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
			gridConfig: GridConfig,
			height: number,
			outputResolution = MapDrawEngineBus.outputResolution,
			renderOverflowPEff: number = UtilEngine.renderOverflowPEff,
			scalerEff: number;

		MapDrawEngine.start = () => {
			camera = MapDrawEngine.mapActiveCamera;
			gridConfig = MapDrawEngine.mapActive.gridConfigActive;
			scalerEff = renderOverflowPEff / MapDrawEngine.scaler;

			// Calcs
			MapDrawEngine.backgroundPh = (camera.viewportPh * backgroundRatio) | 0;
			MapDrawEngine.backgroundPw = (camera.viewportPw * backgroundRatio) | 0;
			MapDrawEngine.backgroundPx = (camera.viewportPx2 - MapDrawEngine.backgroundPw - scalerEff) | 0;
			MapDrawEngine.backgroundPy = (camera.viewportPy + scalerEff) | 0;

			/*
			 * Background
			 */
			if (
				MapDrawEngine.cacheBackgroundHashPh !== camera.windowPh ||
				MapDrawEngine.cacheBackgroundHashPw !== camera.windowPw ||
				MapDrawEngine.cacheBackgroundSkyNew ||
				MapDrawEngine.mapImageNew
			) {
				// Canvas
				if (
					cacheBackgroundCanvas.height !== MapDrawEngine.backgroundPh ||
					cacheBackgroundCanvas.width !== MapDrawEngine.backgroundPw
				) {
					cacheBackgroundCanvas.height = MapDrawEngine.backgroundPh;
					cacheBackgroundCanvas.width = MapDrawEngine.backgroundPw;
					outputResolution(MapDrawEngine.backgroundPh, MapDrawEngine.backgroundPw);
				} else {
					ctxBackground.clearRect(0, 0, cacheBackgroundCanvas.width, cacheBackgroundCanvas.height);
				}

				// Background
				if (MapDrawEngine.mapImage) {
					height = (MapDrawEngine.backgroundPh * (gridConfig.gHorizon / gridConfig.gHeight)) | 0;

					if (MapDrawEngine.cacheBackgroundSky) {
						ctxBackground.drawImage(MapDrawEngine.cacheBackgroundSky, 0, 0, MapDrawEngine.backgroundPw, height);
						ctxBackground.drawImage(MapDrawEngine.cacheBackgroundStarfield, 0, 0, MapDrawEngine.backgroundPw, height);
					}

					ctxBackground.drawImage(MapDrawEngine.mapImage, 0, 0);
				} else {
					ctxBackground.fillStyle = 'rgba(0,0,0,.5)';
					ctxBackground.fillRect(0, 0, MapDrawEngine.backgroundPw, MapDrawEngine.backgroundPh);
				}

				// Background Border
				ctxBackground.lineWidth = 1;
				ctxBackground.rect(0, 0, MapDrawEngine.backgroundPw, MapDrawEngine.backgroundPh);
				ctxBackground.strokeStyle = 'white';
				ctxBackground.stroke();

				// Cache it
				MapDrawEngine.cacheBackgroundSkyNew = false;
				MapDrawEngine.mapImageNew = false;
				MapDrawEngine.cacheBackgroundHashPh = camera.windowPh;
				MapDrawEngine.cacheBackgroundHashPw = camera.windowPw;
			}
			// Draw from cache
			ctxOverlay.drawImage(cacheBackgroundCanvas, MapDrawEngine.backgroundPx, MapDrawEngine.backgroundPy);

			/*
			 * Camera Lines
			 */
			if (
				MapDrawEngine.cacheCameraLinesHashGx !== camera.gx ||
				MapDrawEngine.cacheCameraLinesHashGy !== camera.gy ||
				MapDrawEngine.cacheCameraLinesHashPh !== camera.windowPh ||
				MapDrawEngine.cacheCameraLinesHashPw !== camera.windowPw ||
				MapDrawEngine.cacheZoom !== camera.zoom
			) {
				// Canvas
				if (
					cacheCameraLinesCanvas.height !== MapDrawEngine.backgroundPh ||
					cacheCameraLinesCanvas.width !== MapDrawEngine.backgroundPw
				) {
					cacheCameraLinesCanvas.height = MapDrawEngine.backgroundPh;
					cacheCameraLinesCanvas.width = MapDrawEngine.backgroundPw;
				} else {
					ctxCameraLines.clearRect(0, 0, cacheCameraLinesCanvas.width, cacheCameraLinesCanvas.height);
				}

				// Calc
				ghRelScaled = (MapDrawEngine.backgroundPh * (camera.viewportGhEff / gridConfig.gHeight)) | 0;
				gwRelScaled = (MapDrawEngine.backgroundPw * (camera.viewportGwEff / gridConfig.gWidth)) | 0;
				gxRelScaled = (MapDrawEngine.backgroundPw * (camera.viewportGx / gridConfig.gWidth)) | 0;
				gyRelScaled = (MapDrawEngine.backgroundPh * (camera.viewportGy / gridConfig.gHeight)) | 0;

				// Calc eff
				ghRelScaledEffB = (gyRelScaled + ghRelScaled * 0.3) | 0;
				ghRelScaledEffL = (gxRelScaled + gwRelScaled * 0.16875) | 0;
				ghRelScaledEffR = (gxRelScaled + gwRelScaled * 0.83125) | 0;
				ghRelScaledEffT = (gyRelScaled + ghRelScaled * 0.7) | 0;
				gxRelScaledEff = (gxRelScaled + gwRelScaled) | 0;
				gyRelScaledEff = (gyRelScaled + ghRelScaled) | 0;

				/*
				 * viewport within Window
				 */
				ctxCameraLines.lineWidth = 1;
				ctxCameraLines.strokeStyle = 'white';

				// top: left
				ctxCameraLines.beginPath();
				ctxCameraLines.moveTo(gxRelScaled, gyRelScaled);
				ctxCameraLines.lineTo(ghRelScaledEffL, gyRelScaled);
				ctxCameraLines.stroke();

				// top: right
				ctxCameraLines.beginPath();
				ctxCameraLines.lineTo(ghRelScaledEffR, gyRelScaled);
				ctxCameraLines.lineTo(gxRelScaledEff, gyRelScaled);
				ctxCameraLines.stroke();

				// right: top
				ctxCameraLines.beginPath();
				ctxCameraLines.lineTo(gxRelScaledEff, gyRelScaled);
				ctxCameraLines.lineTo(gxRelScaledEff, ghRelScaledEffB);
				ctxCameraLines.stroke();

				// right: bottom
				ctxCameraLines.beginPath();
				ctxCameraLines.lineTo(gxRelScaledEff, ghRelScaledEffT);
				ctxCameraLines.lineTo(gxRelScaledEff, gyRelScaledEff);
				ctxCameraLines.stroke();

				// bottom: right
				ctxCameraLines.beginPath();
				ctxCameraLines.lineTo(gxRelScaledEff, gyRelScaledEff);
				ctxCameraLines.lineTo(ghRelScaledEffR, gyRelScaledEff);
				ctxCameraLines.stroke();

				// bottom: left
				ctxCameraLines.beginPath();
				ctxCameraLines.lineTo(ghRelScaledEffL, gyRelScaledEff);
				ctxCameraLines.lineTo(gxRelScaled, gyRelScaledEff);
				ctxCameraLines.stroke();

				// left: bottom
				ctxCameraLines.beginPath();
				ctxCameraLines.lineTo(gxRelScaled, gyRelScaled);
				ctxCameraLines.lineTo(gxRelScaled, ghRelScaledEffB);
				ctxCameraLines.stroke();

				// left: top
				ctxCameraLines.beginPath();
				ctxCameraLines.lineTo(gxRelScaled, ghRelScaledEffT);
				ctxCameraLines.lineTo(gxRelScaled, gyRelScaledEff);
				ctxCameraLines.stroke();

				// Cache it
				MapDrawEngine.cacheCameraLinesHashGx = camera.gx;
				MapDrawEngine.cacheCameraLinesHashGy = camera.gy;
				MapDrawEngine.cacheCameraLinesHashPh = camera.windowPh;
				MapDrawEngine.cacheCameraLinesHashPw = camera.windowPw;
				MapDrawEngine.cacheZoom = camera.zoom;
			}
			ctxOverlay.drawImage(cacheCameraLinesCanvas, MapDrawEngine.backgroundPx, MapDrawEngine.backgroundPy);
		};
	}

	public static isPixelInMap(xRel: number, yRel: number): boolean {
		let camera: Camera = MapDrawEngine.mapActiveCamera,
			px: number = ((camera.viewportPx + camera.viewportPw * xRel) * MapDrawEngine.devicePixelRatioEff) | 0,
			py: number = ((camera.viewportPy + camera.viewportPh * yRel) * MapDrawEngine.devicePixelRatioEff) | 0;

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

	public static setBackgroundSky(imageBitmaps: ImageBitmap[]) {
		MapDrawEngine.cacheBackgroundSky = imageBitmaps[0];
		MapDrawEngine.cacheBackgroundStarfield = imageBitmaps[1];
		MapDrawEngine.cacheBackgroundSkyNew = true;
	}

	public static setMapActive(mapActive: MapActive) {
		MapDrawEngine.mapActive = mapActive;
		MapDrawEngine.mapActiveCamera = mapActive.camera;

		MapDrawEngineBus.outputGrids(mapActive.grids, mapActive.gridConfigs);
	}
}
