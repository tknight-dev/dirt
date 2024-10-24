/**
 * Draw an image then cache it to an Image object. Hardware acceleration comes into play when you draw that Image onto the canvas;
 *
 * Offscreen canvas?
 *
 * @author tknight-dev
 */

import { AudioAsset } from './engine/assets/audio.asset';
import { ImageAsset } from './engine/assets/image.asset';
import { AssetEngine } from './engine/asset.engine';
import { AudioEngine } from './engine/audio.engine';
import { FullscreenEngine } from './engine/fullscreen.engine';
import { VideoEngine } from './engine/video.engine';
var globalPackageJSONVersion = require('../../package.json').version;

// App
class Dirt {
	private static elementCanvas: HTMLCanvasElement = <HTMLCanvasElement>document.getElementById('canvas');
	private static elementCanvasBackground: HTMLCanvasElement = <HTMLCanvasElement>document.getElementById('canvas-background');
	private static elementCanvasForeground: HTMLCanvasElement = <HTMLCanvasElement>document.getElementById('canvas-foreground');
	private static elementCanvasOverlay: HTMLCanvasElement = <HTMLCanvasElement>document.getElementById('canvas-overlay');
	private static elementClickAudio: HTMLElement = <HTMLElement>document.getElementById('click-audio');
	private static elementClickAudioVolume: HTMLInputElement = <HTMLInputElement>document.getElementById('click-audio-volume');
	private static elementClickAudioVolumeTimeout: ReturnType<typeof setTimeout>;
	private static elementClickFullscreen: HTMLElement = <HTMLElement>document.getElementById('click-fullscreen');
	private static elementCompanyOverlay: HTMLElement = <HTMLElement>document.getElementById('company-overlay');
	private static elementFeed: HTMLElement = <HTMLElement>document.getElementById('feed');
	private static elementFullscreen: HTMLElement = <HTMLElement>document.getElementById('fullscreen');
	private static elementLogoDirt: HTMLElement = <HTMLElement>document.getElementById('logo-dirt');
	private static elementViewer: HTMLElement = <HTMLElement>document.getElementById('viewer');
	private static elementViewerControls: HTMLElement = <HTMLElement>document.getElementById('viewer-controls');
	private static fullscreenState: boolean;
	private static initialized: boolean;
	private static ready: boolean;
	private static readyOverlayDone: boolean;

	public static async initialize(): Promise<void> {
		let ready: Promise<void>,
			timestamp: number = new Date().getTime();

		if (Dirt.initialized) {
			return;
		}
		Dirt.initialized = true;

		console.log('Dirt: Initializing...');

		// Start basic systems and load assets into ram
		await AssetEngine.initialize();
		await AssetEngine.load();
		await AudioEngine.initialize();
		await AudioEngine.load();

		// Start feed
		ready = new Promise((resolve: any) => {
			setTimeout(() => {
				// Expand the feed out
				Dirt.elementLogoDirt.style.background = 'url("' + AssetEngine.getAsset(ImageAsset.DIRT.src) + '")';
				Dirt.elementCompanyOverlay.className = 'feeder start';
				Dirt.elementFeed.className = 'feed start';
				setTimeout(() => {
					// Feed expanded
					Dirt.elementCompanyOverlay.className = 'feeder start clickable';
					Dirt.elementFeed.className = 'feed start complete';
					AudioEngine.trigger(AudioAsset.BONK1, 0, 50);
					resolve();
				}, 500);
			}, 1000);
		});

		// Secondary initializations
		await FullscreenEngine.initialize();

		// Hook while the feed starts
		await Dirt.hooks();
		console.log('Dirt: Loaded in', new Date().getTime() - timestamp, 'ms');

		// Last (feed & game ready)
		await ready;
		Dirt.ready = true;
		VideoEngine.go(Dirt.elementFeed, Dirt.elementCanvas, Dirt.elementCanvasBackground, Dirt.elementCanvasForeground, Dirt.elementCanvasOverlay);

		// TODO: delete me as I just skip the into
		Dirt.elementCompanyOverlay.click();
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

		// Hook: CompanyOverlay (temporary for loading)
		Dirt.elementCompanyOverlay.onclick = (event: any) => {
			if (Dirt.ready) {
				Dirt.elementCompanyOverlay.onclick = null;
				if (!Dirt.readyOverlayDone) {
					Dirt.readyOverlayDone = true;
					Dirt.companyOverlayFadeOut();
				}
			}
		};
		let companyOverlayKeyboardHook: (event: any) => void = (event: any) => {
			if (Dirt.ready) {
				document.removeEventListener('keydown', companyOverlayKeyboardHook);
				if (!Dirt.readyOverlayDone) {
					Dirt.readyOverlayDone = true;
					Dirt.companyOverlayFadeOut();
				}
			}
		};
		document.addEventListener('keydown', companyOverlayKeyboardHook);

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

	private static companyOverlayFadeOut(): void {
		Dirt.elementCompanyOverlay.style.opacity = '0';
		setTimeout(() => {
			Dirt.elementCompanyOverlay.style.display = 'none';
		}, 500);
	}
}

// Bootstrap
Dirt.initialize();
