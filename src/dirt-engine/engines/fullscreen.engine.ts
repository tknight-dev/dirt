/**
 * @author tknight-dev
 */

export class FullscreenEngine {
	private static callback: (state: boolean) => void;
	private static initialized: boolean;
	private static state: boolean;

	public static async initialize(): Promise<void> {
		if (FullscreenEngine.initialized) {
			return;
		}
		FullscreenEngine.initialized = true;

		addEventListener('fullscreenchange', (event: any) => {
			const state: boolean = document.fullscreenElement !== null;
			if (FullscreenEngine.state !== state) {
				FullscreenEngine.state = state;

				if (FullscreenEngine.callback) {
					FullscreenEngine.callback(state);
				}
			}
		});
	}

	public static async close(): Promise<void> {
		if (!FullscreenEngine.initialized) {
			console.error('FullscreenEngine > close: not initialized');
			return;
		} else if (!FullscreenEngine.state) {
			return;
		}

		try {
			await document.exitFullscreen();
			FullscreenEngine.state = false;
		} catch (error: any) {}
	}

	public static async open(element: HTMLElement): Promise<boolean> {
		if (!FullscreenEngine.initialized) {
			console.error('FullscreenEngine > open: not initialized');
			return false;
		} else if (FullscreenEngine.state) {
			console.error('FullscreenEngine > open: already open');
			return false;
		}

		await element.requestFullscreen();
		FullscreenEngine.state = true;

		return true;
	}

	public static setCallback(callback: (state: boolean) => void): void {
		FullscreenEngine.callback = callback;
	}

	public static isOpen(): boolean {
		if (!FullscreenEngine.initialized) {
			console.error('FullscreenEngine > isOpen: not initialized');
			return false;
		} else {
			return FullscreenEngine.state;
		}
	}
}
