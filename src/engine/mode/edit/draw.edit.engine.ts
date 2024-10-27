import { Camera } from '../../models/camera.model';
import { CameraDrawEngine } from '../../draw/camera.draw.engine';
import { FPSDrawEngine } from '../../draw/fps.draw.engine';
import { GridDrawEngine } from '../../draw/grid.draw.engine';
import { MapActive } from '../../models/map.model';
import { MapDrawEngine } from '../../draw/map.draw.engine';

/**
 * @author tknight-dev
 */

export class DrawEditEngine {
	public static ctx: OffscreenCanvasRenderingContext2D;
	public static ctxBackground: OffscreenCanvasRenderingContext2D;
	public static ctxForeground: OffscreenCanvasRenderingContext2D;
	public static ctxOverlay: OffscreenCanvasRenderingContext2D;
	private static initialized: boolean;
	public static fpsVisible: boolean;
	private static mapActive: MapActive;
	private static mapActiveCamera: Camera;
	public static mapVisible: boolean;

	public static async initialize(
		ctx: OffscreenCanvasRenderingContext2D,
		ctxBackground: OffscreenCanvasRenderingContext2D,
		ctxForeground: OffscreenCanvasRenderingContext2D,
		ctxOverlay: OffscreenCanvasRenderingContext2D,
	): Promise<void> {
		if (DrawEditEngine.initialized) {
			console.error('DrawEditEngine > initialize: already initialized');
			return;
		}
		DrawEditEngine.initialized = true;

		// Primary
		DrawEditEngine.ctx = ctx;
		DrawEditEngine.ctxBackground = ctxBackground;
		DrawEditEngine.ctxForeground = ctxForeground;
		DrawEditEngine.ctxOverlay = ctxOverlay;
	}

	public static start(): void {
		if (!DrawEditEngine.initialized) {
			console.error('DrawEditEngine > start: not initialized');
			return;
		}

		/*
		 * Overlay
		 */
		DrawEditEngine.ctxOverlay.clearRect(0, 0, DrawEditEngine.mapActiveCamera.windowPw, DrawEditEngine.mapActiveCamera.windowPh);

		// Draw First
		GridDrawEngine.start();

		// Draw
		CameraDrawEngine.start();

		// Draw Last
		if (DrawEditEngine.mapVisible) {
			MapDrawEngine.start();
		}
		if (DrawEditEngine.fpsVisible) {
			FPSDrawEngine.start();
		}
	}

	public static setMapActive(mapActive: MapActive) {
		DrawEditEngine.mapActive = mapActive;
		DrawEditEngine.mapActiveCamera = mapActive.camera;
	}
}
