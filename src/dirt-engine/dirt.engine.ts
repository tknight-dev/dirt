// Imports
import { AssetCollection, AssetDeclarations, AssetManifest, AssetManifestMaster } from './models/asset.model';
import { AssetCache, AssetEngine } from './engines/asset.engine';
import { AudioEngine } from './engines/audio.engine';
import { AudioModulation } from './models/audio-modulation.model';
import { FullscreenEngine } from './engines/fullscreen.engine';
import { KeyAction, KeyCommon, KeyboardEngine } from './engines/keyboard.engine';
import { MouseAction, MouseEngine } from './engines/mouse.engine';
import { ResizeEngine } from './engines/resize.engine';
import { VideoCmdGameModeEditZLayer, VideoCmdGamePauseReason, VideoCmdSettingsFPS } from './models/video-worker-cmds.model';
import { VideoEngine } from './engines/video.engine';
import { VisibilityEngine } from './engines/visibility.engine';

// Exports
export {
	AssetAudio,
	AssetAudioType,
	AssetCollection,
	AssetDeclarations,
	AssetImage,
	AssetImageSrc,
	AssetImageSrcResolution,
	AssetImageType,
	AssetMap,
	AssetManifest,
	AssetMeta,
} from './models/asset.model';
export { VideoCmdSettingsFPS } from './models/video-worker-cmds.model';

/**
 * Background and Foreground have x-axis paralax, with a user defined speed :)
 *
 * @author tknight-dev
 */

export class DirtEngine {
	private static assetManifestMaster: AssetManifestMaster;
	private static dom: HTMLElement;
	private static domElements: { [key: string]: HTMLElement } = {};
	private static domElementsCanvas: { [key: string]: HTMLCanvasElement } = {};
	private static domElementsInput: { [key: string]: HTMLInputElement } = {};
	private static domElementsInputVolumeTimeout: ReturnType<typeof setTimeout>;
	private static domElementsUIEdit: { [key: string]: HTMLElement } = {};
	private static dragable: boolean;
	private static dragging: boolean;
	private static draggingLoading: boolean;
	private static initialized: boolean;
	private static ready: boolean;
	private static readyOverlayComplete: boolean;
	private static gameModeEditStart: boolean = true;
	private static uiEditZ: VideoCmdGameModeEditZLayer;
	private static version: string = '0.1.0';

