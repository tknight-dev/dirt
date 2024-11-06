import {
	AssetAudio,
	AssetAudioType,
	AssetCollection,
	AssetImage,
	AssetImageSrc,
	AssetImageType,
	AssetManifestMaster,
	AssetMap,
} from '../models/asset.model';
import { AssetEngine } from '../engines/asset.engine';
import { AudioEngine } from '../engines/audio.engine';
import { AudioModulation } from '../models/audio-modulation.model';
import { DoubleLinkedList } from '../models/double-linked-list.model';
import {
	Grid,
	GridConfig,
	GridAudioBlock,
	GridAudioTriggerTripType,
	GridImageBlockType,
	GridCoordinate,
} from '../models/grid.model';
import { Map, MapActive } from '../models/map.model';
import { MapEditEngine } from '../engines/map-edit.engine';
import { MouseAction, MouseEngine } from '../engines/mouse.engine';
import { UtilEngine } from '../engines/util.engine';
import {
	VideoCmdGameModeEditApply,
	VideoCmdGameModeEditApplyType,
	VideoCmdGameModeEditApplyZ,
	VideoWorkerCmdEditCameraUpdate,
} from '../models/video-worker-cmds.model';
import { VideoEngine } from '../engines/video.engine';

/**
 * @author tknight-dev
 */
enum ApplicationType {
	PENCIL,
	BRUSH,
	FILL,
	ERASER,
	STAMP,
}

enum View {
	AUDIO, // primary only
	BLOCK,
	LIGHT, // foreground and primary only
}

export class DomUI {
	protected static assetManifestMaster: AssetManifestMaster;
	protected static dom: HTMLElement;
	protected static domElements: { [key: string]: HTMLElement } = {};
	protected static domElementsCanvas: { [key: string]: HTMLCanvasElement } = {};
	protected static domElementsInput: { [key: string]: HTMLInputElement } = {};
	protected static domElementsInputVolumeTimeout: ReturnType<typeof setTimeout>;
	protected static domElementsUIEdit: { [key: string]: HTMLElement } = {};
	private static domUIinitialized: boolean;
	private static uiEditApplicationProperties: {};
	private static uiEditApplicationType: ApplicationType;
	public static uiEditApplyType: VideoCmdGameModeEditApplyType;
	private static uiEditBrushSize: number;
	private static uiEditCursorGInPh: number;
	private static uiEditCursorGInPw: number;
	private static uiEditCursorReady: boolean;
	protected static uiEditMode: boolean;
	private static uiEditMouseCmdCollection: DoubleLinkedList<number> = new DoubleLinkedList<number>();
	private static uiEditMouseCmdCollectionHashesEffected: { [key: number]: null } = {};
	private static uiEditMouseCmdCollectionHashesOrigin: { [key: number]: null } = {};
	private static uiEditMouseCmdCollectionActive: boolean;
	private static uiEditMouseCmdCollectionEngaged: boolean;
	private static uiEditMouseCmdCollectionPromise: Promise<void>;
	private static uiEditSpinnerStatus: boolean;
	private static uiEditZ: VideoCmdGameModeEditApplyZ;

	private static detailsModalSelector(
		assetAudio: boolean,
		assetImage: boolean,
		assetRemovable: boolean,
		selectors: any[],
		callback: (value: any) => void,
	): void {
		let image: HTMLImageElement | undefined = undefined,
			modal = DomUI.domElements['feed-fitted-ui-select-modal'],
			modalContent = DomUI.domElements['feed-fitted-ui-select-modal-content'],
			div: HTMLElement;

		modal.style.display = 'flex';
		MouseEngine.setSuspendWheel(true);

		if (assetRemovable) {
			div = document.createElement('div');
			div.className = 'button red';
			div.innerText = 'None';
			div.onclick = () => {
				callback(undefined);
				modal.style.display = 'none';
				modalContent.textContent = '';
				MouseEngine.setSuspendWheel(false);
			};
			modalContent.appendChild(div);
		}

		selectors.forEach((selector: any) => {
			div = document.createElement('div');
			div.className = 'button';
			div.innerText = selector.name;
			div.onclick = () => {
				callback(selector.value);
				modal.style.display = 'none';
				modalContent.textContent = '';
				MouseEngine.setSuspendWheel(false);

				if (assetAudio) {
					if (selector.type === AssetAudioType.MUSIC) {
						AudioEngine.pause(selector.value);
					}
				}
			};
			if (assetAudio) {
				div.onmouseover = () => {
					if (selector.type === AssetAudioType.EFFECT) {
						AudioEngine.trigger(selector.value, AudioModulation.NONE, 0, 0.5);
					} else {
						AudioEngine.play(selector.value, 0, 0.5);
					}
				};
				div.onmouseout = () => {
					if (selector.type === AssetAudioType.MUSIC) {
						AudioEngine.pause(selector.value);
					}
				};
			}
			if (assetImage) {
				div.onmouseover = () => {
					if (!image) {
						let imageSrc: AssetImageSrc | undefined = undefined;

						DomUI.assetManifestMaster.images[selector.value].srcs.forEach(
							(assetImageSrc: AssetImageSrc) => {
								// Grab the highest available resolution
								if (assetImageSrc.collection === AssetCollection.SHARED) {
									if (!imageSrc || imageSrc.resolution < assetImageSrc.resolution) {
										imageSrc = assetImageSrc;
									}
								}
							},
						);

						if (imageSrc) {
							image = document.createElement('img');
							image.className = 'after-image';
							image.src = (<any>AssetEngine.getAsset((<any>imageSrc).src)).data;

							div.appendChild(image);
						}
					}
				};
				div.onmouseout = () => {
					if (image) {
						div.removeChild(image);
						image = undefined;
					}
				};
			}
			modalContent.appendChild(div);
		});
	}

	private static detailsModalAudioBlock(): void {
		let applicationProperties: any = {
				modulationId: AudioModulation.NONE.id,
			},
			t: HTMLElement = DomUI.domElementsUIEdit['application-palette-modal-content-body-table'],
			td: HTMLElement,
			tr: HTMLElement;

		t.textContent = '';

		// Modulation
		tr = document.createElement('tr');
		td = document.createElement('td');
		td.innerText = 'Modulation';
		tr.appendChild(td);
		td = document.createElement('td');
		td.className = 'button right-arrow';
		td.innerText = AudioModulation.NONE.displayName;
		td.onclick = (event: any) => {
			DomUI.detailsModalSelector(
				false,
				false,
				false,
				AudioModulation.values.map((v) => {
					return {
						name: v.displayName,
						value: v.id,
					};
				}),
				(modulationId: string) => {
					event.target.innerText = AudioModulation.find(modulationId)?.displayName;
					applicationProperties.modulationId = modulationId;
				},
			);
		};
		tr.appendChild(td);
		t.appendChild(tr);

		// Show the cancel/apply buttons
		DomUI.domElementsUIEdit['application-palette-modal-content-body'].classList.add('buttoned');
		DomUI.domElementsUIEdit['application-palette-modal-content-buttons'].style.display = 'flex';
		DomUI.domElementsUIEdit['application-palette-modal-content-header'].innerText = 'Palette: Audio Block';

		// Apply
		DomUI.domElementsUIEdit['application-palette-modal-content-buttons-apply'].onclick = () => {
			// Values
			DomUI.uiEditApplicationProperties = applicationProperties;
			DomUI.uiEditApplyType = VideoCmdGameModeEditApplyType.AUDIO_BLOCK;

			// Graphics
			DomUI.detailsModalPostClickGraphics('mode-menu-audio');
		};
	}

	private static detailsModalAudioTagEffectTrigger(): void {
		let valuesAudio: AssetAudio[] = Object.values(DomUI.assetManifestMaster.audio).filter(
				(v) => v.type === AssetAudioType.EFFECT,
			),
			valuesTrip: GridAudioTriggerTripType[] = <any>(
				Object.values(GridAudioTriggerTripType).filter((v) => typeof v !== 'string')
			),
			applicationProperties: any = {
				assetId: valuesAudio[0].id,
				oneshot: true,
				trip: GridAudioTriggerTripType.CONTACT,
				volumePercentage: 1,
			},
			input: HTMLInputElement,
			playing: boolean,
			t: HTMLElement = DomUI.domElementsUIEdit['application-palette-modal-content-body-table'],
			td: HTMLElement,
			tr: HTMLElement;

		t.textContent = '';

		// Asset
		tr = document.createElement('tr');
		td = document.createElement('td');
		td.innerText = 'Asset';
		tr.appendChild(td);
		td = document.createElement('td');
		td.className = 'button right-arrow';
		td.innerText = valuesAudio[0].id;
		td.onclick = (event: any) => {
			DomUI.detailsModalSelector(
				true,
				false,
				false,
				valuesAudio.map((v) => {
					return {
						name: v.id,
						type: v.type,
						value: v.id,
					};
				}),
				(assetId: string) => {
					event.target.innerText = assetId;
					applicationProperties.assetId = assetId;
				},
			);
		};
		tr.appendChild(td);
		t.appendChild(tr);

		// Oneshot
		tr = document.createElement('tr');
		td = document.createElement('td');
		td.innerText = 'Oneshot';
		tr.appendChild(td);
		td = document.createElement('td');
		input = document.createElement('input');
		input.checked = applicationProperties.oneshot;
		input.oninput = (event: any) => {
			applicationProperties.oneshot = Boolean(event.target.checked);
		};
		input.type = 'checkbox';
		td.appendChild(input);
		tr.appendChild(td);
		t.appendChild(tr);

		// Trip
		tr = document.createElement('tr');
		td = document.createElement('td');
		td.innerText = 'Trip';
		tr.appendChild(td);
		td = document.createElement('td');
		td.className = 'button right-arrow';
		td.innerText = GridAudioTriggerTripType[valuesTrip[0]];
		td.onclick = (event: any) => {
			DomUI.detailsModalSelector(
				false,
				false,
				false,
				valuesTrip.map((v) => {
					return {
						name: GridAudioTriggerTripType[<any>v],
						value: v,
					};
				}),
				(trip: string) => {
					event.target.innerText = GridAudioTriggerTripType[<any>trip];
					applicationProperties.trip = trip;
				},
			);
		};
		tr.appendChild(td);
		t.appendChild(tr);

		// Volume Percentage
		tr = document.createElement('tr');
		td = document.createElement('td');
		td.innerText = 'Volume Percentage';
		tr.appendChild(td);
		td = document.createElement('td');
		input = document.createElement('input');
		input.max = '1';
		input.min = '.1';
		input.oninput = (event: any) => {
			// Update volume
			applicationProperties.volumePercentage = Number(event.target.value);

			// Play sample at volume
			AudioEngine.trigger(
				applicationProperties.assetId,
				AudioModulation.NONE,
				0,
				applicationProperties.volumePercentage,
			);
		};
		input.step = '.1';
		input.type = 'range';
		input.value = applicationProperties.volumePercentage;
		td.appendChild(input);
		tr.appendChild(td);
		t.appendChild(tr);

		// Show the cancel/apply buttons
		DomUI.domElementsUIEdit['application-palette-modal-content-body'].classList.add('buttoned');
		DomUI.domElementsUIEdit['application-palette-modal-content-buttons'].style.display = 'flex';
		DomUI.domElementsUIEdit['application-palette-modal-content-header'].innerText = 'Palette: Audio Tag - Effect';

		// Apply
		DomUI.domElementsUIEdit['application-palette-modal-content-buttons-apply'].onclick = () => {
			// Values
			DomUI.uiEditApplicationProperties = applicationProperties;
			DomUI.uiEditApplyType = VideoCmdGameModeEditApplyType.AUDIO_TRIGGER_EFFECT;

			// Graphics
			DomUI.detailsModalPostClickGraphics('mode-menu-audio');
		};
	}

