// Imports
import { AssetCollection, AssetDeclarations } from './models/asset.model';
import { AssetEngine } from './engines/asset.engine';
import { AudioEngine } from './engines/audio.engine';
import { AudioAsset } from './assets/audio.asset';
import { AudioModulation } from './models/audio-modulation.model';
import { FullscreenEngine } from './engines/fullscreen.engine';
import { ImageAsset } from './assets/image.asset';
import { KeyAction, KeyCommon, KeyboardEngine } from './engines/keyboard.engine';
import { MouseAction, MouseEngine } from './engines/mouse.engine';
import { ResizeEngine } from './engines/resize.engine';
import { VideoCmdGamePauseReason, VideoCmdSettingsFPS } from './models/video-worker-cmds.model';
import { VideoEngine } from './engines/video.engine';
import { VisibilityEngine } from './engines/visibility.engine';

// Exports
export { AssetDeclarations } from './models/asset.model';
export { VideoCmdSettingsFPS } from './models/video-worker-cmds.model';

/**
 * @author tknight-dev
 */

export class DirtEngine {
	private static assetDeclarations: AssetDeclarations;
	private static dom: HTMLElement;
	private static domElements: { [key: string]: HTMLElement } = {};
	private static domElementsCanvas: { [key: string]: HTMLCanvasElement } = {};
	private static domElementsInput: { [key: string]: HTMLInputElement } = {};
	private static domElementsInputVolumeTimeout: ReturnType<typeof setTimeout>;
	private static dragable: boolean;
	private static dragging: boolean;
	private static draggingLoading: boolean;
	private static initialized: boolean;
	private static ready: boolean;
	private static readyOverlayComplete: boolean;
	private static version: string = '0.1.0';

	public static async initialize(assetDeclarations: AssetDeclarations, dom: HTMLElement, fps: VideoCmdSettingsFPS): Promise<void> {
		if (!(await AssetEngine.verify(assetDeclarations))) {
			return;
		} else if (DirtEngine.initialized) {
			return;
		}
		DirtEngine.initialized = true;
		DirtEngine.assetDeclarations = assetDeclarations;
		DirtEngine.dom = dom;

		console.log('DirtEngine: Initializing...');
		let ready: Promise<void>,
			timestamp: number = performance.now();

		// Initialize DOM
		await DirtEngine.initializeDOM();

		// Start basic systems and load assets into ram
		await AssetEngine.initialize(assetDeclarations, AssetCollection.UI);
		await AssetEngine.load();
		await AudioEngine.initialize();
		await AudioEngine.load();

		// Start feed
		ready = DirtEngine.feedTitleOverlay();

		// Extended initializations
		await FullscreenEngine.initialize();
		await KeyboardEngine.initialize();
		await MouseEngine.initialize(DirtEngine.domElements['feed']);
		await ResizeEngine.initialize();
		await VisibilityEngine.initialize();

		// Hooks
		await DirtEngine.initializeHooks();
		console.log('DirtEngine: Initialization completed in', performance.now() - timestamp, 'ms');

		// Ready to start engine
		await ready;
		DirtEngine.ready = true;
		await VideoEngine.go(
			assetDeclarations,
			DirtEngine.domElements['feed'],
			DirtEngine.domElementsCanvas['feeder-canvas'],
			DirtEngine.domElementsCanvas['feeder-background'],
			DirtEngine.domElementsCanvas['feeder-foreground'],
			DirtEngine.domElementsCanvas['feeder-overlay'],
			true, // start in edit mode
			{
				fps: fps,
				fpsVisible: true,
				mapVisible: true,
			},
		);
		DirtEngine.dragable = true;

		// TODO: delete me as I just skip the into
		DirtEngine.domElements['feed'].click();
	}

