/**
 * @author tknight-dev
 */

export class VisibilityEngine {
	private static callback: (state: boolean) => void;
	private static initialized: boolean;
	private static state: boolean;

	public static async initialize(): Promise<void> {
		if (VisibilityEngine.initialized) {
			return;
		}
		VisibilityEngine.initialized = true;

		addEventListener('visibilitychange', (event: any) => {
			const state: boolean = document.visibilityState !== 'hidden';

			if (VisibilityEngine.state !== state) {
				VisibilityEngine.state = state;

				if (VisibilityEngine.callback) {
					setTimeout(() => VisibilityEngine.callback(state));
				}
			}
		});
	}

	public static setCallback(callback: (state: boolean) => void): void {
		VisibilityEngine.callback = callback;
	}

	public static isVisible(): boolean {
		if (!VisibilityEngine.initialized) {
			console.error('VisibilityEngine > isVisible: not initialized');
			return false;
		} else {
			return VisibilityEngine.state;
		}
	}
}
