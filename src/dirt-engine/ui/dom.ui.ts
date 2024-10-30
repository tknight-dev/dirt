import { AssetManifestMaster, AssetMap } from '../models/asset.model';
import { DoubleLinkedList } from '../models/double-linked-list.model';
import { Map } from '../models/map.model';
import {
	VideoCmdGameModeEditZLayer,
	VideoCmdGamePauseReason,
	VideoCmdSettingsFPS,
} from '../models/video-worker-cmds.model';
import { VideoEngine } from '../engines/video.engine';

/**
 * @author tknight-dev
 */

// TODO, MISSING Z LAYER ENUM

enum EditApplicationType {
	PENCIL,
	BRUSH,
	FILL,
	ERASER,
}

interface EditApplicationHistory {
	id: string | undefined;
	palette: EditPalette | undefined;
}

enum EditPalette {
	AUDIO,
	BLOCK,
	LIGHT,
}

export class DomUI {
	protected static assetManifestMaster: AssetManifestMaster;
	protected static dom: HTMLElement;
	protected static domElements: { [key: string]: HTMLElement } = {};
	protected static domElementsCanvas: { [key: string]: HTMLCanvasElement } = {};
	protected static domElementsInput: { [key: string]: HTMLInputElement } = {};
	protected static domElementsInputVolumeTimeout: ReturnType<typeof setTimeout>;
	protected static domElementsUIEdit: { [key: string]: HTMLElement } = {};
	protected static domUIinitialized: boolean;
	protected static uiEditApplicationHistory: DoubleLinkedList<EditApplicationHistory> =
		new DoubleLinkedList<EditApplicationHistory>();
	protected static uiEditApplicationType: EditApplicationType = EditApplicationType.PENCIL;
	protected static uiEditBrushSize: number;
	protected static uiEditChanged: boolean;
	protected static uiEditMap: Map;
	protected static uiEditMode: boolean;
	protected static uiEditPalette: EditPalette = EditPalette.BLOCK;
	protected static uiEditZ: VideoCmdGameModeEditZLayer;

	protected static async initializeDomUI(oldTVIntro: boolean): Promise<void> {
		if (DomUI.domUIinitialized) {
			console.error('DomUI > initializeDomUI: already initialized');
			return;
		}
		DomUI.domUIinitialized = true;
		let maps: AssetMap[] = Object.values(DomUI.assetManifestMaster.maps).sort(
			(a: AssetMap, b: AssetMap) => a.order - b.order,
		);

		VideoEngine.setCallbackMapAsset((map: Map | undefined) => {
			if (map) {
				DomUI.uiEditChanged = false;
				DomUI.uiEditMap = map;
			} else {
				DomUI.statusFlash(false);
			}

			DomUI.domElementsUIEdit['map'].classList.remove('active');
			DomUI.domElementsUIEdit['application-map-modal'].style.display = 'none';
		});

		await DomUI.initDom(maps, oldTVIntro);
	}

