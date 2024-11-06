import { Camera } from '../../../models/camera.model';
import { ImageBlockDrawEngine } from '../../../draw/image-block.draw.engine';
import { FPSDrawEngine } from '../../../draw/fps.draw.engine';
import { MapActive } from '../../../models/map.model';

/**
 * @author tknight-dev
 */

export class DrawPlayEngine {
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
		DrawPlayEngine.ctxUnderlay = ctxUnderlay;
	}

	public static start(): void {
		if (!DrawPlayEngine.initialized) {
			console.error('DrawPlayEngine > start: not initialized');
			return;
		}
		ImageBlockDrawEngine.start();

		// Last
		if (DrawPlayEngine.fpsVisible) {
			FPSDrawEngine.start();
		}
	}

	public static setMapActive(mapActive: MapActive) {
		DrawPlayEngine.mapActive = mapActive;
		DrawPlayEngine.mapActiveCamera = mapActive.camera;
	}
}
