import {
	AssetDeclarations,
	AssetImageSrcResolution,
	AssetManifest,
	DirtEngine,
	VideoInputCmdSettings,
	VideoInputCmdSettingsFPS,
} from './dirt-engine/dirt.engine';
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
			domGame: HTMLElement = <HTMLElement>document.getElementById('game'),
			settings: VideoInputCmdSettings = {
				foregroundViewerPercentageOfViewport: 1.5,
				fps: VideoInputCmdSettingsFPS._60,
				fpsVisible: true,
				mapVisible: true,
				resolution: AssetImageSrcResolution.ULTRA,
			};

		DirtEngine.initialize(assetDeclarations, domGame, true, true, settings);
	}
}

// Bootstrap
Dirt.initialize();