	private static detailsModalAudioTagMusicTrigger(): void {
		let valuesAudio: AssetAudio[] = Object.values(DomUI.assetManifestMaster.audio).filter(
				(v) => v.type === AssetAudioType.MUSIC,
			),
			valuesTrip: GridAudioTriggerTripType[] = <any>(
				Object.values(GridAudioTriggerTripType).filter((v) => typeof v !== 'string')
			),
			applicationProperties: any = {
				assetId: valuesAudio[0].id,
				oneshot: true,
				tagId: UtilEngine.randomAlphaNumeric(5),
				trip: GridAudioTriggerTripType.CONTACT,
				volumePercentage: 1,
			},
			input: HTMLInputElement,
			playing: boolean,
			t: HTMLElement = DomUI.domElementsUIEdit['application-palette-modal-content-body-table'],
			td: HTMLElement,
			tr: HTMLElement;

		t.textContent = '';

		// Asset
		tr = document.createElement('tr');
		td = document.createElement('td');
		td.innerText = 'Asset';
		tr.appendChild(td);
		td = document.createElement('td');
		td.className = 'button right-arrow';
		td.innerText = valuesAudio[0].id;
		td.onclick = (event: any) => {
			DomUI.detailsModalSelector(
				true,
				false,
				false,
				valuesAudio.map((v) => {
					return {
						name: v.id,
						type: v.type,
						value: v.id,
					};
				}),
				(assetId: string) => {
					event.target.innerText = assetId;
					applicationProperties.assetId = assetId;
				},
			);
		};
		tr.appendChild(td);
		t.appendChild(tr);

		// Oneshot
		tr = document.createElement('tr');
		td = document.createElement('td');
		td.innerText = 'Oneshot';
		tr.appendChild(td);
		td = document.createElement('td');
		input = document.createElement('input');
		input.checked = applicationProperties.oneshot;
		input.oninput = (event: any) => {
			applicationProperties.oneshot = Boolean(event.target.checked);
		};
		input.type = 'checkbox';
		td.appendChild(input);
		tr.appendChild(td);
		t.appendChild(tr);

		// TagId
		tr = document.createElement('tr');
		td = document.createElement('td');
		td.innerText = 'Tag Id';
		tr.appendChild(td);
		td = document.createElement('td');
		input = document.createElement('input');
		input.oninput = (event: any) => {
			let string: string = String(event.target.value).replaceAll(/[\W]/g, '').trim();
			input.value = string;
			applicationProperties.tagId = string;
		};
		input.type = 'text';
		input.value = applicationProperties.tagId;
		td.appendChild(input);
		tr.appendChild(td);
		t.appendChild(tr);

		// Trip
		tr = document.createElement('tr');
		td = document.createElement('td');
		td.innerText = 'Trip';
		tr.appendChild(td);
		td = document.createElement('td');
		td.className = 'button right-arrow';
		td.innerText = GridAudioTriggerTripType[valuesTrip[0]];
		td.onclick = (event: any) => {
			DomUI.detailsModalSelector(
				false,
				false,
				false,
				valuesTrip.map((v) => {
					return {
						name: GridAudioTriggerTripType[<any>v],
						value: v,
					};
				}),
				(trip: string) => {
					event.target.innerText = GridAudioTriggerTripType[<any>trip];
					applicationProperties.trip = trip;
				},
			);
		};
		tr.appendChild(td);
		t.appendChild(tr);

		// Volume Percentage
		tr = document.createElement('tr');
		td = document.createElement('td');
		td.innerText = 'Volume Percentage';
		tr.appendChild(td);
		td = document.createElement('td');
		input = document.createElement('input');
		input.max = '1';
		input.min = '.1';
		input.oninput = (event: any) => {
			// Update volume
			applicationProperties.volumePercentage = Number(event.target.value);

			// Play sample at volume
			if (playing) {
				AudioEngine.setVolumeAsset(applicationProperties.assetId, applicationProperties.volumePercentage);
			} else {
				AudioEngine.play(applicationProperties.assetId, 0, applicationProperties.volumePercentage);
				playing = true;
			}
		};
		input.onmouseout = (event: any) => {
			if (playing) {
				AudioEngine.pause(applicationProperties.assetId);
				playing = false;
			}
		};
		input.step = '.1';
		input.type = 'range';
		input.value = applicationProperties.volumePercentage;
		td.appendChild(input);
		tr.appendChild(td);
		t.appendChild(tr);

		// Show the cancel/apply buttons
		DomUI.domElementsUIEdit['application-palette-modal-content-body'].classList.add('buttoned');
		DomUI.domElementsUIEdit['application-palette-modal-content-buttons'].style.display = 'flex';
		DomUI.domElementsUIEdit['application-palette-modal-content-header'].innerText = 'Palette: Audio Tag - Music';

		// Apply
		DomUI.domElementsUIEdit['application-palette-modal-content-buttons-apply'].onclick = () => {
			// Values
			DomUI.uiEditApplicationProperties = applicationProperties;
			DomUI.uiEditApplyType = VideoCmdGameModeEditApplyType.AUDIO_TRIGGER_MUSIC;

			// Graphics
			DomUI.detailsModalPostClickGraphics('mode-menu-audio');
		};
	}

	private static detailsModalAudioTagMusicFadeTrigger(): void {
		let valuesTrip: GridAudioTriggerTripType[] = <any>(
				Object.values(GridAudioTriggerTripType).filter((v) => typeof v !== 'string')
			),
			applicationProperties: any = {
				fadeDurationInMs: 1000,
				fadeTo: 0.5,
				tagId: '', // TODO validation logic
				trip: GridAudioTriggerTripType.CONTACT,
			},
			input: HTMLInputElement,
			playing: boolean,
			t: HTMLElement = DomUI.domElementsUIEdit['application-palette-modal-content-body-table'],
			td: HTMLElement,
			tr: HTMLElement;

		t.textContent = '';

		// Fade Duration In MS
		tr = document.createElement('tr');
		td = document.createElement('td');
		td.innerText = 'Fade Duration In Ms';
		tr.appendChild(td);
		td = document.createElement('td');
		input = document.createElement('input');
		input.max = '10000';
		input.min = '100';
		input.oninput = (event: any) => {
			applicationProperties.fadeDurationInMs = Number(event.target.value);
		};
		input.step = '10';
		input.type = 'range';
		input.value = applicationProperties.fadeDurationInMs;
		td.appendChild(input);
		tr.appendChild(td);
		t.appendChild(tr);

		// Fade To
		tr = document.createElement('tr');
		td = document.createElement('td');
		td.innerText = 'Fade To Volume';
		tr.appendChild(td);
		td = document.createElement('td');
		input = document.createElement('input');
		input.max = '1';
		input.min = '0';
		input.oninput = (event: any) => {
			applicationProperties.fadeTo = Number(event.target.value);
		};
		input.step = '.1';
		input.type = 'range';
		input.value = applicationProperties.fadeTo;
		td.appendChild(input);
		tr.appendChild(td);
		t.appendChild(tr);

		// TagId
		tr = document.createElement('tr');
		td = document.createElement('td');
		td.innerText = 'Tag Id';
		tr.appendChild(td);
		td = document.createElement('td');
		input = document.createElement('input');
		input.oninput = (event: any) => {
			let string: string = String(event.target.value).replaceAll(/[\W]/g, '').trim();
			input.value = string;
			applicationProperties.tagId = string;
		};
		input.type = 'text';
		input.value = applicationProperties.tagId;
		td.appendChild(input);
		tr.appendChild(td);
		t.appendChild(tr);

		// Trip
		tr = document.createElement('tr');
		td = document.createElement('td');
		td.innerText = 'Trip';
		tr.appendChild(td);
		td = document.createElement('td');
		td.className = 'button right-arrow';
		td.innerText = GridAudioTriggerTripType[valuesTrip[0]];
		td.onclick = (event: any) => {
			DomUI.detailsModalSelector(
				false,
				false,
				false,
				valuesTrip.map((v) => {
					return {
						name: GridAudioTriggerTripType[<any>v],
						value: v,
					};
				}),
				(trip: string) => {
					event.target.innerText = GridAudioTriggerTripType[<any>trip];
					applicationProperties.trip = trip;
				},
			);
		};
		tr.appendChild(td);
		t.appendChild(tr);

		// Show the cancel/apply buttons
		DomUI.domElementsUIEdit['application-palette-modal-content-body'].classList.add('buttoned');
		DomUI.domElementsUIEdit['application-palette-modal-content-buttons'].style.display = 'flex';
		DomUI.domElementsUIEdit['application-palette-modal-content-header'].innerText =
			'Palette: Audio Tag - Fade Music';

		// Apply
		DomUI.domElementsUIEdit['application-palette-modal-content-buttons-apply'].onclick = () => {
			// Values
			DomUI.uiEditApplicationProperties = applicationProperties;
			DomUI.uiEditApplyType = VideoCmdGameModeEditApplyType.AUDIO_TRIGGER_MUSIC_FADE;

			// Graphics
			DomUI.detailsModalPostClickGraphics('mode-menu-audio');
		};
	}

	private static detailsModalAudioTagMusicPauseTrigger(): void {
		let valuesTrip: GridAudioTriggerTripType[] = <any>(
				Object.values(GridAudioTriggerTripType).filter((v) => typeof v !== 'string')
			),
			applicationProperties: any = {
				tagId: '', // TODO validation logic
				trip: GridAudioTriggerTripType.CONTACT,
			},
			input: HTMLInputElement,
			playing: boolean,
			t: HTMLElement = DomUI.domElementsUIEdit['application-palette-modal-content-body-table'],
			td: HTMLElement,
			tr: HTMLElement;

		t.textContent = '';

		// TagId
		tr = document.createElement('tr');
		td = document.createElement('td');
		td.innerText = 'Tag Id';
		tr.appendChild(td);
		td = document.createElement('td');
		input = document.createElement('input');
		input.oninput = (event: any) => {
			let string: string = String(event.target.value).replaceAll(/[\W]/g, '').trim();
			input.value = string;
			applicationProperties.tagId = string;
		};
		input.type = 'text';
		input.value = applicationProperties.tagId;
		td.appendChild(input);
		tr.appendChild(td);
		t.appendChild(tr);

		// Trip
		tr = document.createElement('tr');
		td = document.createElement('td');
		td.innerText = 'Trip';
		tr.appendChild(td);
		td = document.createElement('td');
		td.className = 'button right-arrow';
		td.innerText = GridAudioTriggerTripType[valuesTrip[0]];
		td.onclick = (event: any) => {
			DomUI.detailsModalSelector(
				false,
				false,
				false,
				valuesTrip.map((v) => {
					return {
						name: GridAudioTriggerTripType[<any>v],
						value: v,
					};
				}),
				(trip: string) => {
					event.target.innerText = GridAudioTriggerTripType[<any>trip];
					applicationProperties.trip = trip;
				},
			);
		};
		tr.appendChild(td);
		t.appendChild(tr);

		// Show the cancel/apply buttons
		DomUI.domElementsUIEdit['application-palette-modal-content-body'].classList.add('buttoned');
		DomUI.domElementsUIEdit['application-palette-modal-content-buttons'].style.display = 'flex';
		DomUI.domElementsUIEdit['application-palette-modal-content-header'].innerText =
			'Palette: Audio Tag - Pause Music';

		// Apply
		DomUI.domElementsUIEdit['application-palette-modal-content-buttons-apply'].onclick = () => {
			// Values
			DomUI.uiEditApplicationProperties = applicationProperties;
			DomUI.uiEditApplyType = VideoCmdGameModeEditApplyType.AUDIO_TRIGGER_MUSIC_PAUSE;

			// Graphics
			DomUI.detailsModalPostClickGraphics('mode-menu-audio');
		};
	}

