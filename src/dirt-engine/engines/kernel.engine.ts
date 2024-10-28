import { CalcEditEngine } from './mode/edit/calc.edit.engine';
import { CalcPlayEngine } from './mode/play/calc.play.engine';
import { CameraDrawEngine } from '../draw/camera.draw.engine';
import { CameraEngine } from './camera.engine';
import { DrawEditEngine } from './mode/edit/draw.edit.engine';
import { DrawPlayEngine } from './mode/play/draw.play.engine';
import { GridDrawEngine } from '../draw/grid.draw.engine';
import { FPSDrawEngine } from '../draw/fps.draw.engine';
import { KeyAction, KeyCommon } from './keyboard.engine';
import { MapActive } from '../models/map.model';
import { MapDrawEngine } from '../draw/map.draw.engine';
import { MouseAction, MouseCmd } from './mouse.engine';
import { UtilEngine } from './util.engine';
import { VideoCmdSettings, VideoCmdSettingsFPS } from '../models/video-worker-cmds.model';

/**
 * @author tknight-dev
 */

export class KernelEngine {
	private static ctxDimensionHeight: number;
	private static ctxDimensionWidth: number;
	private static fpms: number;
	private static fpmsUnlimited: boolean;
	private static initialized: boolean;
	private static mapActive: MapActive;
	private static modeEdit: boolean;
	private static paused: boolean;
	private static status: boolean;
	private static timestampDelta: number;
	private static timestampNow: number;
	private static timestampThen: number = performance.now();

	public static async initialize(
		ctxBackground: OffscreenCanvasRenderingContext2D,
		ctxForeground: OffscreenCanvasRenderingContext2D,
		ctxOverlay: OffscreenCanvasRenderingContext2D,
		ctxPrimary: OffscreenCanvasRenderingContext2D,
		ctxUnderlay: OffscreenCanvasRenderingContext2D,
	): Promise<void> {
		if (KernelEngine.initialized) {
			console.error('KernelEngine > initialize: already initialized');
			return;
		}
		KernelEngine.initialized = true;

		await DrawEditEngine.initialize(ctxBackground, ctxForeground, ctxOverlay, ctxPrimary, ctxUnderlay);
		await DrawPlayEngine.initialize(ctxBackground, ctxForeground, ctxOverlay, ctxPrimary, ctxUnderlay);

		// Extended
		await CameraDrawEngine.initialize(ctxBackground, ctxForeground, ctxOverlay, ctxPrimary, ctxUnderlay);
		await FPSDrawEngine.initialize(ctxBackground, ctxForeground, ctxOverlay, ctxPrimary, ctxUnderlay);
		await GridDrawEngine.initialize(ctxBackground, ctxForeground, ctxOverlay, ctxPrimary, ctxUnderlay);
		await MapDrawEngine.initialize(ctxBackground, ctxForeground, ctxOverlay, ctxPrimary, ctxUnderlay);
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
				}, 75);
			}
			if (action.down && action.key === KeyCommon.LEFT) {
				clearInterval(KernelEngine.tmpH);
				CameraEngine.moveIncremental(-1, 0);
				KernelEngine.tmpH = setInterval(() => {
					CameraEngine.moveIncremental(-1, 0);
				}, 75);
			}
			if (action.down && action.key === KeyCommon.RIGHT) {
				clearInterval(KernelEngine.tmpH);
				CameraEngine.moveIncremental(1, 0);
				KernelEngine.tmpH = setInterval(() => {
					CameraEngine.moveIncremental(1, 0);
				}, 75);
			}
			if (action.down && action.key === KeyCommon.UP) {
				clearInterval(KernelEngine.tmpV);
				CameraEngine.moveIncremental(0, -1);
				KernelEngine.tmpV = setInterval(() => {
					CameraEngine.moveIncremental(0, -1);
				}, 75);
			}
		}
	}

	public static inputMouse(action: MouseAction): void {
		if (KernelEngine.status) {
			if (action.cmd == MouseCmd.LEFT_CLICK) {
				if (MapDrawEngine.isPixelInMap(action.position.x, action.position.y)) {
					MapDrawEngine.moveToPx(action.position.x, action.position.y);
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

	private static loop(): void {
		if (!KernelEngine.status) {
			return;
		}

		//Start the request for the next frame
		requestAnimationFrame(KernelEngine.loop);

		if (!KernelEngine.fpmsUnlimited) {
			/**
			 * FPS limited
			 */
			KernelEngine.timestampNow = performance.now();
			KernelEngine.timestampDelta = KernelEngine.timestampNow - KernelEngine.timestampThen;
			if (KernelEngine.timestampDelta > KernelEngine.fpms) {
				KernelEngine.timestampThen = KernelEngine.timestampNow - (KernelEngine.timestampDelta % KernelEngine.fpms);

				// Start
				if (KernelEngine.modeEdit) {
					!KernelEngine.paused && CalcEditEngine.start(KernelEngine.timestampNow, KernelEngine.timestampThen);
					DrawEditEngine.start();
				} else {
					CalcPlayEngine.start(KernelEngine.timestampNow, KernelEngine.timestampThen);
					DrawPlayEngine.start();
				}
			}
		} else {
			/**
			 * FPS unlimited
			 */
			if (KernelEngine.modeEdit) {
				!KernelEngine.paused && CalcEditEngine.start(KernelEngine.timestampNow, KernelEngine.timestampThen);
				DrawEditEngine.start();
			} else {
				!KernelEngine.paused && CalcPlayEngine.start(KernelEngine.timestampNow, KernelEngine.timestampThen);
				DrawPlayEngine.start();
			}
		}
	}

	public static start(mapActive: MapActive): void {
		if (!KernelEngine.initialized) {
			console.error('KernelEngine > start: not initialized');
			return;
		} else if (KernelEngine.status) {
			console.error('KernelEngine > start: already started');
			return;
		}
		KernelEngine.status = true;
		KernelEngine.mapActive = mapActive;

		// Load into engines
		CalcEditEngine.setMapActive(mapActive);
		CalcPlayEngine.setMapActive(mapActive);

		CameraEngine.setMapActive(mapActive);

		DrawEditEngine.setMapActive(mapActive);
		DrawPlayEngine.setMapActive(mapActive);

		// Load into extended engines
		CameraDrawEngine.setMapActive(mapActive);
		GridDrawEngine.setMapActive(mapActive);
		MapDrawEngine.setMapActive(mapActive);

		// Reset camera
		if (KernelEngine.ctxDimensionHeight && KernelEngine.ctxDimensionWidth) {
			CameraEngine.updateDimensions(KernelEngine.ctxDimensionHeight, KernelEngine.ctxDimensionWidth);
		} else {
			console.error('KernelEngine > start: no dimensions set');
			return;
		}
		CameraEngine.reset();

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
			CameraEngine.updateDimensions(height, width);
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

	public static updateSettings(settings: VideoCmdSettings): void {
		if (!KernelEngine.initialized) {
			console.error('KernelEngine > updateSettings: not initialized');
			return;
		}
		KernelEngine.fpms = Math.round(1000 / settings.fps);
		KernelEngine.fpmsUnlimited = settings.fps === VideoCmdSettingsFPS._unlimited;

		// Primary
		DrawEditEngine.fpsVisible = settings.fpsVisible;
		DrawEditEngine.mapVisible = settings.mapVisible;
		DrawPlayEngine.fpsVisible = settings.fpsVisible;

		// Extended
		FPSDrawEngine.fpsTarget = settings.fps;
	}
}
