import { AssetImageSrcQuality } from '../models/asset.model';
import { CalcEditEngine } from './mode/edit/calc.edit.engine';
import { CalcPlayEngine } from './mode/play/calc.play.engine';
import { ClockCalcEngine } from '../calc/clock.calc.engine';
import { CameraDrawEngine } from '../draw/camera.draw.engine';
import { CameraEngine } from './camera.engine';
import { DrawEditEngine } from './mode/edit/draw.edit.engine';
import { DrawPlayEngine } from './mode/play/draw.play.engine';
import { GridDrawEngine } from '../draw/grid.draw.engine';
import { ImageBlockDrawEngine } from '../draw/image-block.draw.engine';
import { KeyAction, KeyCommon } from './keyboard.engine';
import { LightingEngine } from './lighting.engine';
import { LightingCalcEngineBus } from '../calc/buses/lighting.calc.engine.bus';
import { MapActive } from '../models/map.model';
import { MapDrawEngine } from '../draw/map.draw.engine';
import { MapDrawEngineBus } from '../draw/buses/map.draw.engine.bus';
import { MouseAction, MouseCmd } from './mouse.engine';
import { TouchAction, TouchCmd } from './touch.engine';
import { UtilEngine } from './util.engine';
import { VideoBusInputCmdGameModeEditDraw, VideoBusInputCmdSettings, VideoBusInputCmdSettingsFPS } from '../engines/buses/video.model.bus';

/**
 * @author tknight-dev
 */

export class KernelEngine {
	private static callbackFPS: (fps: number) => void;
	private static ctxDimensionHeight: number;
	private static ctxDimensionWidth: number;
	private static frames: number = 0;
	private static framesInterval: ReturnType<typeof setInterval>;
	private static fpms: number;
	private static fpmsCamera: number = 35;
	private static fpmsUnlimited: boolean;
	private static initialized: boolean;
	private static mapActive: MapActive;
	private static modeEdit: boolean;
	private static paused: boolean;
	private static quality: AssetImageSrcQuality;
	private static status: boolean;
	private static timestampDelta: number;
	private static timestampDeltaCamera: number;
	private static timestampNow: number;
	private static timestampThen: number = performance.now();
	private static timestampThenCamera: number = performance.now();
	private static touchDistanceActive: boolean;
	private static touchDistanceOrig: number;
	private static touchDistanceOrigX: number;
	private static touchDistanceOrigY: number;

	public static async initialize(
		ctxBackground: OffscreenCanvasRenderingContext2D,
		ctxForeground: OffscreenCanvasRenderingContext2D,
		ctxOverlay: OffscreenCanvasRenderingContext2D,
		ctxPrimary: OffscreenCanvasRenderingContext2D,
		ctxUnderlay: OffscreenCanvasRenderingContext2D,
		ctxVanishing: OffscreenCanvasRenderingContext2D,
	): Promise<void> {
		if (KernelEngine.initialized) {
			console.error('KernelEngine > initialize: already initialized');
			return;
		}
		KernelEngine.initialized = true;

		ctxBackground.imageSmoothingEnabled = false;
		ctxForeground.imageSmoothingEnabled = false;
		ctxOverlay.imageSmoothingEnabled = false;
		ctxPrimary.imageSmoothingEnabled = false;
		ctxUnderlay.imageSmoothingEnabled = false;
		ctxVanishing.imageSmoothingEnabled = false;

		await DrawEditEngine.initialize(ctxBackground, ctxForeground, ctxOverlay, ctxPrimary, ctxUnderlay, ctxVanishing);
		await DrawPlayEngine.initialize(ctxBackground, ctxForeground, ctxOverlay, ctxPrimary, ctxUnderlay, ctxVanishing);

		// Extended
		await CameraDrawEngine.initialize(ctxBackground, ctxForeground, ctxOverlay, ctxPrimary, ctxUnderlay, ctxVanishing);
		await GridDrawEngine.initialize(ctxBackground, ctxForeground, ctxOverlay, ctxPrimary, ctxUnderlay, ctxVanishing);
		await ImageBlockDrawEngine.initialize(ctxBackground, ctxForeground, ctxOverlay, ctxPrimary, ctxUnderlay, ctxVanishing);
		await MapDrawEngine.initialize(ctxBackground, ctxForeground, ctxOverlay, ctxPrimary, ctxUnderlay, ctxVanishing);
	}

