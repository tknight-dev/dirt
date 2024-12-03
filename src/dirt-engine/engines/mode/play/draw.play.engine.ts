import { Camera } from '../../../models/camera.model';
import { ImageBlockDrawEngine } from '../../../draw/image-block.draw.engine';
import { MapActive } from '../../../models/map.model';
import { UnderlayDrawEngine } from '../../../draw/underlay.draw.engine';

/**
 * @author tknight-dev
 */

export class DrawPlayEngine {
	private static ctxBackground: OffscreenCanvasRenderingContext2D;
	private static ctxForeground: OffscreenCanvasRenderingContext2D;
	private static ctxOverlay: OffscreenCanvasRenderingContext2D;
	private static ctxPrimary: OffscreenCanvasRenderingContext2D;
	private static ctxSecondary: OffscreenCanvasRenderingContext2D;
	private static ctxUnderlay: OffscreenCanvasRenderingContext2D;
	private static ctxVanishing: OffscreenCanvasRenderingContext2D;
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
		ctxSecondary: OffscreenCanvasRenderingContext2D,
		ctxUnderlay: OffscreenCanvasRenderingContext2D,
		ctxVanishing: OffscreenCanvasRenderingContext2D,
	): Promise<void> {
		if (DrawPlayEngine.initialized) {
			console.error('DrawPlayEngine > initialize: already initialized');
			return;
		}
		DrawPlayEngine.initialized = true;

		// Primary
		DrawPlayEngine.ctxBackground = ctxBackground;
		DrawPlayEngine.ctxForeground = ctxForeground;
		DrawPlayEngine.ctxOverlay = ctxOverlay;
		DrawPlayEngine.ctxPrimary = ctxPrimary;
		DrawPlayEngine.ctxSecondary = ctxSecondary;
		DrawPlayEngine.ctxUnderlay = ctxUnderlay;
		DrawPlayEngine.ctxVanishing = ctxVanishing;
	}

	public static start(): void {
		if (!DrawPlayEngine.initialized) {
			console.error('DrawPlayEngine > start: not initialized');
			return;
		}
		let camera: Camera = DrawPlayEngine.mapActiveCamera;

		/*
		 * Clear canvas
		 */
		// DrawEditEngine.ctxUnderlay.clearRect(0, 0, camera.windowPw, camera.windowPh);
		DrawPlayEngine.ctxBackground.clearRect(0, 0, camera.windowPw, camera.windowPh);
		DrawPlayEngine.ctxForeground.clearRect(0, 0, camera.windowPw, camera.windowPh);
		DrawPlayEngine.ctxPrimary.clearRect(0, 0, camera.windowPw, camera.windowPh);
		DrawPlayEngine.ctxSecondary.clearRect(0, 0, camera.windowPw, camera.windowPh);
		DrawPlayEngine.ctxOverlay.clearRect(0, 0, camera.windowPw, camera.windowPh);
		DrawPlayEngine.ctxVanishing.clearRect(0, 0, camera.windowPw, camera.windowPh);

		// Draw
		UnderlayDrawEngine.start();
		ImageBlockDrawEngine.start();
	}

	public static setMapActive(mapActive: MapActive) {
		DrawPlayEngine.mapActive = mapActive;
		DrawPlayEngine.mapActiveCamera = mapActive.camera;
	}
}
