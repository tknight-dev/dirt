import { AssetCollection } from './engine/models/asset.model';
import { AssetEngine } from './engine/asset.engine';
import { AudioAsset } from './engine/assets/audio.asset';
import { AudioEngine } from './engine/audio.engine';
import { FullscreenEngine } from './engine/fullscreen.engine';
import { ImageAsset } from './engine/assets/image.asset';
import { KeyAction, KeyCommon, KeyboardEngine } from './engine/keyboard.engine';
import { MouseAction, MouseEngine } from './engine/mouse.engine';
import { VideoCmdGamePauseReason, VideoCmdSettingsFPS } from './engine/models/video-worker-cmds.model';
import { VideoEngine } from './engine/video.engine';
import { VisibilityEngine } from './engine/visibility.engine';
var globalPackageJSONVersion = require('../../package.json').version;

/**
 * Draw an image then cache it to an Image object. Hardware acceleration comes into play when you draw that Image onto the canvas;
 *
 * Offscreen canvas?
 *
 * @author tknight-dev
 */

// App
class Dirt {
	private static dragable: boolean;
	private static dragging: boolean;
	private static draggingLoading: boolean;
	private static elementBody: HTMLCanvasElement = <HTMLCanvasElement>document.getElementById('body');
	private static elementCanvas: HTMLCanvasElement = <HTMLCanvasElement>document.getElementById('canvas');
	private static elementCanvasBackground: HTMLCanvasElement = <HTMLCanvasElement>document.getElementById('canvas-background');
	private static elementCanvasForeground: HTMLCanvasElement = <HTMLCanvasElement>document.getElementById('canvas-foreground');
	private static elementCanvasOverlay: HTMLCanvasElement = <HTMLCanvasElement>document.getElementById('canvas-overlay');
	private static elementClickAudio: HTMLElement = <HTMLElement>document.getElementById('click-audio');
	private static elementClickAudioVolume: HTMLInputElement = <HTMLInputElement>document.getElementById('click-audio-volume');
	private static elementClickAudioVolumeTimeout: ReturnType<typeof setTimeout>;
	private static elementClickFullscreen: HTMLElement = <HTMLElement>document.getElementById('click-fullscreen');
	private static elementCompanyOverlay: HTMLElement = <HTMLElement>document.getElementById('company-overlay');
	private static elementDownload: HTMLElement = <HTMLElement>document.getElementById('download');
	private static elementFeed: HTMLElement = <HTMLElement>document.getElementById('feed');
	private static elementFileCollector: HTMLElement = <HTMLElement>document.getElementById('file-collector');
	private static elementFullscreen: HTMLElement = <HTMLElement>document.getElementById('fullscreen');
	private static elementLogoDirt: HTMLElement = <HTMLElement>document.getElementById('logo-dirt');
	private static elementStatus: HTMLElement = <HTMLElement>document.getElementById('status');
	private static elementViewer: HTMLElement = <HTMLElement>document.getElementById('viewer');
	private static elementViewerControls: HTMLElement = <HTMLElement>document.getElementById('viewer-controls');
	private static fullscreenState: boolean;
	private static initialized: boolean;
	private static ready: boolean;
	private static readyOverlayDone: boolean;