	private static tmpH: any;
	private static tmpV: any;
	public static inputKey(action: KeyAction): void {
		if (KernelEngine.status) {
			if (!action.down) {
				clearInterval(KernelEngine.tmpH);
				clearInterval(KernelEngine.tmpV);
			}

			if (action.down && action.key === KeyCommon.DOWN) {
				clearInterval(KernelEngine.tmpV);
				CameraEngine.moveIncremental(0, 1);
				KernelEngine.tmpV = setInterval(() => {
					CameraEngine.moveIncremental(0, 1);
				}, KernelEngine.fpmsCamera);
			}
			if (action.down && action.key === KeyCommon.LEFT) {
				clearInterval(KernelEngine.tmpH);
				CameraEngine.moveIncremental(-1, 0);
				KernelEngine.tmpH = setInterval(() => {
					CameraEngine.moveIncremental(-1, 0);
				}, KernelEngine.fpmsCamera);
			}
			if (action.down && action.key === KeyCommon.RIGHT) {
				clearInterval(KernelEngine.tmpH);
				CameraEngine.moveIncremental(1, 0);
				KernelEngine.tmpH = setInterval(() => {
					CameraEngine.moveIncremental(1, 0);
				}, KernelEngine.fpmsCamera);
			}
			if (action.down && action.key === KeyCommon.UP) {
				clearInterval(KernelEngine.tmpV);
				CameraEngine.moveIncremental(0, -1);
				KernelEngine.tmpV = setInterval(() => {
					CameraEngine.moveIncremental(0, -1);
				}, KernelEngine.fpmsCamera);
			}
		}
	}

	public static inputMouse(action: MouseAction): void {
		if (KernelEngine.status) {
			if (action.cmd == MouseCmd.LEFT_CLICK) {
				if (MapDrawEngine.isPixelInMap(action.position.xRel, action.position.yRel)) {
					MapDrawEngine.moveToPx(action.position.xRel, action.position.yRel);
				}
			}
			if (action.cmd == MouseCmd.WHEEL) {
				if (action.down) {
					CameraEngine.zoom(false);
				} else {
					CameraEngine.zoom(true);
				}
			}
		}
	}

	public static inputTouch(action: TouchAction): void {
		if (KernelEngine.status) {
			if (action.cmd == TouchCmd.ZOOM) {
				if (action.down) {
					KernelEngine.touchDistanceActive = true;
					KernelEngine.touchDistanceOrig = <number>action.positions[0].distance;
					KernelEngine.touchDistanceOrigX = <number>action.positions[0].x;
					KernelEngine.touchDistanceOrigY = <number>action.positions[0].y;
				} else {
					KernelEngine.touchDistanceActive = false;
				}
			} else if (action.cmd == TouchCmd.ZOOM_MOVE && KernelEngine.touchDistanceActive) {
				let distance: number = <number>action.positions[0].distance,
					x: number = <number>action.positions[0].x,
					y: number = <number>action.positions[0].y,
					absX: number = Math.abs(KernelEngine.touchDistanceOrigX - x),
					absY: number = Math.abs(KernelEngine.touchDistanceOrigY - y),
					absZoom: number = Math.abs(KernelEngine.touchDistanceOrig - distance);

				// Move X
				if (absX > 40) {
					if (KernelEngine.touchDistanceOrigX - x > 0) {
						CameraEngine.moveIncremental(1, 0);
					} else {
						CameraEngine.moveIncremental(-1, 0);
					}
					KernelEngine.touchDistanceOrigX = x;
				}

				// Move Y
				if (absY > 40) {
					if (KernelEngine.touchDistanceOrigY - y > 0) {
						CameraEngine.moveIncremental(0, 1);
					} else {
						CameraEngine.moveIncremental(0, -1);
					}
					KernelEngine.touchDistanceOrigY = y;
				}

				// Zoom
				if (absZoom > 40) {
					if (KernelEngine.touchDistanceOrig - distance > 0) {
						CameraEngine.zoom(false);
					} else {
						CameraEngine.zoom(true);
					}
					KernelEngine.touchDistanceOrig = distance;
				}
			}
		}
	}

