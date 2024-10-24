/**
 * @author tknight-dev
 */

export { AssetEngine } from './asset.engine';
import { AssetEngine } from './asset.engine';
export { AudioEngine } from './audio.engine';
import { AudioEngine } from './audio.engine';
export { FullscreenEngine } from './fullscreen.engine';
import { FullscreenEngine } from './fullscreen.engine';
export { KeyAction, KeyboardEngine } from './keyboard.engine';
import { KeyAction, KeyboardEngine } from './keyboard.engine';
export { UtilEngine } from './util.engine';
import { UtilEngine } from './util.engine';
export { VisibilityEngine } from './visibility.engine';
import { VisibilityEngine } from './visibility.engine';

export class GameEngine {
	private initialized: boolean;

	public async initialize(): Promise<void> {
		let t = this;

		if (t.initialized) {
			return;
		}
		t.initialized = true;

		let promises: Promise<void>[] = [AudioEngine.initialize(), FullscreenEngine.initialize(), KeyboardEngine.initialize(), VisibilityEngine.initialize()];

		await Promise.all(promises);
	}
}
