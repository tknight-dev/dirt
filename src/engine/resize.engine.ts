/**
 * Callback triggered on window resize and shifts to a new monitor (with a new)
 *
 * @author tknight-dev
 */

export class ResizeEngine {
	private static callback: () => void;
	private static initialized: boolean;
	private static timeout: ReturnType<typeof setTimeout>;

	public static async initialize(): Promise<void> {
		if (ResizeEngine.initialized) {
			return;
		}
		ResizeEngine.initialized = true;

		addEventListener('resize', (event: any) => {
			clearTimeout(ResizeEngine.timeout);
			ResizeEngine.timeout = setTimeout(() => {
				if (ResizeEngine.callback) {
					ResizeEngine.callback();
				}
			}, 40);
		});
	}

	public static setCallback(callback: () => void): void {
		ResizeEngine.callback = callback;
	}
}
