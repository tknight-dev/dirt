import {
	AssetAudio,
	AssetAudioType,
	AssetCollection,
	AssetImage,
	AssetImageSrcQuality,
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
	GridAnimation,
	GridAnimationCalc,
	GridAudioTagActivationType,
	GridAudioTagType,
	GridConfig,
	GridCoordinate,
	GridLightType,
	GridImageBlockHalved,
	GridImageTransform,
	GridObject,
	GridObjectType,
} from '../models/grid.model';
import { MapActive, MapConfig } from '../models/map.model';
import { MapAudioAmbientEngine } from '../engines/map-audio-ambient.engine';
import { MapEditEngine } from '../engines/map-edit.engine';
import { MouseAction, MouseEngine } from '../engines/mouse.engine';
import { TouchAction } from '../engines/touch.engine';
import { UtilEngine } from '../engines/util.engine';
import {
	VideoBusInputCmdGameModeEditApply,
	VideoBusInputCmdGameModeEditApplyType,
	VideoBusInputCmdGameModeEditApplyView,
	VideoBusInputCmdGameModeEditApplyZ,
	VideoBusInputCmdGameModeEditDraw,
	VideoBusInputCmdSettings,
	VideoBusInputCmdSettingsFPS,
	VideoBusInputCmdSettingsShadingQuality,
	VideoBusOutputCmdEditCameraUpdate,
} from '../engines/buses/video.model.bus';
import { VideoEngineBus } from '../engines/buses/video.engine.bus';

/**
 * @author tknight-dev
 */
enum ApplicationType {
	PENCIL,
	BRUSH,
	FILL,
	ERASER,
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
	private static domUIRumbleAnimations: Animation[];
	private static domUIRumbleAnimationStreams: HTMLElement[] = [];
	private static domUIRumbleTimeout: ReturnType<typeof setTimeout>;
	private static uiEditApplicationProperties: {};
	private static uiEditApplicationType: ApplicationType;
	public static uiEditApplyType: VideoBusInputCmdGameModeEditApplyType;
	private static uiEditBrushSize: number;
	private static uiEditCursorGInPh: number;
	private static uiEditCursorGInPw: number;
	private static uiEditCursorReady: boolean;
	private static uiEditDraw: VideoBusInputCmdGameModeEditDraw;
	protected static uiEditMode: boolean;
	private static uiEditMouseCmdCollection: DoubleLinkedList<number> = new DoubleLinkedList<number>();
	private static uiEditMouseCmdCollectionHashesEffected: { [key: number]: null } = {};
	private static uiEditMouseCmdCollectionHashesOrigin: { [key: number]: null } = {};
	private static uiEditMouseCmdCollectionActive: boolean;
	private static uiEditMouseCmdCollectionEngaged: boolean;
	private static uiEditMouseCmdCollectionPromise: Promise<void>;
	private static uiEditSpinnerStatus: boolean;
	protected static settings: VideoBusInputCmdSettings;
	private static uiEditView: VideoBusInputCmdGameModeEditApplyView;
	private static uiEditZ: VideoBusInputCmdGameModeEditApplyZ | undefined;