	private static detailsModalAudioTagMusicUnpauseTrigger(): void {
		let valuesTrip: GridAudioTriggerTripType[] = <any>(
				Object.values(GridAudioTriggerTripType).filter((v) => typeof v !== 'string')
			),
			applicationProperties: any = {
				tagId: '', // TODO validation logic
				trip: GridAudioTriggerTripType.CONTACT,
			},
			input: HTMLInputElement,
			playing: boolean,
			t: HTMLElement = DomUI.domElementsUIEdit['application-palette-modal-content-body-table'],
			td: HTMLElement,
			tr: HTMLElement;

		t.textContent = '';

		// TagId
		tr = document.createElement('tr');
		td = document.createElement('td');
		td.innerText = 'Tag Id';
		tr.appendChild(td);
		td = document.createElement('td');
		input = document.createElement('input');
		input.oninput = (event: any) => {
			let string: string = String(event.target.value).replaceAll(/[\W]/g, '').trim();
			input.value = string;
			applicationProperties.tagId = string;
		};
		input.type = 'text';
		input.value = applicationProperties.tagId;
		td.appendChild(input);
		tr.appendChild(td);
		t.appendChild(tr);

		// Trip
		tr = document.createElement('tr');
		td = document.createElement('td');
		td.innerText = 'Trip';
		tr.appendChild(td);
		td = document.createElement('td');
		td.className = 'button right-arrow';
		td.innerText = GridAudioTriggerTripType[valuesTrip[0]];
		td.onclick = (event: any) => {
			DomUI.detailsModalSelector(
				false,
				false,
				false,
				valuesTrip.map((v) => {
					return {
						name: GridAudioTriggerTripType[<any>v],
						value: v,
					};
				}),
				(trip: string) => {
					event.target.innerText = GridAudioTriggerTripType[<any>trip];
					applicationProperties.trip = trip;
				},
			);
		};
		tr.appendChild(td);
		t.appendChild(tr);

		// Show the cancel/apply buttons
		DomUI.domElementsUIEdit['application-palette-modal-content-body'].classList.add('buttoned');
		DomUI.domElementsUIEdit['application-palette-modal-content-buttons'].style.display = 'flex';
		DomUI.domElementsUIEdit['application-palette-modal-content-header'].innerText =
			'Palette: Audio Tag - Unpause Music';

		// Apply
		DomUI.domElementsUIEdit['application-palette-modal-content-buttons-apply'].onclick = () => {
			// Values
			DomUI.uiEditApplicationProperties = applicationProperties;
			DomUI.uiEditApplyType = VideoCmdGameModeEditApplyType.AUDIO_TRIGGER_MUSIC_UNPAUSE;

			// Graphics
			DomUI.detailsModalPostClickGraphics('mode-menu-audio');
		};
	}

	private static detailsModalImageBlock(): void {
		let valuesAudio: AssetAudio[] = Object.values(DomUI.assetManifestMaster.audio).filter(
				(v) => v.type === AssetAudioType.EFFECT,
			),
			valuesImage: AssetImage[] = Object.values(DomUI.assetManifestMaster.images).filter(
				(v) => v.type === AssetImageType.GRID_BLOCK,
			),
			valuesTypes: GridImageBlockType[] = <any>(
				Object.values(GridImageBlockType).filter((v) => typeof v !== 'string')
			),
			applicationProperties: any = {
				assetId: valuesImage[0].id,
				assetIdDamagedImage: undefined,
				assetIdDamangedWalkedOnAudioEffect: undefined,
				assetIdWalkedOnAudioEffect: undefined,
				damageable: false,
				destructible: false,
				strengthToDamangeInN: undefined,
				strengthToDestroyInN: undefined,
				type: GridImageBlockType.SOLID,
				viscocity: undefined,
				weight: undefined,
			},
			input: HTMLInputElement,
			playing: boolean,
			t: HTMLElement = DomUI.domElementsUIEdit['application-palette-modal-content-body-table'],
			td: HTMLElement,
			tr: HTMLElement;

		t.textContent = '';

		// Asset
		tr = document.createElement('tr');
		td = document.createElement('td');
		td.innerText = 'Asset';
		tr.appendChild(td);
		td = document.createElement('td');
		td.className = 'button right-arrow';
		td.innerText = valuesImage[0].id;
		td.onclick = (event: any) => {
			DomUI.detailsModalSelector(
				false,
				true,
				false,
				valuesImage.map((v) => {
					return {
						name: v.id,
						value: v.id,
					};
				}),
				(assetId: string) => {
					event.target.innerText = assetId;
					applicationProperties.assetId = assetId;
				},
			);
		};
		tr.appendChild(td);
		t.appendChild(tr);

		// Asset - Damaged
		if (DomUI.uiEditZ === VideoCmdGameModeEditApplyZ.PRIMARY) {
			tr = document.createElement('tr');
			td = document.createElement('td');
			td.innerText = 'Asset Damaged';
			tr.appendChild(td);
			td = document.createElement('td');
			td.className = 'button right-arrow';
			td.innerText = 'NONE';
			td.onclick = (event: any) => {
				DomUI.detailsModalSelector(
					false,
					true,
					true,
					valuesImage.map((v) => {
						return {
							name: v.id,
							value: v.id,
						};
					}),
					(assetId: string) => {
						event.target.innerText = assetId || 'None';
						applicationProperties.assetIdDamagedImage = assetId;
					},
				);
			};
			tr.appendChild(td);
			t.appendChild(tr);
		}

		// Asset - Damaged Walked On
		if (DomUI.uiEditZ === VideoCmdGameModeEditApplyZ.PRIMARY) {
			tr = document.createElement('tr');
			td = document.createElement('td');
			td.innerText = 'Asset Damaged Walked On Audio Effect';
			tr.appendChild(td);
			td = document.createElement('td');
			td.className = 'button right-arrow';
			td.innerText = 'NONE';
			td.onclick = (event: any) => {
				DomUI.detailsModalSelector(
					true,
					true,
					true,
					valuesAudio.map((v) => {
						return {
							name: v.id,
							type: v.type,
							value: v.id,
						};
					}),
					(assetId: string) => {
						event.target.innerText = assetId || 'None';
						applicationProperties.assetIdDamangedWalkedOnAudioEffect = assetId;
					},
				);
			};
			tr.appendChild(td);
			t.appendChild(tr);
		}

		// Asset - Walked On
		if (DomUI.uiEditZ === VideoCmdGameModeEditApplyZ.PRIMARY) {
			tr = document.createElement('tr');
			td = document.createElement('td');
			td.innerText = 'Asset Walked On Audio Effect';
			tr.appendChild(td);
			td = document.createElement('td');
			td.className = 'button right-arrow';
			td.innerText = 'NONE';
			td.onclick = (event: any) => {
				DomUI.detailsModalSelector(
					true,
					true,
					true,
					valuesAudio.map((v) => {
						return {
							name: v.id,
							type: v.type,
							value: v.id,
						};
					}),
					(assetId: string) => {
						event.target.innerText = assetId || 'None';
						applicationProperties.assetIdWalkedOnAudioEffect = assetId;
					},
				);
			};
			tr.appendChild(td);
			t.appendChild(tr);
		}

		// Damageable
		if (DomUI.uiEditZ === VideoCmdGameModeEditApplyZ.PRIMARY) {
			tr = document.createElement('tr');
			td = document.createElement('td');
			td.innerText = 'Damageable';
			tr.appendChild(td);
			td = document.createElement('td');
			input = document.createElement('input');
			input.checked = applicationProperties.damageable;
			input.oninput = (event: any) => {
				applicationProperties.damageable = Boolean(event.target.checked);
			};
			input.type = 'checkbox';
			td.appendChild(input);
			tr.appendChild(td);
			t.appendChild(tr);

			// Destructible
			tr = document.createElement('tr');
			td = document.createElement('td');
			td.innerText = 'Destructible';
			tr.appendChild(td);
			td = document.createElement('td');
			input = document.createElement('input');
			input.checked = applicationProperties.destructible;
			input.oninput = (event: any) => {
				applicationProperties.destructible = Boolean(event.target.checked);
			};
			input.type = 'checkbox';
			td.appendChild(input);
			tr.appendChild(td);
			t.appendChild(tr);
		}

		// strengthToDamangeInN
		if (DomUI.uiEditZ === VideoCmdGameModeEditApplyZ.PRIMARY) {
			tr = document.createElement('tr');
			td = document.createElement('td');
			td.innerText = 'Strength to Damange In N';
			tr.appendChild(td);
			td = document.createElement('td');
			input = document.createElement('input');
			input.max = '10000';
			input.min = '1';
			input.oninput = (event: any) => {
				applicationProperties.strengthToDamangeInN = Number(event.target.value);
			};
			input.step = '1';
			input.type = 'range';
			input.value = applicationProperties.strengthToDamangeInN;
			td.appendChild(input);
			tr.appendChild(td);
			t.appendChild(tr);
		}

		// strengthToDestroyInN
		if (DomUI.uiEditZ === VideoCmdGameModeEditApplyZ.PRIMARY) {
			tr = document.createElement('tr');
			td = document.createElement('td');
			td.innerText = 'Strength to Destroy In N';
			tr.appendChild(td);
			td = document.createElement('td');
			input = document.createElement('input');
			input.max = '10000';
			input.min = '1';
			input.oninput = (event: any) => {
				applicationProperties.strengthToDestroyInN = Number(event.target.value);
			};
			input.step = '1';
			input.type = 'range';
			input.value = applicationProperties.strengthToDestroyInN;
			td.appendChild(input);
			tr.appendChild(td);
			t.appendChild(tr);
		}

		// Type
		tr = document.createElement('tr');
		td = document.createElement('td');
		td.innerText = 'Type';
		tr.appendChild(td);
		td = document.createElement('td');
		td.className = 'button right-arrow';
		td.innerText = GridImageBlockType[applicationProperties.type];
		td.onclick = (event: any) => {
			DomUI.detailsModalSelector(
				false,
				false,
				false,
				valuesTypes.map((v) => {
					return {
						name: GridImageBlockType[<any>v],
						value: v,
					};
				}),
				(trip: string) => {
					event.target.innerText = GridImageBlockType[<any>trip];
					applicationProperties.trip = trip;
				},
			);
		};
		tr.appendChild(td);
		t.appendChild(tr);

		// Viscocity
		if (DomUI.uiEditZ === VideoCmdGameModeEditApplyZ.PRIMARY) {
			tr = document.createElement('tr');
			td = document.createElement('td');
			td.innerText = 'Viscocity';
			tr.appendChild(td);
			td = document.createElement('td');
			input = document.createElement('input');
			input.max = '1';
			input.min = '.1';
			input.oninput = (event: any) => {
				applicationProperties.viscocity = Number(event.target.value);
			};
			input.step = '.1';
			input.type = 'range';
			input.value = applicationProperties.viscocity;
			td.appendChild(input);
			tr.appendChild(td);
			t.appendChild(tr);
		}

		// Weight In Kg
		if (DomUI.uiEditZ === VideoCmdGameModeEditApplyZ.PRIMARY) {
			tr = document.createElement('tr');
			td = document.createElement('td');
			td.innerText = 'Weight In Kg';
			tr.appendChild(td);
			td = document.createElement('td');
			input = document.createElement('input');
			input.max = '100';
			input.min = '1';
			input.oninput = (event: any) => {
				applicationProperties.weight = Number(event.target.value);
			};
			input.step = '1';
			input.type = 'range';
			input.value = applicationProperties.weight;
			td.appendChild(input);
			tr.appendChild(td);
			t.appendChild(tr);
		}

		// Show the cancel/apply buttons
		DomUI.domElementsUIEdit['application-palette-modal-content-body'].classList.add('buttoned');
		DomUI.domElementsUIEdit['application-palette-modal-content-buttons'].style.display = 'flex';
		DomUI.domElementsUIEdit['application-palette-modal-content-header'].innerText = 'Palette: Audio Tag - Music';

		// Apply
		DomUI.domElementsUIEdit['application-palette-modal-content-buttons-apply'].onclick = () => {
			// Values
			DomUI.uiEditApplicationProperties = applicationProperties;
			DomUI.uiEditApplyType = VideoCmdGameModeEditApplyType.IMAGE_BLOCK;

			// Graphics
			DomUI.detailsModalPostClickGraphics('mode-menu-block');
		};
	}

