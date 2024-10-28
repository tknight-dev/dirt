import { AssetDeclarations, DirtEngine, VideoCmdSettingsFPS } from './dirt-engine/dirt.engine';
var globalPackageJSONVersion = require('../../package.json').version;

/**
 * @author tknight-dev
 */

// App
class Dirt {
	public static initialize(): void {
		let assetDeclarations: AssetDeclarations = {
				customU: undefined,
				customV: undefined,
				dir: undefined,
			},
			domGame: HTMLElement = <HTMLElement>document.getElementById('game');

		DirtEngine.initialize(assetDeclarations, domGame, VideoCmdSettingsFPS._60);
	}
}

// Bootstrap
Dirt.initialize();