	public static async initialize(): Promise<void> {
		let ready: Promise<void>,
			timestamp: number = Date.now();

		if (Dirt.initialized) {
			return;
		}
		Dirt.initialized = true;

		console.log('Dirt: Initializing...');

		// Start basic systems and load assets into ram
		await AssetEngine.initialize(AssetCollection.UI);
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
					Dirt.elementViewer.style.backgroundColor = 'transparent';
					Dirt.elementCompanyOverlay.className = 'feeder start clickable';
					Dirt.elementFeed.className = 'feed start complete';
					AudioEngine.trigger(AudioAsset.BONK1, 0.1234567, 0.5);
					resolve();
				}, 500);
			}, 1000);
		});

		// Secondary initializations
		await FullscreenEngine.initialize();
		await KeyboardEngine.initialize();
		await MouseEngine.initialize(Dirt.elementCanvas);
		await VisibilityEngine.initialize();

		// Hook while the feed starts
		await Dirt.hooks();
		console.log('Dirt: Loaded in', Date.now() - timestamp, 'ms');

		// Last (feed & game ready)
		await ready;
		Dirt.ready = true;
		await VideoEngine.go(Dirt.elementFeed, Dirt.elementCanvas, Dirt.elementCanvasBackground, Dirt.elementCanvasForeground, Dirt.elementCanvasOverlay, {
			fps: VideoCmdSettingsFPS._60,
			fpsVisible: true,
		});
		Dirt.dragable = true;

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
					Dirt.companyOverlayFadeOutAndGameHooksStart();
				}
			}
		};
		let companyOverlayKeyboardHook: (event: any) => void = (event: any) => {
			if (Dirt.ready) {
				document.removeEventListener('keydown', companyOverlayKeyboardHook);
				if (!Dirt.readyOverlayDone) {
					Dirt.readyOverlayDone = true;
					Dirt.companyOverlayFadeOutAndGameHooksStart();
				}
			}
		};
		document.addEventListener('keydown', companyOverlayKeyboardHook);

		// Hook: Fullscreen
		FullscreenEngine.setCallback((state: boolean) => {
			if (!state) {
				if (VideoEngine.isGoComplete()) {
					VideoEngine.workerGamePause({ reason: VideoCmdGamePauseReason.FULLSCREEN });
				}

				Dirt.elementClickFullscreen.className = 'icon fullscreen';
				Dirt.elementFullscreen.className = 'wrapper fullscreen';
				Dirt.elementViewer.className = 'viewer';
				Dirt.elementViewerControls.className = 'viewer-controls';
			}
		});
		Dirt.elementClickFullscreen.onclick = (event: any) => {
			if (VideoEngine.isGoComplete()) {
				VideoEngine.workerGamePause({ reason: VideoCmdGamePauseReason.FULLSCREEN });
			}

			if (FullscreenEngine.isOpen()) {
				FullscreenEngine.close();
				Dirt.elementClickFullscreen.className = 'icon fullscreen';
				Dirt.elementFullscreen.className = 'wrapper';
				Dirt.elementViewer.className = 'viewer';
				Dirt.elementViewerControls.className = 'viewer-controls';
			} else {
				FullscreenEngine.open(Dirt.elementFullscreen);
				Dirt.elementClickFullscreen.className = 'icon fullscreen-exit';
				Dirt.elementFullscreen.className = 'wrapper fullscreen';
				Dirt.elementViewer.className = 'viewer fullscreen';
				Dirt.elementViewerControls.className = 'viewer-controls fullscreen';
			}
		};

		// Hook: Map - Drag and Drop
		Dirt.elementFileCollector.ondrop = (event: any) => {
			let reader: FileReader = new FileReader();
			event.preventDefault();

			// One at a time
			if (Dirt.draggingLoading) {
				return;
			}
			Dirt.draggingLoading = true;

			// Load file
			reader.onload = (event: any) => {
				VideoEngine.workerLoadMap(event.target.result);

				// Reset UI
				Dirt.dragging = false;
				Dirt.draggingLoading = false;
				Dirt.elementFileCollector.style.display = 'none';
			};
			reader.readAsText(event.dataTransfer.files[0]);
		};
		Dirt.elementBody.ondragleave = (event: any) => {
			if (Dirt.dragging) {
				Dirt.dragging = false;
				Dirt.elementFileCollector.style.display = 'none';
			}
		};
		Dirt.elementBody.ondragover = (event: any) => {
			if (Dirt.dragable && !Dirt.dragging) {
				Dirt.dragging = true;
				Dirt.elementFileCollector.style.display = 'flex';
			}
		};

		// Hook: Map - Load/Save
		VideoEngine.setCallbackMapLoadStatus((status: boolean) => {
			Dirt.statusFlash(status);
		});
		VideoEngine.setCallbackMapSave((data: string, name: string) => {
			Dirt.elementDownload.setAttribute('href', 'data:application/octet-stream;base64,' + btoa(data));
			Dirt.elementDownload.setAttribute('download', name + '.map');
			Dirt.elementDownload.click();

			// Clean up
			Dirt.elementDownload.setAttribute('href', '');
			Dirt.elementDownload.setAttribute('download', '');
		});

		// Hook: Visibility
		VisibilityEngine.setCallback((visible: boolean) => {
			if (!visible) {
				VideoEngine.workerGamePause({ reason: VideoCmdGamePauseReason.VISIBILITY });
			}
		});
	}

	private static async hooksGame(): Promise<void> {
		// Keyboard
		Object.keys(KeyCommon).forEach((key: string) => {
			let keyValue: number = Number(key);
			if (!isNaN(keyValue)) {
				KeyboardEngine.register(keyValue, (keyAction: KeyAction) => {
					VideoEngine.workerKey(keyAction);
				});
			}
		});

		//Mouse
		MouseEngine.setCallback((action: MouseAction) => {
			VideoEngine.workerMouse(action);
		});
	}

	private static async companyOverlayFadeOutAndGameHooksStart(): Promise<void> {
		// Start game
		await Dirt.hooksGame();
		VideoEngine.workerGameStart({});

		Dirt.elementCompanyOverlay.style.opacity = '0';
		setTimeout(() => {
			Dirt.elementCompanyOverlay.style.display = 'none';
		}, 500);
	}

	private static statusFlash(status: boolean): void {
		Dirt.elementStatus.className = status ? 'good' : 'bad';
		Dirt.elementStatus.innerText = status ? 'Success' : 'Failed';
		Dirt.elementStatus.style.opacity = '1';
		Dirt.elementStatus.style.display = 'flex';

		setTimeout(() => {
			Dirt.elementStatus.style.opacity = '0';
			setTimeout(() => {
				Dirt.elementStatus.style.display = 'none';
			}, 1000);
		}, 1000);
	}
}

// Bootstrap
Dirt.initialize();