	private static detailsModalLight(): void {
		let t: HTMLElement = DomUI.domElementsUIEdit['application-palette-modal-content-body-table'];

		t.textContent = '';
		console.log('detailsModalLight');

		// color: number; // hexadecimal
		// destructible: boolean;
		// gRadius: number;
		// hash: number;
		// nightOnly: boolean;
		// strengthToDestroyInN: number | undefined; // newtons of force required to destroy
		// type: GridLightType;

		// Show the cancel/apply buttons
		DomUI.domElementsUIEdit['application-palette-modal-content-body'].classList.add('buttoned');
		DomUI.domElementsUIEdit['application-palette-modal-content-buttons'].style.display = 'flex';
		DomUI.domElementsUIEdit['application-palette-modal-content-header'].innerText = 'Palette: Light';

		// Apply
		DomUI.domElementsUIEdit['application-palette-modal-content-buttons-apply'].onclick = () => {
			// Values
			//DomUI.uiEditApplicationProperties = applicationProperties;
			DomUI.uiEditApplyType = VideoCmdGameModeEditApplyType.LIGHT;

			// Graphics
			DomUI.detailsModalPostClickGraphics('mode-menu-light');
		};
	}

	private static detailsModalPostClickGraphics(menuId: string): void {
		DomUI.domElementsUIEdit['application-palette-modal'].style.display = 'none';
		DomUI.domElementsUIEdit[menuId].click();
		DomUI.domElementsUIEdit['palette'].classList.remove('active');
		MouseEngine.setSuspendWheel(false);

		// Draw cursor
		DomUI.uiEditCursorReady = true;
		switch (DomUI.uiEditApplicationType) {
			case ApplicationType.BRUSH:
				DomUI.domElementsUIEdit['application-type-menu-brush'].click();
				break;
			case ApplicationType.ERASER:
				DomUI.domElementsUIEdit['application-type-menu-eraser'].click();
				break;
			case ApplicationType.FILL:
				DomUI.domElementsUIEdit['application-type-menu-fill'].click();
				break;
			case ApplicationType.PENCIL:
				DomUI.domElementsUIEdit['application-type-menu-pencil'].click();
				break;
			case ApplicationType.STAMP:
				DomUI.domElementsUIEdit['application-type-menu-stamp'].click();
				break;
		}

		// Hide view menu
		setTimeout(() => {
			DomUI.domElementsUIEdit['view'].click();
		});
	}

	private static displaySpinner(display: boolean) {
		let spinner: HTMLElement = DomUI.domElementsUIEdit['application-spinner-modal'];

		DomUI.uiEditSpinnerStatus = display;

		if (display) {
			setTimeout(() => {
				if (DomUI.uiEditSpinnerStatus) {
					spinner.style.display = 'flex';
				}
			});
		} else {
			spinner.style.display = 'none';
		}
	}

	/**
	 * Updates the UI cache of the camera contained within the mapActive
	 */
	protected static editCameraUpdate(videoWorkerCmdEditCameraUpdate: VideoWorkerCmdEditCameraUpdate) {
		MapEditEngine.uiCameraUpdate(videoWorkerCmdEditCameraUpdate);

		DomUI.uiEditCursorGInPh =
			Math.round((videoWorkerCmdEditCameraUpdate.gInPh / window.devicePixelRatio) * 1000) / 1000;
		DomUI.uiEditCursorGInPw =
			Math.round((videoWorkerCmdEditCameraUpdate.gInPw / window.devicePixelRatio) * 1000) / 1000;
		DomUI.editCursor();
	}

	private static editCursor(): void {
		let applicationType: ApplicationType = DomUI.uiEditApplicationType,
			brushSize: number = DomUI.uiEditBrushSize,
			brushSizeEff: number,
			cursor: HTMLElement = DomUI.domElementsUIEdit['application-cursor'],
			div: HTMLElement,
			div2: HTMLElement,
			divs: HTMLElement[],
			divWrapper: HTMLElement,
			divWrapper2: HTMLElement,
			gInPh: number = DomUI.uiEditCursorGInPh,
			gInPw: number = DomUI.uiEditCursorGInPw,
			i: number,
			j: number,
			scratch: number;

		// Erase cursor child nodes
		cursor.textContent = '';

		if (!DomUI.uiEditCursorReady) {
			cursor.style.display = 'none';
		} else if (applicationType === ApplicationType.FILL) {
			cursor.style.display = 'none';
		} else {
			div = document.createElement('div');
			div.className = 'node';
			div.style.height = gInPh + 'px';
			div.style.width = gInPw + 'px';
			divs = [];
			divWrapper = document.createElement('div');
			divWrapper.className = 'group';

			if (applicationType === ApplicationType.BRUSH) {
				brushSizeEff = brushSize + 1;

				// Build div arrays and attach upper portion
				for (i = 0; i < brushSizeEff; i++) {
					divWrapper = <HTMLElement>divWrapper.cloneNode();
					divWrapper2 = <HTMLElement>divWrapper.cloneNode();

					scratch = i * 2 + 1;
					for (j = 0; j < scratch; j++) {
						div = <HTMLElement>div.cloneNode();
						div.className = 'node';
						div2 = <HTMLElement>div.cloneNode();

						if (j === 0) {
							div.classList.add('left');
							div2.classList.add('left');
							div.classList.add('top');
							div2.classList.add('bottom');

							if (i === brushSize) {
								div.classList.add('bottom');
							}
						}

						if (j === i * 2) {
							div.classList.add('right');
							div2.classList.add('right');
							div.classList.add('top');
							div2.classList.add('bottom');

							if (i === brushSize) {
								div.classList.add('bottom');
							}
						}

						divWrapper.appendChild(div);
						divWrapper2.appendChild(div2);
					}

					cursor.appendChild(divWrapper);
					divs.push(divWrapper2);
				}

				// Invert and attach lower portion
				for (i = divs.length - 2; i > -1; i--) {
					cursor.appendChild(<HTMLElement>divs[i]);
				}
			} else if (applicationType === ApplicationType.ERASER || applicationType === ApplicationType.STAMP) {
				brushSizeEff = (brushSize - 1) * 2 + 1;

				for (i = 0; i < brushSizeEff; i++) {
					divWrapper = <HTMLElement>divWrapper.cloneNode();

					for (j = 0; j < brushSizeEff; j++) {
						div = <HTMLElement>div.cloneNode();
						div.className = 'node';
						divWrapper.appendChild(div);

						if (i === 0) {
							div.classList.add('top');
						}

						if (i === brushSizeEff - 1) {
							div.classList.add('bottom');
						}

						if (j === 0) {
							div.classList.add('left');
						}

						if (j === brushSizeEff - 1) {
							div.classList.add('right');
						}
					}

					cursor.appendChild(divWrapper);
				}
			} else {
				// Pencil
				div.className = 'node all';
				divWrapper.appendChild(div);
				cursor.appendChild(divWrapper);
			}

			// Done
			cursor.style.display = 'flex';
		}
	}

	private static editCursorMove(event: any): void {
		if (DomUI.uiEditCursorReady) {
			let cursorDOMRect: DOMRect = DomUI.domElementsUIEdit['application-cursor'].getBoundingClientRect(),
				feedFittedDOMRect: DOMRect = DomUI.domElements['feed-fitted'].getBoundingClientRect();

			DomUI.domElementsUIEdit['application-cursor'].style.transform =
				`translate(${event.clientX - feedFittedDOMRect.x - cursorDOMRect.width / 2}px, ${event.clientY - feedFittedDOMRect.y - cursorDOMRect.height / 2}px)`;
		}
	}

	private static editMapSelect(assetMapId: string | undefined): void {
		DomUI.displaySpinner(true);
		VideoEngine.workerMapLoadById(assetMapId);
	}

	public static editMouseDown(mouseAction: MouseAction): void {
		if (!DomUI.uiEditCursorReady) {
			return;
		} else if (DomUI.uiEditMouseCmdCollectionActive) {
			console.error('DomUI > editMouseDown: already active');
			return;
		}
		DomUI.uiEditMouseCmdCollectionActive = true;

		let hash: number = MapEditEngine.uiRelXYToGBlockHash(mouseAction);
		DomUI.uiEditMouseCmdCollection.pushEnd(hash);
		DomUI.uiEditMouseCmdCollectionHashesOrigin[hash] = null;

		DomUI.uiEditMouseCmdCollectionPromise = new Promise((resolve: any) => {
			DomUI.editMouseProcessor(resolve);
		});
		DomUI.uiEditMouseCmdCollectionEngaged = true;
	}

	public static editMouseMove(mouseAction: MouseAction): void {
		if (!DomUI.uiEditMouseCmdCollectionEngaged) {
			return;
		}
		let hash: number = MapEditEngine.uiRelXYToGBlockHash(mouseAction);

		// Only add unique origins (don't recalc what's already been done)
		if (DomUI.uiEditMouseCmdCollectionHashesOrigin[hash] === undefined) {
			DomUI.uiEditMouseCmdCollectionHashesOrigin[hash] = null;
			DomUI.uiEditMouseCmdCollection.pushEnd(hash);
		}
	}

	// Submit commands based on interval
	private static editMouseProcessor(resolve: any): void {
		let applyType: VideoCmdGameModeEditApplyType,
			arrayPush: any = Array.prototype.push,
			collection: DoubleLinkedList<number> = DomUI.uiEditMouseCmdCollection,
			coordinate: GridCoordinate,
			gridConfig: GridConfig,
			gHashes: number[],
			hash: number,
			interval: ReturnType<typeof setInterval> = setInterval(() => {
				gHashes = new Array();
				length = collection.getLength();

				if (length) {
					// Process available positions within this time interval
					while (length) {
						length--;

						hash = <number>collection.popStart(); // Oldest in front
						arrayPush.apply(gHashes, DomUI.editMouseEffected(gridConfig, hash));
					}

					// console.log('gHashes.length', gHashes.length);
					// for (let i in gHashes) {
					// 	console.log('  >> ' + i + ':', UtilEngine.gridHashFrom(gHashes[i]), gHashes[i]);
					// }

					payload = MapEditEngine.uiApply(
						gHashes,
						<any>DomUI.uiEditApplicationProperties,
						DomUI.uiEditApplyType,
						z,
					); // Auto-applies to map

					if (payload) {
						VideoEngine.workerGameModeEditApply(payload);
					} else {
						console.error('DomIU > editMouseProcessor: payload failed to generate');
					}
				}

				if (!DomUI.uiEditMouseCmdCollectionEngaged) {
					clearInterval(interval);
					resolve();
				}
			}, 40),
			length: number,
			payload: VideoCmdGameModeEditApply | undefined,
			z: VideoCmdGameModeEditApplyZ = DomUI.uiEditZ;
		gridConfig = MapEditEngine.getGridConfigActive();
	}

