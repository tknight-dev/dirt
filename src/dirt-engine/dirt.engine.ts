// Imports
import { AssetCollection, AssetDeclarations } from './models/asset.model';
import { AssetCache, AssetEngine } from './engines/asset.engine';
import { AudioEngine } from './engines/audio.engine';
import { AudioModulation } from './models/audio-modulation.model';
import { Grid } from './models/grid.model';
import { DomUI } from './ui/dom.ui';
import { FullscreenEngine } from './engines/fullscreen.engine';
import { KeyAction, KeyCommon, KeyboardEngine } from './engines/keyboard.engine';
import { Map } from './models/map.model';
import { MapEditEngine } from './engines/map-edit.engine';
import { MapEngine } from './engines/map.engine';
import { MouseAction, MouseCmd, MouseEngine } from './engines/mouse.engine';
import { Orientation, OrientationEngine } from './engines/orientation.engine';
import { ResizeEngine } from './engines/resize.engine';
import { TouchAction, TouchCmd, TouchEngine } from './engines/touch.engine';
import { UtilEngine } from './engines/util.engine';
import { VideoBusInputCmdGamePauseReason, VideoBusInputCmdSettings } from './engines/buses/video.model.bus';
import { VideoEngineBus } from './engines/buses/video.engine.bus';
import { VisibilityEngine } from './engines/visibility.engine';

// Exports
export {
	AssetAudio,
	AssetAudioType,
	AssetCollection,
	AssetDeclarations,
	AssetImage,
	AssetImageSrc,
	AssetImageSrcQuality,
	AssetImageType,
	AssetMap,
	AssetManifest,
	AssetMeta,
} from './models/asset.model';
export { VideoBusInputCmdSettings, VideoBusInputCmdSettingsFPS } from './engines/buses/video.model.bus';

/**
 * @author tknight-dev
 */

export class DirtEngine extends DomUI {
	private static dragable: boolean;
	private static dragging: boolean;
	private static draggingLoading: boolean;
	private static gameModeEditStart: boolean = true;
	private static gameStarted: boolean;
	private static initialized: boolean;
	private static ready: boolean;
	private static readyOverlayComplete: boolean;
	private static version: string = '0.1.0';

	public static async initialize(
		assetDeclarations: AssetDeclarations,
		dom: HTMLElement,
		gameModeEditStart: boolean,
		oldTVIntro: boolean,
		settings: VideoBusInputCmdSettings,
	): Promise<void> {
		if (!(await AssetEngine.verify(assetDeclarations))) {
			return;
		} else if (DirtEngine.initialized) {
			return;
		}
		DirtEngine.initialized = true;
		DomUI.assetManifestMaster = AssetEngine.compileMasterManifest(assetDeclarations.manifest || <any>{});
		DomUI.dom = dom;
		DomUI.domUIFPSTarget = settings.fps;
		DomUI.domUIFPSVisible = settings.fpsVisible;
		DomUI.uiEditResolution = settings.resolution;
		DomUI.domUIRumbleEnable = settings.screenShakeEnable;
		DirtEngine.gameModeEditStart = gameModeEditStart;

		console.log('DirtEngine: Initializing...');
		let ready: Promise<void>,
			timestamp: number = performance.now();

		// Initialize DOM
		await DirtEngine.initializeDomUI(oldTVIntro);

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
		await MapEngine.initialize();
		await MapEditEngine.initialize(true);
		await MouseEngine.initialize(DirtEngine.domElements['feed-fitted']);
		await OrientationEngine.initialize();
		await ResizeEngine.initialize();
		await TouchEngine.initialize(DirtEngine.domElements['feed-fitted']);
		await VisibilityEngine.initialize();

		// Hooks
		await DirtEngine.initializeHooks();
		console.log('DirtEngine: UI Initialization completed in', performance.now() - timestamp, 'ms');

		// Ready to start engine
		await ready;

		// Start the engine
		let promise: Promise<void> = new Promise((resolve: any) => {
			VideoEngineBus.setCallbackStatusInitialized((durationInMs: number) => {
				console.log('DirtEngine: Video Initialization completed in', durationInMs, 'ms');
				resolve();
			});
		});
		await VideoEngineBus.initialize(
			assetDeclarations,
			DirtEngine.domElements['feed-overflow-streams'],
			DirtEngine.domElementsCanvas['feed-overflow-streams-background-data'],
			DirtEngine.domElementsCanvas['feed-overflow-streams-foreground-data'],
			DirtEngine.domElementsCanvas['feed-overflow-streams-overlay-data'],
			DirtEngine.domElementsCanvas['feed-overflow-streams-primary-data'],
			DirtEngine.domElementsCanvas['feed-overflow-streams-underlay-data'],
			DirtEngine.domElementsCanvas['feed-overflow-streams-vanishing-data'],
			DirtEngine.domElements['map-interaction'],
			settings,
		);
		await promise;
		DirtEngine.dragable = true;
		DirtEngine.ready = true;

		// TODO: delete me as I just skip the into
		DirtEngine.domElements['feed'].click();
	}

