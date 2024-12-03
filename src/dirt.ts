import {
	AssetDeclarations,
	AssetImageSrcQuality,
	DirtEngine,
	VideoBusInputCmdSettings,
	VideoBusInputCmdSettingsFPS,
	VideoBusInputCmdSettingsShadingQuality,
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
				gamma: 0,
				imageQuality: AssetImageSrcQuality.HIGH,
				mapVisible: true,
				resolution: null,
				//resolution: 640,
				screenShakeEnable: true, // Screen rumble (earthquake, proximity to explosion)
				shadingQuality: VideoBusInputCmdSettingsShadingQuality.HIGH,
				vanishingPercentageOfViewport: 1.5,
				volumeAmbient: 0.8,
				volumeEffect: 0.8,
				volumeMusic: 1,
			};

		DirtEngine.initialize(assetDeclarations, domGame, true, true, settings);
	}
}

// Bootstrap
Dirt.initialize();