	private static editMouseEffected(gridConfig: GridConfig, hash: number): number[] {
		let applicationType: ApplicationType = DomUI.uiEditApplicationType,
			brushSize: number = DomUI.uiEditBrushSize,
			brushSizeEffX: number,
			brushSizeEffY: number,
			coordinate: GridCoordinate,
			effected: { [key: number]: null } = DomUI.uiEditMouseCmdCollectionHashesEffected,
			gHashes: number[] = [],
			jEff: number,
			scratch: number,
			x: number,
			y: number;

		if (applicationType === ApplicationType.FILL) {
			console.warn('DomUI > editMouseEffected: not yet implemented');
		} else {
			if (applicationType === ApplicationType.BRUSH) {
				/*
				 * This brush was probably the hardest thing to solve in the entire project
				 */
				coordinate = UtilEngine.gridHashFrom(hash);
				jEff = Math.max(0, coordinate.gy - brushSize);

				// Bottom Left
				scratch = brushSize;
				for (y = brushSize + 1; y > 0; y--) {
					for (x = brushSize; x > scratch; x--) {
						hash = UtilEngine.gridHashTo(
							Math.max(0, Math.min(gridConfig.gWidth, coordinate.gx - brushSize + x)),
							Math.max(0, Math.min(gridConfig.gHeight, coordinate.gy + y)),
						);
						if (effected[hash] === undefined) {
							effected[hash] = null;
							gHashes.push(hash);
						}
					}
					scratch--;
				}

				// Bottom Right
				scratch = brushSize;
				for (y = 0; y < brushSize + 1; y++) {
					for (x = 0; x < scratch; x++) {
						hash = UtilEngine.gridHashTo(
							Math.max(0, Math.min(gridConfig.gWidth, coordinate.gx + x)),
							Math.max(0, Math.min(gridConfig.gHeight, coordinate.gy + y + 1)),
						);
						if (effected[hash] === undefined) {
							effected[hash] = null;
							gHashes.push(hash);
						}
					}
					scratch--;
				}

				// Top Left
				scratch = brushSize;
				for (y = 0; y < brushSize + 1; y++) {
					for (x = scratch; x < brushSize + 1; x++) {
						hash = UtilEngine.gridHashTo(
							Math.max(0, Math.min(gridConfig.gWidth, coordinate.gx - brushSize + x)),
							Math.max(0, Math.min(gridConfig.gHeight, coordinate.gy - brushSize + y)),
						);
						if (effected[hash] === undefined) {
							effected[hash] = null;
							gHashes.push(hash);
						}
					}
					scratch--;
				}

				// Top Right
				scratch = brushSize;
				for (y = 0; y < brushSize + 1; y++) {
					for (x = scratch; x < brushSize + 1; x++) {
						hash = UtilEngine.gridHashTo(
							Math.max(0, Math.min(gridConfig.gWidth, coordinate.gx + brushSize - x)),
							Math.max(0, Math.min(gridConfig.gHeight, coordinate.gy - brushSize + y)),
						);
						if (effected[hash] === undefined) {
							effected[hash] = null;
							gHashes.push(hash);
						}
					}
					scratch--;
				}
			} else if (applicationType === ApplicationType.ERASER || applicationType === ApplicationType.STAMP) {
				if (brushSize === 1) {
					if (effected[hash] === undefined) {
						effected[hash] = null;
						gHashes.push(hash);
					}
				} else {
					coordinate = UtilEngine.gridHashFrom(hash);
					brushSizeEffX = Math.min(gridConfig.gWidth, coordinate.gx + brushSize);
					brushSizeEffY = Math.min(gridConfig.gHeight, coordinate.gy + brushSize);
					jEff = Math.max(0, coordinate.gy - (brushSize - 1));

					for (x = Math.max(0, coordinate.gx - (brushSize - 1)); x < brushSizeEffX; x++) {
						for (y = jEff; y < brushSizeEffY; y++) {
							hash = UtilEngine.gridHashTo(x, y);
							if (effected[hash] === undefined) {
								effected[hash] = null;
								gHashes.push(hash);
							}
						}
					}
				}
			} else {
				// Pencil
				if (effected[hash] === undefined) {
					effected[hash] = null;
					gHashes.push(hash);
				}
			}
		}

		return gHashes;
	}

	public static async editMouseUp(mouseAction: MouseAction): Promise<void> {
		if (!DomUI.uiEditMouseCmdCollectionActive) {
			return;
		}
		DomUI.uiEditMouseCmdCollectionEngaged = false;
		DomUI.displaySpinner(true);
		await DomUI.uiEditMouseCmdCollectionPromise;

		// Make sure the down and up action wasn't in a race condition
		setTimeout(() => {
			DomUI.uiEditMouseCmdCollectionEngaged = false;
			DomUI.uiEditMouseCmdCollection = new DoubleLinkedList<number>();
			DomUI.uiEditMouseCmdCollectionHashesEffected = <any>new Object();
			DomUI.uiEditMouseCmdCollectionHashesOrigin = <any>new Object();
			DomUI.displaySpinner(false);
			DomUI.uiEditMouseCmdCollectionActive = false;

			if (MapEditEngine.getHistoryRedoLength()) {
				DomUI.domElementsUIEdit['redo'].classList.remove('disabled');
			} else {
				DomUI.domElementsUIEdit['redo'].classList.add('disabled');
			}

			if (MapEditEngine.getHistoryUndoLength()) {
				DomUI.domElementsUIEdit['undo'].classList.remove('disabled');
			} else {
				DomUI.domElementsUIEdit['undo'].classList.add('disabled');
			}
		});
	}

	private static editRedo(): void {
		DomUI.displaySpinner(true);
		MapEditEngine.historyRedo();
		VideoEngine.workerGameModeEditRedo();
	}

	private static editUndo(): void {
		DomUI.displaySpinner(true);
		MapEditEngine.historyUndo();
		VideoEngine.workerGameModeEditUndo();
	}

