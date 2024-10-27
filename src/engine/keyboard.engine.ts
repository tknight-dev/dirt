/**
 * @author tknight-dev
 */

export interface KeyAction {
	down: boolean;
	key: KeyCommon;
}

export enum KeyCommon {
	CROUCH = 87, // 17-lctrl
	DOWN = 83, // 83-s
	INTERACT = 69, // 69-e
	JUMP = 32, // 32-space
	LEFT = 65, // 65-a
	MEELE = 81, // 81-q
	RIGHT = 68, // 68-d
	RUN = 16, // 16-shift
	UP = 87, // 87-w
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

		document.addEventListener('keydown', (event: KeyboardEvent) => {
			KeyboardEngine.state[event.keyCode] = true;
		});
		document.addEventListener('keyup', (event: KeyboardEvent) => {
			KeyboardEngine.state[event.keyCode] = false;
		});

		KeyboardEngine.processor();
	}

	public static register(keyCommon: KeyCommon, callback: (keyAction: KeyAction) => void): void {
		if (!KeyboardEngine.initialized) {
			console.error('KeyboardEngine > register: not initialized');
			return;
		}
		if (KeyboardEngine.state[keyCommon] === undefined) {
			KeyboardEngine.state[keyCommon] = false;
		}
		KeyboardEngine.registered[keyCommon] = {
			callback: callback,
			keyAction: {
				down: KeyboardEngine.state[keyCommon],
				key: keyCommon,
			},
		};
	}

	public static unregister(keyCode: number): void {
		if (!KeyboardEngine.initialized) {
			console.error('KeyboardEngine > unregister: not initialized');
			return;
		}
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
					keyRegistration.callback(keyAction);
				}
			}
		}
	}
}
