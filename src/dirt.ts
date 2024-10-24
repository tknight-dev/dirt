/**
 * Draw an image then cache it to an Image object. Hardware acceleration comes into play when you draw that Image onto the canvas;
 *
 * Offscreen canvas?
 *
 * @author tknight-dev
 */

import { AudioAsset } from './engine/assets/audio.asset';
import { AssetEngine, AudioEngine, GameEngine, FullscreenEngine, VisibilityEngine } from './engine/game.engine';
var globalPackageJSONVersion = require('../../package.json').version;

// App
class Dirt {
	private static elementClickAudio: HTMLElement = <HTMLElement>document.getElementById('click-audio');
	private static elementClickAudioVolume: HTMLInputElement = <HTMLInputElement>document.getElementById('click-audio-volume');
	private static elementClickAudioVolumeTimeout: ReturnType<typeof setTimeout>;
	private static elementClickFullscreen: HTMLElement = <HTMLElement>document.getElementById('click-fullscreen');
	private static elementFullscreen: HTMLElement = <HTMLElement>document.getElementById('fullscreen');
	private static elementViewer: HTMLElement = <HTMLElement>document.getElementById('viewer');
	private static elementViewerControls: HTMLElement = <HTMLElement>document.getElementById('viewer-controls');
	private static fullscreenState: boolean;
	private static gameEngine: GameEngine = new GameEngine();
	private static initialized: boolean;

	public static async initialize(): Promise<void> {
		let t = this;

		if (Dirt.initialized) {
			return;
		}
		Dirt.initialized = true;

		console.log('Dirt: Initializing...');

		await t.gameEngine.initialize();
		await Dirt.hooks();
		await Dirt.loaders();

		console.log('Dirt: Loaded');
	}

	private static async hooks(): Promise<void> {
		// Hook: Audio
		let permitted: (permitted: boolean) => void = (permitted: boolean) => {
			if (permitted) {
				Dirt.elementClickAudio.style.visibility = 'visible';
				Dirt.elementClickAudioVolume.disabled = false;
			} else {
				Dirt.elementClickAudio.style.visibility = 'hidden';
				Dirt.elementClickAudioVolume.disabled = true;
			}
		};
		AudioEngine.setPermittedCallback(permitted);
		permitted(AudioEngine.isPermitted());

		Dirt.elementClickAudio.onclick = (event: any) => {
			if (AudioEngine.isMuted()) {
				AudioEngine.setMuted(false);
				Dirt.elementClickAudio.className = 'icon audio-on';

				if (Dirt.elementClickAudioVolume.value === '0') {
					Dirt.elementClickAudioVolume.value = '1';
					AudioEngine.setVolume(1);
				}
			} else {
				AudioEngine.setMuted(true);
				Dirt.elementClickAudio.className = 'icon audio-off';
			}
		};
		Dirt.elementClickAudioVolume.oninput = (event: any) => {
			clearTimeout(Dirt.elementClickAudioVolumeTimeout);
			Dirt.elementClickAudioVolumeTimeout = setTimeout(() => {
				let value: number = Number(event.target.value);

				if (value === 0) {
					AudioEngine.setMuted(true);
					Dirt.elementClickAudio.className = 'icon audio-off';
				} else {
					AudioEngine.setMuted(false);
					AudioEngine.setVolume(Number(event.target.value));
					Dirt.elementClickAudio.className = 'icon audio-on';
				}
			}, 40);
		};

		// Hook: Fullscreen
		FullscreenEngine.setCallback((state: boolean) => {
			if (!state) {
				Dirt.elementClickFullscreen.className = 'icon fullscreen';
				Dirt.elementViewer.className = 'viewer';
				Dirt.elementViewerControls.className = 'viewer-controls';
			}
		});
		Dirt.elementClickFullscreen.onclick = (event: any) => {
			if (FullscreenEngine.isOpen()) {
				FullscreenEngine.close();
				Dirt.elementClickFullscreen.className = 'icon fullscreen';
				Dirt.elementViewer.className = 'viewer';
				Dirt.elementViewerControls.className = 'viewer-controls';
			} else {
				FullscreenEngine.open(Dirt.elementFullscreen);
				Dirt.elementClickFullscreen.className = 'icon fullscreen-exit';
				Dirt.elementViewer.className = 'viewer fullscreen';
				Dirt.elementViewerControls.className = 'viewer-controls fullscreen';
			}
		};
	}

	private static async loaders(): Promise<void> {
		console.log('AssetEngine.load()', await AssetEngine.load(), 'ms'); // First
		console.log('AudioEngine.load()', await AudioEngine.load(), 'ms');

		// AudioEngine.play(AudioAsset.MUS1);
		// Dirt.play();

		AudioEngine.trigger(AudioAsset.BONK1, 0, 100);
	}

	private static async play(): Promise<void> {
		AudioEngine.trigger(AudioAsset.BANG1, 0, 50);
		setTimeout(() => {
			AudioEngine.trigger(AudioAsset.BANG1, 1, 15);
		}, 1000);
		setTimeout(() => {
			AudioEngine.trigger(AudioAsset.BANG1, 1, 20);
		}, 1200);
		setTimeout(() => {
			AudioEngine.trigger(AudioAsset.BANG1, -1, 35);
		}, 1100);
		setTimeout(() => {
			AudioEngine.trigger(AudioAsset.BANG1, -0.25, 10);
		}, 500);

		// setTimeout(() => {
		// 	Dirt.play();
		// }, 2000);
	}
}

// Bootstrap
Dirt.initialize();
