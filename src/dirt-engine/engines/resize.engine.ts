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

	public static async initialize(): Promise<void> {
		if (ResizeEngine.initialized) {
			return;
		}
		ResizeEngine.initialized = true;

		addEventListener('resize', (event: any) => {
			if (ResizeEngine.callback) {
				let timestamp = performance.now();

				if (timestamp - ResizeEngine.timestamp > 30) {
					ResizeEngine.callback();
					ResizeEngine.timestamp = timestamp;
				} else {
					clearTimeout(ResizeEngine.timeout);
					ResizeEngine.timeout = setTimeout(() => {
						ResizeEngine.callback();
					}, 60);
				}
			}
		});
	}

	public static setCallback(callback: () => void): void {
		ResizeEngine.callback = callback;
	}
}