	/**
	 * Sequence:
	 * 	A: GoEditMode > VideoStartsNewMap
	 * 	B: SelectMap or New > (if req) get asset by id >
	 */
	protected static async setGameModeEdit(modeEdit: boolean): Promise<void> {
		let domUIEdit: { [key: string]: HTMLElement } = DomUI.domElementsUIEdit,
			domUIEditElement: HTMLElement;

		DomUI.uiEditMode = modeEdit;
		if (modeEdit) {
			for (let i in domUIEdit) {
				domUIEditElement = domUIEdit[i];
				if (
					domUIEditElement.className.includes('dirt-engine-ui-edit') &&
					!domUIEditElement.className.includes('modal')
				) {
					domUIEditElement.style.opacity = '0';
					domUIEditElement.style.display = 'flex';
					domUIEditElement.style.opacity = '1';
				}

				DomUI.domElementsUIEdit['z-primary'].click();
				DomUI.domElementsUIEdit['application-type-menu-pencil'].click();
				DomUI.domElementsUIEdit['map'].click();
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

	private static mapSelect(assetMapId: string | undefined): void {
		VideoEngine.workerMapLoadById(assetMapId);
	}

	protected static statusFlash(status: boolean): void {
		DomUI.domElements['status'].className = 'status ' + (status ? 'good' : 'bad');
		DomUI.domElements['status'].innerText = status ? 'Success' : 'Failed';
		DomUI.domElements['status'].style.opacity = '1';
		DomUI.domElements['status'].style.display = 'flex';

		setTimeout(() => {
			DomUI.domElements['status'].style.opacity = '0';
			setTimeout(() => {
				DomUI.domElements['status'].style.display = 'none';
			}, 1000);
		}, 1000);
	}

	/**
	 * DOM Code Below
	 */

	private static async initDom(maps: AssetMap[], oldTVIntro: boolean): Promise<void> {
		let domChannel: HTMLElement,
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
		DomUI.domElements['viewer-a'] = domViewerA;

		domViewerB = document.createElement('div');
		domViewerB.className = 'viewer-b';

		domViewerA.appendChild(domViewerB);
		DomUI.domElements['viewer-b'] = domViewerB;

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
		DomUI.domElements['channel'] = domViewerB;

		/*
		 * ViewerB: Spinner
		 */
		domViewerBSpinner = document.createElement('div');
		domViewerBSpinner.className = 'spinner';
		domViewerB.appendChild(domViewerBSpinner);
		DomUI.domElements['spinner'] = domViewerBSpinner;

		domViewerBSpinnerContent = document.createElement('div');
		domViewerBSpinnerContent.className = 'content';
		domViewerBSpinner.appendChild(domViewerBSpinnerContent);
		DomUI.domElements['spinner-content'] = domViewerBSpinnerContent;

		/*
		 * Controls
		 */
		domControls = document.createElement('div');
		domControls.className = 'controls';
		domViewerB.appendChild(domControls);
		DomUI.domElements['controls'] = domControls;

		/*
		 * Controls: Left
		 */
		domControlsLeft = document.createElement('div');
		domControlsLeft.className = 'left';
		domControls.appendChild(domControlsLeft);
		DomUI.domElements['left'] = domControlsLeft;

		domControlsLeftAudio = document.createElement('div');
		domControlsLeftAudio.className = 'dirt-engine-icon audio-on';
		domControlsLeft.appendChild(domControlsLeftAudio);
		DomUI.domElements['audio'] = domControlsLeftAudio;

		domControlsLeftAudioVolume = document.createElement('input');
		domControlsLeftAudioVolume.className = 'volume';
		domControlsLeftAudioVolume.setAttribute('autocomplete', 'off');
		domControlsLeftAudioVolume.setAttribute('max', '1');
		domControlsLeftAudioVolume.setAttribute('min', '0');
		domControlsLeftAudioVolume.setAttribute('step', '.1');
		domControlsLeftAudioVolume.setAttribute('type', 'range');
		domControlsLeftAudioVolume.setAttribute('value', '1');
		domControlsLeft.appendChild(domControlsLeftAudioVolume);
		DomUI.domElementsInput['volume'] = domControlsLeftAudioVolume;

		/*
		 * Controls: Right
		 */
		domControlsRight = document.createElement('div');
		domControlsRight.className = 'right';
		domControls.appendChild(domControlsRight);
		DomUI.domElements['right'] = domControlsRight;

		domControlsRightFullscreen = document.createElement('div');
		domControlsRightFullscreen.className = 'dirt-engine-icon fullscreen';
		domControlsRight.appendChild(domControlsRightFullscreen);
		DomUI.domElements['fullscreen'] = domControlsRightFullscreen;

		/*
		 * Download
		 */
		domDownload = document.createElement('a');
		domDownload.className = 'download';
		DomUI.dom.appendChild(domDownload);
		DomUI.domElements['download'] = domDownload;

		/*
		 * Feed
		 */
		domFeed = document.createElement('div');
		domFeed.className = 'feed';
		domViewerB.appendChild(domFeed);
		DomUI.domElements['feed'] = domFeed;

		/*
		 * Feed: Fitted
		 */
		domFeedFitted = document.createElement('div');
		domFeedFitted.className = 'fitted';
		domFeedFitted.id = 'fitted';
		domFeed.appendChild(domFeedFitted);
		DomUI.domElements['feed-fitted'] = domFeedFitted;

		domFeedFittedOutline = document.createElement('div');
		domFeedFittedOutline.className = 'outline';
		domFeedFitted.appendChild(domFeedFittedOutline);
		DomUI.domElements['feed-fitted-outline'] = domFeedFittedOutline;

		/*
		 * Feed: Fitted - Title
		 */
		domFeedFittedTitle = document.createElement('div');
		domFeedFittedTitle.className = 'title';
		DomUI.domElements['feed-fitted-title'] = domFeedFittedTitle;
		domFeedFitted.appendChild(domFeedFittedTitle);

		domFeedFittedTitleContent = document.createElement('div');
		domFeedFittedTitleContent.className = 'content';
		DomUI.domElements['feed-fitted-title-content'] = domFeedFittedTitleContent;
		domFeedFittedTitle.appendChild(domFeedFittedTitleContent);

		domFeedFittedTitleContentLogoCompany = document.createElement('div');
		domFeedFittedTitleContentLogoCompany.className = 'logo company';
		DomUI.domElements['feed-fitted-title-content-logo-company'] = domFeedFittedTitleContentLogoCompany;
		domFeedFittedTitleContent.appendChild(domFeedFittedTitleContentLogoCompany);

		domFeedFittedTitleContentLogoEngine = document.createElement('div');
		domFeedFittedTitleContentLogoEngine.className = 'logo engine';
		DomUI.domElements['feed-fitted-title-content-logo-engine'] = domFeedFittedTitleContentLogoEngine;
		domFeedFittedTitleContent.appendChild(domFeedFittedTitleContentLogoEngine);

		domFeedFittedTitleContentText = document.createElement('div');
		domFeedFittedTitleContentText.className = 'text';
		domFeedFittedTitleContentText.innerText = 'Click Here or Press Any Key to Continue';
		DomUI.domElements['feed-fitted-title-content-text'] = domFeedFittedTitleContentText;
		domFeedFittedTitleContent.appendChild(domFeedFittedTitleContentText);

		/*
		 * Feed: Fitted - UI
		 */
		await DomUI.initDomEdit(domFeedFitted, maps);

		/*
		 * Feed: Overflow
		 */
		domFeedOverflow = document.createElement('div');
		domFeedOverflow.className = 'overflow';
		domFeed.appendChild(domFeedOverflow);
		DomUI.domElements['feed-overflow'] = domFeedOverflow;

		domFeedOverflowStreams = document.createElement('div');
		domFeedOverflowStreams.className = 'streams';
		domFeedOverflow.appendChild(domFeedOverflowStreams);
		DomUI.domElements['feed-overflow-streams'] = domFeedOverflowStreams;

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
			DomUI.domElements['feed-overflow-streams-' + streamName] = domFeedOverflowStreamsStream;

			// Stream data
			domFeedOverflowStreamsStreamData = document.createElement('canvas');
			domFeedOverflowStreamsStreamData.className = 'data';
			domFeedOverflowStreamsStream.appendChild(domFeedOverflowStreamsStreamData);
			DomUI.domElementsCanvas['feed-overflow-streams-' + streamName + '-data'] = domFeedOverflowStreamsStreamData;
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
		DomUI.domElements['file'] = domFile;

		domFileCollector = document.createElement('div');
		domFileCollector.className = 'collector';
		domFileCollector.innerText = 'File Collector';
		domFile.appendChild(domFileCollector);
		DomUI.domElements['file-collector'] = domFileCollector;

		/*
		 * Map Interation
		 */
		domMapInteraction = document.createElement('div');
		domMapInteraction.className = 'map-interaction';
		domViewerB.appendChild(domMapInteraction);
		DomUI.domElements['map-interaction'] = domMapInteraction;

		/*
		 * Status
		 */
		domStatus = document.createElement('div');
		domStatus.className = 'status';
		domViewerB.appendChild(domStatus);
		DomUI.domElements['status'] = domStatus;

		// Last
		DomUI.dom.appendChild(domPrimary);
		DomUI.domElements['dirt-engine'] = domPrimary;
	}

	private static async initDomEdit(domFeedFitted: HTMLElement, maps: AssetMap[]): Promise<void> {
		let application: HTMLElement,
			applicationHistory: HTMLElement,
			applicationType: HTMLElement,
			applicationTypeMenu: HTMLElement,
			applicationTypeMenuBrush: HTMLElement,
			applicationTypeMenuEraser: HTMLElement,
			applicationTypeMenuFill: HTMLElement,
			applicationTypeMenuPencil: HTMLElement,
			applicationTypePixelSize: HTMLElement,
			applicationTypePixelSizeInputRange: HTMLInputElement,
			applicationTypePixelSizeInputText: HTMLInputElement,
			applicationWrap: HTMLElement,
			assetMap: AssetMap,
			blockMenu: HTMLElement,
			feedFitted: HTMLElement = DomUI.domElements['feed-fitted'],
			grid: HTMLElement,
			gridButton: HTMLElement,
			gridModal: HTMLElement,
			gridModalContent: HTMLElement,
			gridModalContentBody: HTMLElement,
			gridModalContentHeader: HTMLElement,
			map: HTMLElement,
			mapButton: HTMLElement,
			mapModal: HTMLElement,
			mapModalContent: HTMLElement,
			mapModalContentBody: HTMLElement,
			mapModalContentBodySelection: HTMLElement,
			mapModalContentHeader: HTMLElement,
			mode: HTMLElement,
			modeButton: HTMLElement,
			modeMenu: HTMLElement,
			modeMenuAudio: HTMLElement,
			modeMenuBlock: HTMLElement,
			modeMenuLight: HTMLElement,
			save: HTMLElement,
			saveButton: HTMLElement,
			settings: HTMLElement,
			settingsButton: HTMLElement,
			settingsModal: HTMLElement,
			settingsModalContent: HTMLElement,
			settingsModalContentBody: HTMLElement,
			settingsModalContentBodyName: HTMLInputElement,
			settingsModalContentBodyButtons: HTMLElement,
			settingsModalContentBodyButtonsApply: HTMLElement,
			settingsModalContentBodyButtonsCancel: HTMLElement,
			settingsModalContentHeader: HTMLElement,
			t: HTMLElement,
			td: HTMLElement,
			tr: HTMLElement,
			z: HTMLElement,
			zBackground: HTMLElement,
			zForeground: HTMLElement,
			zPrimary: HTMLElement;

		/*
		 * Application Type
		 */
		application = document.createElement('div');
		application.className = 'dirt-engine-ui-edit application';
		DomUI.domElements['feed-fitted-ui-application'] = application;
		DomUI.domElementsUIEdit['application'] = application;
		domFeedFitted.appendChild(application);

		applicationWrap = document.createElement('div');
		applicationWrap.className = 'wrap';
		DomUI.domElements['feed-fitted-ui-application-wrap'] = applicationWrap;
		DomUI.domElementsUIEdit['application-wrap'] = applicationWrap;
		application.appendChild(applicationWrap);

		applicationType = document.createElement('div');
		applicationType.className = 'button type';
		applicationType.innerText = 'P';
		applicationType.onclick = () => {
			if (applicationTypeMenu.style.display !== 'block') {
				applicationType.classList.add('active');
				applicationTypeMenu.style.opacity = '1';
				applicationTypeMenu.style.display = 'block';

				setTimeout(() => {
					let close = () => {
						applicationType.classList.remove('active');
						applicationTypeMenu.style.opacity = '0';
						document.removeEventListener('click', close);
						setTimeout(() => {
							applicationTypeMenu.style.display = 'none';
						}, 125); // sync with scss
					};
					document.addEventListener('click', close);
				});
			}
		};
		DomUI.domElements['feed-fitted-ui-application-type'] = applicationType;
		DomUI.domElementsUIEdit['application-type'] = applicationType;
		applicationWrap.appendChild(applicationType);

		/*
		 * Application Type: Menu
		 */
		applicationTypeMenu = document.createElement('div');
		applicationTypeMenu.className = 'menu';
		DomUI.domElements['feed-fitted-ui-application-type-menu'] = applicationTypeMenu;
		DomUI.domElementsUIEdit['application-type-menu'] = applicationTypeMenu;
		applicationWrap.appendChild(applicationTypeMenu);

		applicationTypeMenuPencil = document.createElement('div');
		applicationTypeMenuPencil.className = 'button-style pencil active';
		applicationTypeMenuPencil.innerText = 'Pencil';
		applicationTypeMenuPencil.onclick = () => {
			applicationType.innerText = 'P';
			applicationTypeMenuPencil.classList.add('active');
			applicationTypeMenuBrush.classList.remove('active');
			applicationTypeMenuFill.classList.remove('active');
			applicationTypeMenuEraser.classList.remove('active');

			applicationTypePixelSizeInputRange.disabled = true;
			applicationTypePixelSizeInputRange.max = '1';
			applicationTypePixelSizeInputRange.value = '1';
			applicationTypePixelSizeInputText.disabled = true;
			applicationTypePixelSizeInputText.value = '1';
			applicationTypePixelSize.style.display = 'flex';
			DomUI.uiEditBrushSize = 1;

			DomUI.uiEditApplicationType = EditApplicationType.PENCIL;
			feedFitted.classList.add('dirt-engine-cursor-pencil');
			feedFitted.classList.remove('dirt-engine-cursor-paintbrush');
			feedFitted.classList.remove('dirt-engine-cursor-fill');
			feedFitted.classList.remove('dirt-engine-cursor-eraser');
		};
		DomUI.domElements['feed-fitted-ui-application-type-menu-pencil'] = applicationTypeMenuPencil;
		DomUI.domElementsUIEdit['application-type-menu-pencil'] = applicationTypeMenuPencil;
		applicationTypeMenu.appendChild(applicationTypeMenuPencil);

		applicationTypeMenuBrush = document.createElement('div');
		applicationTypeMenuBrush.className = 'button-style brush';
		applicationTypeMenuBrush.innerText = 'Brush';
		applicationTypeMenuBrush.onclick = () => {
			applicationType.innerText = 'B';
			applicationTypeMenuPencil.classList.remove('active');
			applicationTypeMenuBrush.classList.add('active');
			applicationTypeMenuFill.classList.remove('active');
			applicationTypeMenuEraser.classList.remove('active');

			applicationTypePixelSizeInputRange.disabled = false;
			applicationTypePixelSizeInputRange.max = '100';
			applicationTypePixelSizeInputRange.value = '10';
			applicationTypePixelSizeInputText.disabled = false;
			applicationTypePixelSizeInputText.value = '10';
			applicationTypePixelSize.style.display = 'flex';
			DomUI.uiEditBrushSize = 10;

			DomUI.uiEditApplicationType = EditApplicationType.BRUSH;
			feedFitted.classList.remove('dirt-engine-cursor-pencil');
			feedFitted.classList.add('dirt-engine-cursor-paintbrush');
			feedFitted.classList.remove('dirt-engine-cursor-fill');
			feedFitted.classList.remove('dirt-engine-cursor-eraser');
		};
		DomUI.domElements['feed-fitted-ui-application-type-menu-brush'] = applicationTypeMenuBrush;
		DomUI.domElementsUIEdit['application-type-menu-brush'] = applicationTypeMenuBrush;
		applicationTypeMenu.appendChild(applicationTypeMenuBrush);

		applicationTypeMenuFill = document.createElement('div');
		applicationTypeMenuFill.className = 'button-style fill';
		applicationTypeMenuFill.innerText = 'Fill';
		applicationTypeMenuFill.onclick = () => {
			applicationType.innerText = 'F';
			applicationTypeMenuPencil.classList.remove('active');
			applicationTypeMenuBrush.classList.remove('active');
			applicationTypeMenuFill.classList.add('active');
			applicationTypeMenuEraser.classList.remove('active');
			applicationTypePixelSize.style.display = 'none';
			DomUI.uiEditApplicationType = EditApplicationType.FILL;
			DomUI.uiEditBrushSize = 0;
			feedFitted.classList.remove('dirt-engine-cursor-pencil');
			feedFitted.classList.remove('dirt-engine-cursor-paintbrush');
			feedFitted.classList.add('dirt-engine-cursor-fill');
			feedFitted.classList.remove('dirt-engine-cursor-eraser');
		};
		DomUI.domElements['feed-fitted-ui-application-type-menu-fill'] = applicationTypeMenuFill;
		DomUI.domElementsUIEdit['application-type-menu-fill'] = applicationTypeMenuFill;
		applicationTypeMenu.appendChild(applicationTypeMenuFill);

		applicationTypeMenuEraser = document.createElement('div');
		applicationTypeMenuEraser.className = 'button-style eraser';
		applicationTypeMenuEraser.innerText = 'Eraser';
		applicationTypeMenuEraser.onclick = () => {
			applicationType.innerText = 'E';
			applicationTypeMenuPencil.classList.remove('active');
			applicationTypeMenuBrush.classList.remove('active');
			applicationTypeMenuFill.classList.remove('active');
			applicationTypeMenuEraser.classList.add('active');

			applicationTypePixelSizeInputRange.disabled = false;
			applicationTypePixelSizeInputRange.max = '100';
			applicationTypePixelSizeInputRange.value = '1';
			applicationTypePixelSizeInputText.disabled = false;
			applicationTypePixelSizeInputText.value = '1';
			applicationTypePixelSize.style.display = 'flex';
			DomUI.uiEditBrushSize = 1;

			DomUI.uiEditApplicationType = EditApplicationType.ERASER;
			feedFitted.classList.remove('dirt-engine-cursor-pencil');
			feedFitted.classList.remove('dirt-engine-cursor-paintbrush');
			feedFitted.classList.remove('dirt-engine-cursor-fill');
			feedFitted.classList.add('dirt-engine-cursor-eraser');
		};
		DomUI.domElements['feed-fitted-ui-application-type-menu-erase'] = applicationTypeMenuEraser;
		DomUI.domElementsUIEdit['application-type-menu-eraser'] = applicationTypeMenuEraser;
		applicationTypeMenu.appendChild(applicationTypeMenuEraser);

		/*
		 * Application Type: History (last)
		 */
		applicationHistory = document.createElement('div');
		applicationHistory.className = 'button history';
		for (let i = 0; i < 5; i++) {
			applicationHistory = <HTMLElement>applicationHistory.cloneNode(true);
			DomUI.domElements['feed-fitted-ui-application-history-' + i] = applicationHistory;
			DomUI.domElementsUIEdit['application-history-' + i] = applicationHistory;
			applicationWrap.appendChild(applicationHistory);

			DomUI.uiEditApplicationHistory.pushStart({
				id: undefined,
				palette: undefined,
			});
		}

		/*
		 * Application Type: Pixel Size
		 */
		applicationTypePixelSize = document.createElement('div');
		applicationTypePixelSize.className = 'dirt-engine-ui-edit pixelSize';
		DomUI.domElements['feed-fitted-ui-application-pixel-size'] = applicationTypePixelSize;
		DomUI.domElementsUIEdit['application-pixel-size'] = applicationTypePixelSize;
		domFeedFitted.appendChild(applicationTypePixelSize);

		applicationTypePixelSizeInputRange = document.createElement('input');
		applicationTypePixelSizeInputRange.autocomplete = 'off';
		applicationTypePixelSizeInputRange.className = 'input range';
		applicationTypePixelSizeInputRange.disabled = true;
		applicationTypePixelSizeInputRange.max = '100';
		applicationTypePixelSizeInputRange.min = '1';
		applicationTypePixelSizeInputRange.step = '1';
		applicationTypePixelSizeInputRange.type = 'range';
		applicationTypePixelSizeInputRange.value = '1';
		applicationTypePixelSizeInputRange.oninput = (event: any) => {
			applicationTypePixelSizeInputText.value = event.target.value;
			DomUI.uiEditBrushSize = Number(event.target.value);
		};
		DomUI.domElements['feed-fitted-ui-application-pixel-size-range'] = applicationTypePixelSizeInputRange;
		DomUI.domElementsUIEdit['application-pixel-size-range'] = applicationTypePixelSizeInputRange;
		applicationTypePixelSize.appendChild(applicationTypePixelSizeInputRange);

		applicationTypePixelSizeInputText = document.createElement('input');
		applicationTypePixelSizeInputText.className = 'input text';
		applicationTypePixelSizeInputText.disabled = true;
		applicationTypePixelSizeInputText.type = 'number';
		applicationTypePixelSizeInputText.oninput = (event: any) => {
			let value: number = Math.max(1, Math.min(100, Math.round(Number(event.target.value))));
			applicationTypePixelSizeInputRange.value = String(value);
			DomUI.uiEditBrushSize = value;
		};
		applicationTypePixelSizeInputText.onblur = (event: any) => {
			applicationTypePixelSizeInputText.value = applicationTypePixelSizeInputRange.value;
			DomUI.uiEditBrushSize = Number(applicationTypePixelSizeInputRange.value);
		};
		applicationTypePixelSizeInputText.value = applicationTypePixelSizeInputRange.value;
		DomUI.domElements['feed-fitted-ui-application-pixel-size-number'] = applicationTypePixelSizeInputText;
		DomUI.domElementsUIEdit['application-pixel-size-number'] = applicationTypePixelSizeInputText;
		applicationTypePixelSize.appendChild(applicationTypePixelSizeInputText);

		/*
		 * Grid
		 */
		grid = document.createElement('div');
		grid.className = 'dirt-engine-ui-edit grid';
		grid.onclick = () => {
			grid.classList.add('active');
			gridModal.style.display = 'flex';
		};
		DomUI.domElements['feed-fitted-ui-grid'] = grid;
		DomUI.domElementsUIEdit['grid'] = grid;
		domFeedFitted.appendChild(grid);

		gridButton = document.createElement('div');
		gridButton.className = 'dirt-engine-icon table';
		DomUI.domElements['feed-fitted-ui-grid-button'] = gridButton;
		DomUI.domElementsUIEdit['grid-button'] = gridButton;
		grid.appendChild(gridButton);

		/*
		 * Map
		 */
		map = document.createElement('div');
		map.className = 'dirt-engine-ui-edit map';
		map.onclick = () => {
			map.classList.add('active');

			setTimeout(() => {
				if (DomUI.uiEditChanged) {
					if (!confirm('Discard changes?')) {
						map.classList.remove('active');
						return;
					}
				}
				mapModalContent.style.display = 'block';
				mapModal.style.display = 'flex';
			});
		};
		DomUI.domElements['feed-fitted-ui-map'] = map;
		DomUI.domElementsUIEdit['map'] = map;
		domFeedFitted.appendChild(map);

		mapButton = document.createElement('div');
		mapButton.className = 'dirt-engine-icon map';
		DomUI.domElements['feed-fitted-ui-map-button'] = mapButton;
		DomUI.domElementsUIEdit['map-button'] = mapButton;
		map.appendChild(mapButton);

		/*
		 * Mode
		 */
		mode = document.createElement('div');
		mode.className = 'dirt-engine-ui-edit mode';
		mode.onclick = (event: any) => {
			if (modeMenu.style.display !== 'block') {
				mode.classList.add('active');
				modeMenu.style.opacity = '1';
				modeMenu.style.display = 'block';

				setTimeout(() => {
					let close = () => {
						mode.classList.remove('active');
						modeMenu.style.opacity = '0';
						document.removeEventListener('click', close);
						setTimeout(() => {
							modeMenu.style.display = 'none';
						}, 125); // sync with scss
					};
					document.addEventListener('click', close);
				});
			}
		};
		DomUI.domElements['feed-fitted-ui-mode'] = mode;
		DomUI.domElementsUIEdit['mode'] = mode;
		domFeedFitted.appendChild(mode);

		modeButton = document.createElement('div');
		modeButton.className = 'dirt-engine-icon palette';
		DomUI.domElements['feed-fitted-ui-mode-button'] = modeButton;
		DomUI.domElementsUIEdit['mode-button'] = modeButton;
		mode.appendChild(modeButton);

		/*
		 * Mode: Menu
		 */
		modeMenu = document.createElement('div');
		modeMenu.className = 'menu';
		DomUI.domElements['feed-fitted-ui-mode-menu'] = modeMenu;
		DomUI.domElementsUIEdit['mode-menu'] = modeMenu;
		mode.appendChild(modeMenu);

		modeMenuAudio = document.createElement('div');
		modeMenuAudio.className = 'button-style audio';
		modeMenuAudio.innerText = 'Audio';
		modeMenuAudio.onclick = (event: any) => {
			modeMenuAudio.classList.add('active');
			modeMenuBlock.classList.remove('active');
			modeMenuLight.classList.remove('active');
			DomUI.uiEditPalette = EditPalette.AUDIO;
		};
		DomUI.domElements['feed-fitted-ui-mode-menu-audio'] = modeMenuAudio;
		DomUI.domElementsUIEdit['mode-menu-audio'] = modeMenuAudio;
		modeMenu.appendChild(modeMenuAudio);

		modeMenuBlock = document.createElement('div');
		modeMenuBlock.className = 'button-style block active';
		modeMenuBlock.innerText = 'Block';
		modeMenuBlock.onclick = () => {
			modeMenuAudio.classList.remove('active');
			modeMenuBlock.classList.add('active');
			modeMenuLight.classList.remove('active');
			DomUI.uiEditPalette = EditPalette.BLOCK;
		};
		DomUI.domElements['feed-fitted-ui-mode-menu-block'] = modeMenuBlock;
		DomUI.domElementsUIEdit['mode-menu-block'] = modeMenuBlock;
		modeMenu.appendChild(modeMenuBlock);

		modeMenuLight = document.createElement('div');
		modeMenuLight.className = 'button-style light';
		modeMenuLight.innerText = 'Light';
		modeMenuLight.onclick = () => {
			modeMenuAudio.classList.remove('active');
			modeMenuBlock.classList.remove('active');
			modeMenuLight.classList.add('active');
			DomUI.uiEditPalette = EditPalette.LIGHT;
		};
		DomUI.domElements['feed-fitted-ui-mode-menu-light'] = modeMenuLight;
		DomUI.domElementsUIEdit['mode-menu-light'] = modeMenuLight;
		modeMenu.appendChild(modeMenuLight);

		/*
		 * Save
		 */
		save = document.createElement('div');
		save.className = 'dirt-engine-ui-edit save';
		DomUI.domElements['feed-fitted-ui-save'] = save;
		DomUI.domElementsUIEdit['save'] = save;
		domFeedFitted.appendChild(save);

		saveButton = document.createElement('div');
		saveButton.className = 'dirt-engine-icon save';
		DomUI.domElements['feed-fitted-ui-save-button'] = saveButton;
		DomUI.domElementsUIEdit['save-button'] = saveButton;
		save.appendChild(saveButton);

		/*
		 * Settings
		 */
		settings = document.createElement('div');
		settings.className = 'dirt-engine-ui-edit settings';
		settings.onclick = (event: any) => {
			settings.classList.add('active');

			// Load in current values
			settingsModalContentBodyName.value = DomUI.uiEditMap.name;

			DomUI.domElementsUIEdit['application-settings-modal'].style.display = 'flex';
		};
		DomUI.domElements['feed-fitted-ui-settings'] = settings;
		DomUI.domElementsUIEdit['settings'] = settings;
		domFeedFitted.appendChild(settings);

		settingsButton = document.createElement('div');
		settingsButton.className = 'dirt-engine-icon gear';
		DomUI.domElements['feed-fitted-ui-settings-button'] = settingsButton;
		DomUI.domElementsUIEdit['settings-button'] = settingsButton;
		settings.appendChild(settingsButton);

		/*
		 * Z
		 */
		z = document.createElement('div');
		z.className = 'dirt-engine-ui-edit z';
		DomUI.domElements['feed-fitted-ui-z'] = z;
		DomUI.domElementsUIEdit['z'] = z;
		domFeedFitted.appendChild(z);

		zBackground = document.createElement('div');
		zBackground.className = 'button background';
		zBackground.innerText = 'B';
		zBackground.onclick = () => {
			DomUI.uiEditZ = VideoCmdGameModeEditZLayer.BACKGROUND;
			zBackground.classList.add('active');
			zForeground.classList.remove('active');
			zPrimary.classList.remove('active');
		};
		DomUI.domElements['feed-fitted-ui-z-background'] = zBackground;
		DomUI.domElementsUIEdit['z-background'] = zBackground;
		z.appendChild(zBackground);

		zPrimary = document.createElement('div');
		zPrimary.className = 'button primary active';
		zPrimary.innerText = 'P';
		zPrimary.onclick = () => {
			DomUI.uiEditZ = VideoCmdGameModeEditZLayer.PRIMARY;
			zBackground.classList.remove('active');
			zForeground.classList.remove('active');
			zPrimary.classList.add('active');
		};
		DomUI.domElements['feed-fitted-ui-z-foreground'] = zPrimary;
		DomUI.domElementsUIEdit['z-primary'] = zPrimary;
		z.appendChild(zPrimary);

		zForeground = document.createElement('div');
		zForeground.className = 'button foreground';
		zForeground.innerText = 'F';
		zForeground.onclick = () => {
			DomUI.uiEditZ = VideoCmdGameModeEditZLayer.FOREGROUND;
			zBackground.classList.remove('active');
			zForeground.classList.add('active');
			zPrimary.classList.remove('active');
		};
		DomUI.domElements['feed-fitted-ui-z-foreground'] = zForeground;
		DomUI.domElementsUIEdit['z-foreground'] = zForeground;
		z.appendChild(zForeground);

		/*
		 * Grid: Modal
		 */
		gridModal = document.createElement('div');
		gridModal.className = 'dirt-engine-ui-edit grid-modal modal';
		DomUI.domElements['feed-fitted-ui-grid-modal'] = gridModal;
		DomUI.domElementsUIEdit['application-grid-modal'] = gridModal;
		domFeedFitted.appendChild(gridModal);

		gridModalContent = document.createElement('div');
		gridModalContent.className = 'content';
		DomUI.domElements['feed-fitted-ui-grid-modal-content'] = gridModalContent;
		DomUI.domElementsUIEdit['application-grid-modal-content'] = gridModalContent;
		gridModal.appendChild(gridModalContent);

		gridModalContentHeader = document.createElement('div');
		gridModalContentHeader.className = 'header';
		gridModalContentHeader.innerText = 'Grid Manager';
		DomUI.domElements['feed-fitted-ui-grid-modal-content-header'] = gridModalContentHeader;
		DomUI.domElementsUIEdit['application-grid-modal-content-header'] = gridModalContentHeader;
		gridModalContent.appendChild(gridModalContentHeader);

		gridModalContentBody = document.createElement('div');
		gridModalContentBody.className = 'body';
		gridModalContentBody.onclick = () => {
			grid.classList.remove('active');
			gridModal.style.display = 'none';
		};
		DomUI.domElements['feed-fitted-ui-grid-modal-content-body'] = gridModalContentBody;
		DomUI.domElementsUIEdit['application-grid-modal-content-body'] = gridModalContentBody;
		gridModalContent.appendChild(gridModalContentBody);

		/*
		 * Maps: Modal
		 */
		mapModal = document.createElement('div');
		mapModal.className = 'dirt-engine-ui-edit map-modal modal';
		DomUI.domElements['feed-fitted-ui-map-modal'] = mapModal;
		DomUI.domElementsUIEdit['application-map-modal'] = mapModal;
		domFeedFitted.appendChild(mapModal);

		mapModalContent = document.createElement('div');
		mapModalContent.className = 'content';
		DomUI.domElements['feed-fitted-ui-map-modal-content'] = mapModalContent;
		DomUI.domElementsUIEdit['application-map-modal-content'] = mapModalContent;
		mapModal.appendChild(mapModalContent);

		mapModalContentHeader = document.createElement('div');
		mapModalContentHeader.className = 'header';
		mapModalContentHeader.innerText = 'Map Selection';
		DomUI.domElements['feed-fitted-ui-map-modal-content-header'] = mapModalContentHeader;
		DomUI.domElementsUIEdit['application-map-modal-content-header'] = mapModalContentHeader;
		mapModalContent.appendChild(mapModalContentHeader);

		mapModalContentBody = document.createElement('div');
		mapModalContentBody.className = 'body';
		DomUI.domElements['feed-fitted-ui-map-modal-content-body'] = mapModalContentBody;
		DomUI.domElementsUIEdit['application-map-modal-content-body'] = mapModalContentBody;
		mapModalContent.appendChild(mapModalContentBody);

		for (let i in maps) {
			mapModalContentBodySelection = document.createElement('div');
			mapModalContentBodySelection.className = 'button';
			mapModalContentBodySelection.innerText = maps[i].id;
			mapModalContentBodySelection.onclick = (event: any) => {
				DomUI.mapSelect(event.target.innerText);
				mapModalContent.style.display = 'none';
			};
			DomUI.domElements['feed-fitted-ui-map-modal-content-body-selection-' + i] = mapModalContentBodySelection;
			DomUI.domElementsUIEdit['application-map-modal-content-body-selection-' + i] = mapModalContentBodySelection;
			mapModalContentBody.appendChild(mapModalContentBodySelection);
		}

		mapModalContentBodySelection = document.createElement('div');
		mapModalContentBodySelection.className = 'button';
		mapModalContentBodySelection.innerText = 'New Map';
		mapModalContentBodySelection.onclick = (event: any) => {
			DomUI.mapSelect(undefined);
			mapModalContent.style.display = 'none';
		};
		DomUI.domElements['feed-fitted-ui-map-modal-content-body-selection-new'] = mapModalContentBodySelection;
		DomUI.domElementsUIEdit['application-map-modal-content-body-selection-new'] = mapModalContentBodySelection;
		mapModalContentBody.appendChild(mapModalContentBodySelection);

		/*
		 * Settings: Modal
		 */
		settingsModal = document.createElement('div');
		settingsModal.className = 'dirt-engine-ui-edit settings-modal modal';
		DomUI.domElements['feed-fitted-ui-settings-modal'] = settingsModal;
		DomUI.domElementsUIEdit['application-settings-modal'] = settingsModal;
		domFeedFitted.appendChild(settingsModal);

		settingsModalContent = document.createElement('div');
		settingsModalContent.className = 'content';
		DomUI.domElements['feed-fitted-ui-settings-modal-content'] = settingsModalContent;
		DomUI.domElementsUIEdit['application-settings-modal-content'] = settingsModalContent;
		settingsModal.appendChild(settingsModalContent);

		settingsModalContentHeader = document.createElement('div');
		settingsModalContentHeader.className = 'header';
		settingsModalContentHeader.innerText = 'Settings';
		DomUI.domElements['feed-fitted-ui-settings-modal-content-header'] = settingsModalContentHeader;
		DomUI.domElementsUIEdit['application-settings-modal-content-header'] = settingsModalContentHeader;
		settingsModalContent.appendChild(settingsModalContentHeader);

		settingsModalContentBody = document.createElement('div');
		settingsModalContentBody.className = 'body buttoned';
		DomUI.domElements['feed-fitted-ui-settings-modal-content-body'] = settingsModalContentBody;
		DomUI.domElementsUIEdit['application-settings-modal-content-body'] = settingsModalContentBody;
		settingsModalContent.appendChild(settingsModalContentBody);

		t = document.createElement('table');
		settingsModalContentBody.appendChild(t);

		// Input table: map name
		tr = document.createElement('tr');
		td = document.createElement('td');
		td.innerText = 'Map Name';
		tr.appendChild(td);

		td = document.createElement('td');
		settingsModalContentBodyName = document.createElement('input');
		settingsModalContentBodyName.autocomplete = 'off';
		settingsModalContentBodyName.className = 'input';
		DomUI.domElements['feed-fitted-ui-settings-modal-content-body-name'] = settingsModalContentBodyName;
		DomUI.domElementsUIEdit['application-settings-modal-content-body-name'] = settingsModalContentBodyName;
		td.appendChild(settingsModalContentBodyName);
		tr.appendChild(td);
		t.appendChild(tr);

		// Cancel/Save
		settingsModalContentBodyButtons = document.createElement('div');
		settingsModalContentBodyButtons.className = 'buttons';
		DomUI.domElements['feed-fitted-ui-settings-modal-content-buttons'] = settingsModalContentBodyButtons;
		DomUI.domElementsUIEdit['application-settings-modal-content-buttons'] = settingsModalContentBodyButtons;
		settingsModalContent.appendChild(settingsModalContentBodyButtons);

		settingsModalContentBodyButtonsCancel = document.createElement('div');
		settingsModalContentBodyButtonsCancel.className = 'button cancel red';
		settingsModalContentBodyButtonsCancel.innerText = 'Cancel';
		settingsModalContentBodyButtonsCancel.onclick = () => {
			if (!confirm('Are you sure?')) {
				return;
			}
			settings.classList.remove('active');
			DomUI.domElementsUIEdit['application-settings-modal'].style.display = 'none';
		};
		DomUI.domElements['feed-fitted-ui-settings-modal-content-buttons-cancel'] =
			settingsModalContentBodyButtonsCancel;
		DomUI.domElementsUIEdit['application-settings-modal-content-buttons-cancel'] =
			settingsModalContentBodyButtonsCancel;
		settingsModalContentBodyButtons.appendChild(settingsModalContentBodyButtonsCancel);

		settingsModalContentBodyButtonsApply = document.createElement('div');
		settingsModalContentBodyButtonsApply.className = 'button apply';
		settingsModalContentBodyButtonsApply.innerText = 'Apply';
		settingsModalContentBodyButtonsApply.onclick = () => {
			DomUI.uiEditMap.name = settingsModalContentBodyName.value.trim();

			settings.classList.remove('active');
			DomUI.domElementsUIEdit['application-settings-modal'].style.display = 'none';
		};
		DomUI.domElements['feed-fitted-ui-settings-modal-content-buttons-apply'] = settingsModalContentBodyButtonsApply;
		DomUI.domElementsUIEdit['application-settings-modal-content-buttons-apply'] =
			settingsModalContentBodyButtonsApply;
		settingsModalContentBodyButtons.appendChild(settingsModalContentBodyButtonsApply);
	}
}
