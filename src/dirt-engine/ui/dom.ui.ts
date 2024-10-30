import { DoubleLinkedList } from '../models/double-linked-list.model';
import {
	VideoCmdGameModeEditZLayer,
	VideoCmdGamePauseReason,
	VideoCmdSettingsFPS,
} from '../models/video-worker-cmds.model';

/**
 * @author tknight-dev
 */

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

export class DomUIDirtEngine {
	protected static dom: HTMLElement;
	protected static domElements: { [key: string]: HTMLElement } = {};
	protected static domElementsCanvas: { [key: string]: HTMLCanvasElement } = {};
	protected static domElementsInput: { [key: string]: HTMLInputElement } = {};
	protected static domElementsInputVolumeTimeout: ReturnType<typeof setTimeout>;
	protected static domElementsUIEdit: { [key: string]: HTMLElement } = {};
	protected static uiEditApplicationHistory: DoubleLinkedList<EditApplicationHistory> =
		new DoubleLinkedList<EditApplicationHistory>();
	protected static uiEditApplicationType: EditApplicationType = EditApplicationType.PENCIL;
	protected static uiEditPalette: EditPalette = EditPalette.BLOCK;
	protected static uiEditZ: VideoCmdGameModeEditZLayer;

	protected static async gameModeEdit(modeEdit: boolean): Promise<void> {
		let domUIEdit: { [key: string]: HTMLElement } = DomUIDirtEngine.domElementsUIEdit,
			domUIEditElement: HTMLElement;

		if (modeEdit) {
			for (let i in domUIEdit) {
				domUIEditElement = domUIEdit[i];
				if (domUIEditElement.className.includes('dirt-engine-ui-edit')) {
					domUIEditElement.style.opacity = '0';
					domUIEditElement.style.display = 'flex';
					domUIEditElement.style.opacity = '1';
				}

				DomUIDirtEngine.domElementsUIEdit['z-primary'].click();
				DomUIDirtEngine.domElements['feed-fitted'].classList.add('dirt-engine-cursor-pencil');
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

	protected static async initializeDOM(oldTVIntro: boolean): Promise<void> {
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
		DomUIDirtEngine.domElements['viewer-a'] = domViewerA;

		domViewerB = document.createElement('div');
		domViewerB.className = 'viewer-b';

		domViewerA.appendChild(domViewerB);
		DomUIDirtEngine.domElements['viewer-b'] = domViewerB;

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
		DomUIDirtEngine.domElements['channel'] = domViewerB;

		/*
		 * ViewerB: Spinner
		 */
		domViewerBSpinner = document.createElement('div');
		domViewerBSpinner.className = 'spinner';
		domViewerB.appendChild(domViewerBSpinner);
		DomUIDirtEngine.domElements['spinner'] = domViewerBSpinner;

		domViewerBSpinnerContent = document.createElement('div');
		domViewerBSpinnerContent.className = 'content';
		domViewerBSpinner.appendChild(domViewerBSpinnerContent);
		DomUIDirtEngine.domElements['spinner-content'] = domViewerBSpinnerContent;

		/*
		 * Controls
		 */
		domControls = document.createElement('div');
		domControls.className = 'controls';
		domViewerB.appendChild(domControls);
		DomUIDirtEngine.domElements['controls'] = domControls;

		/*
		 * Controls: Left
		 */
		domControlsLeft = document.createElement('div');
		domControlsLeft.className = 'left';
		domControls.appendChild(domControlsLeft);
		DomUIDirtEngine.domElements['left'] = domControlsLeft;

		domControlsLeftAudio = document.createElement('div');
		domControlsLeftAudio.className = 'dirt-engine-icon audio-on';
		domControlsLeft.appendChild(domControlsLeftAudio);
		DomUIDirtEngine.domElements['audio'] = domControlsLeftAudio;

		domControlsLeftAudioVolume = document.createElement('input');
		domControlsLeftAudioVolume.className = 'volume';
		domControlsLeftAudioVolume.setAttribute('autocomplete', 'off');
		domControlsLeftAudioVolume.setAttribute('max', '1');
		domControlsLeftAudioVolume.setAttribute('min', '0');
		domControlsLeftAudioVolume.setAttribute('step', '.1');
		domControlsLeftAudioVolume.setAttribute('type', 'range');
		domControlsLeftAudioVolume.setAttribute('value', '1');
		domControlsLeft.appendChild(domControlsLeftAudioVolume);
		DomUIDirtEngine.domElementsInput['volume'] = domControlsLeftAudioVolume;

		/*
		 * Controls: Right
		 */
		domControlsRight = document.createElement('div');
		domControlsRight.className = 'right';
		domControls.appendChild(domControlsRight);
		DomUIDirtEngine.domElements['right'] = domControlsRight;

		domControlsRightFullscreen = document.createElement('div');
		domControlsRightFullscreen.className = 'dirt-engine-icon fullscreen';
		domControlsRight.appendChild(domControlsRightFullscreen);
		DomUIDirtEngine.domElements['fullscreen'] = domControlsRightFullscreen;

		/*
		 * Download
		 */
		domDownload = document.createElement('a');
		domDownload.className = 'download';
		DomUIDirtEngine.dom.appendChild(domDownload);
		DomUIDirtEngine.domElements['download'] = domDownload;

		/*
		 * Feed
		 */
		domFeed = document.createElement('div');
		domFeed.className = 'feed';
		domViewerB.appendChild(domFeed);
		DomUIDirtEngine.domElements['feed'] = domFeed;

		/*
		 * Feed: Fitted
		 */
		domFeedFitted = document.createElement('div');
		domFeedFitted.className = 'fitted';
		domFeed.appendChild(domFeedFitted);
		DomUIDirtEngine.domElements['feed-fitted'] = domFeedFitted;

		domFeedFittedOutline = document.createElement('div');
		domFeedFittedOutline.className = 'outline';
		domFeedFitted.appendChild(domFeedFittedOutline);
		DomUIDirtEngine.domElements['feed-fitted-outline'] = domFeedFittedOutline;

		/*
		 * Feed: Fitted - Title
		 */
		domFeedFittedTitle = document.createElement('div');
		domFeedFittedTitle.className = 'title';
		DomUIDirtEngine.domElements['feed-fitted-title'] = domFeedFittedTitle;
		domFeedFitted.appendChild(domFeedFittedTitle);

		domFeedFittedTitleContent = document.createElement('div');
		domFeedFittedTitleContent.className = 'content';
		DomUIDirtEngine.domElements['feed-fitted-title-content'] = domFeedFittedTitleContent;
		domFeedFittedTitle.appendChild(domFeedFittedTitleContent);

		domFeedFittedTitleContentLogoCompany = document.createElement('div');
		domFeedFittedTitleContentLogoCompany.className = 'logo company';
		DomUIDirtEngine.domElements['feed-fitted-title-content-logo-company'] = domFeedFittedTitleContentLogoCompany;
		domFeedFittedTitleContent.appendChild(domFeedFittedTitleContentLogoCompany);

		domFeedFittedTitleContentLogoEngine = document.createElement('div');
		domFeedFittedTitleContentLogoEngine.className = 'logo engine';
		DomUIDirtEngine.domElements['feed-fitted-title-content-logo-engine'] = domFeedFittedTitleContentLogoEngine;
		domFeedFittedTitleContent.appendChild(domFeedFittedTitleContentLogoEngine);

		domFeedFittedTitleContentText = document.createElement('div');
		domFeedFittedTitleContentText.className = 'text';
		domFeedFittedTitleContentText.innerText = 'Click Here or Press Any Key to Continue';
		DomUIDirtEngine.domElements['feed-fitted-title-content-text'] = domFeedFittedTitleContentText;
		domFeedFittedTitleContent.appendChild(domFeedFittedTitleContentText);

		/*
		 * Feed: Fitted - UI
		 */
		await DomUIDirtEngine.initializeDOMUIEdit(domFeedFitted);

		/*
		 * Feed: Overflow
		 */
		domFeedOverflow = document.createElement('div');
		domFeedOverflow.className = 'overflow';
		domFeed.appendChild(domFeedOverflow);
		DomUIDirtEngine.domElements['feed-overflow'] = domFeedOverflow;

		domFeedOverflowStreams = document.createElement('div');
		domFeedOverflowStreams.className = 'streams';
		domFeedOverflow.appendChild(domFeedOverflowStreams);
		DomUIDirtEngine.domElements['feed-overflow-streams'] = domFeedOverflowStreams;

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
			DomUIDirtEngine.domElements['feed-overflow-streams-' + streamName] = domFeedOverflowStreamsStream;

			// Stream data
			domFeedOverflowStreamsStreamData = document.createElement('canvas');
			domFeedOverflowStreamsStreamData.className = 'data';
			domFeedOverflowStreamsStream.appendChild(domFeedOverflowStreamsStreamData);
			DomUIDirtEngine.domElementsCanvas['feed-overflow-streams-' + streamName + '-data'] =
				domFeedOverflowStreamsStreamData;
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
		DomUIDirtEngine.domElements['file'] = domFile;

		domFileCollector = document.createElement('div');
		domFileCollector.className = 'collector';
		domFileCollector.innerText = 'File Collector';
		domFile.appendChild(domFileCollector);
		DomUIDirtEngine.domElements['file-collector'] = domFileCollector;

		/*
		 * Map Interation
		 */
		domMapInteraction = document.createElement('div');
		domMapInteraction.className = 'map-interaction';
		domViewerB.appendChild(domMapInteraction);
		DomUIDirtEngine.domElements['map-interaction'] = domMapInteraction;

		/*
		 * Status
		 */
		domStatus = document.createElement('div');
		domStatus.className = 'status';
		domViewerB.appendChild(domStatus);
		DomUIDirtEngine.domElements['status'] = domStatus;

		// Last
		DomUIDirtEngine.dom.appendChild(domPrimary);
		DomUIDirtEngine.domElements['dirt-engine'] = domPrimary;
	}

	private static async initializeDOMUIEdit(domFeedFitted: HTMLElement): Promise<void> {
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
			blockMenu: HTMLElement,
			feedFitted: HTMLElement = DomUIDirtEngine.domElements['feed-fitted'],
			mode: HTMLElement,
			modeButton: HTMLElement,
			modeMenu: HTMLElement,
			modeMenuAudio: HTMLElement,
			modeMenuBlock: HTMLElement,
			modeMenuLight: HTMLElement,
			save: HTMLElement,
			saveButton: HTMLElement,
			z: HTMLElement,
			zBackground: HTMLElement,
			zForeground: HTMLElement,
			zPrimary: HTMLElement;

		/*
		 * Application Type
		 */
		application = document.createElement('div');
		application.className = 'dirt-engine-ui-edit application';
		DomUIDirtEngine.domElements['feed-fitted-ui-application'] = application;
		DomUIDirtEngine.domElementsUIEdit['application'] = application;
		domFeedFitted.appendChild(application);

		applicationWrap = document.createElement('div');
		applicationWrap.className = 'wrap';
		DomUIDirtEngine.domElements['feed-fitted-ui-application-wrap'] = applicationWrap;
		DomUIDirtEngine.domElementsUIEdit['application-wrap'] = applicationWrap;
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
		DomUIDirtEngine.domElements['feed-fitted-ui-application-type'] = applicationType;
		DomUIDirtEngine.domElementsUIEdit['application-type'] = applicationType;
		applicationWrap.appendChild(applicationType);

		/*
		 * Application Type: Menu
		 */
		applicationTypeMenu = document.createElement('div');
		applicationTypeMenu.className = 'menu';
		DomUIDirtEngine.domElements['feed-fitted-ui-application-type-menu'] = applicationTypeMenu;
		DomUIDirtEngine.domElementsUIEdit['application-type-menu'] = applicationTypeMenu;
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

			DomUIDirtEngine.uiEditApplicationType = EditApplicationType.PENCIL;
			feedFitted.classList.add('dirt-engine-cursor-pencil');
			feedFitted.classList.remove('dirt-engine-cursor-paintbrush');
			feedFitted.classList.remove('dirt-engine-cursor-fill');
			feedFitted.classList.remove('dirt-engine-cursor-eraser');
		};
		DomUIDirtEngine.domElements['feed-fitted-ui-application-type-menu-pencil'] = applicationTypeMenuPencil;
		DomUIDirtEngine.domElementsUIEdit['application-type-menu-pencil'] = applicationTypeMenuPencil;
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

			DomUIDirtEngine.uiEditApplicationType = EditApplicationType.BRUSH;
			feedFitted.classList.remove('dirt-engine-cursor-pencil');
			feedFitted.classList.add('dirt-engine-cursor-paintbrush');
			feedFitted.classList.remove('dirt-engine-cursor-fill');
			feedFitted.classList.remove('dirt-engine-cursor-eraser');
		};
		DomUIDirtEngine.domElements['feed-fitted-ui-application-type-menu-brush'] = applicationTypeMenuBrush;
		DomUIDirtEngine.domElementsUIEdit['application-type-menu-brush'] = applicationTypeMenuBrush;
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
			DomUIDirtEngine.uiEditApplicationType = EditApplicationType.FILL;
			feedFitted.classList.remove('dirt-engine-cursor-pencil');
			feedFitted.classList.remove('dirt-engine-cursor-paintbrush');
			feedFitted.classList.add('dirt-engine-cursor-fill');
			feedFitted.classList.remove('dirt-engine-cursor-eraser');
		};
		DomUIDirtEngine.domElements['feed-fitted-ui-application-type-menu-fill'] = applicationTypeMenuFill;
		DomUIDirtEngine.domElementsUIEdit['application-type-menu-fill'] = applicationTypeMenuFill;
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

			DomUIDirtEngine.uiEditApplicationType = EditApplicationType.ERASER;
			feedFitted.classList.remove('dirt-engine-cursor-pencil');
			feedFitted.classList.remove('dirt-engine-cursor-paintbrush');
			feedFitted.classList.remove('dirt-engine-cursor-fill');
			feedFitted.classList.add('dirt-engine-cursor-eraser');
		};
		DomUIDirtEngine.domElements['feed-fitted-ui-application-type-menu-erase'] = applicationTypeMenuEraser;
		DomUIDirtEngine.domElementsUIEdit['application-type-menu-eraser'] = applicationTypeMenuEraser;
		applicationTypeMenu.appendChild(applicationTypeMenuEraser);

