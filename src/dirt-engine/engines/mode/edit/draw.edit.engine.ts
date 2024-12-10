import { Camera } from '../../../models/camera.model';
import { CameraDrawEngine } from '../../../draw/camera.draw.engine';
import { GridDrawEngine } from '../../../draw/grid.draw.engine';
import { ImageBlockDrawEngine } from '../../../draw/image-block.draw.engine';
import { MapActive } from '../../../models/map.model';
import { MapDrawEngine } from '../../../draw/map.draw.engine';
import { UnderlayDrawEngine } from '../../../draw/underlay.draw.engine';

/**
 * @author tknight-dev
 */

export class DrawEditEngine {
	private static ctxBackground1: OffscreenCanvasRenderingContext2D;
	private static ctxBackground2: OffscreenCanvasRenderingContext2D;
	private static ctxForeground1: OffscreenCanvasRenderingContext2D;
	private static ctxForeground2: OffscreenCanvasRenderingContext2D;
	private static ctxInteractive: OffscreenCanvasRenderingContext2D;
	private static ctxOverlay: OffscreenCanvasRenderingContext2D;
	private static ctxUnderlay: OffscreenCanvasRenderingContext2D;
	private static ctxVanishing: OffscreenCanvasRenderingContext2D;
	private static initialized: boolean;
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
		if (DrawEditEngine.initialized) {
			console.error('DrawEditEngine > initialize: already initialized');
			return;
		}
		DrawEditEngine.initialized = true;

		// Primary
		DrawEditEngine.ctxBackground1 = ctxBackground1;
		DrawEditEngine.ctxBackground2 = ctxBackground2;
		DrawEditEngine.ctxForeground1 = ctxForeground1;
		DrawEditEngine.ctxForeground2 = ctxForeground2;
		DrawEditEngine.ctxInteractive = ctxInteractive;
		DrawEditEngine.ctxOverlay = ctxOverlay;
		DrawEditEngine.ctxUnderlay = ctxUnderlay;
		DrawEditEngine.ctxVanishing = ctxVanishing;
	}

	public static start(): void {
		if (!DrawEditEngine.initialized) {
			console.error('DrawEditEngine > start: not initialized');
			return;
		}
		let camera: Camera = DrawEditEngine.mapActiveCamera;

		/*
		 * Clear canvas
		 */
		DrawEditEngine.ctxUnderlay.clearRect(0, 0, camera.windowPw, camera.windowPh);
		DrawEditEngine.ctxBackground1.clearRect(0, 0, camera.windowPw, camera.windowPh);
		DrawEditEngine.ctxBackground2.clearRect(0, 0, camera.windowPw, camera.windowPh);
		DrawEditEngine.ctxForeground1.clearRect(0, 0, camera.windowPw, camera.windowPh);
		DrawEditEngine.ctxForeground2.clearRect(0, 0, camera.windowPw, camera.windowPh);
		DrawEditEngine.ctxInteractive.clearRect(0, 0, camera.windowPw, camera.windowPh);
		DrawEditEngine.ctxOverlay.clearRect(0, 0, camera.windowPw, camera.windowPh);
		DrawEditEngine.ctxVanishing.clearRect(0, 0, camera.windowPw, camera.windowPh);

		// Draw
		UnderlayDrawEngine.start();
		ImageBlockDrawEngine.start();
		GridDrawEngine.start();
		CameraDrawEngine.start();

		// Draw Last
		if (DrawEditEngine.mapVisible) {
			MapDrawEngine.start();
		}
	}

	public static setMapActive(mapActive: MapActive) {
		DrawEditEngine.mapActive = mapActive;
		DrawEditEngine.mapActiveCamera = mapActive.camera;
	}
}