	protected static async initializeDomUI(oldTVIntro: boolean): Promise<void> {
		if (DomUI.domUIinitialized) {
			console.error('DomUI > initializeDomUI: already initialized');
			return;
		}
		DomUI.domUIinitialized = true;
		let maps: AssetMap[] = Object.values(DomUI.assetManifestMaster.maps).sort(
			(a: AssetMap, b: AssetMap) => a.order - b.order,
		);

		VideoEngine.setCallbackMapAsset((mapActive: MapActive | undefined) => {
			if (mapActive) {
				MapEditEngine.load(mapActive);

				DomUI.uiEditCursorGInPh = Math.round((mapActive.camera.gInPh / window.devicePixelRatio) * 1000) / 1000;
				DomUI.uiEditCursorGInPw = Math.round((mapActive.camera.gInPw / window.devicePixelRatio) * 1000) / 1000;
				DomUI.editCursor();
			} else {
				DomUI.statusFlash(false);
			}

			DomUI.domElementsUIEdit['map'].classList.remove('active');
			DomUI.domElementsUIEdit['application-map-modal'].style.display = 'none';
			DomUI.displaySpinner(false);
		});
		VideoEngine.setCallbackEditComplete(() => {
			DomUI.displaySpinner(false);
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
			}

			DomUI.domElementsUIEdit['z-primary'].click();
			DomUI.domElementsUIEdit['application-type-menu-pencil'].click(); // Default
			DomUI.domElementsUIEdit['map'].click();
			DomUI.domElements['feed-fitted'].addEventListener('mousemove', DomUI.editCursorMove);
			DomUI.domElementsUIEdit['mode-menu-block'].click();
		} else {
			DomUI.domElements['feed-fitted'].removeEventListener('mousemove', DomUI.editCursorMove);
			for (let i in domUIEdit) {
				domUIEditElement = domUIEdit[i];
				if (domUIEditElement.className.includes('dirt-engine-ui-edit')) {
					domUIEditElement.style.display = 'none';
				}
			}
		}
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
			applicationCursor: HTMLElement,
			applicationHistory: HTMLElement,
			applicationType: HTMLElement,
			applicationTypeMenu: HTMLElement,
			applicationTypeMenuBrush: HTMLElement,
			applicationTypeMenuEraser: HTMLElement,
			applicationTypeMenuFill: HTMLElement,
			applicationTypeMenuPencil: HTMLElement,
			applicationTypeMenuStamp: HTMLElement,
			applicationTypePixelSize: HTMLElement,
			applicationTypePixelSizeInputRange: HTMLInputElement,
			applicationTypePixelSizeInputText: HTMLInputElement,
			applicationWrap: HTMLElement,
			assetMap: AssetMap,
			blockMenu: HTMLElement,
			detailsContextMenu: HTMLElement,
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
			palette: HTMLElement,
			paletteButton: HTMLElement,
			paletteModal: HTMLElement,
			paletteModalContent: HTMLElement,
			paletteModalContentBody: HTMLElement,
			paletteModalContentBodyButton: HTMLElement,
			paletteModalContentBodyButtons: HTMLElement,
			paletteModalContentBodyButtonsApply: HTMLElement,
			paletteModalContentBodyButtonsCancel: HTMLElement,
			paletteModalContentHeader: HTMLElement,
			redo: HTMLElement,
			redoButton: HTMLElement,
			save: HTMLElement,
			saveButton: HTMLElement,
			selectModal: HTMLElement,
			selectModalContent: HTMLElement,
			settings: HTMLElement,
			settingsButton: HTMLElement,
			settingsModal: HTMLElement,
			settingsModalContent: HTMLElement,
			settingsModalContentBody: HTMLElement,
			settingsModalContentBodyButtons: HTMLElement,
			settingsModalContentBodyButtonsApply: HTMLElement,
			settingsModalContentBodyButtonsCancel: HTMLElement,
			settingsModalContentBodyText: HTMLInputElement,
			settingsModalContentHeader: HTMLElement,
			spinnerModal: HTMLElement,
			spinnerModalContent: HTMLElement,
			t: HTMLElement,
			td: HTMLElement,
			tr: HTMLElement,
			undo: HTMLElement,
			undoButton: HTMLElement,
			view: HTMLElement,
			viewButton: HTMLElement,
			viewMenu: HTMLElement,
			viewMenuAudio: HTMLElement,
			viewMenuBlock: HTMLElement,
			viewMenuLight: HTMLElement,
			z: HTMLElement,
			zBackground: HTMLElement,
			zForeground: HTMLElement,
			zPrimary: HTMLElement;

		/*
		 * Application cursor (first)
		 */
		applicationCursor = document.createElement('div');
		applicationCursor.className = 'dirt-engine-ui-edit application-cursor';
		DomUI.domElements['feed-fitted-ui-application-cursor'] = applicationCursor;
		DomUI.domElementsUIEdit['application-cursor'] = applicationCursor;
		domFeedFitted.appendChild(applicationCursor);

		/*
		 * Application Type
		 */
		application = document.createElement('div');
		application.className = 'dirt-engine-ui-edit application';
		DomUI.domElements['feed-fitted-ui-application'] = application;
		DomUI.domElementsUIEdit['application'] = application;
		domFeedFitted.appendChild(application);

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
		application.appendChild(applicationType);

		/*
		 * Application Type: Menu
		 */
		applicationTypeMenu = document.createElement('div');
		applicationTypeMenu.className = 'menu';
		DomUI.domElements['feed-fitted-ui-application-type-menu'] = applicationTypeMenu;
		DomUI.domElementsUIEdit['application-type-menu'] = applicationTypeMenu;
		application.appendChild(applicationTypeMenu);

		applicationTypeMenuPencil = document.createElement('div');
		applicationTypeMenuPencil.className = 'button-style pencil active';
		applicationTypeMenuPencil.innerText = 'Pencil';
		applicationTypeMenuPencil.onclick = () => {
			applicationType.innerText = 'P';
			applicationTypeMenuPencil.classList.add('active');
			applicationTypeMenuBrush.classList.remove('active');
			applicationTypeMenuFill.classList.remove('active');
			applicationTypeMenuEraser.classList.remove('active');
			applicationTypeMenuStamp.classList.remove('active');

			applicationTypePixelSizeInputRange.disabled = true;
			applicationTypePixelSizeInputRange.max = '1';
			applicationTypePixelSizeInputRange.min = '1';
			applicationTypePixelSizeInputRange.value = '1';
			applicationTypePixelSizeInputText.disabled = true;
			applicationTypePixelSizeInputText.max = '1';
			applicationTypePixelSizeInputText.min = '1';
			applicationTypePixelSizeInputText.value = '1';
			applicationTypePixelSize.style.display = 'flex';
			DomUI.uiEditBrushSize = 1;

			DomUI.uiEditApplicationType = ApplicationType.PENCIL;
			feedFitted.classList.remove('dirt-engine-cursor-pencil');
			feedFitted.classList.remove('dirt-engine-cursor-paintbrush');
			feedFitted.classList.remove('dirt-engine-cursor-fill');
			feedFitted.classList.remove('dirt-engine-cursor-eraser');
			feedFitted.classList.remove('dirt-engine-cursor-stamp');

			if (DomUI.uiEditCursorReady) {
				feedFitted.classList.add('dirt-engine-cursor-pencil');
				DomUI.editCursor();
			}
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
			applicationTypeMenuStamp.classList.remove('active');

			applicationTypePixelSizeInputRange.disabled = false;
			applicationTypePixelSizeInputRange.max = '100';
			applicationTypePixelSizeInputRange.min = '1';
			applicationTypePixelSizeInputRange.value = '1';
			applicationTypePixelSizeInputText.disabled = false;
			applicationTypePixelSizeInputText.max = '100';
			applicationTypePixelSizeInputText.min = '1';
			applicationTypePixelSizeInputText.value = '1';
			applicationTypePixelSize.style.display = 'flex';
			DomUI.uiEditBrushSize = 1;

			DomUI.uiEditApplicationType = ApplicationType.BRUSH;
			feedFitted.classList.remove('dirt-engine-cursor-pencil');
			feedFitted.classList.remove('dirt-engine-cursor-paintbrush');
			feedFitted.classList.remove('dirt-engine-cursor-fill');
			feedFitted.classList.remove('dirt-engine-cursor-eraser');
			feedFitted.classList.remove('dirt-engine-cursor-stamp');

			if (DomUI.uiEditCursorReady) {
				feedFitted.classList.add('dirt-engine-cursor-paintbrush');
				DomUI.editCursor();
			}
		};
		DomUI.domElements['feed-fitted-ui-application-type-menu-brush'] = applicationTypeMenuBrush;
		DomUI.domElementsUIEdit['application-type-menu-brush'] = applicationTypeMenuBrush;
		applicationTypeMenu.appendChild(applicationTypeMenuBrush);

		applicationTypeMenuStamp = document.createElement('div');
		applicationTypeMenuStamp.className = 'button-style stamp';
		applicationTypeMenuStamp.innerText = 'Stamp';
		applicationTypeMenuStamp.onclick = () => {
			applicationType.innerText = 'S';
			applicationTypeMenuPencil.classList.remove('active');
			applicationTypeMenuBrush.classList.remove('active');
			applicationTypeMenuFill.classList.remove('active');
			applicationTypeMenuEraser.classList.remove('active');
			applicationTypeMenuStamp.classList.add('active');

			applicationTypePixelSizeInputRange.disabled = false;
			applicationTypePixelSizeInputRange.max = '100';
			applicationTypePixelSizeInputRange.min = '1';
			applicationTypePixelSizeInputRange.value = '1';
			applicationTypePixelSizeInputText.disabled = false;
			applicationTypePixelSizeInputText.max = '100';
			applicationTypePixelSizeInputText.min = '1';
			applicationTypePixelSizeInputText.value = '1';
			applicationTypePixelSize.style.display = 'flex';
			DomUI.uiEditBrushSize = 1;

			DomUI.uiEditApplicationType = ApplicationType.STAMP;
			feedFitted.classList.remove('dirt-engine-cursor-pencil');
			feedFitted.classList.remove('dirt-engine-cursor-paintbrush');
			feedFitted.classList.remove('dirt-engine-cursor-fill');
			feedFitted.classList.remove('dirt-engine-cursor-eraser');
			feedFitted.classList.remove('dirt-engine-cursor-stamp');

			if (DomUI.uiEditCursorReady) {
				feedFitted.classList.add('dirt-engine-cursor-stamp');
				DomUI.editCursor();
			}
		};
		DomUI.domElements['feed-fitted-ui-application-type-menu-stamp'] = applicationTypeMenuStamp;
		DomUI.domElementsUIEdit['application-type-menu-stamp'] = applicationTypeMenuStamp;
		applicationTypeMenu.appendChild(applicationTypeMenuStamp);

		applicationTypeMenuFill = document.createElement('div');
		applicationTypeMenuFill.className = 'button-style fill';
		applicationTypeMenuFill.innerText = 'Fill';
		applicationTypeMenuFill.onclick = () => {
			applicationType.innerText = 'F';
			applicationTypeMenuPencil.classList.remove('active');
			applicationTypeMenuBrush.classList.remove('active');
			applicationTypeMenuFill.classList.add('active');
			applicationTypeMenuEraser.classList.remove('active');
			applicationTypeMenuStamp.classList.remove('active');
			applicationTypePixelSize.style.display = 'none';
			DomUI.uiEditApplicationType = ApplicationType.FILL;
			DomUI.uiEditBrushSize = 0;
			feedFitted.classList.remove('dirt-engine-cursor-pencil');
			feedFitted.classList.remove('dirt-engine-cursor-paintbrush');
			feedFitted.classList.remove('dirt-engine-cursor-fill');
			feedFitted.classList.remove('dirt-engine-cursor-eraser');
			feedFitted.classList.remove('dirt-engine-cursor-stamp');

			if (DomUI.uiEditCursorReady) {
				feedFitted.classList.add('dirt-engine-cursor-fill');
				DomUI.editCursor();
			}
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
			applicationTypeMenuStamp.classList.remove('active');

			applicationTypePixelSizeInputRange.disabled = false;
			applicationTypePixelSizeInputRange.max = '100';
			applicationTypePixelSizeInputRange.min = '1';
			applicationTypePixelSizeInputRange.value = '1';
			applicationTypePixelSizeInputText.disabled = false;
			applicationTypePixelSizeInputText.max = '100';
			applicationTypePixelSizeInputText.min = '1';
			applicationTypePixelSizeInputText.value = '1';
			applicationTypePixelSize.style.display = 'flex';
			DomUI.uiEditBrushSize = 1;

			DomUI.uiEditApplicationType = ApplicationType.ERASER;
			feedFitted.classList.remove('dirt-engine-cursor-pencil');
			feedFitted.classList.remove('dirt-engine-cursor-paintbrush');
			feedFitted.classList.remove('dirt-engine-cursor-fill');
			feedFitted.classList.remove('dirt-engine-cursor-eraser');
			feedFitted.classList.remove('dirt-engine-cursor-stamp');

			if (DomUI.uiEditCursorReady) {
				feedFitted.classList.add('dirt-engine-cursor-eraser');
				DomUI.editCursor();
			}
		};
		DomUI.domElements['feed-fitted-ui-application-type-menu-erase'] = applicationTypeMenuEraser;
		DomUI.domElementsUIEdit['application-type-menu-eraser'] = applicationTypeMenuEraser;
		applicationTypeMenu.appendChild(applicationTypeMenuEraser);

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
			DomUI.editCursor();
		};
		DomUI.domElements['feed-fitted-ui-application-pixel-size-range'] = applicationTypePixelSizeInputRange;
		DomUI.domElementsUIEdit['application-pixel-size-range'] = applicationTypePixelSizeInputRange;
		applicationTypePixelSize.appendChild(applicationTypePixelSizeInputRange);