	private static async feedTitleOverlay(): Promise<void> {
		console.log('feedTitleOverlay');
		return new Promise((resolve: any) => {
			setTimeout(() => {
				// Expand the feed out
				DirtEngine.domElements['feeder-title-overlay-content-logo-company'].style.background =
					'url("' + AssetEngine.getAsset(ImageAsset.TKNIGHT_DEV.src).data + '")';
				DirtEngine.domElements['feeder-title-overlay-content-logo-engine'].style.background =
					'url("' + AssetEngine.getAsset(ImageAsset.DIRT_ENGINE.src).data + '")';
				DirtEngine.domElements['feed'].className = 'feed start';
				setTimeout(() => {
					DirtEngine.domElements['feed'].className = 'feed start clickable';

					AudioEngine.trigger(AudioAsset.BONK1, AudioModulation.NONE, 0, 0.5);
					// setTimeout(() => {
					// 	AudioEngine.trigger(AudioAsset.BONK1, AudioModulation.REVERB_ROOM, 0, 0.5);
					// 	setTimeout(() => {
					// 		AudioEngine.trigger(AudioAsset.BONK1, AudioModulation.REVERB_HALL, 0, 0.5);

					// 		setTimeout(() => {
					// 			AudioEngine.trigger(AudioAsset.BONK1, AudioModulation.REVERB_CAVE, 0, 0.5);
					// 		}, 1000);
					// 	}, 1000);
					// }, 1000);

					resolve();
				}, 500);
			}, 1000);
		});
	}

	private static async feedTitleOverlayRemove(): Promise<void> {
		// Start game
		await DirtEngine.initializeHooksGame();
		VideoEngine.workerGameStart({});

		DirtEngine.domElements['feeder-title-overlay'].style.opacity = '0';
		setTimeout(() => {
			DirtEngine.domElements['feeder-title-overlay'].style.display = 'none';
		}, 500);
	}

