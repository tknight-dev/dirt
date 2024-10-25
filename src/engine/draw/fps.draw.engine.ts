/**
 * @author tknight-dev
 */

export class FPSDrawEngine {
	public static ctxOverlay: OffscreenCanvasRenderingContext2D;
	public static drawAvailable: boolean = true;
	public static fps: number = 0;
	public static fpsVisible: boolean;
	public static fpsTarget: number;
	public static frameCount: number = 0;
	public static i: number;
	public static initialized: boolean;
	public static sampleSize: number;

	/**
	 * @timingResolutionInS between 1 and 30
	 */
	public static async initialize(): Promise<void> {
		if (FPSDrawEngine.initialized) {
			console.error('FPSDrawEngine > initialize: already initialized');
			return;
		}
		FPSDrawEngine.initialized = true;
		setTimeout(() => {
			FPSDrawEngine.interval();
		});
	}

	public static start(): void {
		FPSDrawEngine.frameCount++;

		if (FPSDrawEngine.fpsVisible && FPSDrawEngine.drawAvailable) {
			// FPSDrawEngine.ctxOverlay.beginPath();
			// FPSDrawEngine.ctxOverlay.fillStyle = "blue";
			// FPSDrawEngine.ctxOverlay.rect(11, 13, 64, 29);
			// FPSDrawEngine.ctxOverlay.fill();
			// FPSDrawEngine.ctxOverlay.closePath();
			FPSDrawEngine.ctxOverlay.clearRect(11, 13, 64, 29);

			FPSDrawEngine.ctxOverlay.font = '40px Arial';
			if (FPSDrawEngine.fps < FPSDrawEngine.fpsTarget - 20) {
				FPSDrawEngine.ctxOverlay.fillStyle = 'red';
			} else if (FPSDrawEngine.fps < FPSDrawEngine.fpsTarget - 10) {
				FPSDrawEngine.ctxOverlay.fillStyle = 'yellow';
			} else {
				FPSDrawEngine.ctxOverlay.fillStyle = 'green';
			}
			FPSDrawEngine.ctxOverlay.fillText(FPSDrawEngine.fps.toString().padStart(2, '00'), 10, 42);
			FPSDrawEngine.drawAvailable = false;
		}
	}

	/**
	 * Value per intervale is between 0 and .1 where .5 is the target fps
	 */
	private static interval(): void {
		let frameCount: number;

		setInterval(() => {
			frameCount = FPSDrawEngine.frameCount;
			FPSDrawEngine.frameCount = 0;
			FPSDrawEngine.fps = frameCount;
			FPSDrawEngine.drawAvailable = true;
		}, 1000);
	}
}
