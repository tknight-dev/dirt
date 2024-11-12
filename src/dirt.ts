import {
	AssetDeclarations,
	AssetImageSrcQuality,
	AssetManifest,
	DirtEngine,
	VideoBusInputCmdSettings,
	VideoBusInputCmdSettingsFPS,
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
			settings: VideoBusInputCmdSettings = {
				darknessMax: 0.7,
				fps: VideoBusInputCmdSettingsFPS._60,
				fpsVisible: true,
				mapVisible: true,
				quality: AssetImageSrcQuality.HIGH,
				resolution: null,
				//resolution: 640,
				screenShakeEnable: true, // Screen rumble (earthquake, proximity to explosion)
				vanishingPercentageOfViewport: 1.5,
			};

		DirtEngine.initialize(assetDeclarations, domGame, true, true, settings);
	}
}

// Bootstrap
Dirt.initialize();