	private static async initializeDOM(): Promise<void> {
		let dom: HTMLElement = DirtEngine.dom,
			domChannel: HTMLElement,
			domControls: HTMLElement,
			domControlsLeft: HTMLElement,
			domControlsLeftAudio: HTMLElement,
			domControlsLeftAudioVolume: HTMLInputElement,
			domControlsRight: HTMLElement,
			domControlsRightFullscreen: HTMLElement,
			domDownload: HTMLElement,
			domFeed: HTMLElement,
			domFeeder: HTMLCanvasElement,
			domFeederTitleOverlay: HTMLElement,
			domFeederTitleOverlayContent: HTMLElement,
			domFeederTitleOverlayContentLogoCompany: HTMLElement,
			domFeederTitleOverlayContentLogoEngine: HTMLElement,
			domFeederTitleOverlayContentText: HTMLElement,
			domFeedOutline: HTMLElement,
			domFile: HTMLElement,
			domFileCollector: HTMLElement,
			domPrimary: HTMLElement,
			domStatus: HTMLElement,
			domViewerA: HTMLElement,
			domViewerB: HTMLElement;

		/*
		 * Primary
		 */
		domPrimary = document.createElement('div');
		domPrimary.className = 'dirt-engine';

		/*
		 * Viewer
		 */
		domViewerA = document.createElement('div');
		domViewerA.className = 'viewer-a';
		domPrimary.appendChild(domViewerA);
		DirtEngine.domElements['viewer-a'] = domViewerA;

		domViewerB = document.createElement('div');
		domViewerB.className = 'viewer-b';
		domViewerA.appendChild(domViewerB);
		DirtEngine.domElements['viewer-b'] = domViewerB;

		/*
		 * Channel
		 */
		domChannel = document.createElement('div');
		domChannel.className = 'channel';
		domChannel.innerText = '3';
		domViewerB.appendChild(domChannel);
		DirtEngine.domElements['channel'] = domViewerB;

		/*
		 * Controls
		 */
		domControls = document.createElement('div');
		domControls.className = 'controls';
		domViewerB.appendChild(domControls);
		DirtEngine.domElements['controls'] = domControls;

		/*
		 * Controls: Left
		 */
		domControlsLeft = document.createElement('div');
		domControlsLeft.className = 'left';
		domControls.appendChild(domControlsLeft);
		DirtEngine.domElements['left'] = domControlsLeft;

		domControlsLeftAudio = document.createElement('div');
		domControlsLeftAudio.className = 'dirt-engine-icon audio-on';
		domControlsLeft.appendChild(domControlsLeftAudio);
		DirtEngine.domElements['audio'] = domControlsLeftAudio;

		domControlsLeftAudioVolume = document.createElement('input');
		domControlsLeftAudioVolume.className = 'volume';
		domControlsLeftAudioVolume.setAttribute('autocomplete', 'off');
		domControlsLeftAudioVolume.setAttribute('max', '1');
		domControlsLeftAudioVolume.setAttribute('min', '0');
		domControlsLeftAudioVolume.setAttribute('step', '.1');
		domControlsLeftAudioVolume.setAttribute('type', 'range');
		domControlsLeftAudioVolume.setAttribute('value', '1');
		domControlsLeft.appendChild(domControlsLeftAudioVolume);
		DirtEngine.domElementsInput['volume'] = domControlsLeftAudioVolume;

		/*
		 * Controls: Right
		 */
		domControlsRight = document.createElement('div');
		domControlsRight.className = 'right';
		domControls.appendChild(domControlsRight);
		DirtEngine.domElements['right'] = domControlsRight;

		domControlsRightFullscreen = document.createElement('div');
		domControlsRightFullscreen.className = 'dirt-engine-icon fullscreen';
		domControlsRight.appendChild(domControlsRightFullscreen);
		DirtEngine.domElements['fullscreen'] = domControlsRightFullscreen;

		/*
		 * Download
		 */
		domDownload = document.createElement('a');
		domDownload.className = 'download';
		dom.appendChild(domDownload);
		DirtEngine.domElements['download'] = domDownload;

		/*
		 * Feed
		 */
		domFeed = document.createElement('div');
		domFeed.className = 'feed';
		domViewerB.appendChild(domFeed);
		DirtEngine.domElements['feed'] = domFeed;

		domFeedOutline = document.createElement('div');
		domFeedOutline.className = 'outline';
		domFeed.appendChild(domFeedOutline);
		DirtEngine.domElements['feed-outline'] = domFeedOutline;

		let feedName: string = '';
		for (let i = 0; i < 4; i++) {
			domFeeder = document.createElement('canvas');

			switch (i) {
				case 0:
					feedName = 'canvas';
					break;
				case 1:
					feedName = 'background';
					break;
				case 2:
					feedName = 'foreground';
					break;
				case 3:
					feedName = 'overlay';
					break;
			}

			domFeeder.className = 'feeder ' + feedName;
			DirtEngine.domElementsCanvas['feeder-' + feedName] = domFeeder;
			domFeed.appendChild(domFeeder);
		}

		/*
		 * Feed: Title Overlay
		 */
		domFeederTitleOverlay = document.createElement('div');
		domFeederTitleOverlay.className = 'feeder title-overlay';
		DirtEngine.domElements['feeder-title-overlay'] = domFeederTitleOverlay;
		domFeed.appendChild(domFeederTitleOverlay);

		domFeederTitleOverlayContent = document.createElement('div');
		domFeederTitleOverlayContent.className = 'content';
		DirtEngine.domElements['feeder-title-overlay-content'] = domFeederTitleOverlayContent;
		domFeederTitleOverlay.appendChild(domFeederTitleOverlayContent);

		domFeederTitleOverlayContentLogoCompany = document.createElement('div');
		domFeederTitleOverlayContentLogoCompany.className = 'logo company';
		DirtEngine.domElements['feeder-title-overlay-content-logo-company'] = domFeederTitleOverlayContentLogoCompany;
		domFeederTitleOverlayContent.appendChild(domFeederTitleOverlayContentLogoCompany);

		domFeederTitleOverlayContentLogoEngine = document.createElement('div');
		domFeederTitleOverlayContentLogoEngine.className = 'logo engine';
		DirtEngine.domElements['feeder-title-overlay-content-logo-engine'] = domFeederTitleOverlayContentLogoEngine;
		domFeederTitleOverlayContent.appendChild(domFeederTitleOverlayContentLogoEngine);

		domFeederTitleOverlayContentText = document.createElement('div');
		domFeederTitleOverlayContentText.className = 'text';
		domFeederTitleOverlayContentText.innerText = 'Click Here or Press Any Key to Continue';
		DirtEngine.domElements['feeder-title-overlay-content-text'] = domFeederTitleOverlayContentText;
		domFeederTitleOverlayContent.appendChild(domFeederTitleOverlayContentText);

		/*
		 * File
		 */
		domFile = document.createElement('div');
		domFile.className = 'file';
		domFile.ondragover = (event: any) => {
			event.preventDefault();
		};
		domViewerB.appendChild(domFile);
		DirtEngine.domElements['file'] = domFile;

		domFileCollector = document.createElement('div');
		domFileCollector.className = 'collector';
		domFileCollector.innerText = 'File Collector';
		domFile.appendChild(domFileCollector);
		DirtEngine.domElements['file-collector'] = domFileCollector;

		/*
		 * Status
		 */
		domStatus = document.createElement('div');
		domStatus.className = 'status';
		domViewerB.appendChild(domStatus);
		DirtEngine.domElements['status'] = domStatus;

		// Last
		dom.appendChild(domPrimary);
		DirtEngine.domElements['dirt-engine'] = domPrimary;
	}