		applicationTypePixelSizeInputText = document.createElement('input');
		applicationTypePixelSizeInputText.className = 'input text';
		applicationTypePixelSizeInputText.disabled = true;
		applicationTypePixelSizeInputText.max = '100';
		applicationTypePixelSizeInputText.min = '1';
		applicationTypePixelSizeInputText.step = '1';
		applicationTypePixelSizeInputText.type = 'number';
		applicationTypePixelSizeInputText.oninput = (event: any) => {
			applicationTypePixelSizeInputRange.value = event.target.value;
			DomUI.uiEditBrushSize = Number(event.target.value);
			DomUI.editCursor();
		};
		applicationTypePixelSizeInputText.onblur = (event: any) => {
			applicationTypePixelSizeInputText.value = applicationTypePixelSizeInputRange.value;
			DomUI.uiEditBrushSize = Number(applicationTypePixelSizeInputRange.value);
			DomUI.editCursor();
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
			MouseEngine.setSuspendWheel(true);
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
				if (MapEditEngine.uiChanged) {
					if (!confirm('Discard changes?')) {
						map.classList.remove('active');
						return;
					}
				}
				mapModalContent.style.display = 'block';
				mapModal.style.display = 'flex';
				MouseEngine.setSuspendWheel(true);
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
		 * Palette
		 */
		palette = document.createElement('div');
		palette.className = 'dirt-engine-ui-edit palette';
		palette.onclick = (event: any) => {
			palette.classList.add('active');

			// Menu buttons
			t = DomUI.domElementsUIEdit['application-palette-modal-content-body-table'];
			t.textContent = '';

			// Table: Audio Block
			tr = document.createElement('tr');
			td = document.createElement('td');
			paletteModalContentBodyButton = document.createElement('div');
			paletteModalContentBodyButton.className = 'button';
			paletteModalContentBodyButton.innerText = 'Audio Block';
			paletteModalContentBodyButton.onclick = () => {
				DomUI.detailsModalAudioBlock();
			};
			td.appendChild(paletteModalContentBodyButton);
			tr.appendChild(td);
			t.appendChild(tr);

			// Table: Audio Tag Effect Trigger
			tr = document.createElement('tr');
			td = document.createElement('td');
			paletteModalContentBodyButton = document.createElement('div');
			paletteModalContentBodyButton.className = 'button';
			paletteModalContentBodyButton.innerText = 'Audio Tag Effect Trigger';
			paletteModalContentBodyButton.onclick = () => {
				DomUI.detailsModalAudioTagEffectTrigger();
			};
			td.appendChild(paletteModalContentBodyButton);
			tr.appendChild(td);
			t.appendChild(tr);

			// Table: Audio Tag Music Trigger
			tr = document.createElement('tr');
			td = document.createElement('td');
			paletteModalContentBodyButton = document.createElement('div');
			paletteModalContentBodyButton.className = 'button';
			paletteModalContentBodyButton.innerText = 'Audio Tag Music Trigger';
			paletteModalContentBodyButton.onclick = () => {
				DomUI.detailsModalAudioTagMusicTrigger();
			};
			td.appendChild(paletteModalContentBodyButton);
			tr.appendChild(td);
			t.appendChild(tr);

			// Table: Audio Tag Music Fade Trigger
			tr = document.createElement('tr');
			td = document.createElement('td');
			paletteModalContentBodyButton = document.createElement('div');
			paletteModalContentBodyButton.className = 'button';
			paletteModalContentBodyButton.innerText = 'Audio Tag Music Fade Trigger';
			paletteModalContentBodyButton.onclick = () => {
				DomUI.detailsModalAudioTagMusicFadeTrigger();
			};
			td.appendChild(paletteModalContentBodyButton);
			tr.appendChild(td);
			t.appendChild(tr);

			// Table: Audio Tag Music Pause Trigger
			tr = document.createElement('tr');
			td = document.createElement('td');
			paletteModalContentBodyButton = document.createElement('div');
			paletteModalContentBodyButton.className = 'button';
			paletteModalContentBodyButton.innerText = 'Audio Tag Music Pause Trigger';
			paletteModalContentBodyButton.onclick = () => {
				DomUI.detailsModalAudioTagMusicPauseTrigger();
			};
			td.appendChild(paletteModalContentBodyButton);
			tr.appendChild(td);
			t.appendChild(tr);

			// Table: Audio Tag Music Unpause Trigger
			tr = document.createElement('tr');
			td = document.createElement('td');
			paletteModalContentBodyButton = document.createElement('div');
			paletteModalContentBodyButton.className = 'button';
			paletteModalContentBodyButton.innerText = 'Audio Tag Music Unpause Trigger';
			paletteModalContentBodyButton.onclick = () => {
				DomUI.detailsModalAudioTagMusicUnpauseTrigger();
			};
			td.appendChild(paletteModalContentBodyButton);
			tr.appendChild(td);
			t.appendChild(tr);

			// Table: Image Block
			tr = document.createElement('tr');
			td = document.createElement('td');
			paletteModalContentBodyButton = document.createElement('div');
			paletteModalContentBodyButton.className = 'button';
			paletteModalContentBodyButton.innerText = 'Image Block';
			paletteModalContentBodyButton.onclick = () => {
				DomUI.detailsModalImageBlock();
			};
			td.appendChild(paletteModalContentBodyButton);
			tr.appendChild(td);
			t.appendChild(tr);

			// Table: Light
			tr = document.createElement('tr');
			td = document.createElement('td');
			paletteModalContentBodyButton = document.createElement('div');
			paletteModalContentBodyButton.className = 'button';
			paletteModalContentBodyButton.innerText = 'Light';
			paletteModalContentBodyButton.onclick = () => {
				DomUI.detailsModalLight();
			};
			td.appendChild(paletteModalContentBodyButton);
			tr.appendChild(td);
			t.appendChild(tr);

			paletteModalContentHeader.innerText = 'Palette';
			paletteModalContentBody.classList.remove('buttoned');
			paletteModalContentBodyButtons.style.display = 'none';
			paletteModal.style.display = 'flex';
			MouseEngine.setSuspendWheel(true);
		};
		DomUI.domElements['feed-fitted-ui-palette'] = palette;
		DomUI.domElementsUIEdit['palette'] = palette;
		domFeedFitted.appendChild(palette);

		paletteButton = document.createElement('div');
		paletteButton.className = 'dirt-engine-icon palette';
		DomUI.domElements['feed-fitted-ui-palette-button'] = paletteButton;
		DomUI.domElementsUIEdit['palette-button'] = paletteButton;
		palette.appendChild(paletteButton);

		/*
		 * Redo
		 */
		redo = document.createElement('div');
		redo.className = 'dirt-engine-ui-edit redo disabled';
		redo.onclick = () => {
			let length: number = MapEditEngine.getHistoryRedoLength();

			if (length) {
				DomUI.editRedo();
				length--;

				if (length) {
					redo.classList.remove('disabled');
				} else {
					redo.classList.add('disabled');
				}

				if (MapEditEngine.getHistoryUndoLength()) {
					undo.classList.remove('disabled');
				} else {
					undo.classList.add('disabled');
				}
			}
		};
		DomUI.domElements['feed-fitted-ui-redo'] = redo;
		DomUI.domElementsUIEdit['redo'] = redo;
		domFeedFitted.appendChild(redo);

		redoButton = document.createElement('div');
		redoButton.className = 'dirt-engine-icon redo';
		DomUI.domElements['feed-fitted-ui-redo-button'] = redoButton;
		DomUI.domElementsUIEdit['redo-button'] = redoButton;
		redo.appendChild(redoButton);

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
			// TODO
			//settingsModalContentBodyText.value = MapEditEngine.map.name;

			DomUI.domElementsUIEdit['application-settings-modal'].style.display = 'flex';
			MouseEngine.setSuspendWheel(true);
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
		 * View
		 */
		view = document.createElement('div');
		view.className = 'dirt-engine-ui-edit view';
		view.onclick = (event: any) => {
			if (viewMenu.style.display !== 'block') {
				view.classList.add('active');
				viewMenu.style.opacity = '1';
				viewMenu.style.display = 'block';

				setTimeout(() => {
					let close = () => {
						view.classList.remove('active');
						viewMenu.style.opacity = '0';
						document.removeEventListener('click', close);

						// Remove application cursor
						if (!DomUI.uiEditCursorReady) {
							feedFitted.classList.remove('dirt-engine-cursor-pencil');
							feedFitted.classList.remove('dirt-engine-cursor-paintbrush');
							feedFitted.classList.remove('dirt-engine-cursor-fill');
							feedFitted.classList.remove('dirt-engine-cursor-eraser');
							feedFitted.classList.remove('dirt-engine-cursor-stamp');
							DomUI.editCursor();
						}

						setTimeout(() => {
							viewMenu.style.display = 'none';
						}, 125); // sync with scss
					};
					document.addEventListener('click', close);
				});
			}
		};
		DomUI.domElements['feed-fitted-ui-view'] = view;
		DomUI.domElementsUIEdit['view'] = view;
		domFeedFitted.appendChild(view);

		viewButton = document.createElement('div');
		viewButton.className = 'dirt-engine-icon eye';
		DomUI.domElements['feed-fitted-ui-view-button'] = viewButton;
		DomUI.domElementsUIEdit['view-button'] = viewButton;
		view.appendChild(viewButton);

		/*
		 * View: Menu
		 */
		viewMenu = document.createElement('div');
		viewMenu.className = 'menu';
		DomUI.domElements['feed-fitted-ui-view-menu'] = viewMenu;
		DomUI.domElementsUIEdit['view-menu'] = viewMenu;
		view.appendChild(viewMenu);

		viewMenuAudio = document.createElement('div');
		viewMenuAudio.className = 'button-style audio';
		viewMenuAudio.innerText = 'Audio';
		viewMenuAudio.onclick = (event: any) => {
			viewMenuAudio.classList.add('active');
			viewMenuBlock.classList.remove('active');
			viewMenuLight.classList.remove('active');

			zBackground.classList.add('disabled');
			zForeground.classList.add('disabled');
			zPrimary.classList.remove('disabled');

			view.classList.add('overlay-text');
			view.classList.add('audio');
			view.classList.remove('block');
			view.classList.remove('light');

			DomUI.uiEditCursorReady = false;
			// Undraw cursor

			if (DomUI.uiEditZ !== VideoCmdGameModeEditApplyZ.PRIMARY) {
				zPrimary.click();
			}
		};
		DomUI.domElements['feed-fitted-ui-view-menu-audio'] = viewMenuAudio;
		DomUI.domElementsUIEdit['mode-menu-audio'] = viewMenuAudio;
		viewMenu.appendChild(viewMenuAudio);

		viewMenuBlock = document.createElement('div');
		viewMenuBlock.className = 'button-style block active';
		viewMenuBlock.innerText = 'Block';
		viewMenuBlock.onclick = () => {
			viewMenuAudio.classList.remove('active');
			viewMenuBlock.classList.add('active');
			viewMenuLight.classList.remove('active');

			zBackground.classList.remove('disabled');
			zForeground.classList.remove('disabled');
			zPrimary.classList.remove('disabled');

			view.classList.add('overlay-text');
			view.classList.remove('audio');
			view.classList.add('block');
			view.classList.remove('light');

			DomUI.uiEditCursorReady = false;
			// Undraw cursor
		};
		DomUI.domElements['feed-fitted-ui-view-menu-block'] = viewMenuBlock;
		DomUI.domElementsUIEdit['mode-menu-block'] = viewMenuBlock;
		viewMenu.appendChild(viewMenuBlock);

		viewMenuLight = document.createElement('div');
		viewMenuLight.className = 'button-style light';
		viewMenuLight.innerText = 'Light';
		viewMenuLight.onclick = () => {
			viewMenuAudio.classList.remove('active');
			viewMenuBlock.classList.remove('active');
			viewMenuLight.classList.add('active');

			zBackground.classList.add('disabled');
			zForeground.classList.remove('disabled');
			zPrimary.classList.remove('disabled');

			view.classList.add('overlay-text');
			view.classList.remove('audio');
			view.classList.remove('block');
			view.classList.add('light');

			DomUI.uiEditCursorReady = false;
			// Undraw cursor

			if (DomUI.uiEditZ === VideoCmdGameModeEditApplyZ.BACKGROUND) {
				zPrimary.click();
			}
		};
		DomUI.domElements['feed-fitted-ui-view-menu-light'] = viewMenuLight;
		DomUI.domElementsUIEdit['mode-menu-light'] = viewMenuLight;
		viewMenu.appendChild(viewMenuLight);

		/*
		 * Undo
		 */
		undo = document.createElement('div');
		undo.className = 'dirt-engine-ui-edit undo disabled';
		undo.onclick = () => {
			let length: number = MapEditEngine.getHistoryUndoLength();

			if (length) {
				DomUI.editUndo();
				length--;

				if (length) {
					undo.classList.remove('disabled');
				} else {
					undo.classList.add('disabled');
				}

				if (MapEditEngine.getHistoryRedoLength()) {
					redo.classList.remove('disabled');
				} else {
					redo.classList.add('disabled');
				}
			}
		};
		DomUI.domElements['feed-fitted-ui-undo'] = undo;
		DomUI.domElementsUIEdit['undo'] = undo;
		domFeedFitted.appendChild(undo);

		undoButton = document.createElement('div');
		undoButton.className = 'dirt-engine-icon undo';
		DomUI.domElements['feed-fitted-ui-undo-button'] = undoButton;
		DomUI.domElementsUIEdit['undo-button'] = undoButton;
		undo.appendChild(undoButton);

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
			if (DomUI.uiEditZ === VideoCmdGameModeEditApplyZ.BACKGROUND) {
				return;
			}

			if (DomUI.uiEditZ === VideoCmdGameModeEditApplyZ.PRIMARY) {
				// Remove application cursor
				DomUI.uiEditCursorReady = false;
				feedFitted.classList.remove('dirt-engine-cursor-pencil');
				feedFitted.classList.remove('dirt-engine-cursor-paintbrush');
				feedFitted.classList.remove('dirt-engine-cursor-fill');
				feedFitted.classList.remove('dirt-engine-cursor-eraser');
				feedFitted.classList.remove('dirt-engine-cursor-stamp');
				DomUI.editCursor();
			}

			DomUI.uiEditZ = VideoCmdGameModeEditApplyZ.BACKGROUND;
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
			if (DomUI.uiEditZ === VideoCmdGameModeEditApplyZ.PRIMARY) {
				return;
			}

			DomUI.uiEditZ = VideoCmdGameModeEditApplyZ.PRIMARY;
			zBackground.classList.remove('active');
			zForeground.classList.remove('active');
			zPrimary.classList.add('active');

			// Remove application cursor
			DomUI.uiEditCursorReady = false;
			feedFitted.classList.remove('dirt-engine-cursor-pencil');
			feedFitted.classList.remove('dirt-engine-cursor-paintbrush');
			feedFitted.classList.remove('dirt-engine-cursor-fill');
			feedFitted.classList.remove('dirt-engine-cursor-eraser');
			feedFitted.classList.remove('dirt-engine-cursor-stamp');
			DomUI.editCursor();
		};
		DomUI.domElements['feed-fitted-ui-z-foreground'] = zPrimary;
		DomUI.domElementsUIEdit['z-primary'] = zPrimary;
		z.appendChild(zPrimary);