	private static detailsModalSelector(
		assetAudio: boolean,
		assetImage: boolean,
		assetNullable: boolean,
		assetRemovable: boolean,
		selectors: any[],
		callback: (value: any) => void,
	): void {
		let audioBufferId: number,
			div: HTMLElement,
			image: HTMLImageElement,
			imageWrapper: HTMLElement,
			modal = DomUI.domElements['feed-fitted-ui-select-modal'],
			modalContent = DomUI.domElements['feed-fitted-ui-select-modal-content'];

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
			};
			modalContent.appendChild(div);
		}

		if (assetNullable) {
			div = document.createElement('div');
			div.className = 'button yellow';
			div.innerText = 'null';
			div.onclick = () => {
				callback('null');
				modal.style.display = 'none';
				modalContent.textContent = '';
			};
			modalContent.appendChild(div);
		}

		selectors.forEach((selector: any) => {
			if (selector.value === 'null2') {
				return;
			}

			div = document.createElement('div');
			div.className = 'button';
			div.innerText = selector.name;
			div.onclick = () => {
				callback(selector.value);
				modal.style.display = 'none';
				modalContent.textContent = '';

				if (assetAudio) {
					AudioEngine.controlStop(audioBufferId);
				}
			};
			if (assetAudio) {
				div.onmouseover = async () => {
					if (selector.type === AssetAudioType.EFFECT) {
						audioBufferId = <number>await AudioEngine.controlPlay(selector.value, {
							volumePercentage: 0.5,
						});
					} else {
						audioBufferId = <number>await AudioEngine.controlPlay(selector.value, {
							volumePercentage: 0.5,
						});
					}
				};
				div.onmouseout = () => {
					AudioEngine.controlStop(audioBufferId);
				};
			}
			if (assetImage) {
				let imageSrc: AssetImageSrc | undefined = undefined;

				DomUI.assetManifestMaster.images[selector.value].srcs.forEach((assetImageSrc: AssetImageSrc) => {
					// Grab the highest available quality
					if (assetImageSrc.collection === AssetCollection.SHARED) {
						if (!imageSrc || imageSrc.quality < assetImageSrc.quality) {
							imageSrc = assetImageSrc;
						}
					}
				});

				if (imageSrc) {
					imageWrapper = document.createElement('div');
					imageWrapper.className = 'after-image';

					image = document.createElement('img');
					image.src = (<any>AssetEngine.getAsset((<any>imageSrc).src)).data;

					imageWrapper.appendChild(image);
					div.appendChild(imageWrapper);
				}
			}
			modalContent.appendChild(div);
		});
	}

	private static detailsModalSelectorAnimation(
		animation: GridAnimation,
		valuesImage: AssetImage[],
		callback: (value: GridAnimation) => void,
	): void {
		let animationUpdated: GridAnimation = JSON.parse(JSON.stringify(animation)),
			button: HTMLButtonElement,
			canvas: HTMLCanvasElement,
			ctx: CanvasRenderingContext2D,
			frameT: HTMLTableElement,
			frameTd: HTMLTableCellElement,
			frameTr: HTMLTableRowElement,
			gridAnimationCalc: GridAnimationCalc,
			gridImageTransform: GridImageTransform,
			imageBitmap: ImageBitmap,
			imageSrc: AssetImageSrc | undefined,
			input: HTMLInputElement,
			inputIndexInitial: HTMLInputElement,
			interval: ReturnType<typeof setInterval>,
			modal = DomUI.domElementsUIEdit['application-palette-animation-modal'],
			modalApply = DomUI.domElementsUIEdit['application-palette-animation-modal-content-buttons-apply'],
			modalCancel = DomUI.domElementsUIEdit['application-palette-animation-modal-content-buttons-cancel'],
			modalContent = DomUI.domElementsUIEdit['application-palette-animation-modal-content-body-table'],
			td: HTMLTableCellElement,
			tr: HTMLTableRowElement,
			transform: boolean,
			frameLogic = () => {
				// Clear
				frameT.textContent = '';

				animationUpdated.assetIds.forEach((value: string, index: number) => {
					frameTr = document.createElement('tr');

					frameTd = document.createElement('td');
					frameTd.innerText = '[' + index + ']';
					frameTr.appendChild(frameTd);

					frameTd = document.createElement('td');
					if (index === 0) {
						frameTd.innerText = value;
					} else {
						frameTd.className = 'button right-arrow';
						frameTd.innerText = animationUpdated.assetIds[index] || valuesImage[0].id;
						frameTd.onclick = (event: any) => {
							DomUI.detailsModalSelector(
								false,
								true,
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
									animationUpdated.assetIds[index] = assetId;
								},
							);
						};
					}
					frameTr.appendChild(frameTd);
					frameT.appendChild(frameTr);

					if (index !== 0) {
						// FlipH
						frameTr = document.createElement('tr');
						frameTd = document.createElement('td');
						frameTd.innerText = 'Flip Horizontal [' + index + ']';
						frameTr.appendChild(frameTd);
						frameTd = document.createElement('td');
						input = document.createElement('input');
						input.checked = !!animationUpdated.assetOptions[index].flipH;
						input.oninput = (event: any) => {
							animationUpdated.assetOptions[index].flipH = Boolean(event.target.checked);
						};
						input.type = 'checkbox';
						frameTd.appendChild(input);
						frameTr.appendChild(frameTd);
						frameT.appendChild(frameTr);

						// FlipV
						frameTr = document.createElement('tr');
						frameTd = document.createElement('td');
						frameTd.innerText = 'Flip Vertical [' + index + ']';
						frameTr.appendChild(frameTd);
						frameTd = document.createElement('td');
						input = document.createElement('input');
						input.checked = !!animationUpdated.assetOptions[index].flipV;
						input.oninput = (event: any) => {
							animationUpdated.assetOptions[index].flipV = Boolean(event.target.checked);
						};
						input.type = 'checkbox';
						frameTd.appendChild(input);
						frameTr.appendChild(frameTd);
						frameT.appendChild(frameTr);
					}
				});
			},
			intervalLogic = () => {
				gridAnimationCalc = <any>animationUpdated.calc;
				if (gridAnimationCalc.ended) {
					if (animationUpdated.finishOnLastFrame) {
						gridAnimationCalc.index = animationUpdated.assetIds.length - 1;
					} else {
						gridAnimationCalc.index = 0;
					}
				}

				imageSrc = undefined;
				DomUI.assetManifestMaster.images[animationUpdated.assetIds[gridAnimationCalc.index]].srcs.forEach(
					(assetImageSrc: AssetImageSrc) => {
						// Grab the highest available quality
						if (assetImageSrc.collection === AssetCollection.SHARED) {
							if (!imageSrc || imageSrc.quality < assetImageSrc.quality) {
								imageSrc = assetImageSrc;
							}
						}
					},
				);

				if (imageSrc) {
					// Clear the canvas
					ctx.clearRect(0, 0, canvas.width, canvas.height);

					gridImageTransform = animationUpdated.assetOptions[gridAnimationCalc.index];
					if (gridImageTransform.flipH || gridImageTransform.flipV) {
						transform = true;
						ctx.setTransform(
							gridImageTransform.flipH ? -1 : 1,
							0,
							0,
							gridImageTransform.flipV ? -1 : 1,
							(gridImageTransform.flipH ? canvas.width : 0) | 0,
							(gridImageTransform.flipV ? canvas.height : 0) | 0,
						);
					}

					// Draw asset
					imageBitmap = <ImageBitmap>(<any>AssetEngine.getAsset((<any>imageSrc).src)).imageBitmap;
					ctx.drawImage(imageBitmap, 0, 0, canvas.width, canvas.height);

					if (transform) {
						ctx.setTransform(1, 0, 0, 1, 0, 0);
						transform = false;
					}
				} else {
					ctx.fillStyle = 'red';
					ctx.fillRect(0, 0, canvas.width, canvas.height);
				}

				if (!gridAnimationCalc.ended) {
					if (animationUpdated.reverse) {
						gridAnimationCalc.index--;
						if (gridAnimationCalc.index === -1) {
							gridAnimationCalc.index = animationUpdated.assetIds.length - 1;
							gridAnimationCalc.count++;
						}
					} else {
						gridAnimationCalc.index++;
						if (gridAnimationCalc.index === animationUpdated.assetIds.length) {
							gridAnimationCalc.index = 0;
							gridAnimationCalc.count++;
						}
					}

					if (animationUpdated.loopCount && gridAnimationCalc.count === animationUpdated.loopCount) {
						gridAnimationCalc.ended = true;
					}
				}
			};

		// Config
		animationUpdated.calc = {
			count: 0,
			durationInMs: 0,
			ended: false,
			index: 0,
		};

		// Clear
		modalContent.textContent = '';

		// Animation Window
		tr = document.createElement('tr');
		td = document.createElement('td');
		td.className = 'animation-window';
		td.colSpan = 2;
		canvas = document.createElement('canvas');
		canvas.height = 128;
		canvas.width = 128;
		ctx = <CanvasRenderingContext2D>canvas.getContext('2d');
		td.appendChild(canvas);
		tr.appendChild(td);
		modalContent.appendChild(tr);

		// Frames Container
		tr = document.createElement('tr');
		td = document.createElement('td');
		td.className = 'frames-container';
		td.colSpan = 2;
		frameT = document.createElement('table');
		td.appendChild(frameT);
		tr.appendChild(td);
		modalContent.appendChild(tr);

		// Frames Control
		tr = document.createElement('tr');
		td = document.createElement('td');
		td.innerText = 'Frames Control';
		tr.appendChild(td);
		td = document.createElement('td');

		button = document.createElement('button');
		button.className = 'button small green';
		button.innerText = 'Add';
		button.onclick = () => {
			animationUpdated.assetIds.push(valuesImage[0].id);
			animationUpdated.assetOptions.push({});

			inputIndexInitial.max = String(animationUpdated.assetIds.length - 1);

			(<any>animationUpdated.calc).count = 0;
			(<any>animationUpdated.calc).ended = false;
			(<any>animationUpdated.calc).index = animationUpdated.indexInitial || 0;

			frameLogic();
		};
		td.appendChild(button);
		button = document.createElement('button');
		button.className = 'button small red';
		button.innerText = 'Remove';
		button.onclick = () => {
			if (animationUpdated.assetIds.length > 1) {
				animationUpdated.assetIds.pop();
				animationUpdated.assetOptions.pop();

				animationUpdated.indexInitial = Math.min(animationUpdated.indexInitial || 0, animationUpdated.assetIds.length - 1);
				inputIndexInitial.max = String(animationUpdated.assetIds.length - 1);
				inputIndexInitial.value = String(animationUpdated.indexInitial || 0);

				(<any>animationUpdated.calc).count = 0;
				(<any>animationUpdated.calc).ended = false;
				(<any>animationUpdated.calc).index = animationUpdated.indexInitial || 0;

				frameLogic();
			}
		};
		td.appendChild(button);
		tr.appendChild(td);
		modalContent.appendChild(tr);

		// Index Initial
		tr = document.createElement('tr');
		td = document.createElement('td');
		td.innerText = 'Index Initial';
		tr.appendChild(td);
		td = document.createElement('td');
		inputIndexInitial = document.createElement('input');
		inputIndexInitial.max = String(animationUpdated.assetIds.length - 1);
		inputIndexInitial.min = '0';
		inputIndexInitial.step = '1';
		inputIndexInitial.value = String(animationUpdated.indexInitial || 0);
		inputIndexInitial.oninput = (event: any) => {
			animationUpdated.indexInitial = Number(event.target.value);

			clearInterval(interval);
			(<any>animationUpdated.calc).count = 0;
			(<any>animationUpdated.calc).ended = false;
			(<any>animationUpdated.calc).index = animationUpdated.indexInitial || 0;
			interval = setInterval(intervalLogic, animationUpdated.frameDurationInMs);
			intervalLogic();
		};
		inputIndexInitial.type = 'range';
		td.appendChild(inputIndexInitial);
		tr.appendChild(td);
		modalContent.appendChild(tr);

		// Finish On Last Frame
		tr = document.createElement('tr');
		td = document.createElement('td');
		td.innerText = 'Finish On Last Frame';
		tr.appendChild(td);
		td = document.createElement('td');
		input = document.createElement('input');
		input.checked = !!animationUpdated.finishOnLastFrame;
		input.oninput = (event: any) => {
			animationUpdated.finishOnLastFrame = Boolean(event.target.checked);

			clearInterval(interval);
			(<any>animationUpdated.calc).count = 0;
			(<any>animationUpdated.calc).ended = false;
			(<any>animationUpdated.calc).index = animationUpdated.indexInitial || 0;
			interval = setInterval(intervalLogic, animationUpdated.frameDurationInMs);
			intervalLogic();
		};
		input.type = 'checkbox';
		td.appendChild(input);
		tr.appendChild(td);
		modalContent.appendChild(tr);

		// Loop Count
		tr = document.createElement('tr');
		td = document.createElement('td');
		td.innerText = 'Loop Count';
		tr.appendChild(td);
		td = document.createElement('td');
		input = document.createElement('input');
		input.max = '10';
		input.min = '0';
		input.step = '1';
		input.value = String(animationUpdated.loopCount || 0);
		input.oninput = (event: any) => {
			animationUpdated.loopCount = Number(event.target.value);

			clearInterval(interval);
			(<any>animationUpdated.calc).count = 0;
			(<any>animationUpdated.calc).ended = false;
			(<any>animationUpdated.calc).index = animationUpdated.indexInitial || 0;
			interval = setInterval(intervalLogic, animationUpdated.frameDurationInMs);
			intervalLogic();
		};
		input.type = 'range';
		td.appendChild(input);
		tr.appendChild(td);

		modalContent.appendChild(tr);

		// Duration
		tr = document.createElement('tr');
		td = document.createElement('td');
		td.innerText = 'Duration In MS';
		tr.appendChild(td);
		td = document.createElement('td');
		input = document.createElement('input');
		input.max = '10000';
		input.min = '50';
		input.step = '10';
		input.value = String(animationUpdated.frameDurationInMs);
		input.oninput = (event: any) => {
			animationUpdated.frameDurationInMs = Number(event.target.value);

			clearInterval(interval);
			(<any>animationUpdated.calc).count = 0;
			(<any>animationUpdated.calc).ended = false;
			(<any>animationUpdated.calc).index = animationUpdated.indexInitial || 0;
			interval = setInterval(intervalLogic, animationUpdated.frameDurationInMs);
			intervalLogic();
		};
		input.type = 'range';
		td.appendChild(input);
		tr.appendChild(td);
		modalContent.appendChild(tr);

		// Reverse
		tr = document.createElement('tr');
		td = document.createElement('td');
		td.innerText = 'Reverse';
		tr.appendChild(td);
		td = document.createElement('td');
		input = document.createElement('input');
		input.checked = !!animationUpdated.reverse;
		input.oninput = (event: any) => {
			animationUpdated.reverse = Boolean(event.target.checked);

			clearInterval(interval);
			(<any>animationUpdated.calc).count = 0;
			(<any>animationUpdated.calc).ended = false;
			(<any>animationUpdated.calc).index = animationUpdated.indexInitial || 0;
			interval = setInterval(intervalLogic, animationUpdated.frameDurationInMs);
			intervalLogic();
		};
		input.type = 'checkbox';
		td.appendChild(input);
		tr.appendChild(td);
		modalContent.appendChild(tr);

		//Buttons
		modalApply.onclick = () => {
			clearInterval(interval);
			delete animationUpdated.calc;
			callback(animationUpdated);
			modal.style.display = 'none';
		};
		modalCancel.onclick = () => {
			if (JSON.stringify(animation) !== JSON.stringify(animationUpdated) && !confirm('Are you sure?')) {
				return;
			}

			clearInterval(interval);
			delete animationUpdated.calc;
			callback(animation);
			modal.style.display = 'none';
		};

		// Logic
		frameLogic();
		interval = setInterval(intervalLogic, animationUpdated.frameDurationInMs);
		intervalLogic();

		//Done
		modal.style.display = 'flex';
	}

	private static detailsModalAudioBlock(): void {
		let applicationProperties: any = {
				modulationId: AudioModulation.valuesWithoutNone[0].id,
				objectType: GridObjectType.AUDIO_BLOCK,
			},
			t: HTMLElement = DomUI.domElementsUIEdit['application-palette-modal-content-body-table'],
			td: HTMLElement,
			tr: HTMLElement;

		if (DomUI.uiEditApplicationProperties && DomUI.uiEditApplyType === VideoBusInputCmdGameModeEditApplyType.AUDIO_BLOCK) {
			applicationProperties = DomUI.uiEditApplicationProperties;
		}

		t.textContent = '';

		// Modulation
		tr = document.createElement('tr');
		td = document.createElement('td');
		td.innerText = 'Modulation';
		tr.appendChild(td);
		td = document.createElement('td');
		td.className = 'button right-arrow';
		td.innerText = AudioModulation.valuesWithoutNone[0].displayName;
		td.onclick = (event: any) => {
			DomUI.detailsModalSelector(
				false,
				false,
				false,
				false,
				AudioModulation.valuesWithoutNone.map((v) => {
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
			DomUI.uiEditApplyType = VideoBusInputCmdGameModeEditApplyType.AUDIO_BLOCK;

			// Graphics
			DomUI.detailsModalPostClickGraphics('mode-menu-audio');
		};
	}

	private static detailsModalAudioTagEffect(): void {
		let valuesAudio: AssetAudio[] = Object.values(DomUI.assetManifestMaster.audio).filter((v) => v.type === AssetAudioType.EFFECT),
			valuesTrip: GridAudioTagActivationType[] = <any>Object.values(GridAudioTagActivationType).filter((v) => typeof v !== 'string'),
			applicationProperties: any = {
				activation: GridAudioTagActivationType.CONTACT,
				alwaysOn: undefined,
				assetId: valuesAudio[0].id,
				gRadius: 5,
				oneshot: undefined,
				panIgnored: undefined,
				tagId: '',
				type: GridAudioTagType.EFFECT,
			},
			input: HTMLInputElement,
			playing: boolean,
			t: HTMLElement = DomUI.domElementsUIEdit['application-palette-modal-content-body-table'],
			td: HTMLElement,
			tr: HTMLElement;

		if (DomUI.uiEditApplicationProperties && DomUI.uiEditApplyType === VideoBusInputCmdGameModeEditApplyType.AUDIO_TAG) {
			applicationProperties = DomUI.uiEditApplicationProperties;
		}

		t.textContent = '';

		// Activation
		tr = document.createElement('tr');
		td = document.createElement('td');
		td.innerText = 'Activation';
		tr.appendChild(td);
		td = document.createElement('td');
		td.className = 'button right-arrow';
		td.innerText = GridAudioTagActivationType[valuesTrip[0]];
		td.onclick = (event: any) => {
			DomUI.detailsModalSelector(
				false,
				false,
				false,
				false,
				valuesTrip.map((v) => {
					return {
						name: GridAudioTagActivationType[<any>v],
						value: v,
					};
				}),
				(activation: string) => {
					event.target.innerText = GridAudioTagActivationType[<any>activation];
					applicationProperties.activation = activation;
				},
			);
		};
		tr.appendChild(td);
		t.appendChild(tr);

		// AlwaysOn
		tr = document.createElement('tr');
		td = document.createElement('td');
		td.innerText = 'Always On';
		tr.appendChild(td);
		td = document.createElement('td');
		input = document.createElement('input');
		input.checked = applicationProperties.alwaysOn;
		input.oninput = (event: any) => {
			applicationProperties.alwaysOn = Boolean(event.target.checked);
		};
		input.type = 'checkbox';
		td.appendChild(input);
		tr.appendChild(td);
		t.appendChild(tr);

		// Asset
		tr = document.createElement('tr');
		td = document.createElement('td');
		td.innerText = 'Asset';
		tr.appendChild(td);
		td = document.createElement('td');
		td.className = 'button right-arrow';
		td.innerText = applicationProperties.assetId;
		td.onclick = (event: any) => {
			DomUI.detailsModalSelector(
				true,
				false,
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
					applicationProperties.assetAnimation.assetIds[0] = assetId;
				},
			);
		};
		tr.appendChild(td);
		t.appendChild(tr);

		// gRadius
		tr = document.createElement('tr');
		td = document.createElement('td');
		td.innerText = 'G Radius';
		tr.appendChild(td);
		td = document.createElement('td');
		input = document.createElement('input');
		input.max = '25';
		input.min = '0'; // 0 is inf
		input.oninput = (event: any) => {
			applicationProperties.gRadius = Number(event.target.value);
		};
		input.step = '1';
		input.type = 'range';
		input.value = applicationProperties.gRadius;
		td.appendChild(input);
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

		// PanIgnored
		tr = document.createElement('tr');
		td = document.createElement('td');
		td.innerText = 'Pan: Ignore';
		tr.appendChild(td);
		td = document.createElement('td');
		input = document.createElement('input');
		input.checked = applicationProperties.panIgnored;
		input.oninput = (event: any) => {
			applicationProperties.panIgnored = Boolean(event.target.checked);
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

		// Show the cancel/apply buttons
		DomUI.domElementsUIEdit['application-palette-modal-content-body'].classList.add('buttoned');
		DomUI.domElementsUIEdit['application-palette-modal-content-buttons'].style.display = 'flex';
		DomUI.domElementsUIEdit['application-palette-modal-content-header'].innerText = 'Palette: Audio Tag - Effect';

		// Apply
		DomUI.domElementsUIEdit['application-palette-modal-content-buttons-apply'].onclick = () => {
			// Values
			DomUI.uiEditApplicationProperties = applicationProperties;
			DomUI.uiEditApplyType = VideoBusInputCmdGameModeEditApplyType.AUDIO_TAG;

			// Graphics
			DomUI.detailsModalPostClickGraphics('mode-menu-audio');
		};
	}

	private static detailsModalAudioTagMusic(): void {
		let valuesAudio: AssetAudio[] = Object.values(DomUI.assetManifestMaster.audio).filter((v) => v.type === AssetAudioType.MUSIC),
			applicationProperties: any = {
				alwaysOn: undefined,
				assetId: valuesAudio[0].id,
				gRadius: 5,
				panIgnored: undefined,
				tagId: '',
				type: GridAudioTagType.MUSIC,
			},
			input: HTMLInputElement,
			playing: boolean,
			t: HTMLElement = DomUI.domElementsUIEdit['application-palette-modal-content-body-table'],
			td: HTMLElement,
			tr: HTMLElement;

		if (DomUI.uiEditApplicationProperties && DomUI.uiEditApplyType === VideoBusInputCmdGameModeEditApplyType.AUDIO_TAG) {
			applicationProperties = DomUI.uiEditApplicationProperties;
		}

		t.textContent = '';

		// AlwaysOn
		tr = document.createElement('tr');
		td = document.createElement('td');
		td.innerText = 'Always On';
		tr.appendChild(td);
		td = document.createElement('td');
		input = document.createElement('input');
		input.checked = applicationProperties.alwaysOn;
		input.oninput = (event: any) => {
			applicationProperties.alwaysOn = Boolean(event.target.checked);
		};
		input.type = 'checkbox';
		td.appendChild(input);
		tr.appendChild(td);
		t.appendChild(tr);

		// Asset
		tr = document.createElement('tr');
		td = document.createElement('td');
		td.innerText = 'Asset';
		tr.appendChild(td);
		td = document.createElement('td');
		td.className = 'button right-arrow';
		td.innerText = applicationProperties.assetId;
		td.onclick = (event: any) => {
			DomUI.detailsModalSelector(
				true,
				false,
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
					applicationProperties.assetAnimation.assetIds[0] = assetId;
				},
			);
		};
		tr.appendChild(td);
		t.appendChild(tr);

		// gRadius
		tr = document.createElement('tr');
		td = document.createElement('td');
		td.innerText = 'G Radius';
		tr.appendChild(td);
		td = document.createElement('td');
		input = document.createElement('input');
		input.max = '25';
		input.min = '0'; // 0 is inf
		input.oninput = (event: any) => {
			applicationProperties.gRadius = Number(event.target.value);
		};
		input.step = '1';
		input.type = 'range';
		input.value = applicationProperties.gRadius;
		td.appendChild(input);
		tr.appendChild(td);
		t.appendChild(tr);

		// PanIgnored
		tr = document.createElement('tr');
		td = document.createElement('td');
		td.innerText = 'Pan: Ignore';
		tr.appendChild(td);
		td = document.createElement('td');
		input = document.createElement('input');
		input.checked = applicationProperties.panIgnored;
		input.oninput = (event: any) => {
			applicationProperties.panIgnored = Boolean(event.target.checked);
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
			AudioEngine.controlPlay(applicationProperties.assetId, {
				volumePercentage: applicationProperties.volumePercentage,
			});
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
			DomUI.uiEditApplyType = VideoBusInputCmdGameModeEditApplyType.AUDIO_TAG;

			// Graphics
			DomUI.detailsModalPostClickGraphics('mode-menu-audio');
		};
	}

	private static detailsModalImageBlockFoliage(): void {
		let valuesAudio: AssetAudio[] = Object.values(DomUI.assetManifestMaster.audio).filter((v) => v.type === AssetAudioType.EFFECT),
			valuesHalved: GridImageBlockHalved[] = <any>Object.values(GridImageBlockHalved).filter((v) => typeof v === 'number'),
			valuesImage: AssetImage[] = Object.values(DomUI.assetManifestMaster.images).filter(
				(v) => v.type === AssetImageType.GRID_BLOCK_FOLIAGE,
			),
			applicationProperties: any = {
				assetAnimation: {
					assetIds: [valuesImage[0].id],
					assetOptions: [
						{
							flipH: undefined,
							flipV: undefined,
						},
					],
					finishOnLastFrame: undefined,
					frameDurationInMs: 100,
					indexInitial: 0,
					loopCount: undefined,
				},
				assetId: valuesImage[0].id,
				assetIdDamagedImage: undefined,
				damageable: undefined,
				destructible: undefined,
				flipH: undefined,
				flipV: undefined,
				gSizeH: 1,
				gSizeW: 1,
				halved: GridImageBlockHalved.NONE,
				nullBlocking: undefined,
				passthroughLight: undefined,
				strengthToDamangeInN: undefined, // newtons of force required to destroy
				strengthToDestroyInN: undefined, // newtons of force required to destroy
			},
			input: HTMLInputElement,
			playing: boolean,
			t: HTMLElement = DomUI.domElementsUIEdit['application-palette-modal-content-body-table'],
			td: HTMLElement,
			tr: HTMLElement;

		if (DomUI.uiEditApplicationProperties && DomUI.uiEditApplyType === VideoBusInputCmdGameModeEditApplyType.IMAGE_BLOCK_FOLIAGE) {
			applicationProperties = DomUI.uiEditApplicationProperties;
		}

		t.textContent = '';

		// Animation
		tr = document.createElement('tr');
		td = document.createElement('td');
		td.innerText = 'Animation';
		tr.appendChild(td);
		td = document.createElement('td');
		td.className = 'button right-arrow';
		td.innerText = 'Edit';
		td.onclick = (event: any) => {
			DomUI.detailsModalSelectorAnimation(applicationProperties.assetAnimation, valuesImage, (gridAnimation: GridAnimation) => {
				applicationProperties.assetAnimation = gridAnimation;
			});
		};
		tr.appendChild(td);
		t.appendChild(tr);

		// Asset
		tr = document.createElement('tr');
		td = document.createElement('td');
		td.innerText = 'Asset';
		tr.appendChild(td);
		td = document.createElement('td');
		td.className = 'button right-arrow';
		td.innerText = applicationProperties.assetId;
		td.onclick = (event: any) => {
			DomUI.detailsModalSelector(
				false,
				true,
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
					applicationProperties.assetAnimation.assetIds[0] = assetId;
				},
			);
		};
		tr.appendChild(td);
		t.appendChild(tr);

		// Asset - Damaged
		if (DomUI.uiEditZ === VideoBusInputCmdGameModeEditApplyZ.PRIMARY) {
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
					false,
					true,
					valuesImage.map((v) => {
						return {
							name: v.id,
							value: v.id,
						};
					}),
					(assetId: string) => {
						event.target.innerText = assetId || 'NONE';
						applicationProperties.assetIdDamagedImage = assetId;
					},
				);
			};
			tr.appendChild(td);
			t.appendChild(tr);
		}

		// Asset - Damaged Walked On
		if (DomUI.uiEditZ === VideoBusInputCmdGameModeEditApplyZ.PRIMARY) {
			tr = document.createElement('tr');
			td = document.createElement('td');
			td.innerText = 'Asset Audio Effect Walked On Damaged';
			tr.appendChild(td);
			td = document.createElement('td');
			td.className = 'button right-arrow';
			td.innerText = 'NONE';
			td.onclick = (event: any) => {
				DomUI.detailsModalSelector(
					true,
					false,
					false,
					true,
					valuesAudio.map((v) => {
						return {
							name: v.id,
							type: v.type,
							value: v.id,
						};
					}),
					(assetId: string) => {
						event.target.innerText = assetId || 'NONE';
						applicationProperties.assetIdamagedWalkedOnAudioEffect = assetId;
					},
				);
			};
			tr.appendChild(td);
			t.appendChild(tr);
		}

		// Asset - Walked On
		if (DomUI.uiEditZ === VideoBusInputCmdGameModeEditApplyZ.PRIMARY) {
			tr = document.createElement('tr');
			td = document.createElement('td');
			td.innerText = 'Asset Audio Effect Walked On';
			tr.appendChild(td);
			td = document.createElement('td');
			td.className = 'button right-arrow';
			td.innerText = 'NONE';
			td.onclick = (event: any) => {
				DomUI.detailsModalSelector(
					true,
					false,
					false,
					true,
					valuesAudio.map((v) => {
						return {
							name: v.id,
							type: v.type,
							value: v.id,
						};
					}),
					(assetId: string) => {
						event.target.innerText = assetId || 'NONE';
						applicationProperties.assetIdWalkedOnAudioEffect = assetId;
					},
				);
			};
			tr.appendChild(td);
			t.appendChild(tr);
		}

		// FlipH
		tr = document.createElement('tr');
		td = document.createElement('td');
		td.innerText = 'Flip Horizontal';
		tr.appendChild(td);
		td = document.createElement('td');
		input = document.createElement('input');
		input.checked = applicationProperties.flipH;
		input.oninput = (event: any) => {
			applicationProperties.flipH = Boolean(event.target.checked);
			applicationProperties.assetAnimation.assetOptions[0].flipH = applicationProperties.flipH;
		};
		input.type = 'checkbox';
		td.appendChild(input);
		tr.appendChild(td);
		t.appendChild(tr);

		// FlipV
		tr = document.createElement('tr');
		td = document.createElement('td');
		td.innerText = 'Flip Vertical';
		tr.appendChild(td);
		td = document.createElement('td');
		input = document.createElement('input');
		input.checked = applicationProperties.flipV;
		input.oninput = (event: any) => {
			applicationProperties.flipV = Boolean(event.target.checked);
			applicationProperties.assetAnimation.assetOptions[0].flipV = applicationProperties.flipV;
		};
		input.type = 'checkbox';
		td.appendChild(input);
		tr.appendChild(td);
		t.appendChild(tr);

		// GSizeH
		tr = document.createElement('tr');
		td = document.createElement('td');
		td.innerText = 'G Size H';
		tr.appendChild(td);
		td = document.createElement('td');
		input = document.createElement('input');
		input.autocomplete = 'off';
		input.max = '10';
		input.min = '1';
		input.oninput = (event: any) => {
			applicationProperties.gSizeH = Number(event.target.value);
		};
		input.step = '1';
		input.type = 'range';
		input.value = applicationProperties.gSizeH;
		td.appendChild(input);
		tr.appendChild(td);
		t.appendChild(tr);

		// GSizeW
		tr = document.createElement('tr');
		td = document.createElement('td');
		td.innerText = 'G Size W';
		tr.appendChild(td);
		td = document.createElement('td');
		input = document.createElement('input');
		input.autocomplete = 'off';
		input.max = '10';
		input.min = '1';
		input.oninput = (event: any) => {
			applicationProperties.gSizeW = Number(event.target.value);
		};
		input.step = '1';
		input.type = 'range';
		input.value = applicationProperties.gSizeW;
		td.appendChild(input);
		tr.appendChild(td);
		t.appendChild(tr);

		// Halved
		tr = document.createElement('tr');
		td = document.createElement('td');
		td.innerText = 'Halved';
		tr.appendChild(td);
		td = document.createElement('td');
		td.className = 'button right-arrow';
		td.innerText = GridImageBlockHalved[applicationProperties.halved];
		td.onclick = (event: any) => {
			DomUI.detailsModalSelector(
				false,
				false,
				false,
				false,
				valuesHalved.map((v) => {
					return {
						name: GridImageBlockHalved[v],
						value: v,
					};
				}),
				(type: string) => {
					event.target.innerText = type ? GridImageBlockHalved[<any>type] : 'None';
					applicationProperties.halved = type;
				},
			);
		};
		tr.appendChild(td);
		t.appendChild(tr);

		// Damageable
		if (DomUI.uiEditZ === VideoBusInputCmdGameModeEditApplyZ.PRIMARY) {
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

		// Null: blocking
		tr = document.createElement('tr');
		td = document.createElement('td');
		td.innerText = 'Null: Blocking';
		tr.appendChild(td);
		td = document.createElement('td');
		input = document.createElement('input');
		input.checked = applicationProperties.nullBlocking;
		input.oninput = (event: any) => {
			applicationProperties.nullBlocking = Boolean(event.target.checked);
		};
		input.type = 'checkbox';
		td.appendChild(input);
		tr.appendChild(td);
		t.appendChild(tr);

		// light passthrough
		tr = document.createElement('tr');
		td = document.createElement('td');
		td.innerText = 'Passthrough Light';
		tr.appendChild(td);
		td = document.createElement('td');
		input = document.createElement('input');
		input.checked = applicationProperties.passthroughLight;
		input.oninput = (event: any) => {
			applicationProperties.passthroughLight = Boolean(event.target.checked);
		};
		input.type = 'checkbox';
		td.appendChild(input);
		tr.appendChild(td);
		t.appendChild(tr);

		// strengthToDamangeInN
		if (DomUI.uiEditZ === VideoBusInputCmdGameModeEditApplyZ.PRIMARY) {
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
		if (DomUI.uiEditZ === VideoBusInputCmdGameModeEditApplyZ.PRIMARY) {
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

		// Show the cancel/apply buttons
		DomUI.domElementsUIEdit['application-palette-modal-content-body'].classList.add('buttoned');
		DomUI.domElementsUIEdit['application-palette-modal-content-buttons'].style.display = 'flex';
		DomUI.domElementsUIEdit['application-palette-modal-content-header'].innerText = 'Palette: Image Block Foliage';

		// Apply
		DomUI.domElementsUIEdit['application-palette-modal-content-buttons-apply'].onclick = () => {
			// Values
			DomUI.uiEditApplicationProperties = applicationProperties;
			DomUI.uiEditApplyType = VideoBusInputCmdGameModeEditApplyType.IMAGE_BLOCK_FOLIAGE;

			// Graphics
			DomUI.detailsModalPostClickGraphics('mode-menu-image');
		};
	}

	private static detailsModalImageBlockLiquid(): void {
		let valuesAudio: AssetAudio[] = Object.values(DomUI.assetManifestMaster.audio).filter((v) => v.type === AssetAudioType.EFFECT),
			valuesHalved: GridImageBlockHalved[] = <any>Object.values(GridImageBlockHalved).filter((v) => typeof v === 'number'),
			valuesImage: AssetImage[] = Object.values(DomUI.assetManifestMaster.images).filter(
				(v) => v.type === AssetImageType.GRID_BLOCK_LIQUID,
			),
			applicationProperties: any = {
				assetAnimation: {
					assetIds: [valuesImage[0].id],
					assetOptions: [
						{
							flipH: undefined,
							flipV: undefined,
						},
					],
					finishOnLastFrame: undefined,
					frameDurationInMs: 100,
					indexInitial: 0,
					loopCount: undefined,
				},
				assetId: valuesImage[0].id,
				assetIdAudioEffectAmbient: undefined,
				assetIdAudioEffectSwim: undefined,
				assetIdAudioEffectTread: undefined,
				flipH: undefined,
				flipV: undefined,
				gSizeH: 1,
				gSizeW: 1,
				halved: GridImageBlockHalved.NONE,
				nullBlocking: undefined,
				passthroughLight: undefined,
				viscocity: 1,
			},
			input: HTMLInputElement,
			t: HTMLElement = DomUI.domElementsUIEdit['application-palette-modal-content-body-table'],
			td: HTMLElement,
			tr: HTMLElement;

		if (DomUI.uiEditApplicationProperties && DomUI.uiEditApplyType === VideoBusInputCmdGameModeEditApplyType.IMAGE_BLOCK_LIQUID) {
			applicationProperties = DomUI.uiEditApplicationProperties;
		}

		t.textContent = '';

		// Animation
		tr = document.createElement('tr');
		td = document.createElement('td');
		td.innerText = 'Animation';
		tr.appendChild(td);
		td = document.createElement('td');
		td.className = 'button right-arrow';
		td.innerText = 'Edit';
		td.onclick = (event: any) => {
			DomUI.detailsModalSelectorAnimation(applicationProperties.assetAnimation, valuesImage, (gridAnimation: GridAnimation) => {
				applicationProperties.assetAnimation = gridAnimation;
			});
		};
		tr.appendChild(td);
		t.appendChild(tr);

		// Asset
		tr = document.createElement('tr');
		td = document.createElement('td');
		td.innerText = 'Asset';
		tr.appendChild(td);
		td = document.createElement('td');
		td.className = 'button right-arrow';
		td.innerText = applicationProperties.assetId;
		td.onclick = (event: any) => {
			DomUI.detailsModalSelector(
				false,
				true,
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
					applicationProperties.assetAnimation.assetIds[0] = assetId;
				},
			);
		};
		tr.appendChild(td);
		t.appendChild(tr);

		// Asset - Ambient
		tr = document.createElement('tr');
		td = document.createElement('td');
		td.innerText = 'Asset Audio Effect Ambient';
		tr.appendChild(td);
		td = document.createElement('td');
		td.className = 'button right-arrow';
		td.innerText = 'NONE';
		td.onclick = (event: any) => {
			DomUI.detailsModalSelector(
				true,
				false,
				false,
				true,
				valuesAudio.map((v) => {
					return {
						name: v.id,
						type: v.type,
						value: v.id,
					};
				}),
				(assetId: string) => {
					event.target.innerText = assetId || 'NONE';
					applicationProperties.assetIdAudioEffectAmbient = assetId;
				},
			);
		};
		tr.appendChild(td);
		t.appendChild(tr);

		// Asset - Swim
		tr = document.createElement('tr');
		td = document.createElement('td');
		td.innerText = 'Asset Audio Effect Swim';
		tr.appendChild(td);
		td = document.createElement('td');
		td.className = 'button right-arrow';
		td.innerText = 'NONE';
		td.onclick = (event: any) => {
			DomUI.detailsModalSelector(
				true,
				false,
				false,
				true,
				valuesAudio.map((v) => {
					return {
						name: v.id,
						type: v.type,
						value: v.id,
					};
				}),
				(assetId: string) => {
					event.target.innerText = assetId || 'NONE';
					applicationProperties.assetIdAudioEffectSwim = assetId;
				},
			);
		};
		tr.appendChild(td);
		t.appendChild(tr);

		// Asset - Tread
		tr = document.createElement('tr');
		td = document.createElement('td');
		td.innerText = 'Asset Audio Effect Tread';
		tr.appendChild(td);
		td = document.createElement('td');
		td.className = 'button right-arrow';
		td.innerText = 'NONE';
		td.onclick = (event: any) => {
			DomUI.detailsModalSelector(
				true,
				false,
				false,
				true,
				valuesAudio.map((v) => {
					return {
						name: v.id,
						type: v.type,
						value: v.id,
					};
				}),
				(assetId: string) => {
					event.target.innerText = assetId || 'NONE';
					applicationProperties.assetIdAudioEffectTread = assetId;
				},
			);
		};
		tr.appendChild(td);
		t.appendChild(tr);

		// FlipH
		tr = document.createElement('tr');
		td = document.createElement('td');
		td.innerText = 'Flip Horizontal';
		tr.appendChild(td);
		td = document.createElement('td');
		input = document.createElement('input');
		input.checked = applicationProperties.flipH;
		input.oninput = (event: any) => {
			applicationProperties.flipH = Boolean(event.target.checked);
			applicationProperties.assetAnimation.assetOptions[0].flipH = applicationProperties.flipH;
		};
		input.type = 'checkbox';
		td.appendChild(input);
		tr.appendChild(td);
		t.appendChild(tr);

		// FlipV
		tr = document.createElement('tr');
		td = document.createElement('td');
		td.innerText = 'Flip Vertical';
		tr.appendChild(td);
		td = document.createElement('td');
		input = document.createElement('input');
		input.checked = applicationProperties.flipV;
		input.oninput = (event: any) => {
			applicationProperties.flipV = Boolean(event.target.checked);
			applicationProperties.assetAnimation.assetOptions[0].flipV = applicationProperties.flipV;
		};
		input.type = 'checkbox';
		td.appendChild(input);
		tr.appendChild(td);
		t.appendChild(tr);

		// GSizeH
		tr = document.createElement('tr');
		td = document.createElement('td');
		td.innerText = 'G Size H';
		tr.appendChild(td);
		td = document.createElement('td');
		input = document.createElement('input');
		input.autocomplete = 'off';
		input.max = '10';
		input.min = '1';
		input.oninput = (event: any) => {
			applicationProperties.gSizeH = Number(event.target.value);
		};
		input.step = '1';
		input.type = 'range';
		input.value = applicationProperties.gSizeH;
		td.appendChild(input);
		tr.appendChild(td);
		t.appendChild(tr);

		// GSizeW
		tr = document.createElement('tr');
		td = document.createElement('td');
		td.innerText = 'G Size W';
		tr.appendChild(td);
		td = document.createElement('td');
		input = document.createElement('input');
		input.autocomplete = 'off';
		input.max = '10';
		input.min = '1';
		input.oninput = (event: any) => {
			applicationProperties.gSizeW = Number(event.target.value);
		};
		input.step = '1';
		input.type = 'range';
		input.value = applicationProperties.gSizeW;
		td.appendChild(input);
		tr.appendChild(td);
		t.appendChild(tr);

		// Halved
		tr = document.createElement('tr');
		td = document.createElement('td');
		td.innerText = 'Halved';
		tr.appendChild(td);
		td = document.createElement('td');
		td.className = 'button right-arrow';
		td.innerText = GridImageBlockHalved[applicationProperties.halved];
		td.onclick = (event: any) => {
			DomUI.detailsModalSelector(
				false,
				false,
				false,
				false,
				valuesHalved.map((v) => {
					return {
						name: GridImageBlockHalved[v],
						value: v,
					};
				}),
				(type: string) => {
					event.target.innerText = type ? GridImageBlockHalved[<any>type] : 'None';
					applicationProperties.halved = type;
				},
			);
		};
		tr.appendChild(td);
		t.appendChild(tr);

		// Null: blocking
		tr = document.createElement('tr');
		td = document.createElement('td');
		td.innerText = 'Null: Blocking';
		tr.appendChild(td);
		td = document.createElement('td');
		input = document.createElement('input');
		input.checked = applicationProperties.nullBlocking;
		input.oninput = (event: any) => {
			applicationProperties.nullBlocking = Boolean(event.target.checked);
		};
		input.type = 'checkbox';
		td.appendChild(input);
		tr.appendChild(td);
		t.appendChild(tr);

		// light passthrough
		tr = document.createElement('tr');
		td = document.createElement('td');
		td.innerText = 'Passthrough Light';
		tr.appendChild(td);
		td = document.createElement('td');
		input = document.createElement('input');
		input.checked = applicationProperties.passthroughLight;
		input.oninput = (event: any) => {
			applicationProperties.passthroughLight = Boolean(event.target.checked);
		};
		input.type = 'checkbox';
		td.appendChild(input);
		tr.appendChild(td);
		t.appendChild(tr);

		// Viscocity
		if (DomUI.uiEditZ === VideoBusInputCmdGameModeEditApplyZ.PRIMARY) {
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

		// Show the cancel/apply buttons
		DomUI.domElementsUIEdit['application-palette-modal-content-body'].classList.add('buttoned');
		DomUI.domElementsUIEdit['application-palette-modal-content-buttons'].style.display = 'flex';
		DomUI.domElementsUIEdit['application-palette-modal-content-header'].innerText = 'Palette: Image Block Liquid';

		// Apply
		DomUI.domElementsUIEdit['application-palette-modal-content-buttons-apply'].onclick = () => {
			// Values
			DomUI.uiEditApplicationProperties = applicationProperties;
			DomUI.uiEditApplyType = VideoBusInputCmdGameModeEditApplyType.IMAGE_BLOCK_LIQUID;

			// Graphics
			DomUI.detailsModalPostClickGraphics('mode-menu-image');
		};
	}

	private static detailsModalImageBlockSolid(): void {
		let valuesAudio: AssetAudio[] = Object.values(DomUI.assetManifestMaster.audio).filter((v) => v.type === AssetAudioType.EFFECT),
			valuesHalved: GridImageBlockHalved[] = <any>Object.values(GridImageBlockHalved).filter((v) => typeof v === 'number'),
			valuesImage: AssetImage[] = Object.values(DomUI.assetManifestMaster.images).filter(
				(v) => v.type === AssetImageType.GRID_BLOCK_SOLID,
			),
			applicationProperties: any = {
				assetAnimation: {
					assetIds: [valuesImage[0].id],
					assetOptions: [
						{
							flipH: undefined,
							flipV: undefined,
						},
					],
					finishOnLastFrame: undefined,
					frameDurationInMs: 100,
					indexInitial: 0,
					loopCount: undefined,
				},
				assetId: valuesImage[0].id,
				assetIdDamaged: undefined,
				assetIdAudioEffectWalkedOn: undefined,
				assetIdAudioEffectWalkedOnDamaged: undefined,
				damageable: undefined,
				destructible: undefined,
				flipH: undefined,
				flipV: undefined,
				gSizeH: 1,
				gSizeW: 1,
				halved: GridImageBlockHalved.NONE,
				nullBlocking: undefined,
				passthroughLight: undefined,
				strengthToDamangeInN: undefined, // newtons of force required to destroy
				strengthToDestroyInN: undefined, // newtons of force required to destroy
			},
			input: HTMLInputElement,
			playing: boolean,
			t: HTMLElement = DomUI.domElementsUIEdit['application-palette-modal-content-body-table'],
			td: HTMLElement,
			tr: HTMLElement;

		if (DomUI.uiEditApplicationProperties && DomUI.uiEditApplyType === VideoBusInputCmdGameModeEditApplyType.IMAGE_BLOCK_SOLID) {
			applicationProperties = DomUI.uiEditApplicationProperties;
		}

		t.textContent = '';

		// Animation
		tr = document.createElement('tr');
		td = document.createElement('td');
		td.innerText = 'Animation';
		tr.appendChild(td);
		td = document.createElement('td');
		td.className = 'button right-arrow';
		td.innerText = 'Edit';
		td.onclick = (event: any) => {
			DomUI.detailsModalSelectorAnimation(applicationProperties.assetAnimation, valuesImage, (gridAnimation: GridAnimation) => {
				applicationProperties.assetAnimation = gridAnimation;
			});
		};
		tr.appendChild(td);
		t.appendChild(tr);

		// Asset
		tr = document.createElement('tr');
		td = document.createElement('td');
		td.innerText = 'Asset';
		tr.appendChild(td);
		td = document.createElement('td');
		td.className = 'button right-arrow';
		td.innerText = applicationProperties.assetId;
		td.onclick = (event: any) => {
			DomUI.detailsModalSelector(
				false,
				true,
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
					applicationProperties.assetAnimation.assetIds[0] = assetId;
				},
			);
		};
		tr.appendChild(td);
		t.appendChild(tr);

		// Asset - Damaged
		if (DomUI.uiEditZ === VideoBusInputCmdGameModeEditApplyZ.PRIMARY) {
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
					false,
					true,
					valuesImage.map((v) => {
						return {
							name: v.id,
							value: v.id,
						};
					}),
					(assetId: string) => {
						event.target.innerText = assetId || 'NONE';
						applicationProperties.assetIdDamaged = assetId;
					},
				);
			};
			tr.appendChild(td);
			t.appendChild(tr);
		}

		// Asset - Damaged Walked On
		if (DomUI.uiEditZ === VideoBusInputCmdGameModeEditApplyZ.PRIMARY) {
			tr = document.createElement('tr');
			td = document.createElement('td');
			td.innerText = 'Asset Audio Effect Walked On Damaged';
			tr.appendChild(td);
			td = document.createElement('td');
			td.className = 'button right-arrow';
			td.innerText = 'NONE';
			td.onclick = (event: any) => {
				DomUI.detailsModalSelector(
					true,
					false,
					false,
					true,
					valuesAudio.map((v) => {
						return {
							name: v.id,
							type: v.type,
							value: v.id,
						};
					}),
					(assetId: string) => {
						event.target.innerText = assetId || 'NONE';
						applicationProperties.assetIdAudioEffectWalkedOnDamaged = assetId;
					},
				);
			};
			tr.appendChild(td);
			t.appendChild(tr);
		}

		// Asset - Walked On
		if (DomUI.uiEditZ === VideoBusInputCmdGameModeEditApplyZ.PRIMARY) {
			tr = document.createElement('tr');
			td = document.createElement('td');
			td.innerText = 'Asset Audio Effect Walked On';
			tr.appendChild(td);
			td = document.createElement('td');
			td.className = 'button right-arrow';
			td.innerText = 'NONE';
			td.onclick = (event: any) => {
				DomUI.detailsModalSelector(
					true,
					false,
					false,
					true,
					valuesAudio.map((v) => {
						return {
							name: v.id,
							type: v.type,
							value: v.id,
						};
					}),
					(assetId: string) => {
						event.target.innerText = assetId || 'NONE';
						applicationProperties.assetIdAudioEffectWalkedOn = assetId;
					},
				);
			};
			tr.appendChild(td);
			t.appendChild(tr);
		}

		// FlipH
		tr = document.createElement('tr');
		td = document.createElement('td');
		td.innerText = 'Flip Horizontal';
		tr.appendChild(td);
		td = document.createElement('td');
		input = document.createElement('input');
		input.checked = applicationProperties.flipH;
		input.oninput = (event: any) => {
			applicationProperties.flipH = Boolean(event.target.checked);
			applicationProperties.assetAnimation.assetOptions[0].flipH = applicationProperties.flipH;
		};
		input.type = 'checkbox';
		td.appendChild(input);
		tr.appendChild(td);
		t.appendChild(tr);

		// FlipV
		tr = document.createElement('tr');
		td = document.createElement('td');
		td.innerText = 'Flip Vertical';
		tr.appendChild(td);
		td = document.createElement('td');
		input = document.createElement('input');
		input.checked = applicationProperties.flipV;
		input.oninput = (event: any) => {
			applicationProperties.flipV = Boolean(event.target.checked);
			applicationProperties.assetAnimation.assetOptions[0].flipV = applicationProperties.flipV;
		};
		input.type = 'checkbox';
		td.appendChild(input);
		tr.appendChild(td);
		t.appendChild(tr);

		// GSizeH
		tr = document.createElement('tr');
		td = document.createElement('td');
		td.innerText = 'G Size H';
		tr.appendChild(td);
		td = document.createElement('td');
		input = document.createElement('input');
		input.autocomplete = 'off';
		input.max = '10';
		input.min = '1';
		input.oninput = (event: any) => {
			applicationProperties.gSizeH = Number(event.target.value);
		};
		input.step = '1';
		input.type = 'range';
		input.value = applicationProperties.gSizeH;
		td.appendChild(input);
		tr.appendChild(td);
		t.appendChild(tr);

		// GSizeW
		tr = document.createElement('tr');
		td = document.createElement('td');
		td.innerText = 'G Size W';
		tr.appendChild(td);
		td = document.createElement('td');
		input = document.createElement('input');
		input.autocomplete = 'off';
		input.max = '10';
		input.min = '1';
		input.oninput = (event: any) => {
			applicationProperties.gSizeW = Number(event.target.value);
		};
		input.step = '1';
		input.type = 'range';
		input.value = applicationProperties.gSizeW;
		td.appendChild(input);
		tr.appendChild(td);
		t.appendChild(tr);

		// Halved
		tr = document.createElement('tr');
		td = document.createElement('td');
		td.innerText = 'Halved';
		tr.appendChild(td);
		td = document.createElement('td');
		td.className = 'button right-arrow';
		td.innerText = GridImageBlockHalved[applicationProperties.halved];
		td.onclick = (event: any) => {
			DomUI.detailsModalSelector(
				false,
				false,
				false,
				false,
				valuesHalved.map((v) => {
					return {
						name: GridImageBlockHalved[v],
						value: v,
					};
				}),
				(type: string) => {
					event.target.innerText = type ? GridImageBlockHalved[<any>type] : 'None';
					applicationProperties.halved = type;
				},
			);
		};
		tr.appendChild(td);
		t.appendChild(tr);

		// Damageable
		if (DomUI.uiEditZ === VideoBusInputCmdGameModeEditApplyZ.PRIMARY) {
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

		// Null: blocking
		tr = document.createElement('tr');
		td = document.createElement('td');
		td.innerText = 'Null: Blocking';
		tr.appendChild(td);
		td = document.createElement('td');
		input = document.createElement('input');
		input.checked = applicationProperties.nullBlocking;
		input.oninput = (event: any) => {
			applicationProperties.nullBlocking = Boolean(event.target.checked);
		};
		input.type = 'checkbox';
		td.appendChild(input);
		tr.appendChild(td);
		t.appendChild(tr);

		// light passthrough
		tr = document.createElement('tr');
		td = document.createElement('td');
		td.innerText = 'Passthrough Light';
		tr.appendChild(td);
		td = document.createElement('td');
		input = document.createElement('input');
		input.checked = applicationProperties.passthroughLight;
		input.oninput = (event: any) => {
			applicationProperties.passthroughLight = Boolean(event.target.checked);
		};
		input.type = 'checkbox';
		td.appendChild(input);
		tr.appendChild(td);
		t.appendChild(tr);

		// strengthToDamangeInN
		if (DomUI.uiEditZ === VideoBusInputCmdGameModeEditApplyZ.PRIMARY) {
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
		if (DomUI.uiEditZ === VideoBusInputCmdGameModeEditApplyZ.PRIMARY) {
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

		// Show the cancel/apply buttons
		DomUI.domElementsUIEdit['application-palette-modal-content-body'].classList.add('buttoned');
		DomUI.domElementsUIEdit['application-palette-modal-content-buttons'].style.display = 'flex';
		DomUI.domElementsUIEdit['application-palette-modal-content-header'].innerText = 'Palette: Image Block Solid';

		// Apply
		DomUI.domElementsUIEdit['application-palette-modal-content-buttons-apply'].onclick = () => {
			// Values
			DomUI.uiEditApplicationProperties = applicationProperties;
			DomUI.uiEditApplyType = VideoBusInputCmdGameModeEditApplyType.IMAGE_BLOCK_SOLID;

			// Graphics
			DomUI.detailsModalPostClickGraphics('mode-menu-image');
		};
	}

	private static detailsModalLight(): void {
		let valuesAudio: AssetAudio[] = Object.values(DomUI.assetManifestMaster.audio).filter((v) => v.type === AssetAudioType.EFFECT),
			valuesImage: AssetImage[] = Object.values(DomUI.assetManifestMaster.images).filter((v) => v.type === AssetImageType.GRID_LIGHT),
			valuesType: GridLightType[] = <any>Object.values(GridLightType).filter((v) => typeof v === 'number'),
			applicationProperties: any = {
				assetAnimation: {
					assetIds: [valuesImage[0].id],
					assetOptions: [
						{
							flipH: undefined,
							flipV: undefined,
						},
					],
					finishOnLastFrame: undefined,
					frameDurationInMs: 100,
					indexInitial: 0,
					loopCount: undefined,
				},
				assetId: valuesImage[0].id,
				assetIdAudioEffectAmbient: undefined,
				assetIdAudioEffectDestroyed: undefined,
				assetIdAudioEffectSwitchOff: undefined,
				assetIdAudioEffectSwitchOn: undefined,
				destructible: undefined,
				directionOmni: true,
				directionOmniBrightness: 1,
				directionOmniGRadius: 1,
				directions: [
					{
						brightness: 1,
						gRadius: 4,
						type: GridLightType.DOWN,
					},
				],
				flipH: undefined,
				flipV: undefined,
				gRadiusAudioEffect: 5,
				gSizeH: 1,
				gSizeW: 1,
				nightOnly: undefined,
				rounded: true,
				strengthToDestroyInN: undefined, // newtons of force required to destroy
			},
			input: HTMLInputElement,
			t: HTMLElement = DomUI.domElementsUIEdit['application-palette-modal-content-body-table'],
			td: HTMLElement,
			tr: HTMLElement;

		if (DomUI.uiEditApplicationProperties && DomUI.uiEditApplyType === VideoBusInputCmdGameModeEditApplyType.LIGHT) {
			applicationProperties = DomUI.uiEditApplicationProperties;
		}

		t.textContent = '';

		// Animation
		tr = document.createElement('tr');
		td = document.createElement('td');
		td.innerText = 'Animation';
		tr.appendChild(td);
		td = document.createElement('td');
		td.className = 'button right-arrow';
		td.innerText = 'Edit';
		td.onclick = (event: any) => {
			DomUI.detailsModalSelectorAnimation(applicationProperties.assetAnimation, valuesImage, (gridAnimation: GridAnimation) => {
				applicationProperties.assetAnimation = gridAnimation;
			});
		};
		tr.appendChild(td);
		t.appendChild(tr);

		// Asset
		tr = document.createElement('tr');
		td = document.createElement('td');
		td.innerText = 'Asset';
		tr.appendChild(td);
		td = document.createElement('td');
		td.className = 'button right-arrow';
		td.innerText = applicationProperties.assetId;
		td.onclick = (event: any) => {
			DomUI.detailsModalSelector(
				false,
				true,
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
					applicationProperties.assetAnimation.assetIds[0] = assetId;
				},
			);
		};
		tr.appendChild(td);
		t.appendChild(tr);

		// Asset - Ambient
		tr = document.createElement('tr');
		td = document.createElement('td');
		td.innerText = 'Asset Audio Effect Ambient';
		tr.appendChild(td);
		td = document.createElement('td');
		td.className = 'button right-arrow';
		td.innerText = 'NONE';
		td.onclick = (event: any) => {
			DomUI.detailsModalSelector(
				true,
				false,
				false,
				true,
				valuesAudio.map((v) => {
					return {
						name: v.id,
						type: v.type,
						value: v.id,
					};
				}),
				(assetId: string) => {
					event.target.innerText = assetId || 'NONE';
					applicationProperties.assetIdAudioEffectAmbient = assetId;
				},
			);
		};
		tr.appendChild(td);
		t.appendChild(tr);

		// Asset - Destroyed
		tr = document.createElement('tr');
		td = document.createElement('td');
		td.innerText = 'Asset Audio Effect Destroyed';
		tr.appendChild(td);
		td = document.createElement('td');
		td.className = 'button right-arrow';
		td.innerText = 'NONE';
		td.onclick = (event: any) => {
			DomUI.detailsModalSelector(
				true,
				false,
				false,
				true,
				valuesAudio.map((v) => {
					return {
						name: v.id,
						type: v.type,
						value: v.id,
					};
				}),
				(assetId: string) => {
					event.target.innerText = assetId || 'NONE';
					applicationProperties.assetIdAudioEffectDestroyed = assetId;
				},
			);
		};
		tr.appendChild(td);
		t.appendChild(tr);

		// Asset - Switch Off
		tr = document.createElement('tr');
		td = document.createElement('td');
		td.innerText = 'Asset Audio Effect Switch Off';
		tr.appendChild(td);
		td = document.createElement('td');
		td.className = 'button right-arrow';
		td.innerText = 'NONE';
		td.onclick = (event: any) => {
			DomUI.detailsModalSelector(
				true,
				false,
				false,
				true,
				valuesAudio.map((v) => {
					return {
						name: v.id,
						type: v.type,
						value: v.id,
					};
				}),
				(assetId: string) => {
					event.target.innerText = assetId || 'NONE';
					applicationProperties.assetIdAudioEffectSwitchOff = assetId;
				},
			);
		};
		tr.appendChild(td);
		t.appendChild(tr);

		// Asset - Switch On
		tr = document.createElement('tr');
		td = document.createElement('td');
		td.innerText = 'Asset Audio Effect Switch On';
		tr.appendChild(td);
		td = document.createElement('td');
		td.className = 'button right-arrow';
		td.innerText = 'NONE';
		td.onclick = (event: any) => {
			DomUI.detailsModalSelector(
				true,
				false,
				false,
				true,
				valuesAudio.map((v) => {
					return {
						name: v.id,
						type: v.type,
						value: v.id,
					};
				}),
				(assetId: string) => {
					event.target.innerText = assetId || 'NONE';
					applicationProperties.assetIdAudioEffectSwitchOn = assetId;
				},
			);
		};
		tr.appendChild(td);
		t.appendChild(tr);

		// Destructible
		if (DomUI.uiEditZ === VideoBusInputCmdGameModeEditApplyZ.PRIMARY) {
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

		// Direction: Omni
		tr = document.createElement('tr');
		td = document.createElement('td');
		td.innerText = 'Direction Omni';
		tr.appendChild(td);
		td = document.createElement('td');
		input = document.createElement('input');
		input.checked = applicationProperties.directionOmni;
		input.oninput = (event: any) => {
			applicationProperties.directionOmni = Boolean(event.target.checked);
		};
		input.type = 'checkbox';
		td.appendChild(input);
		tr.appendChild(td);
		t.appendChild(tr);

		// Direction: brightness
		tr = document.createElement('tr');
		td = document.createElement('td');
		td.innerText = 'Direction Omni Brightness';
		tr.appendChild(td);
		td = document.createElement('td');
		input = document.createElement('input');
		input.autocomplete = 'off';
		input.max = '6';
		input.min = '1';
		input.oninput = (event: any) => {
			applicationProperties.directionOmniBrightness = Number(event.target.value);
		};
		input.step = '1';
		input.type = 'range';
		input.value = applicationProperties.directionOmniBrightness;
		td.appendChild(input);
		tr.appendChild(td);
		t.appendChild(tr);

		// Direction: gRadius
		tr = document.createElement('tr');
		td = document.createElement('td');
		td.innerText = 'Direction Omni G Radius';
		tr.appendChild(td);
		td = document.createElement('td');
		input = document.createElement('input');
		input.autocomplete = 'off';
		input.max = '10';
		input.min = '1';
		input.oninput = (event: any) => {
			applicationProperties.directionOmniGRadius = Number(event.target.value);
		};
		input.step = '1';
		input.type = 'range';
		input.value = applicationProperties.directionOmniGRadius;
		td.appendChild(input);
		tr.appendChild(td);
		t.appendChild(tr);

		// Direction[0]: brightness
		tr = document.createElement('tr');
		td = document.createElement('td');
		td.innerText = 'Direction[0] Brightness';
		tr.appendChild(td);
		td = document.createElement('td');
		input = document.createElement('input');
		input.autocomplete = 'off';
		input.max = '6';
		input.min = '1';
		input.oninput = (event: any) => {
			applicationProperties.directions[0].brightness = Number(event.target.value);
		};
		input.step = '1';
		input.type = 'range';
		input.value = applicationProperties.directions[0].brightness;
		td.appendChild(input);
		tr.appendChild(td);
		t.appendChild(tr);

		// Direction[0]: gRadius
		tr = document.createElement('tr');
		td = document.createElement('td');
		td.innerText = 'Direction[0] G Radius';
		tr.appendChild(td);
		td = document.createElement('td');
		input = document.createElement('input');
		input.autocomplete = 'off';
		input.max = '10';
		input.min = '1';
		input.oninput = (event: any) => {
			applicationProperties.directions[0].gRadius = Number(event.target.value);
		};
		input.step = '1';
		input.type = 'range';
		input.value = applicationProperties.directions[0].gRadius;
		td.appendChild(input);
		tr.appendChild(td);
		t.appendChild(tr);

		// Direction[0]: Type
		tr = document.createElement('tr');
		td = document.createElement('td');
		td.innerText = 'Direction[0] Type';
		tr.appendChild(td);
		td = document.createElement('td');
		td.className = 'button right-arrow';
		td.innerText = GridLightType[applicationProperties.directions[0].type];
		td.onclick = (event: any) => {
			DomUI.detailsModalSelector(
				false,
				false,
				false,
				false,
				valuesType.map((v) => {
					return {
						name: GridLightType[v],
						value: v,
					};
				}),
				(type: string) => {
					event.target.innerText = type ? GridLightType[<any>type] : 'None';
					applicationProperties.directions[0].type = type;
				},
			);
		};
		tr.appendChild(td);
		t.appendChild(tr);

		// FlipH
		tr = document.createElement('tr');
		td = document.createElement('td');
		td.innerText = 'Flip Horizontal';
		tr.appendChild(td);
		td = document.createElement('td');
		input = document.createElement('input');
		input.checked = applicationProperties.flipH;
		input.oninput = (event: any) => {
			applicationProperties.flipH = Boolean(event.target.checked);
			applicationProperties.assetAnimation.assetOptions[0].flipH = applicationProperties.flipH;
		};
		input.type = 'checkbox';
		td.appendChild(input);
		tr.appendChild(td);
		t.appendChild(tr);

		// FlipV
		tr = document.createElement('tr');
		td = document.createElement('td');
		td.innerText = 'Flip Vertical';
		tr.appendChild(td);
		td = document.createElement('td');
		input = document.createElement('input');
		input.checked = applicationProperties.flipV;
		input.oninput = (event: any) => {
			applicationProperties.flipV = Boolean(event.target.checked);
			applicationProperties.assetAnimation.assetOptions[0].flipV = applicationProperties.flipV;
		};
		input.type = 'checkbox';
		td.appendChild(input);
		tr.appendChild(td);
		t.appendChild(tr);

		// G Radius Audio Effect
		tr = document.createElement('tr');
		td = document.createElement('td');
		td.innerText = 'G Radius Audio Effect';
		tr.appendChild(td);
		td = document.createElement('td');
		input = document.createElement('input');
		input.max = '25';
		input.min = '1';
		input.oninput = (event: any) => {
			applicationProperties.gRadiusAudioEffect = Number(event.target.value);
		};
		input.step = '1';
		input.type = 'range';
		input.value = applicationProperties.gRadiusAudioEffect;
		td.appendChild(input);
		tr.appendChild(td);
		t.appendChild(tr);

		// GSizeH
		tr = document.createElement('tr');
		td = document.createElement('td');
		td.innerText = 'G Size H';
		tr.appendChild(td);
		td = document.createElement('td');
		input = document.createElement('input');
		input.autocomplete = 'off';
		input.max = '10';
		input.min = '1';
		input.oninput = (event: any) => {
			applicationProperties.gSizeH = Number(event.target.value);
		};
		input.step = '1';
		input.type = 'range';
		input.value = applicationProperties.gSizeH;
		td.appendChild(input);
		tr.appendChild(td);
		t.appendChild(tr);

		// GSizeW
		tr = document.createElement('tr');
		td = document.createElement('td');
		td.innerText = 'G Size W';
		tr.appendChild(td);
		td = document.createElement('td');
		input = document.createElement('input');
		input.autocomplete = 'off';
		input.max = '10';
		input.min = '1';
		input.oninput = (event: any) => {
			applicationProperties.gSizeW = Number(event.target.value);
		};
		input.step = '1';
		input.type = 'range';
		input.value = applicationProperties.gSizeW;
		td.appendChild(input);
		tr.appendChild(td);
		t.appendChild(tr);

		// NightOnly
		tr = document.createElement('tr');
		td = document.createElement('td');
		td.innerText = 'Night Only';
		tr.appendChild(td);
		td = document.createElement('td');
		input = document.createElement('input');
		input.checked = applicationProperties.nightOnly;
		input.oninput = (event: any) => {
			applicationProperties.nightOnly = Boolean(event.target.checked);
		};
		input.type = 'checkbox';
		td.appendChild(input);
		tr.appendChild(td);
		t.appendChild(tr);

		// Rounded
		tr = document.createElement('tr');
		td = document.createElement('td');
		td.innerText = 'Rounded';
		tr.appendChild(td);
		td = document.createElement('td');
		input = document.createElement('input');
		input.checked = applicationProperties.rounded;
		input.oninput = (event: any) => {
			applicationProperties.rounded = Boolean(event.target.checked);
		};
		input.type = 'checkbox';
		td.appendChild(input);
		tr.appendChild(td);
		t.appendChild(tr);

		// strengthToDestroyInN
		if (DomUI.uiEditZ === VideoBusInputCmdGameModeEditApplyZ.PRIMARY) {
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
		tr.appendChild(td);
		t.appendChild(tr);

		// Show the cancel/apply buttons
		DomUI.domElementsUIEdit['application-palette-modal-content-body'].classList.add('buttoned');
		DomUI.domElementsUIEdit['application-palette-modal-content-buttons'].style.display = 'flex';
		DomUI.domElementsUIEdit['application-palette-modal-content-header'].innerText = 'Palette: Light';

		// Apply
		DomUI.domElementsUIEdit['application-palette-modal-content-buttons-apply'].onclick = () => {
			// Values
			DomUI.uiEditApplicationProperties = applicationProperties;
			DomUI.uiEditApplyType = VideoBusInputCmdGameModeEditApplyType.LIGHT;

			// Graphics
			DomUI.detailsModalPostClickGraphics('mode-menu-light');
		};
	}

	private static detailsModalPostClickGraphics(menuId: string): void {
		DomUI.domElementsUIEdit['application-palette-modal'].style.display = 'none';
		DomUI.domElementsUIEdit[menuId].click();
		DomUI.domElementsUIEdit['palette'].classList.remove('active');
		MouseEngine.setSuspendWheel(false);

		// Show cursor config buttons
		DomUI.domElementsUIEdit['application'].style.display = 'flex';
		DomUI.domElementsUIEdit['application-pixel-size'].style.display = 'flex';

		// Draw cursor
		DomUI.uiEditCursorReady = true;
		switch (DomUI.uiEditApplicationType) {
			case ApplicationType.BRUSH:
				DomUI.domElementsUIEdit['application-type-menu-brush'].click();
				break;
			case ApplicationType.FILL:
				DomUI.domElementsUIEdit['application-type-menu-fill'].click();
				break;
			default:
			case ApplicationType.ERASER:
			case ApplicationType.PENCIL:
				DomUI.domElementsUIEdit['application-type-menu-pencil'].click();
				break;
		}

		DomUI.domElementsUIEdit['copy'].classList.remove('active');
		DomUI.domElementsUIEdit['inspect'].classList.remove('active');

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
	protected static editCameraUpdate(VideoBusOutputCmdEditCameraUpdate: VideoBusOutputCmdEditCameraUpdate) {
		MapEditEngine.uiCameraUpdate(VideoBusOutputCmdEditCameraUpdate);

		DomUI.uiEditCursorGInPh = Math.round((VideoBusOutputCmdEditCameraUpdate.gInPh / window.devicePixelRatio) * 1000) / 1000;
		DomUI.uiEditCursorGInPw = Math.round((VideoBusOutputCmdEditCameraUpdate.gInPw / window.devicePixelRatio) * 1000) / 1000;
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
			divs = [];
			divWrapper = document.createElement('div');
			divWrapper.className = 'group';

			if (DomUI.settings.resolution === null) {
				div.style.height = gInPh + 'px';
				div.style.width = gInPw + 'px';
			} else {
				let domRect: DOMRect = DomUI.domElements['feed-overflow-streams'].getBoundingClientRect();
				div.style.height = (gInPh * domRect.width) / DomUI.settings.resolution + 'px';
				div.style.width = (gInPw * domRect.width) / DomUI.settings.resolution + 'px';
			}

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
			} else if (applicationType === ApplicationType.ERASER || applicationType === ApplicationType.PENCIL) {
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
		VideoEngineBus.outputMapLoadById(assetMapId);
	}

	public static editMouseDown(action: MouseAction | TouchAction): void {
		if (!DomUI.uiEditCursorReady) {
			let classList: DOMTokenList = DomUI.domElements['feed-fitted'].classList;

			if (classList.contains('dirt-engine-cursor-eye-dropper')) {
				DomUI.editMouseDownSelectMenu(
					true,
					MapEditEngine.getGridProperty(
						MapEditEngine.uiRelXYToGBlockHash(action),
						DomUI.uiEditView,
						<VideoBusInputCmdGameModeEditApplyZ>DomUI.uiEditZ,
					),
				);
			} else if (classList.contains('dirt-engine-cursor-magnifying-glass')) {
				DomUI.editMouseDownSelectMenu(
					false,
					MapEditEngine.getGridProperty(
						MapEditEngine.uiRelXYToGBlockHash(action),
						DomUI.uiEditView,
						<VideoBusInputCmdGameModeEditApplyZ>DomUI.uiEditZ,
					),
				);
			}
			return;
		} else if (DomUI.uiEditMouseCmdCollectionActive) {
			console.error('DomUI > editMouseDown: already active');
			return;
		}
		DomUI.uiEditMouseCmdCollectionActive = true;

		VideoEngineBus.outputGameModeEditApplyGroup(true);
		MapEditEngine.setApplyGroup(true);

		let hash: number = MapEditEngine.uiRelXYToGBlockHash(action);
		DomUI.uiEditMouseCmdCollection.pushEnd(hash);
		DomUI.uiEditMouseCmdCollectionHashesOrigin[hash] = null;

		DomUI.uiEditMouseCmdCollectionPromise = new Promise((resolve: any) => {
			DomUI.editMouseProcessor(resolve);
		});
		DomUI.uiEditMouseCmdCollectionEngaged = true;
	}

	/**
	 * @param copy is inspect on false
	 */
	private static editMouseDownSelectMenu(copy: boolean, gridObjects: GridObject[]): void {
		let td: HTMLElement,
			tr: HTMLElement,
			t: HTMLElement = DomUI.domElementsUIEdit['application-mouse-down-select-modal-content-body-table'];

		if (gridObjects.length === 1 && gridObjects[0] === undefined) {
			return;
		}
		MouseEngine.setSuspendWheel(true);

		if (copy) {
			DomUI.domElementsUIEdit['application-mouse-down-select-modal-content-header'].innerText = 'Copy';
		} else {
			DomUI.domElementsUIEdit['application-mouse-down-select-modal-content-header'].innerText = 'Inspect';
		}

		t.textContent = '';

		for (let i in gridObjects) {
			let gridObject = JSON.parse(JSON.stringify(gridObjects[i]));

			tr = document.createElement('tr');

			td = document.createElement('td');
			if (copy) {
				td.className = 'clickable';
			}

			gridObject.objectType = GridObjectType[gridObject.objectType]; // ObjectType toString
			td.innerText = JSON.stringify(gridObject, null, 2);
			gridObject.objectType = GridObjectType[gridObject.objectType]; // ObjectType toNumber
			td.onclick = () => {
				if (copy) {
					DomUI.uiEditApplicationProperties = gridObject;

					switch (gridObject.objectType) {
						case GridObjectType.AUDIO_BLOCK:
							DomUI.uiEditApplyType = VideoBusInputCmdGameModeEditApplyType.AUDIO_BLOCK;
							break;
						case GridObjectType.AUDIO_TAG:
							DomUI.uiEditApplyType = VideoBusInputCmdGameModeEditApplyType.AUDIO_TAG;
							break;
						case GridObjectType.IMAGE_BLOCK_FOLIAGE:
							DomUI.uiEditApplyType = VideoBusInputCmdGameModeEditApplyType.IMAGE_BLOCK_FOLIAGE;
							break;
						case GridObjectType.IMAGE_BLOCK_LIQUID:
							DomUI.uiEditApplyType = VideoBusInputCmdGameModeEditApplyType.IMAGE_BLOCK_LIQUID;
							break;
						case GridObjectType.IMAGE_BLOCK_SOLID:
							DomUI.uiEditApplyType = VideoBusInputCmdGameModeEditApplyType.IMAGE_BLOCK_SOLID;
							break;
						case GridObjectType.LIGHT:
							DomUI.uiEditApplyType = VideoBusInputCmdGameModeEditApplyType.LIGHT;
							break;
						default:
							console.error('DomUI > editMouseDownSelectMenu: objectType???', gridObject.objectType);
					}

					// Show cursor config buttons
					DomUI.domElementsUIEdit['application'].style.display = 'flex';
					DomUI.domElementsUIEdit['application-pixel-size'].style.display = 'flex';

					// Draw cursor
					DomUI.uiEditCursorReady = true;
					switch (DomUI.uiEditApplicationType) {
						case ApplicationType.BRUSH:
							DomUI.domElementsUIEdit['application-type-menu-brush'].click();
							break;
						case ApplicationType.FILL:
							DomUI.domElementsUIEdit['application-type-menu-fill'].click();
							break;
						default:
						case ApplicationType.ERASER:
						case ApplicationType.PENCIL:
							DomUI.domElementsUIEdit['application-type-menu-pencil'].click();
							break;
					}

					// Done
					DomUI.domElementsUIEdit['application-mouse-down-select-modal'].style.display = 'none';
					DomUI.domElementsUIEdit['copy'].classList.remove('active');

					MouseEngine.setSuspendWheel(false);
				}
			};
			tr.appendChild(td);

			// Last
			t.appendChild(tr);
		}

		DomUI.domElementsUIEdit['application-mouse-down-select-modal'].style.display = 'flex';
	}

	public static editMouseMove(action: MouseAction | TouchAction): void {
		if (!DomUI.uiEditMouseCmdCollectionEngaged) {
			return;
		}
		let hash: number = MapEditEngine.uiRelXYToGBlockHash(action);

		// Only add unique origins (don't recalc what's already been done)
		if (DomUI.uiEditMouseCmdCollectionHashesOrigin[hash] === undefined) {
			DomUI.uiEditMouseCmdCollectionHashesOrigin[hash] = null;
			DomUI.uiEditMouseCmdCollection.pushEnd(hash);
		}
	}

	// Submit commands based on interval
	private static editMouseProcessor(resolve: any): void {
		let arrayPush: any = Array.prototype.push,
			collection: DoubleLinkedList<number> = DomUI.uiEditMouseCmdCollection,
			gridConfig: GridConfig,
			gHashes: number[],
			hash: number,
			interval: ReturnType<typeof setInterval> = setInterval(() => {
				gHashes = new Array();
				length = collection.length;

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
						DomUI.uiEditApplicationType === ApplicationType.ERASER
							? VideoBusInputCmdGameModeEditApplyType.ERASE
							: DomUI.uiEditApplyType,
						z,
						DomUI.uiEditApplyType,
					); // Auto-applies to map

					if (payload) {
						MapAudioAmbientEngine.setMapActive(MapEditEngine.getMapActive());
						if (
							payload.applyType === VideoBusInputCmdGameModeEditApplyType.AUDIO_BLOCK ||
							payload.applyType === VideoBusInputCmdGameModeEditApplyType.AUDIO_TAG
						) {
							MapAudioAmbientEngine.stop();
							MapAudioAmbientEngine.start();
						}

						VideoEngineBus.outputGameModeEditApply(payload);
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
			payload: VideoBusInputCmdGameModeEditApply | undefined,
			z: VideoBusInputCmdGameModeEditApplyZ = <VideoBusInputCmdGameModeEditApplyZ>DomUI.uiEditZ;
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
			} else if (applicationType === ApplicationType.ERASER || applicationType === ApplicationType.PENCIL) {
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
			}
		}

		return gHashes;
	}

	public static async editMouseUp(): Promise<void> {
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

			setTimeout(() => {
				VideoEngineBus.outputGameModeEditApplyGroup(false);
				MapEditEngine.setApplyGroup(false);

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
		});
	}

	private static editRedo(): void {
		DomUI.displaySpinner(true);
		MapEditEngine.historyRedo();
		VideoEngineBus.outputGameModeEditRedo();
	}

	private static editUndo(): void {
		DomUI.displaySpinner(true);
		MapEditEngine.historyUndo();
		VideoEngineBus.outputGameModeEditUndo();
	}

	protected static async initializeDomUI(oldTVIntro: boolean): Promise<void> {
		if (DomUI.domUIinitialized) {
			console.error('DomUI > initializeDomUI: already initialized');
			return;
		}
		DomUI.domUIinitialized = true;
		let maps: AssetMap[] = Object.values(DomUI.assetManifestMaster.maps).sort((a: AssetMap, b: AssetMap) => a.order - b.order);

		VideoEngineBus.setCallbackMapAsset(async (mapActive: MapActive | undefined) => {
			if (mapActive) {
				await MapEditEngine.load(mapActive);

				MapAudioAmbientEngine.stop();
				MapAudioAmbientEngine.setMapActive(MapEditEngine.getMapActive());
				MapAudioAmbientEngine.start();

				DomUI.domElementsUIEdit['time'].innerText = mapActive.hourOfDayEff + ':00';
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
		VideoEngineBus.setCallbackEditComplete(() => {
			DomUI.displaySpinner(false);
		});
		VideoEngineBus.setCallbackFPS((fps: number) => {
			let div: HTMLElement = DomUI.domElementsUIEdit['fps'];

			if (fps < DomUI.settings.fps - 20) {
				div.classList.add('bad');
				div.classList.remove('warn');
			} else if (fps < DomUI.settings.fps - 10) {
				div.classList.remove('bad');
				div.classList.add('warn');
			} else {
				div.classList.remove('bad');
				div.classList.remove('warn');
			}

			div.innerText = String(fps);
		});
		VideoEngineBus.setCallbackMapHourOfDayEff((hourOfDayEff: number) => {
			MapEditEngine.uiClockUpdate(hourOfDayEff);
			DomUI.domElementsUIEdit['time'].innerText = hourOfDayEff + ':00';
		});
		VideoEngineBus.setCallbackRumble((durationInMs: number, enable: boolean, intensity: number) => {
			DomUI.rumble(durationInMs, enable, intensity);
		});

		await DomUI.initDom(maps, oldTVIntro);
	}

	/**
	 * @param durationInMs 0 is never off
	 * @param intensity is between 1 and 10
	 */
	private static rumble(durationInMs: number, enable: boolean, intensity: number) {
		let animations: Animation[] = DomUI.domUIRumbleAnimations,
			animationFrames: Keyframe[],
			animationOptions: KeyframeAnimationOptions = {
				duration: 1000,
				iterations: Infinity,
			},
			animationStreams: HTMLElement[] = DomUI.domUIRumbleAnimationStreams,
			intensityFrames: number,
			intensityShake: number;

		if (!animations) {
			DomUI.domUIRumbleAnimations = new Array(animationStreams.length);
			animations = DomUI.domUIRumbleAnimations;
		}

		if (DomUI.settings.screenShakeEnable && enable) {
			// Calc intensity
			animationFrames = [{ transform: 'rotate(0deg) translate(0, 0)' }];
			intensityFrames = intensity * 10 + 40;
			intensityShake = Math.max(1.5, intensity / 2.5);
			for (let i = 0; i < intensityFrames; i++) {
				animationFrames.push({
					transform:
						'rotate(' +
						(Math.floor(Math.random() * intensityShake) - 1) +
						'deg) translate(' +
						(Math.floor(Math.random() * intensityShake) - 1) +
						'px, ' +
						(Math.floor(Math.random() * intensityShake) - 1) +
						'px)',
				});
			}
			animationFrames.push(animationFrames[0]);

			for (let i = 0; i < animationStreams.length; i++) {
				if (animations[i]) {
					animations[i].cancel(); // Just in case
				}

				animations[i] = animationStreams[i].animate(animationFrames, animationOptions);
			}

			if (durationInMs !== 0) {
				setTimeout(() => {
					DomUI.rumble(0, false, 0);
				}, durationInMs);
			}
		} else {
			clearTimeout(DomUI.domUIRumbleTimeout);
			for (let i in animations) {
				animations[i].cancel();
			}
		}
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
				if (domUIEditElement.className.includes('dirt-engine-ui-edit') && !domUIEditElement.className.includes('modal')) {
					domUIEditElement.style.opacity = '0';
					domUIEditElement.style.display = 'flex';
					domUIEditElement.style.opacity = '1';
				}
			}

			DomUI.uiEditDraw = {
				editing: true,
				grid: true,
				vanishingEnable: true,
			};

			DomUI.domElements['feed-fitted'].addEventListener('mousemove', DomUI.editCursorMove);
			DomUI.domElementsUIEdit['map'].click();
			DomUI.domElementsUIEdit['mode-menu-image'].click();

			DomUI.uiEditZ = VideoBusInputCmdGameModeEditApplyZ.PRIMARY;
			DomUI.domElementsUIEdit['z-global'].click();
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
			domFeedFittedPause: HTMLElement,
			domFeedFittedPauseContent: HTMLElement,
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
			domViewerBSpinnerContent: HTMLElement,
			input: HTMLInputElement,
			option: HTMLOptionElement,
			resolutions: string[] = ['256', '384', '512', '640', '1280', '1920'],
			select: HTMLSelectElement,
			t: HTMLElement,
			td: HTMLElement,
			tr: HTMLElement;

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
		 * Feed: Fitted - Pause
		 */
		domFeedFittedPause = document.createElement('div');
		domFeedFittedPause.className = 'pause';
		DomUI.domElements['feed-fitted-pause'] = domFeedFittedPause;
		domFeedFitted.appendChild(domFeedFittedPause);

		domFeedFittedPauseContent = document.createElement('div');
		domFeedFittedPauseContent.className = 'content';
		DomUI.domElements['feed-fitted-pause-content'] = domFeedFittedPauseContent;
		domFeedFittedPause.appendChild(domFeedFittedPauseContent);

		// Menu buttons
		t = document.createElement('table');

		// Table: Continue
		tr = document.createElement('tr');
		td = document.createElement('td');
		td.classList.add('clickable');
		td.innerText = 'Continue';
		td.style.fontWeight = 'bold';
		td.onclick = () => {
			domFeedFittedPause.style.display = 'none';
			VideoEngineBus.outputGameUnpause({});
		};
		tr.appendChild(td);
		t.appendChild(tr);

		// Table: Darkness Max
		tr = document.createElement('tr');
		td = document.createElement('td');
		td.innerText = 'Darkness Max';
		tr.appendChild(td);

		td = document.createElement('td');
		input = document.createElement('input');
		input.autocomplete = 'off';
		input.max = '1';
		input.min = '0';
		input.step = '0.1';
		input.type = 'range';
		input.value = '0.8';
		input.oninput = (event: any) => {
			DomUI.settings.darknessMax = Number(event.target.value);
			VideoEngineBus.outputSettings(DomUI.settings);
		};
		td.appendChild(input);
		tr.appendChild(td);
		t.appendChild(tr);

		// Table: FPS
		tr = document.createElement('tr');
		td = document.createElement('td');
		td.innerText = 'FPS';
		tr.appendChild(td);

		td = document.createElement('td');
		select = document.createElement('select');
		select.onchange = (event: any) => {
			DomUI.settings.fps = <any>Number(event.target.value);
			VideoEngineBus.outputSettings(DomUI.settings);
		};

		option = document.createElement('option');
		option.innerText = '30';
		option.value = String(VideoBusInputCmdSettingsFPS._30);
		select.appendChild(option);

		option = document.createElement('option');
		option.innerText = '40';
		option.value = String(VideoBusInputCmdSettingsFPS._40);
		select.appendChild(option);

		option = document.createElement('option');
		option.innerText = '60';
		option.selected = true;
		option.value = String(VideoBusInputCmdSettingsFPS._60);
		select.appendChild(option);

		option = document.createElement('option');
		option.innerText = '120';
		option.value = String(VideoBusInputCmdSettingsFPS._120);
		select.appendChild(option);

		td.appendChild(select);
		tr.appendChild(td);
		t.appendChild(tr);

		// Table: FPS Visible
		tr = document.createElement('tr');
		td = document.createElement('td');
		td.innerText = 'FPS Visible';
		tr.appendChild(td);

		td = document.createElement('td');
		input = document.createElement('input');
		input.autocomplete = 'off';
		input.type = 'checkbox';
		input.checked = true;
		input.oninput = (event: any) => {
			DomUI.settings.fpsVisible = Boolean(event.target.checked);

			if (DomUI.settings.fpsVisible) {
				DomUI.domElementsUIEdit['fps'].style.display = 'block';
			} else {
				DomUI.domElementsUIEdit['fps'].style.display = 'none';
			}

			VideoEngineBus.outputSettings(DomUI.settings);
		};
		td.appendChild(input);
		tr.appendChild(td);
		t.appendChild(tr);

		// Table: Gamma
		tr = document.createElement('tr');
		td = document.createElement('td');
		td.innerText = 'Gamma';
		tr.appendChild(td);

		td = document.createElement('td');
		input = document.createElement('input');
		input.autocomplete = 'off';
		input.max = '1.5';
		input.min = '-0.2';
		input.step = '0.1';
		input.type = 'range';
		input.value = '0';
		input.oninput = (event: any) => {
			DomUI.settings.gamma = Number(event.target.value);
			VideoEngineBus.outputSettings(DomUI.settings);
		};
		td.appendChild(input);
		tr.appendChild(td);
		t.appendChild(tr);

		// Table: Image Quality
		tr = document.createElement('tr');
		td = document.createElement('td');
		td.innerText = 'Image Quality';
		tr.appendChild(td);

		td = document.createElement('td');
		select = document.createElement('select');
		select.onchange = (event: any) => {
			DomUI.settings.imageQuality = <any>Number(event.target.value);
			VideoEngineBus.outputSettings(DomUI.settings);
		};

		option = document.createElement('option');
		option.innerText = 'Low';
		option.value = String(AssetImageSrcQuality.LOW);
		select.appendChild(option);

		option = document.createElement('option');
		option.innerText = 'Medium';
		option.value = String(AssetImageSrcQuality.MEDIUM);
		select.appendChild(option);

		option = document.createElement('option');
		option.innerText = 'High';
		option.selected = true;
		option.value = String(AssetImageSrcQuality.HIGH);
		select.appendChild(option);

		td.appendChild(select);
		tr.appendChild(td);
		t.appendChild(tr);

		// Table: Map
		tr = document.createElement('tr');
		td = document.createElement('td');
		td.innerText = 'Map';
		tr.appendChild(td);

		td = document.createElement('td');
		input = document.createElement('input');
		input.autocomplete = 'off';
		input.type = 'checkbox';
		input.checked = true;
		input.oninput = (event: any) => {
			DomUI.settings.mapVisible = Boolean(event.target.checked);
			VideoEngineBus.outputSettings(DomUI.settings);
		};
		td.appendChild(input);
		tr.appendChild(td);
		t.appendChild(tr);

		// Table: Resolution
		tr = document.createElement('tr');
		td = document.createElement('td');
		td.innerText = 'Resolution';
		tr.appendChild(td);

		td = document.createElement('td');
		select = document.createElement('select');
		select.onchange = (event: any) => {
			let value: string = event.target.value;

			if (value === '') {
				DomUI.settings.resolution = null;
			} else {
				DomUI.settings.resolution = <any>Number(value);
			}

			VideoEngineBus.outputSettings(DomUI.settings);
		};

		option = document.createElement('option');
		option.innerText = 'Native';
		option.value = '';
		select.appendChild(option);

		for (let i in resolutions) {
			option = document.createElement('option');
			option.innerText = resolutions[i];
			option.value = resolutions[i];
			select.appendChild(option);
		}

		td.appendChild(select);
		tr.appendChild(td);
		t.appendChild(tr);

		// Table: Screen Shake
		tr = document.createElement('tr');
		td = document.createElement('td');
		td.innerText = 'Screen Shaking';
		tr.appendChild(td);

		td = document.createElement('td');
		input = document.createElement('input');
		input.autocomplete = 'off';
		input.type = 'checkbox';
		input.checked = true;
		input.oninput = (event: any) => {
			DomUI.settings.screenShakeEnable = Boolean(event.target.checked);
			VideoEngineBus.outputSettings(DomUI.settings);
		};
		td.appendChild(input);
		tr.appendChild(td);
		t.appendChild(tr);

		// Table: Shading Quality
		tr = document.createElement('tr');
		td = document.createElement('td');
		td.innerText = 'Shading Quality';
		tr.appendChild(td);

		td = document.createElement('td');
		select = document.createElement('select');
		select.onchange = (event: any) => {
			DomUI.settings.shadingQuality = <any>Number(event.target.value);
			VideoEngineBus.outputSettings(DomUI.settings);
		};

		option = document.createElement('option');
		option.innerText = 'Low';
		option.value = String(VideoBusInputCmdSettingsShadingQuality.LOW);
		select.appendChild(option);

		option = document.createElement('option');
		option.innerText = 'High';
		option.selected = true;
		option.value = String(VideoBusInputCmdSettingsShadingQuality.HIGH);
		select.appendChild(option);

		td.appendChild(select);
		tr.appendChild(td);
		t.appendChild(tr);

		// Done
		domFeedFittedPauseContent.appendChild(t);

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
		for (let i = 0; i < 7; i++) {
			// Stream
			domFeedOverflowStreamsStream = document.createElement('div');

			switch (i) {
				case 0:
					streamName = 'underlay';
					break;
				case 1:
					streamName = 'background';
					DomUI.domUIRumbleAnimationStreams.push(domFeedOverflowStreamsStream);
					break;
				case 2:
					streamName = 'secondary';
					DomUI.domUIRumbleAnimationStreams.push(domFeedOverflowStreamsStream);
					break;
				case 3:
					streamName = 'primary';
					DomUI.domUIRumbleAnimationStreams.push(domFeedOverflowStreamsStream);
					break;
				case 4:
					streamName = 'foreground';
					DomUI.domUIRumbleAnimationStreams.push(domFeedOverflowStreamsStream);
					break;
				case 5:
					streamName = 'vanishing';
					DomUI.domUIRumbleAnimationStreams.push(domFeedOverflowStreamsStream);
					break;
				case 6:
					streamName = 'overlay';
					break;
			}

			domFeedOverflowStreamsStream.className = 'stream ' + streamName;
			domFeedOverflowStreamsStream.style.zIndex = String(i);
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
			copy: HTMLElement,
			copyButton: HTMLElement,
			detailsContextMenu: HTMLElement,
			feedFitted: HTMLElement = DomUI.domElements['feed-fitted'],
			vanishing: HTMLElement,
			vanishingButton: HTMLElement,
			fps: HTMLElement,
			grid: HTMLElement,
			gridButton: HTMLElement,
			gridModal: HTMLElement,
			gridModalContent: HTMLElement,
			gridModalContentBody: HTMLElement,
			gridModalContentHeader: HTMLElement,
			inspect: HTMLElement,
			inspectButton: HTMLElement,
			map: HTMLElement,
			mapButton: HTMLElement,
			mapModal: HTMLElement,
			mapModalContent: HTMLElement,
			mapModalContentBody: HTMLElement,
			mapModalContentBodySelection: HTMLElement,
			mapModalContentHeader: HTMLElement,
			mouseDownSelectModal: HTMLElement,
			mouseDownSelectModalContent: HTMLElement,
			mouseDownSelectModalContentBody: HTMLElement,
			mouseDownSelectModalContentBodyButton: HTMLElement,
			mouseDownSelectModalContentBodyButtons: HTMLElement,
			mouseDownSelectModalContentBodyButtonsCancel: HTMLElement,
			mouseDownSelectModalContentHeader: HTMLElement,
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
			paletteModalAnimation: HTMLElement,
			paletteModalAnimationContent: HTMLElement,
			paletteModalAnimationContentBody: HTMLElement,
			paletteModalAnimationContentBodyButton: HTMLElement,
			paletteModalAnimationContentBodyButtons: HTMLElement,
			paletteModalAnimationContentBodyButtonsApply: HTMLElement,
			paletteModalAnimationContentBodyButtonsCancel: HTMLElement,
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
			settingsModalContentBodyClockSpeed: HTMLInputElement,
			settingsModalContentBodyHourOfDay: HTMLInputElement,
			settingsModalContentBodyMapName: HTMLInputElement,
			settingsModalContentHeader: HTMLElement,
			spinnerModal: HTMLElement,
			spinnerModalContent: HTMLElement,
			t: HTMLElement,
			time: HTMLElement,
			td: HTMLElement,
			tr: HTMLElement,
			undo: HTMLElement,
			undoButton: HTMLElement,
			view: HTMLElement,
			viewButton: HTMLElement,
			viewMenu: HTMLElement,
			viewMenuAudio: HTMLElement,
			viewMenuImage: HTMLElement,
			viewMenuLight: HTMLElement,
			z: HTMLElement,
			zBackground: HTMLElement,
			zForeground: HTMLElement,
			zGlobal: HTMLElement,
			zPrimary: HTMLElement,
			zSecondary: HTMLElement,
			zVanishing: HTMLElement;

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
			//applicationTypeMenuFill.classList.remove('active');
			applicationTypeMenuEraser.classList.remove('active');
			//applicationTypeMenuStamp.classList.remove('active');

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

			DomUI.uiEditApplicationType = ApplicationType.PENCIL;
			feedFitted.classList.remove('dirt-engine-cursor-eraser');
			feedFitted.classList.remove('dirt-engine-cursor-eye-dropper');
			feedFitted.classList.remove('dirt-engine-cursor-magnifying-glass');
			feedFitted.classList.remove('dirt-engine-cursor-pencil');
			feedFitted.classList.remove('dirt-engine-cursor-paintbrush');
			feedFitted.classList.remove('dirt-engine-cursor-fill');
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
			//applicationTypeMenuFill.classList.remove('active');
			applicationTypeMenuEraser.classList.remove('active');
			//applicationTypeMenuStamp.classList.remove('active');

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
			feedFitted.classList.remove('dirt-engine-cursor-eraser');
			feedFitted.classList.remove('dirt-engine-cursor-eye-dropper');
			feedFitted.classList.remove('dirt-engine-cursor-magnifying-glass');
			feedFitted.classList.remove('dirt-engine-cursor-pencil');
			feedFitted.classList.remove('dirt-engine-cursor-paintbrush');
			feedFitted.classList.remove('dirt-engine-cursor-fill');
			feedFitted.classList.remove('dirt-engine-cursor-stamp');

			if (DomUI.uiEditCursorReady) {
				feedFitted.classList.add('dirt-engine-cursor-paintbrush');
				DomUI.editCursor();
			}
		};
		DomUI.domElements['feed-fitted-ui-application-type-menu-brush'] = applicationTypeMenuBrush;
		DomUI.domElementsUIEdit['application-type-menu-brush'] = applicationTypeMenuBrush;
		applicationTypeMenu.appendChild(applicationTypeMenuBrush);

		// applicationTypeMenuStamp = document.createElement('div');
		// applicationTypeMenuStamp.className = 'button-style stamp';
		// applicationTypeMenuStamp.innerText = 'Stamp';
		// applicationTypeMenuStamp.onclick = () => {
		// 	applicationType.innerText = 'S';
		// 	applicationTypeMenuPencil.classList.remove('active');
		// 	applicationTypeMenuBrush.classList.remove('active');
		// 	//applicationTypeMenuFill.classList.remove('active');
		// 	applicationTypeMenuEraser.classList.remove('active');
		// 	applicationTypeMenuStamp.classList.add('active');

		// 	applicationTypePixelSizeInputRange.disabled = false;
		// 	applicationTypePixelSizeInputRange.max = '100';
		// 	applicationTypePixelSizeInputRange.min = '1';
		// 	applicationTypePixelSizeInputRange.value = '1';
		// 	applicationTypePixelSizeInputText.disabled = false;
		// 	applicationTypePixelSizeInputText.max = '100';
		// 	applicationTypePixelSizeInputText.min = '1';
		// 	applicationTypePixelSizeInputText.value = '2';
		// 	applicationTypePixelSize.style.display = 'flex';
		// 	DomUI.uiEditBrushSize = 1;

		// 	DomUI.uiEditApplicationType = ApplicationType.STAMP;
		// 	feedFitted.classList.remove('dirt-engine-cursor-eraser');
		// 	feedFitted.classList.remove('dirt-engine-cursor-pencil');
		// 	feedFitted.classList.remove('dirt-engine-cursor-paintbrush');
		// 	feedFitted.classList.remove('dirt-engine-cursor-fill');
		// 	feedFitted.classList.remove('dirt-engine-cursor-stamp');

		// 	if (DomUI.uiEditCursorReady) {
		// 		feedFitted.classList.add('dirt-engine-cursor-stamp');
		// 		DomUI.editCursor();
		// 	}
		// };
		// DomUI.domElements['feed-fitted-ui-application-type-menu-stamp'] = applicationTypeMenuStamp;
		// DomUI.domElementsUIEdit['application-type-menu-stamp'] = applicationTypeMenuStamp;
		// applicationTypeMenu.appendChild(applicationTypeMenuStamp);

		// applicationTypeMenuFill = document.createElement('div');
		// applicationTypeMenuFill.className = 'button-style fill';
		// applicationTypeMenuFill.innerText = 'Fill';
		// applicationTypeMenuFill.onclick = () => {
		// 	applicationType.innerText = 'F';
		// 	applicationTypeMenuPencil.classList.remove('active');
		// 	applicationTypeMenuBrush.classList.remove('active');
		// 	applicationTypeMenuFill.classList.add('active');
		// 	applicationTypeMenuEraser.classList.remove('active');
		// 	applicationTypeMenuStamp.classList.remove('active');
		// 	applicationTypePixelSize.style.display = 'none';
		// 	DomUI.uiEditApplicationType = ApplicationType.FILL;
		// 	DomUI.uiEditBrushSize = 0;
		// 	feedFitted.classList.remove('dirt-engine-cursor-eraser');
		// 	feedFitted.classList.remove('dirt-engine-cursor-pencil');
		// 	feedFitted.classList.remove('dirt-engine-cursor-paintbrush');
		// 	feedFitted.classList.remove('dirt-engine-cursor-fill');
		// 	feedFitted.classList.remove('dirt-engine-cursor-stamp');

		// 	if (DomUI.uiEditCursorReady) {
		// 		feedFitted.classList.add('dirt-engine-cursor-fill');
		// 		DomUI.editCursor();
		// 	}
		// };
		// DomUI.domElements['feed-fitted-ui-application-type-menu-fill'] = applicationTypeMenuFill;
		// DomUI.domElementsUIEdit['application-type-menu-fill'] = applicationTypeMenuFill;
		// applicationTypeMenu.appendChild(applicationTypeMenuFill);

		applicationTypeMenuEraser = document.createElement('div');
		applicationTypeMenuEraser.className = 'button-style eraser';
		applicationTypeMenuEraser.innerText = 'Eraser';
		applicationTypeMenuEraser.onclick = () => {
			applicationType.innerText = 'E';
			applicationTypeMenuPencil.classList.remove('active');
			applicationTypeMenuBrush.classList.remove('active');
			//applicationTypeMenuFill.classList.remove('active');
			applicationTypeMenuEraser.classList.add('active');
			//applicationTypeMenuStamp.classList.remove('active');

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
			feedFitted.classList.remove('dirt-engine-cursor-eraser');
			feedFitted.classList.remove('dirt-engine-cursor-eye-dropper');
			feedFitted.classList.remove('dirt-engine-cursor-magnifying-glass');
			feedFitted.classList.remove('dirt-engine-cursor-pencil');
			feedFitted.classList.remove('dirt-engine-cursor-paintbrush');
			feedFitted.classList.remove('dirt-engine-cursor-fill');
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
		 * Copy
		 */
		copy = document.createElement('div');
		copy.className = 'dirt-engine-ui-edit copy';
		copy.onclick = (event: any) => {
			application.style.display = 'none';
			applicationTypePixelSize.style.display = 'none';
			copy.classList.add('active');
			inspect.classList.remove('active');

			DomUI.uiEditCursorReady = false;
			feedFitted.classList.remove('dirt-engine-cursor-eraser');
			feedFitted.classList.remove('dirt-engine-cursor-magnifying-glass');
			feedFitted.classList.remove('dirt-engine-cursor-pencil');
			feedFitted.classList.remove('dirt-engine-cursor-paintbrush');
			feedFitted.classList.remove('dirt-engine-cursor-fill');
			feedFitted.classList.remove('dirt-engine-cursor-stamp');
			DomUI.editCursor();

			feedFitted.classList.add('dirt-engine-cursor-eye-dropper');
		};
		DomUI.domElements['feed-fitted-ui-copy'] = copy;
		DomUI.domElementsUIEdit['copy'] = copy;
		domFeedFitted.appendChild(copy);

		copyButton = document.createElement('div');
		copyButton.className = 'dirt-engine-icon eye-dropper';
		DomUI.domElements['feed-fitted-ui-copy-button'] = copyButton;
		DomUI.domElementsUIEdit['copy-button'] = copyButton;
		copy.appendChild(copyButton);

		/*
		 * FPS
		 */
		fps = document.createElement('div');
		fps.className = 'dirt-engine-ui-edit fps';
		if (!DomUI.settings.fpsVisible) {
			fps.style.display = 'none';
		}
		DomUI.domElements['feed-fitted-ui-fps'] = fps;
		DomUI.domElementsUIEdit['fps'] = fps;
		domFeedFitted.appendChild(fps);

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
		 * Inspect
		 */
		inspect = document.createElement('div');
		inspect.className = 'dirt-engine-ui-edit inspect';
		inspect.onclick = (event: any) => {
			application.style.display = 'none';
			applicationTypePixelSize.style.display = 'none';
			copy.classList.remove('active');
			inspect.classList.add('active');

			DomUI.uiEditCursorReady = false;
			feedFitted.classList.remove('dirt-engine-cursor-eraser');
			feedFitted.classList.remove('dirt-engine-cursor-eye-dropper');
			feedFitted.classList.remove('dirt-engine-cursor-pencil');
			feedFitted.classList.remove('dirt-engine-cursor-paintbrush');
			feedFitted.classList.remove('dirt-engine-cursor-fill');
			feedFitted.classList.remove('dirt-engine-cursor-stamp');
			DomUI.editCursor();

			feedFitted.classList.add('dirt-engine-cursor-magnifying-glass');
		};
		DomUI.domElements['feed-fitted-ui-inspect'] = inspect;
		DomUI.domElementsUIEdit['inspect'] = inspect;
		domFeedFitted.appendChild(inspect);

		inspectButton = document.createElement('div');
		inspectButton.className = 'dirt-engine-icon magnifying-glass';
		DomUI.domElements['feed-fitted-ui-inspect-button'] = inspectButton;
		DomUI.domElementsUIEdit['inspect-button'] = inspectButton;
		inspect.appendChild(inspectButton);

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

			if (DomUI.uiEditView === VideoBusInputCmdGameModeEditApplyView.AUDIO) {
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

				// Table: Audio Tag - Effect
				tr = document.createElement('tr');
				td = document.createElement('td');
				paletteModalContentBodyButton = document.createElement('div');
				paletteModalContentBodyButton.className = 'button';
				paletteModalContentBodyButton.innerText = 'Audio Tag: Effect';
				paletteModalContentBodyButton.onclick = () => {
					DomUI.detailsModalAudioTagEffect();
				};
				td.appendChild(paletteModalContentBodyButton);
				tr.appendChild(td);
				t.appendChild(tr);

				// Table: Audio Tag - Music
				tr = document.createElement('tr');
				td = document.createElement('td');
				paletteModalContentBodyButton = document.createElement('div');
				paletteModalContentBodyButton.className = 'button';
				paletteModalContentBodyButton.innerText = 'Audio Tag: Music';
				paletteModalContentBodyButton.onclick = () => {
					DomUI.detailsModalAudioTagMusic();
				};
				td.appendChild(paletteModalContentBodyButton);
				tr.appendChild(td);
				t.appendChild(tr);
			}

			if (DomUI.uiEditView === VideoBusInputCmdGameModeEditApplyView.IMAGE) {
				// Table: Image Block Foliage
				tr = document.createElement('tr');
				td = document.createElement('td');
				paletteModalContentBodyButton = document.createElement('div');
				paletteModalContentBodyButton.className = 'button';
				paletteModalContentBodyButton.innerText = 'Image Block Foliage';
				paletteModalContentBodyButton.onclick = () => {
					DomUI.detailsModalImageBlockFoliage();
				};
				td.appendChild(paletteModalContentBodyButton);
				tr.appendChild(td);
				t.appendChild(tr);

				// Table: Image Block Liquid
				tr = document.createElement('tr');
				td = document.createElement('td');
				paletteModalContentBodyButton = document.createElement('div');
				paletteModalContentBodyButton.className = 'button';
				paletteModalContentBodyButton.innerText = 'Image Block Liquid';
				paletteModalContentBodyButton.onclick = () => {
					DomUI.detailsModalImageBlockLiquid();
				};
				td.appendChild(paletteModalContentBodyButton);
				tr.appendChild(td);
				t.appendChild(tr);

				// Table: Image Block Liquid
				tr = document.createElement('tr');
				td = document.createElement('td');
				paletteModalContentBodyButton = document.createElement('div');
				paletteModalContentBodyButton.className = 'button';
				paletteModalContentBodyButton.innerText = 'Image Block Solid';
				paletteModalContentBodyButton.onclick = () => {
					DomUI.detailsModalImageBlockSolid();
				};
				td.appendChild(paletteModalContentBodyButton);
				tr.appendChild(td);
				t.appendChild(tr);
			}

			if (DomUI.uiEditView === VideoBusInputCmdGameModeEditApplyView.LIGHT) {
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
			}

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
			let mapActive: MapActive = MapEditEngine.getMapActive();
			settings.classList.add('active');

			settingsModalContentBodyClockSpeed.value = String(mapActive.clockSpeedRelativeToEarth);
			settingsModalContentBodyHourOfDay.value = String(mapActive.hourOfDay);
			settingsModalContentBodyMapName.value = mapActive.name;

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
		 * Settings
		 */
		time = document.createElement('div');
		time.className = 'dirt-engine-ui-edit time';
		DomUI.domElements['feed-fitted-ui-time'] = time;
		DomUI.domElementsUIEdit['time'] = time;
		domFeedFitted.appendChild(time);

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
							feedFitted.classList.remove('dirt-engine-cursor-eraser');
							feedFitted.classList.remove('dirt-engine-cursor-pencil');
							feedFitted.classList.remove('dirt-engine-cursor-paintbrush');
							feedFitted.classList.remove('dirt-engine-cursor-fill');
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
			DomUI.uiEditView = VideoBusInputCmdGameModeEditApplyView.AUDIO;
			viewMenuAudio.classList.add('active');
			viewMenuImage.classList.remove('active');
			viewMenuLight.classList.remove('active');

			zBackground.classList.add('disabled');
			zForeground.classList.add('disabled');
			zPrimary.classList.remove('disabled');
			zSecondary.classList.add('disabled');
			zVanishing.classList.add('disabled');

			view.classList.add('overlay-text');
			view.classList.add('audio');
			view.classList.remove('image');
			view.classList.remove('light');

			// Undraw cursor
			DomUI.uiEditCursorReady = false;
			application.style.display = 'none';
			applicationTypePixelSize.style.display = 'none';

			if (DomUI.uiEditZ !== VideoBusInputCmdGameModeEditApplyZ.PRIMARY) {
				zPrimary.click();
			}
		};
		DomUI.domElements['feed-fitted-ui-view-menu-audio'] = viewMenuAudio;
		DomUI.domElementsUIEdit['mode-menu-audio'] = viewMenuAudio;
		viewMenu.appendChild(viewMenuAudio);

		viewMenuImage = document.createElement('div');
		viewMenuImage.className = 'button-style image active';
		viewMenuImage.innerText = 'Image';
		viewMenuImage.onclick = () => {
			DomUI.uiEditView = VideoBusInputCmdGameModeEditApplyView.IMAGE;
			viewMenuAudio.classList.remove('active');
			viewMenuImage.classList.add('active');
			viewMenuLight.classList.remove('active');

			zBackground.classList.remove('disabled');
			zForeground.classList.remove('disabled');
			zPrimary.classList.remove('disabled');
			zSecondary.classList.remove('disabled');
			zVanishing.classList.remove('disabled');

			view.classList.add('overlay-text');
			view.classList.remove('audio');
			view.classList.add('image');
			view.classList.remove('light');

			// Undraw cursor
			DomUI.uiEditCursorReady = false;
			application.style.display = 'none';
			applicationTypePixelSize.style.display = 'none';
		};
		DomUI.domElements['feed-fitted-ui-view-menu-image'] = viewMenuImage;
		DomUI.domElementsUIEdit['mode-menu-image'] = viewMenuImage;
		viewMenu.appendChild(viewMenuImage);

		viewMenuLight = document.createElement('div');
		viewMenuLight.className = 'button-style light';
		viewMenuLight.innerText = 'Light';
		viewMenuLight.onclick = () => {
			DomUI.uiEditView = VideoBusInputCmdGameModeEditApplyView.LIGHT;
			viewMenuAudio.classList.remove('active');
			viewMenuImage.classList.remove('active');
			viewMenuLight.classList.add('active');

			zBackground.classList.add('disabled');
			zForeground.classList.remove('disabled');
			zPrimary.classList.remove('disabled');
			zSecondary.classList.add('disabled');
			zVanishing.classList.add('disabled');

			view.classList.add('overlay-text');
			view.classList.remove('audio');
			view.classList.remove('image');
			view.classList.add('light');

			// Undraw cursor
			DomUI.uiEditCursorReady = false;
			application.style.display = 'none';
			applicationTypePixelSize.style.display = 'none';

			if (
				DomUI.uiEditZ === VideoBusInputCmdGameModeEditApplyZ.BACKGROUND ||
				DomUI.uiEditZ === VideoBusInputCmdGameModeEditApplyZ.VANISHING
			) {
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
			if (DomUI.uiEditZ === VideoBusInputCmdGameModeEditApplyZ.BACKGROUND) {
				return;
			}
			// Display Applications
			copy.style.display = 'flex';
			inspect.style.display = 'flex';
			palette.style.display = 'flex';
			view.style.display = 'flex';

			// Display specific canvas
			DomUI.domElements['feed-overflow-streams-underlay'].style.opacity = '0';
			DomUI.domElements['feed-overflow-streams-background'].style.opacity = '1';
			DomUI.domElements['feed-overflow-streams-secondary'].style.opacity = '.2';
			DomUI.domElements['feed-overflow-streams-primary'].style.opacity = '.2';
			DomUI.domElements['feed-overflow-streams-foreground'].style.opacity = '0';
			DomUI.domElements['feed-overflow-streams-vanishing'].style.opacity = '0';

			// Hide application
			DomUI.domElementsUIEdit['application'].style.display = 'none';
			DomUI.domElementsUIEdit['application-pixel-size'].style.display = 'none';

			if (DomUI.uiEditZ === VideoBusInputCmdGameModeEditApplyZ.PRIMARY) {
				// Remove application cursor
				DomUI.uiEditCursorReady = false;
				feedFitted.classList.remove('dirt-engine-cursor-pencil');
				feedFitted.classList.remove('dirt-engine-cursor-paintbrush');
				feedFitted.classList.remove('dirt-engine-cursor-fill');
				feedFitted.classList.remove('dirt-engine-cursor-eraser');
				feedFitted.classList.remove('dirt-engine-cursor-stamp');
				DomUI.editCursor();
			}

			// Draw Options
			DomUI.uiEditDraw.editing = true;
			DomUI.uiEditDraw.grid = true;
			DomUI.uiEditDraw.vanishingEnable = false;
			VideoEngineBus.outputGameModeEditDraw(DomUI.uiEditDraw);
			VideoEngineBus.outputGameModeEditTimeForced(true);

			DomUI.uiEditZ = VideoBusInputCmdGameModeEditApplyZ.BACKGROUND;
			zBackground.classList.add('active');
			zGlobal.classList.remove('active');
			zForeground.classList.remove('active');
			zPrimary.classList.remove('active');
			zSecondary.classList.remove('active');
			zVanishing.classList.remove('active');
		};
		DomUI.domElements['feed-fitted-ui-z-background'] = zBackground;
		DomUI.domElementsUIEdit['z-background'] = zBackground;
		z.appendChild(zBackground);

		zSecondary = document.createElement('div');
		zSecondary.className = 'button secondary active';
		zSecondary.innerText = 'S';
		zSecondary.onclick = () => {
			if (DomUI.uiEditZ === VideoBusInputCmdGameModeEditApplyZ.SECONDARY) {
				return;
			}
			// Display Applications
			copy.style.display = 'flex';
			inspect.style.display = 'flex';
			palette.style.display = 'flex';
			view.style.display = 'flex';

			// Display specific canvas
			DomUI.domElements['feed-overflow-streams-underlay'].style.opacity = '0';
			DomUI.domElements['feed-overflow-streams-background'].style.opacity = '.5';
			DomUI.domElements['feed-overflow-streams-secondary'].style.opacity = '1';
			DomUI.domElements['feed-overflow-streams-primary'].style.opacity = '.2';
			DomUI.domElements['feed-overflow-streams-foreground'].style.opacity = '.2';
			DomUI.domElements['feed-overflow-streams-vanishing'].style.opacity = '0';

			// Hide application
			DomUI.domElementsUIEdit['application'].style.display = 'none';
			DomUI.domElementsUIEdit['application-pixel-size'].style.display = 'none';

			// Remove application cursor
			DomUI.uiEditCursorReady = false;
			feedFitted.classList.remove('dirt-engine-cursor-pencil');
			feedFitted.classList.remove('dirt-engine-cursor-paintbrush');
			feedFitted.classList.remove('dirt-engine-cursor-fill');
			feedFitted.classList.remove('dirt-engine-cursor-eraser');
			feedFitted.classList.remove('dirt-engine-cursor-stamp');
			DomUI.editCursor();

			// Draw Options
			DomUI.uiEditDraw.editing = true;
			DomUI.uiEditDraw.grid = true;
			DomUI.uiEditDraw.vanishingEnable = false;
			VideoEngineBus.outputGameModeEditDraw(DomUI.uiEditDraw);
			VideoEngineBus.outputGameModeEditTimeForced(true);

			DomUI.uiEditZ = VideoBusInputCmdGameModeEditApplyZ.SECONDARY;
			zBackground.classList.remove('active');
			zGlobal.classList.remove('active');
			zForeground.classList.remove('active');
			zPrimary.classList.remove('active');
			zSecondary.classList.add('active');
			zVanishing.classList.remove('active');
		};
		DomUI.domElements['feed-fitted-ui-z-secondary'] = zSecondary;
		DomUI.domElementsUIEdit['z-secondary'] = zSecondary;
		z.appendChild(zSecondary);

		zPrimary = document.createElement('div');
		zPrimary.className = 'button primary active';
		zPrimary.innerText = 'P';
		zPrimary.onclick = () => {
			if (DomUI.uiEditZ === VideoBusInputCmdGameModeEditApplyZ.PRIMARY) {
				return;
			}
			// Display Applications
			copy.style.display = 'flex';
			inspect.style.display = 'flex';
			palette.style.display = 'flex';
			view.style.display = 'flex';

			// Display specific canvas
			DomUI.domElements['feed-overflow-streams-underlay'].style.opacity = '0';
			DomUI.domElements['feed-overflow-streams-background'].style.opacity = '.5';
			DomUI.domElements['feed-overflow-streams-secondary'].style.opacity = '.5';
			DomUI.domElements['feed-overflow-streams-primary'].style.opacity = '1';
			DomUI.domElements['feed-overflow-streams-foreground'].style.opacity = '.2';
			DomUI.domElements['feed-overflow-streams-vanishing'].style.opacity = '0';

			// Hide application
			DomUI.domElementsUIEdit['application'].style.display = 'none';
			DomUI.domElementsUIEdit['application-pixel-size'].style.display = 'none';

			// Remove application cursor
			DomUI.uiEditCursorReady = false;
			feedFitted.classList.remove('dirt-engine-cursor-pencil');
			feedFitted.classList.remove('dirt-engine-cursor-paintbrush');
			feedFitted.classList.remove('dirt-engine-cursor-fill');
			feedFitted.classList.remove('dirt-engine-cursor-eraser');
			feedFitted.classList.remove('dirt-engine-cursor-stamp');
			DomUI.editCursor();

			// Draw Options
			DomUI.uiEditDraw.editing = true;
			DomUI.uiEditDraw.grid = true;
			DomUI.uiEditDraw.vanishingEnable = false;
			VideoEngineBus.outputGameModeEditDraw(DomUI.uiEditDraw);
			VideoEngineBus.outputGameModeEditTimeForced(true);

			DomUI.uiEditZ = VideoBusInputCmdGameModeEditApplyZ.PRIMARY;
			zBackground.classList.remove('active');
			zGlobal.classList.remove('active');
			zForeground.classList.remove('active');
			zPrimary.classList.add('active');
			zSecondary.classList.remove('active');
			zVanishing.classList.remove('active');
		};
		DomUI.domElements['feed-fitted-ui-z-primary'] = zPrimary;
		DomUI.domElementsUIEdit['z-primary'] = zPrimary;
		z.appendChild(zPrimary);

		zForeground = document.createElement('div');
		zForeground.className = 'button foreground';
		zForeground.innerText = 'F';
		zForeground.onclick = () => {
			if (DomUI.uiEditZ === VideoBusInputCmdGameModeEditApplyZ.FOREGROUND) {
				return;
			}
			// Display Applications
			copy.style.display = 'flex';
			inspect.style.display = 'flex';
			palette.style.display = 'flex';
			view.style.display = 'flex';

			// Display specific canvas
			DomUI.domElements['feed-overflow-streams-underlay'].style.opacity = '0';
			DomUI.domElements['feed-overflow-streams-background'].style.opacity = '.5';
			DomUI.domElements['feed-overflow-streams-secondary'].style.opacity = '.5';
			DomUI.domElements['feed-overflow-streams-primary'].style.opacity = '.5';
			DomUI.domElements['feed-overflow-streams-foreground'].style.opacity = '1';
			DomUI.domElements['feed-overflow-streams-vanishing'].style.opacity = '.2';

			// Hide application
			DomUI.domElementsUIEdit['application'].style.display = 'none';
			DomUI.domElementsUIEdit['application-pixel-size'].style.display = 'none';

			if (DomUI.uiEditZ === VideoBusInputCmdGameModeEditApplyZ.PRIMARY) {
				// Remove application cursor
				DomUI.uiEditCursorReady = false;
				feedFitted.classList.remove('dirt-engine-cursor-pencil');
				feedFitted.classList.remove('dirt-engine-cursor-paintbrush');
				feedFitted.classList.remove('dirt-engine-cursor-fill');
				feedFitted.classList.remove('dirt-engine-cursor-eraser');
				feedFitted.classList.remove('dirt-engine-cursor-stamp');
				DomUI.editCursor();
			}

			// Draw Options
			DomUI.uiEditDraw.editing = true;
			DomUI.uiEditDraw.grid = true;
			DomUI.uiEditDraw.vanishingEnable = false;
			VideoEngineBus.outputGameModeEditDraw(DomUI.uiEditDraw);
			VideoEngineBus.outputGameModeEditTimeForced(true);

			DomUI.uiEditZ = VideoBusInputCmdGameModeEditApplyZ.FOREGROUND;
			zBackground.classList.remove('active');
			zGlobal.classList.remove('active');
			zForeground.classList.add('active');
			zPrimary.classList.remove('active');
			zSecondary.classList.remove('active');
			zVanishing.classList.remove('active');
		};
		DomUI.domElements['feed-fitted-ui-z-foreground'] = zForeground;
		DomUI.domElementsUIEdit['z-foreground'] = zForeground;
		z.appendChild(zForeground);

		zVanishing = document.createElement('div');
		zVanishing.className = 'button vanishing';
		zVanishing.innerText = 'V';
		zVanishing.onclick = () => {
			if (DomUI.uiEditZ === VideoBusInputCmdGameModeEditApplyZ.VANISHING) {
				return;
			}
			// Display Applications
			copy.style.display = 'flex';
			inspect.style.display = 'flex';
			palette.style.display = 'flex';
			view.style.display = 'flex';

			// Display specific canvas
			DomUI.domElements['feed-overflow-streams-underlay'].style.opacity = '0';
			DomUI.domElements['feed-overflow-streams-background'].style.opacity = '.5';
			DomUI.domElements['feed-overflow-streams-secondary'].style.opacity = '.5';
			DomUI.domElements['feed-overflow-streams-primary'].style.opacity = '.5';
			DomUI.domElements['feed-overflow-streams-foreground'].style.opacity = '.5';
			DomUI.domElements['feed-overflow-streams-vanishing'].style.opacity = '1';

			// Hide application
			DomUI.domElementsUIEdit['application'].style.display = 'none';
			DomUI.domElementsUIEdit['application-pixel-size'].style.display = 'none';

			if (DomUI.uiEditZ === VideoBusInputCmdGameModeEditApplyZ.PRIMARY) {
				// Remove application cursor
				DomUI.uiEditCursorReady = false;
				feedFitted.classList.remove('dirt-engine-cursor-pencil');
				feedFitted.classList.remove('dirt-engine-cursor-paintbrush');
				feedFitted.classList.remove('dirt-engine-cursor-fill');
				feedFitted.classList.remove('dirt-engine-cursor-eraser');
				feedFitted.classList.remove('dirt-engine-cursor-stamp');
				DomUI.editCursor();
			}

			// Draw Options
			DomUI.uiEditDraw.editing = true;
			DomUI.uiEditDraw.grid = true;
			DomUI.uiEditDraw.vanishingEnable = false;
			VideoEngineBus.outputGameModeEditDraw(DomUI.uiEditDraw);
			VideoEngineBus.outputGameModeEditTimeForced(true);

			DomUI.uiEditZ = VideoBusInputCmdGameModeEditApplyZ.VANISHING;
			zBackground.classList.remove('active');
			zGlobal.classList.remove('active');
			zForeground.classList.remove('active');
			zPrimary.classList.remove('active');
			zSecondary.classList.remove('active');
			zVanishing.classList.add('active');
		};
		DomUI.domElements['feed-fitted-ui-z-vanishing'] = zVanishing;
		DomUI.domElementsUIEdit['z-vanishing'] = zVanishing;
		z.appendChild(zVanishing);

		zGlobal = document.createElement('div');
		zGlobal.className = 'button global';
		zGlobal.innerText = 'G';
		zGlobal.onclick = () => {
			if (DomUI.uiEditZ === undefined) {
				return;
			}
			// Hide Applications
			application.style.display = 'none';
			applicationTypePixelSize.style.display = 'none';
			copy.style.display = 'none';
			inspect.style.display = 'none';
			palette.style.display = 'none';
			view.style.display = 'none';

			// Display all canvases
			DomUI.domElements['feed-overflow-streams-underlay'].style.opacity = '1';
			DomUI.domElements['feed-overflow-streams-background'].style.opacity = '1';
			DomUI.domElements['feed-overflow-streams-secondary'].style.opacity = '1';
			DomUI.domElements['feed-overflow-streams-primary'].style.opacity = '1';
			DomUI.domElements['feed-overflow-streams-foreground'].style.opacity = '1';
			DomUI.domElements['feed-overflow-streams-vanishing'].style.opacity = '1';

			// Remove application cursor
			DomUI.uiEditCursorReady = false;
			feedFitted.classList.remove('dirt-engine-cursor-eraser');
			feedFitted.classList.remove('dirt-engine-cursor-eye-dropper');
			feedFitted.classList.remove('dirt-engine-cursor-magnifying-glass');
			feedFitted.classList.remove('dirt-engine-cursor-pencil');
			feedFitted.classList.remove('dirt-engine-cursor-paintbrush');
			feedFitted.classList.remove('dirt-engine-cursor-fill');
			feedFitted.classList.remove('dirt-engine-cursor-stamp');
			DomUI.editCursor();

			// Draw Options
			DomUI.uiEditDraw.editing = false;
			DomUI.uiEditDraw.grid = false;
			DomUI.uiEditDraw.vanishingEnable = true;
			VideoEngineBus.outputGameModeEditDraw(DomUI.uiEditDraw);
			VideoEngineBus.outputGameModeEditTimeForced(false);

			DomUI.uiEditZ = undefined;
			copy.classList.remove('active');
			inspect.classList.remove('active');
			zBackground.classList.remove('active');
			zGlobal.classList.add('active');
			zForeground.classList.remove('active');
			zPrimary.classList.remove('active');
			zSecondary.classList.remove('active');
			zVanishing.classList.remove('active');
		};
		DomUI.domElements['feed-fitted-ui-z-global'] = zGlobal;
		DomUI.domElementsUIEdit['z-global'] = zGlobal;
		z.appendChild(zGlobal);

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
		mapModalContentBodySelection.className = 'button green';
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
		 * MouseDown Select Modal
		 */
		mouseDownSelectModal = document.createElement('div');
		mouseDownSelectModal.className = 'dirt-engine-ui-edit mouse-down-select-modal modal';
		DomUI.domElements['feed-fitted-ui-mouse-down-select-modal'] = mouseDownSelectModal;
		DomUI.domElementsUIEdit['application-mouse-down-select-modal'] = mouseDownSelectModal;
		domFeedFitted.appendChild(mouseDownSelectModal);

		mouseDownSelectModalContent = document.createElement('div');
		mouseDownSelectModalContent.className = 'content';
		DomUI.domElements['feed-fitted-ui-mouse-down-select-modal-content'] = mouseDownSelectModalContent;
		DomUI.domElementsUIEdit['application-mouse-down-select-modal-content'] = mouseDownSelectModalContent;
		mouseDownSelectModal.appendChild(mouseDownSelectModalContent);

		mouseDownSelectModalContentHeader = document.createElement('div');
		mouseDownSelectModalContentHeader.className = 'header';
		mouseDownSelectModalContentHeader.innerText = 'Copy or Inspect';
		DomUI.domElements['feed-fitted-ui-mouse-down-select-modal-content-header'] = mouseDownSelectModalContentHeader;
		DomUI.domElementsUIEdit['application-mouse-down-select-modal-content-header'] = mouseDownSelectModalContentHeader;
		mouseDownSelectModalContent.appendChild(mouseDownSelectModalContentHeader);

		mouseDownSelectModalContentBody = document.createElement('div');
		mouseDownSelectModalContentBody.className = 'body buttoned';
		DomUI.domElements['feed-fitted-ui-mouse-down-select-modal-content-body'] = mouseDownSelectModalContentBody;
		DomUI.domElementsUIEdit['application-mouse-down-select-modal-content-body'] = mouseDownSelectModalContentBody;
		mouseDownSelectModalContent.appendChild(mouseDownSelectModalContentBody);

		// Table
		t = document.createElement('table');
		DomUI.domElements['feed-fitted-ui-mouse-down-select-modal-content-body-table'] = t;
		DomUI.domElementsUIEdit['application-mouse-down-select-modal-content-body-table'] = t;
		mouseDownSelectModalContentBody.appendChild(t);

		// Cancel/Save
		mouseDownSelectModalContentBodyButtons = document.createElement('div');
		mouseDownSelectModalContentBodyButtons.className = 'buttons';
		DomUI.domElements['feed-fitted-ui-mouse-down-select-modal-content-buttons'] = mouseDownSelectModalContentBodyButtons;
		DomUI.domElementsUIEdit['application-mouse-down-select-modal-content-buttons'] = mouseDownSelectModalContentBodyButtons;
		mouseDownSelectModalContent.appendChild(mouseDownSelectModalContentBodyButtons);

		mouseDownSelectModalContentBodyButtonsCancel = document.createElement('div');
		mouseDownSelectModalContentBodyButtonsCancel.className = 'button red';
		mouseDownSelectModalContentBodyButtonsCancel.innerText = 'Close';
		mouseDownSelectModalContentBodyButtonsCancel.onclick = () => {
			DomUI.domElementsUIEdit['application-mouse-down-select-modal'].style.display = 'none';
			MouseEngine.setSuspendWheel(false);
		};
		DomUI.domElements['feed-fitted-ui-mouse-down-select-modal-content-buttons-cancel'] = mouseDownSelectModalContentBodyButtonsCancel;
		DomUI.domElementsUIEdit['application-mouse-down-select-modal-content-buttons-cancel'] =
			mouseDownSelectModalContentBodyButtonsCancel;
		mouseDownSelectModalContentBodyButtons.appendChild(mouseDownSelectModalContentBodyButtonsCancel);

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
		DomUI.domElementsUIEdit['application-palette-modal-content-buttons-cancel'] = paletteModalContentBodyButtonsCancel;
		paletteModalContentBodyButtons.appendChild(paletteModalContentBodyButtonsCancel);

		paletteModalContentBodyButtonsApply = document.createElement('div');
		paletteModalContentBodyButtonsApply.className = 'button green';
		paletteModalContentBodyButtonsApply.innerText = 'Apply';
		DomUI.domElements['feed-fitted-ui-palette-modal-content-buttons-apply'] = paletteModalContentBodyButtonsApply;
		DomUI.domElementsUIEdit['application-palette-modal-content-buttons-apply'] = paletteModalContentBodyButtonsApply;
		paletteModalContentBodyButtons.appendChild(paletteModalContentBodyButtonsApply);

		/*
		 * Pallete: Modal Animation
		 */
		paletteModalAnimation = document.createElement('div');
		paletteModalAnimation.className = 'dirt-engine-ui-edit palette-animation-modal modal';
		DomUI.domElements['feed-fitted-ui-palette-animation-modal'] = paletteModalAnimation;
		DomUI.domElementsUIEdit['application-palette-animation-modal'] = paletteModalAnimation;
		domFeedFitted.appendChild(paletteModalAnimation);

		paletteModalAnimationContent = document.createElement('div');
		paletteModalAnimationContent.className = 'content';
		DomUI.domElements['feed-fitted-ui-palette-animation-modal-content'] = paletteModalAnimationContent;
		DomUI.domElementsUIEdit['application-palette-animation-modal-content'] = paletteModalAnimationContent;
		paletteModalAnimation.appendChild(paletteModalAnimationContent);

		paletteModalAnimationContentBody = document.createElement('div');
		paletteModalAnimationContentBody.className = 'body buttoned';
		DomUI.domElements['feed-fitted-ui-palette-animation-modal-content-body'] = paletteModalAnimationContentBody;
		DomUI.domElementsUIEdit['application-palette-animation-modal-content-body'] = paletteModalAnimationContentBody;
		paletteModalAnimationContent.appendChild(paletteModalAnimationContentBody);

		// Table
		t = document.createElement('table');
		DomUI.domElements['feed-fitted-ui-palette-animation-modal-content-body-table'] = t;
		DomUI.domElementsUIEdit['application-palette-animation-modal-content-body-table'] = t;
		paletteModalAnimationContentBody.appendChild(t);

		// Cancel/Save
		paletteModalAnimationContentBodyButtons = document.createElement('div');
		paletteModalAnimationContentBodyButtons.className = 'buttons';
		DomUI.domElements['feed-fitted-ui-palette-animation-modal-content-buttons'] = paletteModalAnimationContentBodyButtons;
		DomUI.domElementsUIEdit['application-palette-animation-modal-content-buttons'] = paletteModalAnimationContentBodyButtons;
		paletteModalAnimationContent.appendChild(paletteModalAnimationContentBodyButtons);

		paletteModalAnimationContentBodyButtonsCancel = document.createElement('div');
		paletteModalAnimationContentBodyButtonsCancel.className = 'button red';
		paletteModalAnimationContentBodyButtonsCancel.innerText = 'Cancel';
		DomUI.domElements['feed-fitted-ui-palette-animation-modal-content-buttons-cancel'] = paletteModalAnimationContentBodyButtonsCancel;
		DomUI.domElementsUIEdit['application-palette-animation-modal-content-buttons-cancel'] =
			paletteModalAnimationContentBodyButtonsCancel;
		paletteModalAnimationContentBodyButtons.appendChild(paletteModalAnimationContentBodyButtonsCancel);

		paletteModalAnimationContentBodyButtonsApply = document.createElement('div');
		paletteModalAnimationContentBodyButtonsApply.className = 'button green';
		paletteModalAnimationContentBodyButtonsApply.innerText = 'Apply';
		DomUI.domElements['feed-fitted-ui-palette-animation-modal-content-buttons-apply'] = paletteModalAnimationContentBodyButtonsApply;
		DomUI.domElementsUIEdit['application-palette-animation-modal-content-buttons-apply'] = paletteModalAnimationContentBodyButtonsApply;
		paletteModalAnimationContentBodyButtons.appendChild(paletteModalAnimationContentBodyButtonsApply);

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
		settingsModalContentBodyMapName = document.createElement('input');
		settingsModalContentBodyMapName.autocomplete = 'off';
		settingsModalContentBodyMapName.className = 'input';
		settingsModalContentBodyMapName.type = 'text';
		DomUI.domElements['feed-fitted-ui-settings-modal-content-body-name'] = settingsModalContentBodyMapName;
		DomUI.domElementsUIEdit['application-settings-modal-content-body-name'] = settingsModalContentBodyMapName;
		td.appendChild(settingsModalContentBodyMapName);
		tr.appendChild(td);
		t.appendChild(tr);

		// Input table: clock speed relative to earch
		tr = document.createElement('tr');
		td = document.createElement('td');
		td.innerText = 'Clock Speed Relative to Earth';
		tr.appendChild(td);

		td = document.createElement('td');
		settingsModalContentBodyClockSpeed = document.createElement('input');
		settingsModalContentBodyClockSpeed.autocomplete = 'off';
		settingsModalContentBodyClockSpeed.className = 'input';
		settingsModalContentBodyClockSpeed.max = '86400';
		settingsModalContentBodyClockSpeed.min = '0';
		settingsModalContentBodyClockSpeed.step = '1';
		settingsModalContentBodyClockSpeed.type = 'range';
		DomUI.domElements['feed-fitted-ui-settings-modal-content-body-clock-speed'] = settingsModalContentBodyClockSpeed;
		DomUI.domElementsUIEdit['application-settings-modal-content-body-clock-speed'] = settingsModalContentBodyClockSpeed;
		td.appendChild(settingsModalContentBodyClockSpeed);
		tr.appendChild(td);
		t.appendChild(tr);

		// Input table: hour of day
		tr = document.createElement('tr');
		td = document.createElement('td');
		td.innerText = 'Hour of Day';
		tr.appendChild(td);

		td = document.createElement('td');
		settingsModalContentBodyHourOfDay = document.createElement('input');
		settingsModalContentBodyHourOfDay.autocomplete = 'off';
		settingsModalContentBodyHourOfDay.className = 'input';
		settingsModalContentBodyHourOfDay.max = '23';
		settingsModalContentBodyHourOfDay.min = '0';
		settingsModalContentBodyHourOfDay.step = '1';
		settingsModalContentBodyHourOfDay.type = 'range';
		DomUI.domElements['feed-fitted-ui-settings-modal-content-body-hour-of-day'] = settingsModalContentBodyHourOfDay;
		DomUI.domElementsUIEdit['application-settings-modal-content-body-hour-of-day'] = settingsModalContentBodyHourOfDay;
		td.appendChild(settingsModalContentBodyHourOfDay);
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
		DomUI.domElements['feed-fitted-ui-settings-modal-content-buttons-cancel'] = settingsModalContentBodyButtonsCancel;
		DomUI.domElementsUIEdit['application-settings-modal-content-buttons-cancel'] = settingsModalContentBodyButtonsCancel;
		settingsModalContentBodyButtons.appendChild(settingsModalContentBodyButtonsCancel);

		settingsModalContentBodyButtonsApply = document.createElement('div');
		settingsModalContentBodyButtonsApply.className = 'button green';
		settingsModalContentBodyButtonsApply.innerText = 'Apply';
		settingsModalContentBodyButtonsApply.onclick = () => {
			let mapConfig: MapConfig = {
				clockSpeedRelativeToEarth: Number(settingsModalContentBodyClockSpeed.value),
				gridConfigs: MapEditEngine.getMapActive().gridConfigs,
				hourOfDay: Number(settingsModalContentBodyHourOfDay.value),
				name: settingsModalContentBodyMapName.value,
			};

			MapEditEngine.updateMapSettings(mapConfig);
			VideoEngineBus.outputGameModeEditSettings(mapConfig);

			settings.classList.remove('active');
			DomUI.domElementsUIEdit['application-settings-modal'].style.display = 'none';
			MouseEngine.setSuspendWheel(false);
		};
		DomUI.domElements['feed-fitted-ui-settings-modal-content-buttons-apply'] = settingsModalContentBodyButtonsApply;
		DomUI.domElementsUIEdit['application-settings-modal-content-buttons-apply'] = settingsModalContentBodyButtonsApply;
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
