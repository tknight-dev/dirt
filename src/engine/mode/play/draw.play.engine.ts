import { FPSDrawEngine } from '../../draw/fps.draw.engine';
import { MapActive } from '../../models/map.model';

/**
 * @author tknight-dev
 */

export class DrawPlayEngine {
	public static ctx: OffscreenCanvasRenderingContext2D;
	public static ctxBackground: OffscreenCanvasRenderingContext2D;
	public static ctxDimensionHeight: number;
	public static ctxDimensionWidth: number;
	public static ctxForeground: OffscreenCanvasRenderingContext2D;
	public static ctxOverlay: OffscreenCanvasRenderingContext2D;
	private static initialized: boolean;
	public static fpsVisible: boolean;
	public static mapActive: MapActive;

	public static async initialize(
		ctx: OffscreenCanvasRenderingContext2D,
		ctxBackground: OffscreenCanvasRenderingContext2D,
		ctxForeground: OffscreenCanvasRenderingContext2D,
		ctxOverlay: OffscreenCanvasRenderingContext2D,
	): Promise<void> {
		if (DrawPlayEngine.initialized) {
			console.error('DrawPlayEngine > initialize: already initialized');
			return;
		}
		DrawPlayEngine.initialized = true;

		// Primary
		DrawPlayEngine.ctx = ctx;
		DrawPlayEngine.ctxBackground = ctxBackground;
		DrawPlayEngine.ctxForeground = ctxForeground;
		DrawPlayEngine.ctxOverlay = ctxOverlay;
	}

	public static start(): void {
		if (!DrawPlayEngine.initialized) {
			console.error('DrawPlayEngine > start: not initialized');
			return;
		}

		// Last
		if (DrawPlayEngine.fpsVisible) {
			FPSDrawEngine.start();
		}
	}
}
