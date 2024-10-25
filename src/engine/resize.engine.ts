/**
 * Callback triggered on window resize and shifts to a new monitor (with a new)
 *
 * @author tknight-dev
 */

export class ResizeEngine {
	private static callback: () => void;
	private static initialized: boolean;
	private static interval: number;
	private static intervalLong: number;
	private static timeout: ReturnType<typeof setTimeout>;
	private static timestamp: number = performance.now();

	public static async initialize(fps: number): Promise<void> {
		if (ResizeEngine.initialized) {
			return;
		}
		ResizeEngine.initialized = true;
		ResizeEngine.setFPS(fps);

		addEventListener('resize', (event: any) => {
			let timestamp = performance.now();

			if (timestamp - ResizeEngine.timestamp > ResizeEngine.interval) {
				if (ResizeEngine.callback) {
					ResizeEngine.callback();
				}
				ResizeEngine.timestamp = timestamp;
			} else {
				clearTimeout(ResizeEngine.timeout);
				ResizeEngine.timeout = setTimeout(() => {
					if (ResizeEngine.callback) {
						ResizeEngine.callback();
					}
				}, ResizeEngine.intervalLong);
			}
		});
	}

	public static setCallback(callback: () => void): void {
		ResizeEngine.callback = callback;
	}

	public static setFPS(fps: number): void {
		ResizeEngine.interval = Math.round(10000 / fps) / 10;
		ResizeEngine.intervalLong = ResizeEngine.interval * 4;
	}
}
