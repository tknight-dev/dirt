import { AnimationImageBlocksCalcEngine } from '../calc/animation-image-blocks.calc.engine';
import { CalcEditEngine } from './mode/edit/calc.edit.engine';
import { CalcPlayEngine } from './mode/play/calc.play.engine';
import { ClockCalcEngine } from '../calc/clock.calc.engine';
import { CameraDrawEngine } from '../draw/camera.draw.engine';
import { CameraEngine } from './camera.engine';
import { DrawEditEngine } from './mode/edit/draw.edit.engine';
import { DrawPlayEngine } from './mode/play/draw.play.engine';
import { GridDrawEngine } from '../draw/grid.draw.engine';
import { ImageBlockDrawEngine } from '../draw/image-block.draw.engine';
import { InputsCalcEngine } from '../calc/inputs.calc.engine';
import { LightingEngine } from './lighting.engine';
import { LightingCalcEngineBus } from '../calc/buses/lighting.calc.engine.bus';
import { MapActive } from '../models/map.model';
import { MapDrawEngine } from '../draw/map.draw.engine';
import { MapDrawEngineBus } from '../draw/buses/map.draw.engine.bus';
import { UnderlayDrawEngine } from '../draw/underlay.draw.engine';
import { VideoBusInputCmdGameModeEditDraw, VideoBusInputCmdSettings } from '../engines/buses/video.model.bus';
import { UtilEngine } from './util.engine';

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
	private static initialized: boolean;
	private static mapActive: MapActive;
	private static modeEdit: boolean;
	private static paused: boolean;
	private static requestFrame: number;
	private static status: boolean;
	private static timestampDelta: number;
	private static timestampThen: number = performance.now();

	public static async initialize(
		ctxBackground1: OffscreenCanvasRenderingContext2D,
		ctxBackground2: OffscreenCanvasRenderingContext2D,
		ctxForeground1: OffscreenCanvasRenderingContext2D,
		ctxForeground2: OffscreenCanvasRenderingContext2D,
		ctxInteractive: OffscreenCanvasRenderingContext2D,
		ctxMiddleground: OffscreenCanvasRenderingContext2D,
		ctxOverlay: OffscreenCanvasRenderingContext2D,
		ctxUnderlay: OffscreenCanvasRenderingContext2D,
		ctxVanishing: OffscreenCanvasRenderingContext2D,
	): Promise<void> {
		if (KernelEngine.initialized) {
			console.error('KernelEngine > initialize: already initialized');
			return;
		}
		KernelEngine.initialized = true;

		await DrawEditEngine.initialize(
			ctxBackground1,
			ctxBackground2,
			ctxForeground1,
			ctxForeground2,
			ctxInteractive,
			ctxMiddleground,
			ctxOverlay,
			ctxUnderlay,
			ctxVanishing,
		);
		await DrawPlayEngine.initialize(
			ctxBackground1,
			ctxBackground2,
			ctxForeground1,
			ctxForeground2,
			ctxInteractive,
			ctxMiddleground,
			ctxOverlay,
			ctxUnderlay,
			ctxVanishing,
		);

		// Calcs
		await AnimationImageBlocksCalcEngine.initialize();
		await ClockCalcEngine.initialize();
		await InputsCalcEngine.initialize();

		// Extended
		await CameraDrawEngine.initialize(ctxInteractive);
		await GridDrawEngine.initialize(ctxOverlay);
		await ImageBlockDrawEngine.initialize(
			ctxBackground1,
			ctxBackground2,
			ctxForeground1,
			ctxForeground2,
			ctxInteractive,
			ctxMiddleground,
			ctxVanishing,
		);
		await MapDrawEngine.initialize(ctxOverlay);
		await UnderlayDrawEngine.initialize(ctxUnderlay);
	}

	private static loop(timestampNow: number): void {
		if (!KernelEngine.status) {
			return;
		}
		timestampNow |= 0;

		// Start the request for the next frame
		KernelEngine.requestFrame = requestAnimationFrame(KernelEngine.loop);
		KernelEngine.timestampDelta = timestampNow - KernelEngine.timestampThen;

		if (KernelEngine.timestampDelta > KernelEngine.fpms) {
			KernelEngine.timestampThen = timestampNow - (KernelEngine.timestampDelta % KernelEngine.fpms);
			KernelEngine.frames++;

			// Start
			CameraEngine.update();

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
		UnderlayDrawEngine.setEditing(draw.editing);
	}

	public static async historyUpdate(mapActive: MapActive): Promise<void> {
		let gridConfigsOptimized: { [key: string]: string } = {},
			gridsOptimized: { [key: string]: string } = {},
			mapActiveClone: MapActive = UtilEngine.mapClone(mapActive);

		KernelEngine.mapActive = mapActive;
		for (let i in mapActiveClone.grids) {
			gridConfigsOptimized[i] = JSON.stringify(mapActiveClone.gridConfigs[i]);
			gridsOptimized[i] = JSON.stringify(mapActiveClone.grids[i]);
		}

		// Load into engines
		CalcEditEngine.setMapActive(mapActive);
		CalcPlayEngine.setMapActive(mapActive);

		CameraEngine.setMapActive(mapActive);

		DrawEditEngine.setMapActive(mapActive);
		DrawPlayEngine.setMapActive(mapActive);

		// Load into calc engines
		ClockCalcEngine.setMapActive(mapActive);
		AnimationImageBlocksCalcEngine.setMapActive(mapActive);

		// Load into draw engines
		CameraDrawEngine.setMapActive(mapActive);
		GridDrawEngine.setMapActive(mapActive);
		ImageBlockDrawEngine.setMapActive(mapActive);
		LightingEngine.setMapActive(mapActive);
		MapDrawEngine.setMapActive(mapActive);
		UnderlayDrawEngine.setMapActive(mapActive);

		// Extended
		MapDrawEngineBus.outputGrids(gridsOptimized, gridConfigsOptimized);
		LightingCalcEngineBus.outputGrids(gridsOptimized, gridConfigsOptimized);

		// Last
		KernelEngine.updateGridActive(mapActive.gridActiveId);
		KernelEngine.cacheResets(false);
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
		InputsCalcEngine.setPaused(true);
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
		InputsCalcEngine.setPaused(false);
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
		InputsCalcEngine.setStatus(true);

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
		UnderlayDrawEngine.setDimensions(KernelEngine.ctxDimensionHeight, KernelEngine.ctxDimensionWidth);

		KernelEngine.framesInterval = setInterval(() => {
			let frames: number = KernelEngine.frames;
			KernelEngine.frames = 0;
			KernelEngine.callbackFPS(frames);
		}, 1000);
		KernelEngine.requestFrame = requestAnimationFrame(KernelEngine.loop);
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
		cancelAnimationFrame(KernelEngine.requestFrame);
		KernelEngine.status = false;
		InputsCalcEngine.setStatus(false);
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

		UnderlayDrawEngine.setDimensions(height, width);
	}

	public static setModeEdit(modeEdit: boolean): void {
		if (!KernelEngine.initialized) {
			console.error('KernelEngine > setModeEdit: not initialized');
			return;
		}
		KernelEngine.modeEdit = modeEdit;

		// Load into engines

		// Load into calc engines

		// Load into draw engines
	}

	public static updateGridActive(id: string): void {
		MapDrawEngineBus.outputGridActive(id);
		LightingCalcEngineBus.outputGridActive(id);
	}

	/*
	 * Used by MapEditEngine on block placement
	 */
	public static updateMap(): void {
		let gridConfigsOptimized: { [key: string]: string } = {},
			gridsOptimized: { [key: string]: string } = {},
			mapActiveClone: MapActive = UtilEngine.mapClone(KernelEngine.getMapActive());

		for (let i in mapActiveClone.grids) {
			gridConfigsOptimized[i] = JSON.stringify(mapActiveClone.gridConfigs[i]);
			gridsOptimized[i] = JSON.stringify(mapActiveClone.grids[i]);
		}

		ImageBlockDrawEngine.cacheReset();

		MapDrawEngineBus.outputGrids(gridsOptimized, gridConfigsOptimized);
		LightingCalcEngineBus.outputGrids(gridsOptimized, gridConfigsOptimized);
	}

	public static updateSettings(settings: VideoBusInputCmdSettings): void {
		if (!KernelEngine.initialized) {
			console.error('KernelEngine > updateSettings: not initialized');
			return;
		}
		if (settings.fps === 1) {
			// Unlimited*
			KernelEngine.fpms = 1;
		} else {
			KernelEngine.fpms = (1000 / settings.fps) | 0;
		}

		// Primary
		DrawEditEngine.mapVisible = settings.mapVisible;

		// Extended
		ImageBlockDrawEngine.setShadingQuality(settings.shadingQuality);
		ImageBlockDrawEngine.setVanishingPercentageOfViewport(settings.vanishingPercentageOfViewport);
		InputsCalcEngine.setMapVisible(settings.mapVisible);
		LightingEngine.settings(settings.darknessMax, settings.gamma, settings.imageQuality);
		MapDrawEngine.resolution = settings.resolution;
		MapDrawEngineBus.setDarknessMax(settings.darknessMax);
		MapDrawEngineBus.setMapVisible(settings.mapVisible);

		// Last
		if (KernelEngine.mapActive) {
			KernelEngine.cacheResets(true);
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
