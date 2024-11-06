import { Camera } from '../../../models/camera.model';
import { CameraDrawEngine } from '../../../draw/camera.draw.engine';
import { FPSDrawEngine } from '../../../draw/fps.draw.engine';
import { GridDrawEngine } from '../../../draw/grid.draw.engine';
import { ImageBlockDrawEngine } from '../../../draw/image-block.draw.engine';
import { MapActive } from '../../../models/map.model';
import { MapDrawEngine } from '../../../draw/map.draw.engine';

/**
 * @author tknight-dev
 */

export class DrawEditEngine {
	private static ctxBackground: OffscreenCanvasRenderingContext2D;
	private static ctxForeground: OffscreenCanvasRenderingContext2D;
	private static ctxOverlay: OffscreenCanvasRenderingContext2D;
	private static ctxPrimary: OffscreenCanvasRenderingContext2D;
	private static ctxUnderlay: OffscreenCanvasRenderingContext2D;
	private static initialized: boolean;
	public static fpsVisible: boolean;
	private static mapActive: MapActive;
	private static mapActiveCamera: Camera;
	public static mapVisible: boolean;

	public static async initialize(
		ctxBackground: OffscreenCanvasRenderingContext2D,
		ctxForeground: OffscreenCanvasRenderingContext2D,
		ctxOverlay: OffscreenCanvasRenderingContext2D,
		ctxPrimary: OffscreenCanvasRenderingContext2D,
		ctxUnderlay: OffscreenCanvasRenderingContext2D,
	): Promise<void> {
		if (DrawEditEngine.initialized) {
			console.error('DrawEditEngine > initialize: already initialized');
			return;
		}
		DrawEditEngine.initialized = true;

		// Primary
		DrawEditEngine.ctxBackground = ctxBackground;
		DrawEditEngine.ctxForeground = ctxForeground;
		DrawEditEngine.ctxOverlay = ctxOverlay;
		DrawEditEngine.ctxPrimary = ctxPrimary;
		DrawEditEngine.ctxUnderlay = ctxUnderlay;
	}

	public static start(): void {
		if (!DrawEditEngine.initialized) {
			console.error('DrawEditEngine > start: not initialized');
			return;
		}

		/*
		 * Clear canvas
		 */
		DrawEditEngine.ctxUnderlay.clearRect(
			0,
			0,
			DrawEditEngine.mapActiveCamera.windowPw,
			DrawEditEngine.mapActiveCamera.windowPh,
		);
		DrawEditEngine.ctxBackground.clearRect(
			0,
			0,
			DrawEditEngine.mapActiveCamera.windowPw,
			DrawEditEngine.mapActiveCamera.windowPh,
		);
		DrawEditEngine.ctxForeground.clearRect(
			0,
			0,
			DrawEditEngine.mapActiveCamera.windowPw,
			DrawEditEngine.mapActiveCamera.windowPh,
		);
		DrawEditEngine.ctxPrimary.clearRect(
			0,
			0,
			DrawEditEngine.mapActiveCamera.windowPw,
			DrawEditEngine.mapActiveCamera.windowPh,
		);
		DrawEditEngine.ctxOverlay.clearRect(
			0,
			0,
			DrawEditEngine.mapActiveCamera.windowPw,
			DrawEditEngine.mapActiveCamera.windowPh,
		);

		// Draw
		ImageBlockDrawEngine.start();
		GridDrawEngine.start();
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