	private static loop(): void {
		if (!KernelEngine.status) {
			return;
		}

		//Start the request for the next frame
		requestAnimationFrame(KernelEngine.loop);
		KernelEngine.timestampNow = performance.now();
		KernelEngine.timestampDelta = KernelEngine.timestampNow - KernelEngine.timestampThen;
		KernelEngine.timestampDeltaCamera = KernelEngine.timestampNow - KernelEngine.timestampThenCamera;

		if (KernelEngine.timestampDeltaCamera > KernelEngine.fpmsCamera) {
			KernelEngine.timestampThenCamera = KernelEngine.timestampNow - (KernelEngine.timestampDeltaCamera % KernelEngine.fpmsCamera);
			setTimeout(() => {
				CameraEngine.update();
			});
		}

		if (!KernelEngine.fpmsUnlimited) {
			/**
			 * FPS limited
			 */
			if (KernelEngine.timestampDelta > KernelEngine.fpms) {
				KernelEngine.timestampThen = KernelEngine.timestampNow - (KernelEngine.timestampDelta % KernelEngine.fpms);
				KernelEngine.frames++;

				// Start
				if (KernelEngine.modeEdit) {
					!KernelEngine.paused && CalcEditEngine.start(KernelEngine.timestampDelta);
					DrawEditEngine.start();
				} else {
					CalcPlayEngine.start(KernelEngine.timestampDelta);
					DrawPlayEngine.start();
				}
			}
		} else {
			/**
			 * FPS unlimited
			 */
			KernelEngine.frames++;
			if (KernelEngine.modeEdit) {
				!KernelEngine.paused && CalcEditEngine.start(KernelEngine.timestampDelta);
				DrawEditEngine.start();
			} else {
				!KernelEngine.paused && CalcPlayEngine.start(KernelEngine.timestampDelta);
				DrawPlayEngine.start();
			}
		}
	}

	/**
	 * Use this to redraw everything and for ext threads to re-pull assets
	 */
	public static async cacheResets(deep?: boolean): Promise<void> {
		// Primary
		deep && LightingEngine.cacheReset();

		// Extended
		CameraDrawEngine.cacheReset();
		GridDrawEngine.cacheReset();
		ImageBlockDrawEngine.cacheReset();
		MapDrawEngine.cacheReset();
	}

	/**
	 * Use this to toggle drawn elements in edit mode
	 */
	public static async draw(draw: VideoBusInputCmdGameModeEditDraw): Promise<void> {
		GridDrawEngine.setEnable(draw.grid);
		ImageBlockDrawEngine.setVanishingEnable(draw.vanishingEnable);
	}

	public static async historyUpdate(mapActive: MapActive): Promise<void> {
		KernelEngine.mapActive = mapActive;

		// Load into engines
		CalcEditEngine.setMapActive(mapActive);
		CalcPlayEngine.setMapActive(mapActive);

		CameraEngine.setMapActive(mapActive);

		DrawEditEngine.setMapActive(mapActive);
		DrawPlayEngine.setMapActive(mapActive);

		// Load into extended engines
		CameraDrawEngine.setMapActive(mapActive);
		ClockCalcEngine.setMapActive(mapActive);
		GridDrawEngine.setMapActive(mapActive);
		ImageBlockDrawEngine.setMapActive(mapActive);
		LightingEngine.setMapActive(mapActive);
		MapDrawEngine.setMapActive(mapActive);

		// Extended
		KernelEngine.cacheResets(false);
		KernelEngine.updateGridActive(mapActive.gridActiveId);
	}

	public static pause(): void {
		if (!KernelEngine.initialized) {
			console.error('KernelEngine > pause: not initialized');
			return;
		} else if (!KernelEngine.status) {
			console.error('KernelEngine > pause: not running');
			return;
		} else if (KernelEngine.paused) {
			console.error('KernelEngine > pause: already paused');
			return;
		}
		KernelEngine.paused = true;
	}

	private static resetMapActive(): void {
		// Primary
		KernelEngine.mapActive.clockTicker = 0;
		KernelEngine.mapActive.durationInMS = 0;
		KernelEngine.mapActive.hourOfDayEff = KernelEngine.mapActive.hourOfDay;
		KernelEngine.mapActive.minuteOfHourEff = 0;

		// Extended
		LightingCalcEngineBus.outputHourPreciseOfDayEff(KernelEngine.mapActive.hourOfDayEff);
	}

	public static resume(): void {
		if (!KernelEngine.initialized) {
			console.error('KernelEngine > resume: not initialized');
			return;
		} else if (!KernelEngine.status) {
			console.error('KernelEngine > resume: not running');
			return;
		} else if (!KernelEngine.paused) {
			console.error('KernelEngine > resume: not paused');
			return;
		}
		KernelEngine.paused = false;
	}

