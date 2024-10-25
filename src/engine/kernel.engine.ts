import { CalcEngine } from './calc.engine';
import { DrawEngine } from './draw.engine';
import { FPSDrawEngine } from './draw/fps.draw.engine';
import { VideoCmdSettings, VideoCmdSettingsFPS } from './models/video-worker-cmds.model';

/**
 * @author tknight-dev
 */

export class KernelEngine {
	private static fpms: number;
	private static fpmsUnlimited: boolean;
	private static initialized: boolean;
	private static status: boolean;
	private static timestampDelta: number;
	private static timestampNow: number;
	private static timestampThen: number = performance.now();

	public static async initialize(
		ctx: OffscreenCanvasRenderingContext2D,
		ctxBackground: OffscreenCanvasRenderingContext2D,
		ctxForeground: OffscreenCanvasRenderingContext2D,
		ctxOverlay: OffscreenCanvasRenderingContext2D,
	): Promise<void> {
		if (KernelEngine.initialized) {
			console.error('KernelEngine > initialize: already initialized');
			return;
		}
		KernelEngine.initialized = true;

		await DrawEngine.initialize(ctx, ctxBackground, ctxForeground, ctxForeground);
	}

	protected static loop(): void {
		if (!KernelEngine.status) {
			return;
		}

		//Start the request for the next frame
		requestAnimationFrame(KernelEngine.loop);

		if (!KernelEngine.fpmsUnlimited) {
			/**
			 * FPS limiter
			 */
			KernelEngine.timestampNow = performance.now();
			KernelEngine.timestampDelta = KernelEngine.timestampNow - KernelEngine.timestampThen;
			if (KernelEngine.timestampDelta > KernelEngine.fpms) {
				KernelEngine.timestampThen = KernelEngine.timestampNow - (KernelEngine.timestampDelta % KernelEngine.fpms);

				// Start
				CalcEngine.start(KernelEngine.timestampNow, KernelEngine.timestampThen);
				DrawEngine.start();
			}
		} else {
			/**
			 * FPS unlimited
			 */
			CalcEngine.start(KernelEngine.timestampNow, KernelEngine.timestampThen);
			DrawEngine.start();
		}
	}

	public static start(): void {
		if (KernelEngine.status) {
			console.error('KernelEngine > start: already started');
			return;
		}
		console.log('STARTED');
		KernelEngine.status = true;
		requestAnimationFrame(KernelEngine.loop);
	}

	public static stop(): void {
		if (!KernelEngine.status) {
			console.error('KernelEngine > stop: already stopped');
			return;
		}
		KernelEngine.status = false;
	}

	public static updateSettings(settings: VideoCmdSettings): void {
		KernelEngine.fpms = Math.round(1000 / settings.fps);
		KernelEngine.fpmsUnlimited = settings.fps === VideoCmdSettingsFPS._unlimited;

		// Primary
		DrawEngine.fpsVisible = settings.fpsVisible;

		// Extended
		FPSDrawEngine.fpsVisible = settings.fpsVisible;
		FPSDrawEngine.fpsTarget = settings.fps;
	}
}