	private static async feedTitleOverlay(): Promise<void> {
		let asset: AssetCache | undefined;

		return new Promise((resolve: any) => {
			DirtEngine.domElements['spinner'].classList.remove('start');
			setTimeout(() => {
				AudioEngine.trigger('title_screen_effect', AudioModulation.NONE, 0, 0.5);

				setTimeout(() => {
					// Expand the feed out
					DirtEngine.domElements['spinner'].style.display = 'none';
					asset = AssetEngine.getAsset(DirtEngine.assetManifestMaster.images['tknight_dev'].srcs[0].src);
					if (asset) {
						DirtEngine.domElements['feed-fitted-title-content-logo-company'].style.background = 'url("' + asset.data + '")';
					} else {
						console.error('DirtEngine > feedTitleOverlay: missing company logo');
					}

					asset = AssetEngine.getAsset(DirtEngine.assetManifestMaster.images['dirt_engine'].srcs[0].src);
					if (asset) {
						DirtEngine.domElements['feed-fitted-title-content-logo-engine'].style.background = 'url("' + asset.data + '")';
					} else {
						console.error('DirtEngine > feedTitleOverlay: missing engine logo');
					}

					DirtEngine.domElements['feed'].classList.add('start');
					setTimeout(() => {
						DirtEngine.domElements['feed'].classList.add('clickable');
						AudioEngine.play('title_screen_music', 0, 0.15);
						resolve();
					}, 500);
				}, 500);
			}, 500);
		});
	}