		/*
		 * Application Type: History (last)
		 */
		applicationHistory = document.createElement('div');
		applicationHistory.className = 'button history';
		for (let i = 0; i < 5; i++) {
			applicationHistory = <HTMLElement>applicationHistory.cloneNode(true);
			DomUIDirtEngine.domElements['feed-fitted-ui-application-history-' + i] = applicationHistory;
			DomUIDirtEngine.domElementsUIEdit['application-history-' + i] = applicationHistory;
			applicationWrap.appendChild(applicationHistory);

			DomUIDirtEngine.uiEditApplicationHistory.pushStart({
				id: undefined,
				palette: undefined,
			});
		}

		/*
		 * Application Type: Pixel Size
		 */
		applicationTypePixelSize = document.createElement('div');
		applicationTypePixelSize.className = 'dirt-engine-ui-edit pixelSize';
		DomUIDirtEngine.domElements['feed-fitted-ui-application-pixel-size'] = applicationTypePixelSize;
		DomUIDirtEngine.domElementsUIEdit['application-pixel-size'] = applicationTypePixelSize;
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
		};
		DomUIDirtEngine.domElements['feed-fitted-ui-application-pixel-size-range'] = applicationTypePixelSizeInputRange;
		DomUIDirtEngine.domElementsUIEdit['application-pixel-size-range'] = applicationTypePixelSizeInputRange;
		applicationTypePixelSize.appendChild(applicationTypePixelSizeInputRange);

		applicationTypePixelSizeInputText = document.createElement('input');
		applicationTypePixelSizeInputText.className = 'input text';
		applicationTypePixelSizeInputText.disabled = true;
		applicationTypePixelSizeInputText.type = 'number';
		applicationTypePixelSizeInputText.oninput = (event: any) => {
			let value: number = Math.max(1, Math.min(100, Math.round(Number(event.target.value))));
			applicationTypePixelSizeInputRange.value = String(value);
		};
		applicationTypePixelSizeInputText.onblur = (event: any) => {
			applicationTypePixelSizeInputText.value = applicationTypePixelSizeInputRange.value;
		};
		applicationTypePixelSizeInputText.value = applicationTypePixelSizeInputRange.value;
		DomUIDirtEngine.domElements['feed-fitted-ui-application-pixel-size-number'] = applicationTypePixelSizeInputText;
		DomUIDirtEngine.domElementsUIEdit['application-pixel-size-number'] = applicationTypePixelSizeInputText;
		applicationTypePixelSize.appendChild(applicationTypePixelSizeInputText);

		/*
		 * Mode
		 */
		mode = document.createElement('div');
		mode.className = 'dirt-engine-ui-edit mode';
		DomUIDirtEngine.domElements['feed-fitted-ui-mode'] = mode;
		DomUIDirtEngine.domElementsUIEdit['mode'] = mode;
		domFeedFitted.appendChild(mode);

		modeButton = document.createElement('div');
		modeButton.className = 'dirt-engine-icon palette';
		modeButton.onclick = () => {
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
		DomUIDirtEngine.domElements['feed-fitted-ui-mode-button'] = modeButton;
		DomUIDirtEngine.domElementsUIEdit['mode-button'] = modeButton;
		mode.appendChild(modeButton);

		/*
		 * Mode: Menu
		 */
		modeMenu = document.createElement('div');
		modeMenu.className = 'menu';
		DomUIDirtEngine.domElements['feed-fitted-ui-mode-menu'] = modeMenu;
		DomUIDirtEngine.domElementsUIEdit['mode-menu'] = modeMenu;
		mode.appendChild(modeMenu);

		modeMenuAudio = document.createElement('div');
		modeMenuAudio.className = 'button-style audio';
		modeMenuAudio.innerText = 'Audio';
		modeMenuAudio.onclick = () => {
			modeMenuAudio.classList.add('active');
			modeMenuBlock.classList.remove('active');
			modeMenuLight.classList.remove('active');
			DomUIDirtEngine.uiEditPalette = EditPalette.AUDIO;
		};
		DomUIDirtEngine.domElements['feed-fitted-ui-mode-menu-audio'] = modeMenuAudio;
		DomUIDirtEngine.domElementsUIEdit['mode-menu-audio'] = modeMenuAudio;
		modeMenu.appendChild(modeMenuAudio);

		modeMenuBlock = document.createElement('div');
		modeMenuBlock.className = 'button-style block active';
		modeMenuBlock.innerText = 'Block';
		modeMenuBlock.onclick = () => {
			modeMenuAudio.classList.remove('active');
			modeMenuBlock.classList.add('active');
			modeMenuLight.classList.remove('active');
			DomUIDirtEngine.uiEditPalette = EditPalette.BLOCK;
		};
		DomUIDirtEngine.domElements['feed-fitted-ui-mode-menu-block'] = modeMenuBlock;
		DomUIDirtEngine.domElementsUIEdit['mode-menu-block'] = modeMenuBlock;
		modeMenu.appendChild(modeMenuBlock);

		modeMenuLight = document.createElement('div');
		modeMenuLight.className = 'button-style light';
		modeMenuLight.innerText = 'Light';
		modeMenuLight.onclick = () => {
			modeMenuAudio.classList.remove('active');
			modeMenuBlock.classList.remove('active');
			modeMenuLight.classList.add('active');
			DomUIDirtEngine.uiEditPalette = EditPalette.LIGHT;
		};
		DomUIDirtEngine.domElements['feed-fitted-ui-mode-menu-light'] = modeMenuLight;
		DomUIDirtEngine.domElementsUIEdit['mode-menu-light'] = modeMenuLight;
		modeMenu.appendChild(modeMenuLight);

		/*
		 * Save
		 */
		save = document.createElement('div');
		save.className = 'dirt-engine-ui-edit save';
		DomUIDirtEngine.domElements['feed-fitted-ui-save'] = save;
		DomUIDirtEngine.domElementsUIEdit['save'] = save;
		domFeedFitted.appendChild(save);

		saveButton = document.createElement('div');
		saveButton.className = 'dirt-engine-icon save';
		DomUIDirtEngine.domElements['feed-fitted-ui-save-button'] = saveButton;
		DomUIDirtEngine.domElementsUIEdit['save-button'] = saveButton;
		save.appendChild(saveButton);

		/*
		 * Z
		 */
		z = document.createElement('div');
		z.className = 'dirt-engine-ui-edit z';
		DomUIDirtEngine.domElements['feed-fitted-ui-z'] = z;
		DomUIDirtEngine.domElementsUIEdit['z'] = z;
		domFeedFitted.appendChild(z);

		zBackground = document.createElement('div');
		zBackground.className = 'button background';
		zBackground.innerText = 'B';
		zBackground.onclick = () => {
			DomUIDirtEngine.uiEditZ = VideoCmdGameModeEditZLayer.BACKGROUND;
			zBackground.classList.add('active');
			zForeground.classList.remove('active');
			zPrimary.classList.remove('active');
		};
		DomUIDirtEngine.domElements['feed-fitted-ui-z-background'] = zBackground;
		DomUIDirtEngine.domElementsUIEdit['z-background'] = zBackground;
		z.appendChild(zBackground);

		zPrimary = document.createElement('div');
		zPrimary.className = 'button primary active';
		zPrimary.innerText = 'P';
		zPrimary.onclick = () => {
			DomUIDirtEngine.uiEditZ = VideoCmdGameModeEditZLayer.PRIMARY;
			zBackground.classList.remove('active');
			zForeground.classList.remove('active');
			zPrimary.classList.add('active');
		};
		DomUIDirtEngine.domElements['feed-fitted-ui-z-foreground'] = zPrimary;
		DomUIDirtEngine.domElementsUIEdit['z-primary'] = zPrimary;
		z.appendChild(zPrimary);

		zForeground = document.createElement('div');
		zForeground.className = 'button foreground';
		zForeground.innerText = 'F';
		zForeground.onclick = () => {
			DomUIDirtEngine.uiEditZ = VideoCmdGameModeEditZLayer.FOREGROUND;
			zBackground.classList.remove('active');
			zForeground.classList.add('active');
			zPrimary.classList.remove('active');
		};
		DomUIDirtEngine.domElements['feed-fitted-ui-z-foreground'] = zForeground;
		DomUIDirtEngine.domElementsUIEdit['z-foreground'] = zForeground;
		z.appendChild(zForeground);
	}
}