		zForeground = document.createElement('div');
		zForeground.className = 'button foreground';
		zForeground.innerText = 'F';
		zForeground.onclick = () => {
			if (DomUI.uiEditZ === VideoCmdGameModeEditApplyZ.FOREGROUND) {
				return;
			}

			if (DomUI.uiEditZ === VideoCmdGameModeEditApplyZ.PRIMARY) {
				// Remove application cursor
				DomUI.uiEditCursorReady = false;
				feedFitted.classList.remove('dirt-engine-cursor-pencil');
				feedFitted.classList.remove('dirt-engine-cursor-paintbrush');
				feedFitted.classList.remove('dirt-engine-cursor-fill');
				feedFitted.classList.remove('dirt-engine-cursor-eraser');
				feedFitted.classList.remove('dirt-engine-cursor-stamp');
				DomUI.editCursor();
			}

			DomUI.uiEditZ = VideoCmdGameModeEditApplyZ.FOREGROUND;
			zBackground.classList.remove('active');
			zForeground.classList.add('active');
			zPrimary.classList.remove('active');
		};
		DomUI.domElements['feed-fitted-ui-z-foreground'] = zForeground;
		DomUI.domElementsUIEdit['z-foreground'] = zForeground;
		z.appendChild(zForeground);

		/*
		 * Details: Context Menu
		 */
		detailsContextMenu = document.createElement('div');
		detailsContextMenu.className = 'dirt-engine-ui-edit details-context-menu context-menu';
		DomUI.domElements['feed-fitted-ui-details-context-menu'] = detailsContextMenu;
		DomUI.domElementsUIEdit['application-details-context-menu'] = detailsContextMenu;
		domFeedFitted.appendChild(detailsContextMenu);

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
			MouseEngine.setSuspendWheel(false);
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
				DomUI.editMapSelect(event.target.innerText);
				mapModalContent.style.display = 'none';
				MouseEngine.setSuspendWheel(false);
			};
			DomUI.domElements['feed-fitted-ui-map-modal-content-body-selection-' + i] = mapModalContentBodySelection;
			DomUI.domElementsUIEdit['application-map-modal-content-body-selection-' + i] = mapModalContentBodySelection;
			mapModalContentBody.appendChild(mapModalContentBodySelection);
		}

		mapModalContentBodySelection = document.createElement('div');
		mapModalContentBodySelection.className = 'button';
		mapModalContentBodySelection.innerText = 'New Map';
		mapModalContentBodySelection.onclick = (event: any) => {
			DomUI.editMapSelect(undefined);
			mapModalContent.style.display = 'none';
			MouseEngine.setSuspendWheel(false);
		};
		DomUI.domElements['feed-fitted-ui-map-modal-content-body-selection-new'] = mapModalContentBodySelection;
		DomUI.domElementsUIEdit['application-map-modal-content-body-selection-new'] = mapModalContentBodySelection;
		mapModalContentBody.appendChild(mapModalContentBodySelection);

		/*
		 * Pallete: Modal
		 */
		paletteModal = document.createElement('div');
		paletteModal.className = 'dirt-engine-ui-edit palette-modal modal';
		DomUI.domElements['feed-fitted-ui-palette-modal'] = paletteModal;
		DomUI.domElementsUIEdit['application-palette-modal'] = paletteModal;
		domFeedFitted.appendChild(paletteModal);

		paletteModalContent = document.createElement('div');
		paletteModalContent.className = 'content';
		DomUI.domElements['feed-fitted-ui-palette-modal-content'] = paletteModalContent;
		DomUI.domElementsUIEdit['application-palette-modal-content'] = paletteModalContent;
		paletteModal.appendChild(paletteModalContent);

		paletteModalContentHeader = document.createElement('div');
		paletteModalContentHeader.className = 'header';
		paletteModalContentHeader.innerText = 'Palette';
		DomUI.domElements['feed-fitted-ui-palette-modal-content-header'] = paletteModalContentHeader;
		DomUI.domElementsUIEdit['application-palette-modal-content-header'] = paletteModalContentHeader;
		paletteModalContent.appendChild(paletteModalContentHeader);

		paletteModalContentBody = document.createElement('div');
		paletteModalContentBody.className = 'body buttoned';
		DomUI.domElements['feed-fitted-ui-palette-modal-content-body'] = paletteModalContentBody;
		DomUI.domElementsUIEdit['application-palette-modal-content-body'] = paletteModalContentBody;
		paletteModalContent.appendChild(paletteModalContentBody);

		// Table
		t = document.createElement('table');
		DomUI.domElements['feed-fitted-ui-palette-modal-content-body-table'] = t;
		DomUI.domElementsUIEdit['application-palette-modal-content-body-table'] = t;
		paletteModalContentBody.appendChild(t);

		// Cancel/Save
		paletteModalContentBodyButtons = document.createElement('div');
		paletteModalContentBodyButtons.className = 'buttons';
		DomUI.domElements['feed-fitted-ui-palette-modal-content-buttons'] = paletteModalContentBodyButtons;
		DomUI.domElementsUIEdit['application-palette-modal-content-buttons'] = paletteModalContentBodyButtons;
		paletteModalContent.appendChild(paletteModalContentBodyButtons);

		paletteModalContentBodyButtonsCancel = document.createElement('div');
		paletteModalContentBodyButtonsCancel.className = 'button red';
		paletteModalContentBodyButtonsCancel.innerText = 'Cancel';
		paletteModalContentBodyButtonsCancel.onclick = () => {
			if (!confirm('Are you sure?')) {
				return;
			}
			palette.classList.remove('active');
			DomUI.domElementsUIEdit['application-palette-modal'].style.display = 'none';
			MouseEngine.setSuspendWheel(false);
		};
		DomUI.domElements['feed-fitted-ui-palette-modal-content-buttons-cancel'] = paletteModalContentBodyButtonsCancel;
		DomUI.domElementsUIEdit['application-palette-modal-content-buttons-cancel'] =
			paletteModalContentBodyButtonsCancel;
		paletteModalContentBodyButtons.appendChild(paletteModalContentBodyButtonsCancel);

		paletteModalContentBodyButtonsApply = document.createElement('div');
		paletteModalContentBodyButtonsApply.className = 'button green';
		paletteModalContentBodyButtonsApply.innerText = 'Apply';
		DomUI.domElements['feed-fitted-ui-palette-modal-content-buttons-apply'] = paletteModalContentBodyButtonsApply;
		DomUI.domElementsUIEdit['application-palette-modal-content-buttons-apply'] =
			paletteModalContentBodyButtonsApply;
		paletteModalContentBodyButtons.appendChild(paletteModalContentBodyButtonsApply);

		/*
		 * Select: Modal
		 */
		selectModal = document.createElement('div');
		selectModal.className = 'dirt-engine-ui-edit select-modal modal';
		DomUI.domElements['feed-fitted-ui-select-modal'] = selectModal;
		DomUI.domElementsUIEdit['application-select-modal'] = selectModal;
		domFeedFitted.appendChild(selectModal);

		selectModalContent = document.createElement('div');
		selectModalContent.className = 'content';
		DomUI.domElements['feed-fitted-ui-select-modal-content'] = selectModalContent;
		DomUI.domElementsUIEdit['application-select-modal-content'] = selectModalContent;
		selectModal.appendChild(selectModalContent);

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
		settingsModalContentBodyText = document.createElement('input');
		settingsModalContentBodyText.autocomplete = 'off';
		settingsModalContentBodyText.className = 'input';
		DomUI.domElements['feed-fitted-ui-settings-modal-content-body-name'] = settingsModalContentBodyText;
		DomUI.domElementsUIEdit['application-settings-modal-content-body-name'] = settingsModalContentBodyText;
		td.appendChild(settingsModalContentBodyText);
		tr.appendChild(td);
		t.appendChild(tr);

		// Cancel/Save
		settingsModalContentBodyButtons = document.createElement('div');
		settingsModalContentBodyButtons.className = 'buttons';
		DomUI.domElements['feed-fitted-ui-settings-modal-content-buttons'] = settingsModalContentBodyButtons;
		DomUI.domElementsUIEdit['application-settings-modal-content-buttons'] = settingsModalContentBodyButtons;
		settingsModalContent.appendChild(settingsModalContentBodyButtons);

		settingsModalContentBodyButtonsCancel = document.createElement('div');
		settingsModalContentBodyButtonsCancel.className = 'button red';
		settingsModalContentBodyButtonsCancel.innerText = 'Cancel';
		settingsModalContentBodyButtonsCancel.onclick = () => {
			if (!confirm('Are you sure?')) {
				return;
			}
			settings.classList.remove('active');
			DomUI.domElementsUIEdit['application-settings-modal'].style.display = 'none';
			MouseEngine.setSuspendWheel(false);
		};
		DomUI.domElements['feed-fitted-ui-settings-modal-content-buttons-cancel'] =
			settingsModalContentBodyButtonsCancel;
		DomUI.domElementsUIEdit['application-settings-modal-content-buttons-cancel'] =
			settingsModalContentBodyButtonsCancel;
		settingsModalContentBodyButtons.appendChild(settingsModalContentBodyButtonsCancel);

		settingsModalContentBodyButtonsApply = document.createElement('div');
		settingsModalContentBodyButtonsApply.className = 'button green';
		settingsModalContentBodyButtonsApply.innerText = 'Apply';
		settingsModalContentBodyButtonsApply.onclick = () => {
			//TODO
			//MapEditEngine.map.name = settingsModalContentBodyText.value.trim();

			settings.classList.remove('active');
			DomUI.domElementsUIEdit['application-settings-modal'].style.display = 'none';
		};
		DomUI.domElements['feed-fitted-ui-settings-modal-content-buttons-apply'] = settingsModalContentBodyButtonsApply;
		DomUI.domElementsUIEdit['application-settings-modal-content-buttons-apply'] =
			settingsModalContentBodyButtonsApply;
		settingsModalContentBodyButtons.appendChild(settingsModalContentBodyButtonsApply);

		/*
		 * Spinner: Modal (Last!!!)
		 */
		spinnerModal = document.createElement('div');
		spinnerModal.className = 'dirt-engine-ui-edit spinner-modal modal';
		DomUI.domElements['feed-fitted-ui-spinner-modal'] = spinnerModal;
		DomUI.domElementsUIEdit['application-spinner-modal'] = spinnerModal;
		domFeedFitted.appendChild(spinnerModal);

		spinnerModalContent = document.createElement('div');
		spinnerModalContent.className = 'content';
		DomUI.domElements['feed-fitted-ui-spinner-modal-content'] = spinnerModalContent;
		DomUI.domElementsUIEdit['application-spinner-modal-content'] = spinnerModalContent;
		spinnerModal.appendChild(spinnerModalContent);
	}
}