	public static async start(mapActive: MapActive): Promise<void> {
		if (!KernelEngine.initialized) {
			console.error('KernelEngine > start: not initialized');
			return;
		} else if (KernelEngine.status) {
			console.error('KernelEngine > start: already started');
			return;
		}
		KernelEngine.status = true;
		KernelEngine.historyUpdate(mapActive);
		KernelEngine.resetMapActive();

		// Reset camera
		if (KernelEngine.ctxDimensionHeight && KernelEngine.ctxDimensionWidth) {
			CameraEngine.dimensions(KernelEngine.ctxDimensionHeight, KernelEngine.ctxDimensionWidth);
		} else {
			console.error('KernelEngine > start: no dimensions set');
			return;
		}
		CameraEngine.reset();

		// Last
		await KernelEngine.cacheResets(true);

		KernelEngine.framesInterval = setInterval(() => {
			let frames = KernelEngine.frames;
			KernelEngine.frames = 0;
			KernelEngine.callbackFPS(frames);
		}, 1000);
		requestAnimationFrame(KernelEngine.loop);
	}

	public static stop(): void {
		if (!KernelEngine.initialized) {
			console.error('KernelEngine > stop: not initialized');
			return;
		} else if (!KernelEngine.status) {
			console.error('KernelEngine > stop: already stopped');
			return;
		}
		clearInterval(KernelEngine.framesInterval);
		KernelEngine.status = false;
	}

	public static setDimension(height: number, width: number): void {
		if (!KernelEngine.initialized) {
			console.error('KernelEngine > setDimensions: not initialized');
			return;
		}
		// Update Camera
		KernelEngine.ctxDimensionHeight = height;
		KernelEngine.ctxDimensionWidth = width;

		if (KernelEngine.mapActive) {
			CameraEngine.dimensions(height, width);
		}
	}

	public static setModeEdit(modeEdit: boolean): void {
		if (!KernelEngine.initialized) {
			console.error('KernelEngine > setModeEdit: not initialized');
			return;
		}
		KernelEngine.modeEdit = modeEdit;

		// Load into engines

		// Load into extended engines
	}

	public static updateGridActive(id: string): void {
		MapDrawEngineBus.outputGridActive(id);
		LightingCalcEngineBus.outputGridActive(id);
	}

	/*
	 * Used by MapEditEngine on block placement
	 */
	public static updateMap(): void {
		ImageBlockDrawEngine.cacheReset();
		MapDrawEngineBus.outputGrids(KernelEngine.getMapActive().grids, KernelEngine.getMapActive().gridConfigs);
		LightingCalcEngineBus.outputGrids(KernelEngine.getMapActive().grids, KernelEngine.getMapActive().gridConfigs);
	}

	public static updateSettings(settings: VideoBusInputCmdSettings): void {
		if (!KernelEngine.initialized) {
			console.error('KernelEngine > updateSettings: not initialized');
			return;
		}
		KernelEngine.fpms = Math.round(1000 / settings.fps);
		KernelEngine.fpmsUnlimited = settings.fps === VideoBusInputCmdSettingsFPS._unlimited;

		// Primary
		DrawEditEngine.mapVisible = settings.mapVisible;

		// Extended
		ImageBlockDrawEngine.setVanishingPercentageOfViewport(settings.vanishingPercentageOfViewport);
		LightingEngine.settings(settings.darknessMax, settings.gamma);
		MapDrawEngine.resolution = settings.resolution;
		MapDrawEngineBus.setDarknessMax(settings.darknessMax);
		MapDrawEngineBus.setMapVisible(settings.mapVisible);

		// Last
		if (KernelEngine.quality !== settings.quality) {
			KernelEngine.quality = settings.quality;
			LightingEngine.setResolution(settings.quality);

			// Last
			if (KernelEngine.mapActive) {
				KernelEngine.cacheResets();
			}
		}
	}

	public static setCallbackFPS(callbackFPS: (fps: number) => void): void {
		KernelEngine.callbackFPS = callbackFPS;
	}

	public static getMapActive(): MapActive {
		return KernelEngine.mapActive;
	}

	public static isModeEdit(): boolean {
		return KernelEngine.modeEdit;
	}

	public static isPaused(): boolean {
		return KernelEngine.paused;
	}

	public static isRunning(): boolean {
		return KernelEngine.status;
	}
}