	public static async initialize(assetDeclarations: AssetDeclarations, dom: HTMLElement, fps: VideoCmdSettingsFPS, oldTVIntro: boolean): Promise<void> {
		if (!(await AssetEngine.verify(assetDeclarations))) {
			return;
		} else if (DirtEngine.initialized) {
			return;
		}
		DirtEngine.initialized = true;
		DirtEngine.assetManifestMaster = AssetEngine.compileMasterManifest(assetDeclarations.manifest || <any>{});
		DirtEngine.dom = dom;

		console.log('DirtEngine: Initializing...');
		let ready: Promise<void>,
			timestamp: number = performance.now();

		// Initialize DOM
		await DirtEngine.initializeDOM(oldTVIntro);

		// Spinner for slow asset loading (bad internet connection)
		setTimeout(() => {
			DirtEngine.domElements['spinner'].classList.add('start'); // fade in
		}, 1000);

		// Start basic systems and load assets into ram
		await AssetEngine.initialize(assetDeclarations, AssetCollection.UI);
		await AssetEngine.load();
		await AudioEngine.initialize(AssetCollection.UI);
		await AudioEngine.load(Object.values(Object.values(DirtEngine.assetManifestMaster.audio)));

		// Start feed
		ready = DirtEngine.feedTitleOverlay();

		// Extended initializations
		await FullscreenEngine.initialize();
		await KeyboardEngine.initialize();
		await MouseEngine.initialize(DirtEngine.domElements['feed-fitted']);
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
			DirtEngine.domElements['feed-overflow-streams'],
			DirtEngine.domElementsCanvas['feed-overflow-streams-background-data'],
			DirtEngine.domElementsCanvas['feed-overflow-streams-foreground-data'],
			DirtEngine.domElementsCanvas['feed-overflow-streams-overlay-data'],
			DirtEngine.domElementsCanvas['feed-overflow-streams-primary-data'],
			DirtEngine.domElementsCanvas['feed-overflow-streams-underlay-data'],
			DirtEngine.gameModeEditStart,
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

	private static async gameModeEdit(modeEdit: boolean): Promise<void> {
		let domUIEdit: { [key: string]: HTMLElement } = DirtEngine.domElementsUIEdit,
			domUIEditElement: HTMLElement;

		if (modeEdit) {
			for (let i in domUIEdit) {
				domUIEditElement = domUIEdit[i];
				if (domUIEditElement.className.includes('dirt-engine-ui-edit')) {
					domUIEditElement.style.opacity = '0';
					domUIEditElement.style.display = 'flex';
					domUIEditElement.style.opacity = '1';
				}

				DirtEngine.domElementsUIEdit['z-primary'].click();
			}
		} else {
			for (let i in domUIEdit) {
				domUIEditElement = domUIEdit[i];
				if (domUIEditElement.className.includes('dirt-engine-ui-edit')) {
					domUIEditElement.style.display = 'none';
				}
			}
		}
	}

	private static async feedTitleOverlay(): Promise<void> {
		let asset: AssetCache | undefined;

		return new Promise((resolve: any) => {
			DirtEngine.domElements['spinner'].classList.remove('start');
			setTimeout(() => {
				AudioEngine.trigger('TITLE_SCREEN_EFFECT', AudioModulation.NONE, 0, 0.5);

				setTimeout(() => {
					// Expand the feed out
					DirtEngine.domElements['spinner'].style.display = 'none';
					asset = AssetEngine.getAsset(DirtEngine.assetManifestMaster.images['TKNIGHT_DEV'].srcs[0].src);
					if (asset) {
						DirtEngine.domElements['feed-fitted-title-content-logo-company'].style.background = 'url("' + asset.data + '")';
					} else {
						console.error('DirtEngine > feedTitleOverlay: missing company logo');
					}

					asset = AssetEngine.getAsset(DirtEngine.assetManifestMaster.images['DIRT_ENGINE'].srcs[0].src);
					if (asset) {
						DirtEngine.domElements['feed-fitted-title-content-logo-engine'].style.background = 'url("' + asset.data + '")';
					} else {
						console.error('DirtEngine > feedTitleOverlay: missing engine logo');
					}

					DirtEngine.domElements['feed'].classList.add('start');
					setTimeout(() => {
						DirtEngine.domElements['feed'].classList.add('clickable');
						AudioEngine.play('TITLE_SCREEN_MUSIC', 0, 0.15);
						resolve();
					}, 500);
				}, 500);
			}, 500);
		});
	}

	private static async feedTitleOverlayRemove(): Promise<void> {
		// Start game
		await DirtEngine.initializeHooksGame();
		VideoEngine.workerGameStart({});
		DirtEngine.gameModeEdit(DirtEngine.gameModeEditStart);

		// Audio
		AudioEngine.fade('TITLE_SCREEN_MUSIC', 1000, 0);
		setTimeout(() => {
			AudioEngine.pause('TITLE_SCREEN_MUSIC');
		}, 1000);

		// VisuaL
		DirtEngine.domElements['feed'].classList.remove('clickable');
		DirtEngine.domElements['feed-fitted-title'].style.opacity = '0';
		setTimeout(() => {
			DirtEngine.domElements['feed-fitted-title'].style.display = 'none';
		}, 500);
	}

	private static async initializeDOM(oldTVIntro: boolean): Promise<void> {
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
			domFeedFitted: HTMLElement,
			domFeedFittedOutline: HTMLElement,
			domFeedFittedTitle: HTMLElement,
			domFeedFittedTitleContent: HTMLElement,
			domFeedFittedTitleContentLogoCompany: HTMLElement,
			domFeedFittedTitleContentLogoEngine: HTMLElement,
			domFeedFittedTitleContentText: HTMLElement,
			domFeedOverflow: HTMLElement,
			domFeedOverflowStreams: HTMLElement,
			domFeedOverflowStreamsStream: HTMLElement,
			domFeedOverflowStreamsStreamData: HTMLCanvasElement,
			domFile: HTMLElement,
			domFileCollector: HTMLElement,
			domMapInteraction: HTMLElement,
			domPrimary: HTMLElement,
			domStatus: HTMLElement,
			domViewerA: HTMLElement,
			domViewerB: HTMLElement,
			domViewerBSpinner: HTMLElement,
			domViewerBSpinnerContent: HTMLElement;

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

		if (!oldTVIntro) {
			domViewerB.classList.add('no-background');
		}

		domViewerA.appendChild(domViewerB);
		DirtEngine.domElements['viewer-b'] = domViewerB;

		/*
		 * ViewerB: Channel
		 */
		domChannel = document.createElement('div');
		domChannel.className = 'channel';
		domChannel.innerText = '3';

		if (!oldTVIntro) {
			domChannel.style.display = 'none';
		}

		domViewerB.appendChild(domChannel);
		DirtEngine.domElements['channel'] = domViewerB;

		/*
		 * ViewerB: Spinner
		 */
		domViewerBSpinner = document.createElement('div');
		domViewerBSpinner.className = 'spinner';
		domViewerB.appendChild(domViewerBSpinner);
		DirtEngine.domElements['spinner'] = domViewerBSpinner;

		domViewerBSpinnerContent = document.createElement('div');
		domViewerBSpinnerContent.className = 'content';
		domViewerBSpinner.appendChild(domViewerBSpinnerContent);
		DirtEngine.domElements['spinner-content'] = domViewerBSpinnerContent;

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

		/*
		 * Feed: Fitted
		 */
		domFeedFitted = document.createElement('div');
		domFeedFitted.className = 'fitted';
		domFeed.appendChild(domFeedFitted);
		DirtEngine.domElements['feed-fitted'] = domFeedFitted;

		domFeedFittedOutline = document.createElement('div');
		domFeedFittedOutline.className = 'outline';
		domFeedFitted.appendChild(domFeedFittedOutline);
		DirtEngine.domElements['feed-fitted-outline'] = domFeedFittedOutline;

		/*
		 * Feed: Fitted - Title
		 */
		domFeedFittedTitle = document.createElement('div');
		domFeedFittedTitle.className = 'title';
		DirtEngine.domElements['feed-fitted-title'] = domFeedFittedTitle;
		domFeedFitted.appendChild(domFeedFittedTitle);

		domFeedFittedTitleContent = document.createElement('div');
		domFeedFittedTitleContent.className = 'content';
		DirtEngine.domElements['feed-fitted-title-content'] = domFeedFittedTitleContent;
		domFeedFittedTitle.appendChild(domFeedFittedTitleContent);

		domFeedFittedTitleContentLogoCompany = document.createElement('div');
		domFeedFittedTitleContentLogoCompany.className = 'logo company';
		DirtEngine.domElements['feed-fitted-title-content-logo-company'] = domFeedFittedTitleContentLogoCompany;
		domFeedFittedTitleContent.appendChild(domFeedFittedTitleContentLogoCompany);

		domFeedFittedTitleContentLogoEngine = document.createElement('div');
		domFeedFittedTitleContentLogoEngine.className = 'logo engine';
		DirtEngine.domElements['feed-fitted-title-content-logo-engine'] = domFeedFittedTitleContentLogoEngine;
		domFeedFittedTitleContent.appendChild(domFeedFittedTitleContentLogoEngine);

		domFeedFittedTitleContentText = document.createElement('div');
		domFeedFittedTitleContentText.className = 'text';
		domFeedFittedTitleContentText.innerText = 'Click Here or Press Any Key to Continue';
		DirtEngine.domElements['feed-fitted-title-content-text'] = domFeedFittedTitleContentText;
		domFeedFittedTitleContent.appendChild(domFeedFittedTitleContentText);

		/*
		 * Feed: Fitted - UI
		 */
		await DirtEngine.initializeDOMUIEdit(domFeedFitted);

		/*
		 * Feed: Overflow
		 */
		domFeedOverflow = document.createElement('div');
		domFeedOverflow.className = 'overflow';
		domFeed.appendChild(domFeedOverflow);
		DirtEngine.domElements['feed-overflow'] = domFeedOverflow;

		domFeedOverflowStreams = document.createElement('div');
		domFeedOverflowStreams.className = 'streams';
		domFeedOverflow.appendChild(domFeedOverflowStreams);
		DirtEngine.domElements['feed-overflow-streams'] = domFeedOverflowStreams;

		let streamName: string = '';
		for (let i = 0; i < 5; i++) {
			// Stream
			domFeedOverflowStreamsStream = document.createElement('div');

			switch (i) {
				case 0:
					streamName = 'underlay';
					break;
				case 1:
					streamName = 'background';
					break;
				case 2:
					streamName = 'primary';
					break;
				case 3:
					streamName = 'foreground';
					break;
				case 4:
					streamName = 'overlay';
					break;
			}

			domFeedOverflowStreamsStream.className = 'stream ' + streamName;
			domFeedOverflowStreams.appendChild(domFeedOverflowStreamsStream);
			DirtEngine.domElements['feed-overflow-streams-' + streamName] = domFeedOverflowStreamsStream;

			// Stream data
			domFeedOverflowStreamsStreamData = document.createElement('canvas');
			domFeedOverflowStreamsStream.appendChild(domFeedOverflowStreamsStreamData);
			DirtEngine.domElementsCanvas['feed-overflow-streams-' + streamName + '-data'] = domFeedOverflowStreamsStreamData;
		}

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
		domMapInteraction = document.createElement('div');
		domMapInteraction.className = 'map-interaction';
		domViewerB.appendChild(domMapInteraction);
		DirtEngine.domElements['map-interaction'] = domMapInteraction;

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

	private static async initializeDOMUIEdit(domFeedFitted: HTMLElement): Promise<void> {
		let mode: HTMLElement, modeButton: HTMLElement, z: HTMLElement, zBackground: HTMLElement, zForeground: HTMLElement, zPrimary: HTMLElement;

		/*
		 * Mode
		 */
		mode = document.createElement('div');
		mode.className = 'dirt-engine-ui-edit mode';
		DirtEngine.domElements['feed-fitted-ui-mode'] = mode;
		DirtEngine.domElementsUIEdit['mode'] = mode;
		domFeedFitted.appendChild(mode);

		modeButton = document.createElement('div');
		modeButton.className = 'button-window';
		DirtEngine.domElements['feed-fitted-ui-mode-button'] = modeButton;
		DirtEngine.domElementsUIEdit['mode-button'] = modeButton;
		mode.appendChild(modeButton);

		/*
		 * Z
		 */
		z = document.createElement('div');
		z.className = 'dirt-engine-ui-edit z';
		DirtEngine.domElements['feed-fitted-ui-z'] = z;
		DirtEngine.domElementsUIEdit['z'] = z;
		domFeedFitted.appendChild(z);

		zBackground = document.createElement('div');
		zBackground.className = 'button background';
		zBackground.innerText = 'B';
		zBackground.onclick = () => {
			DirtEngine.uiEditZ = VideoCmdGameModeEditZLayer.BACKGROUND;
			zBackground.classList.add('active');
			zForeground.classList.remove('active');
			zPrimary.classList.remove('active');
		};
		DirtEngine.domElements['feed-fitted-ui-z-background'] = zBackground;
		DirtEngine.domElementsUIEdit['z-background'] = zBackground;
		z.appendChild(zBackground);

		zPrimary = document.createElement('div');
		zPrimary.className = 'button primary active';
		zPrimary.innerText = 'P';
		zPrimary.onclick = () => {
			DirtEngine.uiEditZ = VideoCmdGameModeEditZLayer.PRIMARY;
			zBackground.classList.remove('active');
			zForeground.classList.remove('active');
			zPrimary.classList.add('active');
		};
		DirtEngine.domElements['feed-fitted-ui-z-foreground'] = zPrimary;
		DirtEngine.domElementsUIEdit['z-primary'] = zPrimary;
		z.appendChild(zPrimary);

		zForeground = document.createElement('div');
		zForeground.className = 'button foreground';
		zForeground.innerText = 'F';
		zForeground.onclick = () => {
			DirtEngine.uiEditZ = VideoCmdGameModeEditZLayer.FOREGROUND;
			zBackground.classList.remove('active');
			zForeground.classList.add('active');
			zPrimary.classList.remove('active');
		};
		DirtEngine.domElements['feed-fitted-ui-z-foreground'] = zForeground;
		DirtEngine.domElementsUIEdit['z-foreground'] = zForeground;
		z.appendChild(zForeground);
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
				DirtEngine.domElements['feed'].classList.add('start');
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
			if (!state) {
				if (VideoEngine.isGoComplete()) {
					VideoEngine.workerGamePause({ reason: VideoCmdGamePauseReason.FULLSCREEN });
				}

				DirtEngine.domElements['dirt-engine'].classList.remove('fullscreen');
				DirtEngine.domElements['fullscreen'].className = 'dirt-engine-icon fullscreen';
			}
		});
		DirtEngine.domElements['fullscreen'].onclick = (event: any) => {
			if (VideoEngine.isGoComplete()) {
				VideoEngine.workerGamePause({ reason: VideoCmdGamePauseReason.FULLSCREEN });
			}

			if (FullscreenEngine.isOpen()) {
				FullscreenEngine.close();
				DirtEngine.domElements['dirt-engine'].classList.remove('fullscreen');
				DirtEngine.domElements['fullscreen'].className = 'dirt-engine-icon fullscreen';
			} else {
				FullscreenEngine.open(DirtEngine.domElements['dirt-engine']);
				DirtEngine.domElements['dirt-engine'].classList.add('fullscreen');
				DirtEngine.domElements['fullscreen'].className = 'dirt-engine-icon fullscreen-exit';
			}
			event.preventDefault();
			event.stopPropagation();
			return false;
		};

		// Hook: Map - Drag and Drop
		DirtEngine.domElements['file'].ondrop = (event: any) => {
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
			let download: HTMLElement = DirtEngine.domElements['download'];
			download.setAttribute('href', 'data:application/octet-stream;base64,' + btoa(data));
			download.setAttribute('download', name + '.map');
			download.click();

			// Clean up
			download.setAttribute('href', '');
			download.setAttribute('download', '');
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