	private static async initializeHooks(): Promise<void> {
		// Hook: Audio
		let permitted: (permitted: boolean) => void = (permitted: boolean) => {
			if (permitted) {
				DirtEngine.domElements['audio'].style.visibility = 'visible';
				DirtEngine.domElementsInput['volume'].disabled = false;
			} else {
				DirtEngine.domElements['audio'].style.visibility = 'hidden';
				DirtEngine.domElementsInput['volume'].disabled = true;
			}
		};
		AudioEngine.setPermittedCallback(permitted);
		permitted(AudioEngine.isPermitted());

		DirtEngine.domElements['audio'].onclick = (event: any) => {
			if (AudioEngine.isMuted()) {
				AudioEngine.setMuted(false);
				DirtEngine.domElements['audio'].className = 'dirt-engine-icon audio-on';

				if (DirtEngine.domElementsInput['volume'].value === '0') {
					DirtEngine.domElementsInput['volume'].value = '1';
					AudioEngine.setVolume(1);
				}
			} else {
				AudioEngine.setMuted(true);
				DirtEngine.domElements['audio'].className = 'dirt-engine-icon audio-off';
			}
		};
		DirtEngine.domElementsInput['volume'].oninput = (event: any) => {
			clearTimeout(DirtEngine.domElementsInputVolumeTimeout);
			DirtEngine.domElementsInputVolumeTimeout = setTimeout(() => {
				let value: number = Number(event.target.value);

				if (value === 0) {
					AudioEngine.setMuted(true);
					DirtEngine.domElements['audio'].className = 'dirt-engine-icon audio-off';
				} else {
					AudioEngine.setMuted(false);
					AudioEngine.setVolume(Number(event.target.value));
					DirtEngine.domElements['audio'].className = 'dirt-engine-icon audio-on';
				}
			}, 40);
		};

		// Hook: Title Overlay (temporary for loading)
		DirtEngine.domElements['feed'].onclick = (event: any) => {
			if (DirtEngine.ready) {
				DirtEngine.domElements['feed'].className = 'feed start';
				DirtEngine.domElements['feed'].onclick = null;
				if (!DirtEngine.readyOverlayComplete) {
					DirtEngine.readyOverlayComplete = true;
					DirtEngine.feedTitleOverlayRemove();
				}
			}
		};
		let companyOverlayKeyboardHook: (event: any) => void = (event: any) => {
			if (DirtEngine.ready) {
				document.removeEventListener('keydown', companyOverlayKeyboardHook);
				if (!DirtEngine.readyOverlayComplete) {
					DirtEngine.readyOverlayComplete = true;
					DirtEngine.feedTitleOverlayRemove();
				}
			}
		};
		document.addEventListener('keydown', companyOverlayKeyboardHook);

		// Hook: Fullscreen
		FullscreenEngine.setCallback((state: boolean) => {
			console.log('FullscreenEngine > state', state);
			if (!state) {
				if (VideoEngine.isGoComplete()) {
					VideoEngine.workerGamePause({ reason: VideoCmdGamePauseReason.FULLSCREEN });
				}

				DirtEngine.domElements['dirt-engine'].className = 'dirt-engine';
				DirtEngine.domElements['fullscreen'].className = 'dirt-engine-icon fullscreen';
			}
		});
		DirtEngine.domElements['fullscreen'].onclick = (event: any) => {
			if (VideoEngine.isGoComplete()) {
				VideoEngine.workerGamePause({ reason: VideoCmdGamePauseReason.FULLSCREEN });
			}

			if (FullscreenEngine.isOpen()) {
				FullscreenEngine.close();
				DirtEngine.domElements['dirt-engine'].className = 'dirt-engine';
				DirtEngine.domElements['fullscreen'].className = 'dirt-engine-icon fullscreen';
			} else {
				FullscreenEngine.open(DirtEngine.domElements['dirt-engine']);
				DirtEngine.domElements['dirt-engine'].className = 'dirt-engine fullscreen';
				DirtEngine.domElements['fullscreen'].className = 'dirt-engine-icon fullscreen-exit';
			}
			event.preventDefault();
			event.stopPropagation();
			return false;
		};

		// Hook: Map - Drag and Drop
		DirtEngine.domElements['file'].ondrop = (event: any) => {
			console.log('ondrop', event);
			let reader: FileReader = new FileReader();
			event.preventDefault();

			// One at a time
			if (DirtEngine.draggingLoading) {
				return;
			}
			DirtEngine.draggingLoading = true;

			// Load file
			reader.onload = (event: any) => {
				VideoEngine.workerLoadMap(event.target.result);

				// Reset UI
				DirtEngine.dragging = false;
				DirtEngine.draggingLoading = false;
				DirtEngine.domElements['file'].style.display = 'none';
			};
			reader.readAsText(event.dataTransfer.files[0]);
		};
		DirtEngine.domElements['viewer-b'].ondragleave = (event: any) => {
			if (DirtEngine.dragging) {
				DirtEngine.dragging = false;
				DirtEngine.domElements['file'].style.display = 'none';
			}
		};
		DirtEngine.domElements['viewer-b'].ondragover = (event: any) => {
			if (DirtEngine.dragable && !DirtEngine.dragging) {
				DirtEngine.dragging = true;
				DirtEngine.domElements['file'].style.display = 'flex';
			}
		};

		// Hook: Map - Load/Save
		VideoEngine.setCallbackMapLoadStatus((status: boolean) => {
			DirtEngine.statusFlash(status);
		});
		VideoEngine.setCallbackMapSave((data: string, name: string) => {
			DirtEngine.domElements['download'].setAttribute('href', 'data:application/octet-stream;base64,' + btoa(data));
			DirtEngine.domElements['download'].setAttribute('download', name + '.map');
			DirtEngine.domElements['download'].click();

			// Clean up
			DirtEngine.domElements['download'].setAttribute('href', '');
			DirtEngine.domElements['download'].setAttribute('download', '');
		});
	}

	private static async initializeHooksGame(): Promise<void> {
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

	private static statusFlash(status: boolean): void {
		DirtEngine.domElements['status'].className = 'status ' + (status ? 'good' : 'bad');
		DirtEngine.domElements['status'].innerText = status ? 'Success' : 'Failed';
		DirtEngine.domElements['status'].style.opacity = '1';
		DirtEngine.domElements['status'].style.display = 'flex';

		setTimeout(() => {
			DirtEngine.domElements['status'].style.opacity = '0';
			setTimeout(() => {
				DirtEngine.domElements['status'].style.display = 'none';
			}, 1000);
		}, 1000);
	}

	public static getVersion(): string {
		return DirtEngine.version;
	}
}
