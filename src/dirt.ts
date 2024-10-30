import { AssetDeclarations, AssetManifest, DirtEngine, VideoCmdSettingsFPS } from './dirt-engine/dirt.engine';
import { audioManifest } from './assets/audio.asset';
import { imageManifest } from './assets/image.asset';
import { mapManifest } from './assets/map.asset';
var globalPackageJSONVersion = require('../../package.json').version;

/**
 * @author tknight-dev
 */

// App
class Dirt {
	public static initialize(): void {
		let assetDeclarations: AssetDeclarations = {
				customS: 'assets-s',
				customU: 'assets-u',
				customV: 'assets-v',
				dirCustom: undefined,
				dirDefault: undefined,
				manifest: {
					audio: audioManifest,
					images: imageManifest,
					maps: mapManifest,
				},
			},
			domGame: HTMLElement = <HTMLElement>document.getElementById('game');

		DirtEngine.initialize(assetDeclarations, domGame, true, VideoCmdSettingsFPS._60, true);
	}
}

// Bootstrap
Dirt.initialize();
