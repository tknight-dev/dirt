/**
 * @author tknight-dev
 */

export interface KeyAction {
	down: boolean;
}

export interface KeyRegistration {
	callback: (keyAction: KeyAction) => void;
	keyAction: KeyAction;
}

export class KeyboardEngine {
	private static initialized: boolean;
	private static registered: { [key: number]: KeyRegistration } = {}; // key is hash
	private static state: { [key: number]: boolean } = {}; // key is keyCode, !undefined is down

	public static async initialize(): Promise<void> {
		if (KeyboardEngine.initialized) {
			return;
		}
		KeyboardEngine.initialized = true;

		document.addEventListener('keydown', (event) => {
			KeyboardEngine.state[event.keyCode] = true;
		});
		document.addEventListener('keyup', (event) => {
			KeyboardEngine.state[event.keyCode] = false;
		});

		KeyboardEngine.processor();
	}

	public static register(keyCode: number, callback: (keyAction: KeyAction) => void): void {
		if (KeyboardEngine.state[keyCode] === undefined) {
			KeyboardEngine.state[keyCode] = false;
		}
		KeyboardEngine.registered[keyCode] = {
			callback: callback,
			keyAction: {
				down: KeyboardEngine.state[keyCode],
			},
		};
	}

	public static unregister(keyCode: number): void {
		delete KeyboardEngine.registered[keyCode];
	}

	/**
	 * Check key usage every X ms
	 */
	private static async processor(): Promise<void> {
		const delay: (ms: number) => Promise<void> = (ms) => new Promise((resolve) => setTimeout(resolve, ms)),
			registered: { [key: number]: KeyRegistration } = KeyboardEngine.registered,
			state: { [key: number]: boolean } = KeyboardEngine.state;
		let i: string, keyAction: KeyAction, keyRegistration: KeyRegistration, keyState: boolean;

		while (true) {
			await delay(20);

			for (i in registered) {
				keyRegistration = registered[i];
				keyAction = keyRegistration.keyAction;
				keyState = state[i];

				if (keyAction.down !== keyState) {
					keyAction.down = keyState;
					setTimeout(() => keyRegistration.callback(keyAction));
				}
			}
		}
	}
}