	private static async feedTitleOverlayRemove(): Promise<void> {
		// Start game
		await DirtEngine.initializeHooksGame();
		VideoEngineBus.outputGameStart({
			modeEdit: DirtEngine.gameModeEditStart,
		});
		DirtEngine.setGameModeEdit(DirtEngine.gameModeEditStart);

		// Audio
		AudioEngine.fade('title_screen_music', 1000, 0);
		setTimeout(() => {
			AudioEngine.pause('title_screen_music');
		}, 1000);

		// Visual
		DirtEngine.domElements['feed'].classList.remove('clickable');
		DirtEngine.domElements['feed-fitted-title'].style.opacity = '0';
		setTimeout(() => {
			DirtEngine.domElements['feed-fitted-title'].style.display = 'none';
		}, 500);

		// Visibility
		VisibilityEngine.setCallback((visible: boolean) => {
			if (!visible) {
				DomUI.domElements['feed-fitted-pause-content'].onclick = () => {
					DomUI.domElements['feed-fitted-pause'].style.display = 'none';
					VideoEngineBus.outputGameUnpause({});
				};
				DomUI.domElements['feed-fitted-pause'].style.display = 'flex';
				VideoEngineBus.outputGamePause({
					reason: VideoBusInputCmdGamePauseReason.VISIBILITY,
				});
			} else {
				setTimeout(() => {
					VideoEngineBus.resized(false, true);
				});
			}
		});

		// Done
		setTimeout(() => {
			DirtEngine.gameStarted = true;
		});
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

		// Hook: Edit Camera Update
		VideoEngineBus.setCallbackEditCameraUpdate(DomUI.editCameraUpdate);

		// Hook: Fullscreen
		FullscreenEngine.setCallback((state: boolean) => {
			if (!state) {
				if (VideoEngineBus.isGoComplete()) {
					DomUI.domElements['feed-fitted-pause-content'].onclick = () => {
						DomUI.domElements['feed-fitted-pause'].style.display = 'none';
						VideoEngineBus.outputGameUnpause({});
					};
					DomUI.domElements['feed-fitted-pause'].style.display = 'flex';
					VideoEngineBus.outputGamePause({
						reason: VideoBusInputCmdGamePauseReason.FULLSCREEN,
					});
				}

				DirtEngine.domElements['dirt-engine'].classList.remove('fullscreen');
				DirtEngine.domElements['fullscreen'].className = 'dirt-engine-icon fullscreen';
				OrientationEngine.unlock();
			}
		});
		DirtEngine.domElements['fullscreen'].onclick = async (event: any) => {
			if (VideoEngineBus.isGoComplete()) {
				DomUI.domElements['feed-fitted-pause-content'].onclick = () => {
					DomUI.domElements['feed-fitted-pause'].style.display = 'none';
					VideoEngineBus.outputGameUnpause({});
				};
				DomUI.domElements['feed-fitted-pause'].style.display = 'flex';
				VideoEngineBus.outputGamePause({
					reason: VideoBusInputCmdGamePauseReason.FULLSCREEN,
				});
			}

			if (FullscreenEngine.isOpen()) {
				await FullscreenEngine.close();
				DirtEngine.domElements['dirt-engine'].classList.remove('fullscreen');
				DirtEngine.domElements['fullscreen'].className = 'dirt-engine-icon fullscreen';
				OrientationEngine.unlock();
			} else {
				await FullscreenEngine.open(DirtEngine.domElements['dirt-engine']);
				DirtEngine.domElements['dirt-engine'].classList.add('fullscreen');
				DirtEngine.domElements['fullscreen'].className = 'dirt-engine-icon fullscreen-exit';
				setTimeout(() => {
					OrientationEngine.lock(Orientation.LANDSCAPE);
				});
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
			reader.onload = async (event: any) => {
				// Load map file into video thread
				VideoEngineBus.outputMapLoad(event.target.result);

				// Load map file into ui thread
				let map: Map = UtilEngine.mapDecode(await AssetEngine.unzip(event.target.result));
				for (let i in map.grids) {
					map.grids[i] = new Grid(JSON.parse(<any>map.grids[i]));
				}
				await MapEditEngine.load(MapEngine.loadFromFile(map));

				// Reset UI
				DirtEngine.dragging = false;
				DirtEngine.draggingLoading = false;
				DirtEngine.domElements['file'].style.display = 'none';
			};
			reader.readAsArrayBuffer(event.dataTransfer.files[0]);
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

		// Hook: Map - Save/load
		VideoEngineBus.setCallbackMapLoadStatus((status: boolean) => {
			DirtEngine.statusFlash(status);
		});
		VideoEngineBus.setCallbackMapSave(async (data: string, name: string) => {
			let download: HTMLElement = DirtEngine.domElements['download'];
			download.setAttribute('href', 'data:application/octet-stream;base64,' + btoa(await AssetEngine.zip(data, name)));
			download.setAttribute('download', name + '.map');
			download.click();

			// Clean up
			download.setAttribute('href', '');
			download.setAttribute('download', '');
		});

		// Hook: Save Button (edit: save map, !edit: save game)
		DomUI.domElementsUIEdit['save'].onclick = () => {
			DirtEngine.domElementsUIEdit['save'].classList.add('active');
			VideoEngineBus.outputGameSave({});
			setTimeout(() => {
				DirtEngine.domElementsUIEdit['save'].classList.remove('active');
			}, 1000);
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
	}

	private static async initializeHooksGame(): Promise<void> {
		// Keyboard
		Object.keys(KeyCommon).forEach((key: string) => {
			let keyValue: number = Number(key);
			if (!isNaN(keyValue)) {
				KeyboardEngine.register(keyValue, (keyAction: KeyAction) => {
					if (DirtEngine.gameStarted) {
						VideoEngineBus.outputKey(keyAction);
					}
				});
			}
		});

		//Mouse
		DirtEngine.domElements['feed'].onmouseout = () => {
			if (DirtEngine.gameStarted && DirtEngine.uiEditMode && MapEditEngine.uiLoaded) {
				DomUI.editMouseUp();
			}
		};
		MouseEngine.setCallback((action: MouseAction) => {
			if (DirtEngine.gameStarted) {
				VideoEngineBus.outputMouse(action);

				if (DirtEngine.uiEditMode && MapEditEngine.uiLoaded && action.elementId === DomUI.domElements['feed-fitted'].id) {
					if (action.cmd === MouseCmd.LEFT) {
						if (action.down) {
							DomUI.editMouseDown(action);
						} else {
							DomUI.editMouseUp();
						}
					} else if (action.cmd === MouseCmd.MOVE) {
						DomUI.editMouseMove(action);
					}
				}
			}
		});

		// Touch
		TouchEngine.setCallback((action: TouchAction) => {
			if (DirtEngine.gameStarted) {
				VideoEngineBus.outputTouch(action);

				//DomUI.domElements['feed-fitted'].innerText = String(action.positions[0].distance) + ', ' + String(action.positions[0].distanceRel);

				if (DirtEngine.uiEditMode && MapEditEngine.uiLoaded && action.elementId === DomUI.domElements['feed-fitted'].id) {
					if (action.cmd === TouchCmd.LEFT) {
						if (action.down) {
							DomUI.editMouseDown(action);
						} else {
							DomUI.editMouseUp();
						}
					} else if (action.cmd === TouchCmd.LEFT_MOVE) {
						DomUI.editMouseMove(action);
					}
				}
			}
		});
	}

	public static getVersion(): string {
		return DirtEngine.version;
	}
}
