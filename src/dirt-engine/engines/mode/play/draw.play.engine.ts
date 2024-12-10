import { Camera } from '../../../models/camera.model';
import { ImageBlockDrawEngine } from '../../../draw/image-block.draw.engine';
import { MapActive } from '../../../models/map.model';
import { UnderlayDrawEngine } from '../../../draw/underlay.draw.engine';

/**
 * @author tknight-dev
 */

export class DrawPlayEngine {
	private static ctxBackground1: OffscreenCanvasRenderingContext2D;
	private static ctxBackground2: OffscreenCanvasRenderingContext2D;
	private static ctxForeground1: OffscreenCanvasRenderingContext2D;
	private static ctxForeground2: OffscreenCanvasRenderingContext2D;
	private static ctxInteractive: OffscreenCanvasRenderingContext2D;
	private static ctxOverlay: OffscreenCanvasRenderingContext2D;
	private static ctxUnderlay: OffscreenCanvasRenderingContext2D;
	private static ctxVanishing: OffscreenCanvasRenderingContext2D;
	private static initialized: boolean;
	public static fpsVisible: boolean;
	private static mapActive: MapActive;
	private static mapActiveCamera: Camera;
	public static mapVisible: boolean;

	public static async initialize(
		ctxBackground1: OffscreenCanvasRenderingContext2D,
		ctxBackground2: OffscreenCanvasRenderingContext2D,
		ctxForeground1: OffscreenCanvasRenderingContext2D,
		ctxForeground2: OffscreenCanvasRenderingContext2D,
		ctxInteractive: OffscreenCanvasRenderingContext2D,
		ctxOverlay: OffscreenCanvasRenderingContext2D,
		ctxUnderlay: OffscreenCanvasRenderingContext2D,
		ctxVanishing: OffscreenCanvasRenderingContext2D,
	): Promise<void> {
		if (DrawPlayEngine.initialized) {
			console.error('DrawPlayEngine > initialize: already initialized');
			return;
		}
		DrawPlayEngine.initialized = true;

		// Primary
		DrawPlayEngine.ctxBackground1 = ctxBackground1;
		DrawPlayEngine.ctxBackground2 = ctxBackground2;
		DrawPlayEngine.ctxForeground1 = ctxForeground1;
		DrawPlayEngine.ctxForeground2 = ctxForeground2;
		DrawPlayEngine.ctxInteractive = ctxInteractive;
		DrawPlayEngine.ctxOverlay = ctxOverlay;
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
		DrawPlayEngine.ctxUnderlay.clearRect(0, 0, camera.windowPw, camera.windowPh);
		DrawPlayEngine.ctxBackground1.clearRect(0, 0, camera.windowPw, camera.windowPh);
		DrawPlayEngine.ctxBackground2.clearRect(0, 0, camera.windowPw, camera.windowPh);
		DrawPlayEngine.ctxForeground1.clearRect(0, 0, camera.windowPw, camera.windowPh);
		DrawPlayEngine.ctxForeground2.clearRect(0, 0, camera.windowPw, camera.windowPh);
		DrawPlayEngine.ctxInteractive.clearRect(0, 0, camera.windowPw, camera.windowPh);
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
