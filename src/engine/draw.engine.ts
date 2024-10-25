import { FPSDrawEngine } from './draw/fps.draw.engine';

/**
 * @author tknight-dev
 */

export class DrawEngine {
	public static ctx: OffscreenCanvasRenderingContext2D;
	public static ctxBackground: OffscreenCanvasRenderingContext2D;
	public static ctxForeground: OffscreenCanvasRenderingContext2D;
	public static ctxOverlay: OffscreenCanvasRenderingContext2D;
	private static initialized: boolean;
	public static fpsVisible: boolean;

	public static async initialize(
		ctx: OffscreenCanvasRenderingContext2D,
		ctxBackground: OffscreenCanvasRenderingContext2D,
		ctxForeground: OffscreenCanvasRenderingContext2D,
		ctxOverlay: OffscreenCanvasRenderingContext2D,
	): Promise<void> {
		if (DrawEngine.initialized) {
			console.error('DrawEngine > initialize: already initialized');
			return;
		}
		DrawEngine.initialized = true;

		// Primary
		DrawEngine.ctx = ctx;
		DrawEngine.ctxBackground = ctxBackground;
		DrawEngine.ctxForeground = ctxForeground;
		DrawEngine.ctxOverlay = ctxOverlay;

		// Extended
		FPSDrawEngine.ctxOverlay = ctxOverlay;
	}

	public static start(): void {
		if (DrawEngine.fpsVisible) {
			FPSDrawEngine.start();
		}
	}
}
