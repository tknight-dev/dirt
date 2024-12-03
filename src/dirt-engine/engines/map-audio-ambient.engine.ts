import { AudioEngine, AudioOptions } from './audio.engine';
import { AudioModulation } from '../models/audio-modulation.model';
import {
	Grid,
	GridAudioBlock,
	GridAudioTag,
	GridAudioTagActivationType,
	GridAudioTagEffect,
	GridAudioTagMusic,
	GridAudioTagType,
	GridBlockTable,
	GridBlockTableComplex,
	GridLight,
} from '../models/grid.model';
import { MapActive } from '../models/map.model';
import { VideoBusOutputCmdEditCameraUpdate } from '../engines/buses/video.model.bus';
import { UtilEngine } from './util.engine';

/**
 * Track camera position on map via UI thread for static map audio assets
 *
 * @author tknight-dev
 */

interface LightMeta {
	on: boolean;
}

interface LightState {
	ambient: State;
	switchOff: State;
	switchOn: State;
}

interface State {
	pan: number;
	volumePercentage: number;
}

interface TagMeta {
	activationCount: number;
	activationType: GridAudioTagActivationType;
	contacted: boolean;
	left: boolean;
	oneshot: boolean;
	up: boolean;
}

interface TagState extends State {}

export class MapAudioAmbientEngine {
	private static active: boolean;
	private static activeAudioLightForegroundAmbient: { [key: number]: number } = {};
	private static activeAudioLightForegroundSwitchOff: { [key: number]: number } = {};
	private static activeAudioLightForegroundSwitchOn: { [key: number]: number } = {};
	private static activeAudioLightPrimaryAmbient: { [key: number]: number } = {};
	private static activeAudioLightPrimarySwitchOff: { [key: number]: number } = {};
	private static activeAudioLightPrimarySwitchOn: { [key: number]: number } = {};
	private static activeAudioTag: { [key: number]: number } = {};
	private static initialized: boolean;
	private static lightForegroundMetaByGrid: { [key: string]: { [key: number]: LightMeta } } = {};
	private static lightForegroundTagStatesByGrid: { [key: string]: { [key: number]: LightState } } = {};
	private static lightPrimaryMetaByGrid: { [key: string]: { [key: number]: LightMeta } } = {};
	private static lightPrimaryTagStatesByGrid: { [key: string]: { [key: number]: LightState } } = {};
	private static mapActive: MapActive;
	private static requestFrame: number;
	private static tagMetaByGrid: { [key: string]: { [key: number]: TagMeta } } = {};
	private static tagStatesByGrid: { [key: string]: { [key: number]: TagState } } = {};
	private static timingResolution: number = 30;
	private static timestampDelta: number;
	private static timestampNow: number;
	private static timestampThen: number = performance.now();
	private static volumePercentage: number = 1;

	private static calc(): void {
		// determine positions of all activation by trip tags (left: boolean, up: boolean, currentTagStateLeft: boolean, currentTagStateUp: boolean)
		let mapActive: MapActive = MapAudioAmbientEngine.mapActive,
			grid: Grid,
			gridAudioTagActivationType: GridAudioTagActivationType | undefined,
			gridAudioTag: GridAudioTag,
			gridLight: GridLight,
			gx: number = mapActive.camera.gx,
			gy: number = mapActive.camera.gy,
			j: string,
			k: string,
			lightHashes: { [key: number]: GridLight },
			lightMeta: { [key: number]: LightMeta },
			lightNight: boolean = UtilEngine.isLightNight(mapActive.hourOfDayEff + 1),
			lights: GridBlockTable<GridLight>[],
			lightForegroundMetaByGrid: { [key: string]: { [key: number]: LightMeta } } = MapAudioAmbientEngine.lightForegroundMetaByGrid,
			lightForegroundTagStatesByGrid: { [key: string]: { [key: number]: LightState } } =
				MapAudioAmbientEngine.lightForegroundTagStatesByGrid,
			lightPrimaryMetaByGrid: { [key: string]: { [key: number]: LightMeta } } = MapAudioAmbientEngine.lightPrimaryMetaByGrid,
			lightPrimaryTagStatesByGrid: { [key: string]: { [key: number]: LightState } } =
				MapAudioAmbientEngine.lightPrimaryTagStatesByGrid,
			tagHashes: { [key: number]: GridAudioTag },
			tagMeta: { [key: number]: TagMeta },
			tagMetaByGrid: { [key: string]: { [key: number]: TagMeta } } = MapAudioAmbientEngine.tagMetaByGrid,
			tagStatesByGrid: { [key: string]: { [key: number]: TagState } } = MapAudioAmbientEngine.tagStatesByGrid;

		for (let i in mapActive.grids) {
			grid = mapActive.grids[i];

			if (lightForegroundMetaByGrid[grid.id] === undefined) {
				lightForegroundMetaByGrid[grid.id] = {};
			}
			if (lightForegroundTagStatesByGrid[grid.id] === undefined) {
				lightForegroundTagStatesByGrid[grid.id] = {};
			}
			if (lightPrimaryMetaByGrid[grid.id] === undefined) {
				lightPrimaryMetaByGrid[grid.id] = {};
			}
			if (lightPrimaryTagStatesByGrid[grid.id] === undefined) {
				lightPrimaryTagStatesByGrid[grid.id] = {};
			}
			if (tagMetaByGrid[grid.id] === undefined) {
				tagMetaByGrid[grid.id] = {};
			}
			if (tagStatesByGrid[grid.id] === undefined) {
				tagStatesByGrid[grid.id] = {};
			}

			/**
			 * Audio Blocks/Tags
			 */
			tagHashes = grid.audioPrimaryTags.hashes;
			tagMeta = tagMetaByGrid[grid.id];
			for (j in tagHashes) {
				gridAudioTag = tagHashes[j];

				if (gridAudioTag.alwaysOn) {
					continue;
				}

				gridAudioTagActivationType = (<GridAudioTagEffect>gridAudioTag).activation;
				if (gridAudioTagActivationType !== undefined) {
					tagMeta[gridAudioTag.hash] = {
						activationCount: 0,
						activationType: gridAudioTagActivationType,
						contacted: false,
						left: gridAudioTag.gx < gx,
						oneshot: !!(<GridAudioTagEffect>gridAudioTag).oneshot,
						up: gridAudioTag.gy < gy,
					};
				}
			}

			/**
			 * Lights
			 */
			lights = [grid.lightsForeground, grid.lightsPrimary];
			for (j in lights) {
				lightHashes = lights[j].hashes;

				if (j === '0') {
					lightMeta = lightForegroundMetaByGrid[grid.id];
				} else {
					lightMeta = lightPrimaryMetaByGrid[grid.id];
				}

				for (k in lightHashes) {
					gridLight = lightHashes[k];

					if (
						gridLight.assetIdAudioEffectAmbient ||
						gridLight.assetIdAudioEffectSwitchOff ||
						gridLight.assetIdAudioEffectSwitchOn
					) {
						if (gridLight.nightOnly) {
							lightMeta[gridLight.hash] = {
								on: lightNight,
							};
						} else {
							lightMeta[gridLight.hash] = {
								on: true,
							};
						}
					}
				}
			}
		}
	}

	public static async initialize(): Promise<void> {
		if (MapAudioAmbientEngine.initialized) {
			console.error('MapAudioAmbientEngine > initialize: already initialized');
			return;
		}
		MapAudioAmbientEngine.initialized = true;
	}

	private static async loop(): Promise<void> {
		if (!MapAudioAmbientEngine.active) {
			return;
		}

		try {
			//Start the request for the next frame
			MapAudioAmbientEngine.requestFrame = requestAnimationFrame(MapAudioAmbientEngine.loop);
			MapAudioAmbientEngine.timestampNow = performance.now();

			MapAudioAmbientEngine.timestampDelta = MapAudioAmbientEngine.timestampNow - MapAudioAmbientEngine.timestampThen;
			if (MapAudioAmbientEngine.timestampDelta > MapAudioAmbientEngine.timingResolution) {
				MapAudioAmbientEngine.timestampThen =
					MapAudioAmbientEngine.timestampNow - (MapAudioAmbientEngine.timestampDelta % MapAudioAmbientEngine.timingResolution);

				// Start
				let activate: boolean,
					activeAudioLightAmbient: { [key: number]: number },
					activeAudioLightSwitchOff: { [key: number]: number },
					activeAudioLightSwitchOn: { [key: number]: number },
					activeAudioLightForegroundAmbient: { [key: number]: number } = MapAudioAmbientEngine.activeAudioLightForegroundAmbient,
					activeAudioLightForegroundSwitchOff: { [key: number]: number } =
						MapAudioAmbientEngine.activeAudioLightForegroundSwitchOff,
					activeAudioLightForegroundSwitchOn: { [key: number]: number } =
						MapAudioAmbientEngine.activeAudioLightForegroundSwitchOn,
					activeAudioLightPrimaryAmbient: { [key: number]: number } = MapAudioAmbientEngine.activeAudioLightPrimaryAmbient,
					activeAudioLightPrimarySwitchOff: { [key: number]: number } = MapAudioAmbientEngine.activeAudioLightPrimarySwitchOff,
					activeAudioLightPrimarySwitchOn: { [key: number]: number } = MapAudioAmbientEngine.activeAudioLightPrimarySwitchOn,
					activeAudioTag: { [key: number]: number } = MapAudioAmbientEngine.activeAudioTag,
					audioBufferId: number | undefined,
					audioBufferIdAmbient: number | undefined,
					audioBufferIdSwitchOff: number | undefined,
					audioBufferIdSwitchOn: number | undefined,
					audioOptions: AudioOptions,
					mapActive: MapActive = MapAudioAmbientEngine.mapActive,
					audioPrimaryBlocks: GridBlockTable<GridAudioBlock> = mapActive.gridActive.audioPrimaryBlocks,
					audioPrimaryTags: GridBlockTable<GridAudioTag> = mapActive.gridActive.audioPrimaryTags,
					audioPrimaryTagsHashes: { [key: number]: GridAudioTag } = audioPrimaryTags.hashes,
					cameraHash: number = UtilEngine.gridHashTo(mapActive.camera.gx, mapActive.camera.gy),
					complex: GridBlockTableComplex,
					distance: number = 0,
					distanceGx: number,
					distanceGy: number,
					gRadius: number | undefined,
					gridAudioBlock: GridAudioBlock,
					gridAudioTag: GridAudioTag,
					gridLight: GridLight,
					gx: number = mapActive.camera.gx,
					gxString: string,
					gy: number = mapActive.camera.gy,
					hash: number,
					i: string,
					j: string,
					lightForeground: boolean,
					lightHashes: { [key: number]: GridLight },
					lightHashesGy: GridBlockTableComplex[],
					lightHashesGyByGx: { [key: number]: GridBlockTableComplex[] } = <any>audioPrimaryTags.hashesGyByGx,
					lightForegroundMeta: { [key: number]: LightMeta } =
						MapAudioAmbientEngine.lightForegroundMetaByGrid[mapActive.gridActiveId],
					lightForegroundTagStates: { [key: number]: LightState } =
						MapAudioAmbientEngine.lightForegroundTagStatesByGrid[mapActive.gridActiveId],
					lightMeta: LightMeta,
					lightNight: boolean = UtilEngine.isLightNight(mapActive.hourOfDayEff + 1),
					lightPrimaryMeta: { [key: number]: LightMeta } = MapAudioAmbientEngine.lightPrimaryMetaByGrid[mapActive.gridActiveId],
					lightPrimaryTagStates: { [key: number]: LightState } =
						MapAudioAmbientEngine.lightPrimaryTagStatesByGrid[mapActive.gridActiveId],
					lights: GridBlockTable<GridLight>[] = [mapActive.gridActive.lightsForeground, mapActive.gridActive.lightsPrimary],
					lightState: LightState,
					pan: number,
					panIgnored: boolean,
					panOffset: number,
					position: TagMeta,
					state: State,
					tagHashesGy: GridBlockTableComplex[],
					tagHashesGyByGx: { [key: number]: GridBlockTableComplex[] } = <any>audioPrimaryTags.hashesGyByGx,
					tagStates: { [key: number]: TagState } = MapAudioAmbientEngine.tagStatesByGrid[mapActive.gridActiveId],
					tagMeta: { [key: number]: TagMeta } = MapAudioAmbientEngine.tagMetaByGrid[mapActive.gridActiveId],
					timingResolution: number = MapAudioAmbientEngine.timingResolution,
					viewportGxStart: number = mapActive.camera.viewportGx,
					viewportGxStop: number =
						viewportGxStart + Math.round((mapActive.camera.viewportPw / mapActive.camera.gInPw) * 1000) / 1000,
					volumePercentage: number,
					volumePercentageMax: number = MapAudioAmbientEngine.volumePercentage;

				// Offset pan when camera isn't perfectly center
				if (viewportGxStart === 0 || viewportGxStart + mapActive.camera.viewportGwEff === mapActive.gridConfigActive.gWidth) {
					panOffset = Math.max(
						-1,
						Math.min(
							1,
							Math.round(UtilEngine.scale(mapActive.camera.gx, viewportGxStop, viewportGxStart, -1, 1) * 1000) / 1000,
						),
					);
				} else {
					panOffset = 0;
				}

				/**
				 * Lights
				 */
				for (i in lights) {
					lightHashes = lights[i].hashes;
					lightHashesGyByGx = <any>lights[i].hashesGyByGx;

					if (i === '0') {
						lightForeground = true;
					} else {
						lightForeground = false;
					}

					for (gxString in lightHashesGyByGx) {
						lightHashesGy = lightHashesGyByGx[gxString];

						for (j in lightHashesGy) {
							complex = lightHashesGy[j];
							hash = complex.hash;

							gridLight = lightHashes[hash];
							gRadius = gridLight.gRadiusAudioEffect;

							// Select source
							if (lightForeground) {
								activeAudioLightAmbient = activeAudioLightForegroundAmbient;
								activeAudioLightSwitchOff = activeAudioLightForegroundSwitchOff;
								activeAudioLightSwitchOn = activeAudioLightForegroundSwitchOn;

								audioBufferIdAmbient = activeAudioLightForegroundAmbient[hash];
								audioBufferIdSwitchOff = activeAudioLightForegroundSwitchOff[hash];
								audioBufferIdSwitchOn = activeAudioLightForegroundSwitchOn[hash];

								lightMeta = lightForegroundMeta[hash];
								if (!lightMeta) {
									// calc didn't pick it up
									continue;
								}

								if (lightForegroundTagStates[hash] === undefined) {
									lightForegroundTagStates[hash] = <any>{};
								}
								lightState = lightForegroundTagStates[hash];
								state = lightForegroundTagStates[hash].ambient;
							} else {
								activeAudioLightAmbient = activeAudioLightPrimaryAmbient;
								activeAudioLightSwitchOff = activeAudioLightPrimarySwitchOff;
								activeAudioLightSwitchOn = activeAudioLightPrimarySwitchOn;

								audioBufferIdAmbient = activeAudioLightPrimaryAmbient[hash];
								audioBufferIdSwitchOff = activeAudioLightPrimarySwitchOff[hash];
								audioBufferIdSwitchOn = activeAudioLightPrimarySwitchOn[hash];

								lightMeta = lightPrimaryMeta[hash];
								if (!lightMeta) {
									// calc didn't pick it up
									continue;
								}

								if (lightPrimaryTagStates[hash] === undefined) {
									lightPrimaryTagStates[hash] = <any>{};
								}
								lightState = lightPrimaryTagStates[hash];
								state = lightPrimaryTagStates[hash].ambient;
							}

							// Is effected by distance?
							if (gRadius) {
								distanceGx = gridLight.gx + gridLight.gSizeW / 2 - gx;
								distanceGy = gridLight.gy + gridLight.gSizeH / 2 - gy;
								distance = Math.round(Math.sqrt(distanceGx * distanceGx + distanceGy * distanceGy) * 1000) / 1000;

								if (distance > gRadius) {
									// stop if currently playing
									if (audioBufferId !== undefined) {
										AudioEngine.controlStop(audioBufferIdAmbient);
										AudioEngine.controlStop(audioBufferIdSwitchOff);
										AudioEngine.controlStop(audioBufferIdSwitchOn);

										delete activeAudioLightAmbient[hash];
										delete activeAudioLightSwitchOff[hash];
										delete activeAudioLightSwitchOn[hash];
									}
									continue;
								}

								volumePercentage = Math.round(UtilEngine.scale(distance, 0, gRadius, volumePercentageMax, 0) * 1000) / 1000;
							} else {
								volumePercentage = 1;
							}

							pan =
								Math.round(
									Math.max(
										-1,
										Math.min(1, UtilEngine.scale(gridLight.gx, viewportGxStop, viewportGxStart, 1, -1) + panOffset),
									) * 1000,
								) / 1000;
							audioOptions = {
								pan: pan,
								volumePercentage: volumePercentage,
							};
							gridAudioBlock = audioPrimaryBlocks.hashes[cameraHash];
							if (gridAudioBlock) {
								audioOptions.modulation = AudioModulation.find(gridAudioBlock.modulationId) || AudioModulation.NONE;
							}

							// Already playing? AMBIENT
							if (audioBufferIdAmbient !== undefined) {
								if (gRadius && state.volumePercentage !== volumePercentage) {
									// Update audio volume by fading the duration of this interval for smooth audio voluming
									if (!AudioEngine.controlFade(audioBufferIdAmbient, timingResolution, volumePercentage)) {
										// Audio ended before volume could be adjusted
										delete activeAudioLightAmbient[hash];
										continue;
									}

									state.volumePercentage = volumePercentage;
								}

								if (state.pan !== pan) {
									// Update audio pan by panning the duration of this interval for smooth audio voluming
									if (!AudioEngine.controlPan(audioBufferIdAmbient, timingResolution, pan)) {
										// Audio ended before pan could be adjusted
										delete activeAudioLightAmbient[hash];
										continue;
									}

									state.pan = pan;
								}
							} else {
								if (gridLight.assetIdAudioEffectAmbient) {
									audioBufferId = await AudioEngine.controlPlay(gridLight.assetIdAudioEffectAmbient, audioOptions);

									if (audioBufferId) {
										activeAudioLightAmbient[hash] = audioBufferId;
										lightState.ambient = {
											pan: pan,
											volumePercentage: volumePercentage,
										};
									}
								}
							}

							// Already playing? SWITCH_OFF
							if (audioBufferIdAmbient !== undefined) {
								if (gRadius && state.volumePercentage !== volumePercentage) {
									// Update audio volume by fading the duration of this interval for smooth audio voluming
									if (!AudioEngine.controlFade(audioBufferIdSwitchOff, timingResolution, volumePercentage)) {
										// Audio ended before volume could be adjusted
										delete activeAudioLightSwitchOff[hash];
										continue;
									}

									state.volumePercentage = volumePercentage;
								}

								if (state.pan !== pan) {
									// Update audio pan by panning the duration of this interval for smooth audio voluming
									if (!AudioEngine.controlPan(audioBufferIdSwitchOff, timingResolution, pan)) {
										// Audio ended before pan could be adjusted
										delete activeAudioLightSwitchOff[hash];
										continue;
									}

									state.pan = pan;
								}
							} else {
								if (lightMeta.on && !lightNight) {
									lightMeta.on = false;

									if (gridLight.assetIdAudioEffectSwitchOff) {
										audioBufferId = await AudioEngine.controlPlay(gridLight.assetIdAudioEffectSwitchOff, audioOptions);

										if (audioBufferId) {
											activeAudioLightSwitchOff[hash] = audioBufferId;
											lightState.ambient = {
												pan: pan,
												volumePercentage: volumePercentage,
											};
										}
									}
								}
							}

							// Already playing? SWITCH_ON
							if (audioBufferIdAmbient !== undefined) {
								if (gRadius && state.volumePercentage !== volumePercentage) {
									// Update audio volume by fading the duration of this interval for smooth audio voluming
									if (!AudioEngine.controlFade(audioBufferIdSwitchOff, timingResolution, volumePercentage)) {
										// Audio ended before volume could be adjusted
										delete activeAudioLightSwitchOff[hash];
										continue;
									}

									state.volumePercentage = volumePercentage;
								}

								if (state.pan !== pan) {
									// Update audio pan by panning the duration of this interval for smooth audio voluming
									if (!AudioEngine.controlPan(audioBufferIdSwitchOff, timingResolution, pan)) {
										// Audio ended before pan could be adjusted
										delete activeAudioLightSwitchOff[hash];
										continue;
									}

									state.pan = pan;
								}
							} else {
								if (!lightMeta.on && lightNight) {
									lightMeta.on = true;

									if (gridLight.assetIdAudioEffectSwitchOn) {
										audioBufferId = await AudioEngine.controlPlay(gridLight.assetIdAudioEffectSwitchOn, audioOptions);

										if (audioBufferId) {
											activeAudioLightSwitchOn[hash] = audioBufferId;
											lightState.switchOn = {
												pan: pan,
												volumePercentage: volumePercentage,
											};
										}
									}
								}
							}
						}
					}
				}

				/**
				 * Audio Blocks/Tags
				 */
				for (gxString in tagHashesGyByGx) {
					tagHashesGy = tagHashesGyByGx[gxString];

					for (i in tagHashesGy) {
						complex = tagHashesGy[i];
						hash = complex.hash;

						audioBufferId = activeAudioTag[hash];
						gridAudioTag = audioPrimaryTagsHashes[hash];
						gRadius = gridAudioTag.gRadius;
						panIgnored = !!gridAudioTag.panIgnored;

						// Is effected by distance?
						if (gRadius) {
							distanceGx = gridAudioTag.gx - gx + 0.5; // .5 centers the sound in the grid box
							distanceGy = gridAudioTag.gy - gy + 0.5; // .5 centers the sound in the grid box
							distance = Math.round(Math.sqrt(distanceGx * distanceGx + distanceGy * distanceGy) * 1000) / 1000;

							if (distance > gRadius) {
								// stop if currently playing
								if (audioBufferId !== undefined) {
									AudioEngine.controlStop(activeAudioTag[hash]);
									delete activeAudioTag[hash];
								}
								continue;
							}

							// Audio volume based on distance
							if (gridAudioTag.type === GridAudioTagType.EFFECT) {
								volumePercentage = Math.round(UtilEngine.scale(distance, 0, gRadius, volumePercentageMax, 0) * 1000) / 1000;
							} else {
								volumePercentage = (<GridAudioTagMusic>gridAudioTag).volumePercentage;
							}
						} else {
							volumePercentage = 1;
						}

						// Pan based on gx
						if (panIgnored) {
							pan = 0;
						} else {
							pan =
								Math.round(
									Math.max(
										-1,
										Math.min(1, UtilEngine.scale(gridAudioTag.gx, viewportGxStop, viewportGxStart, 1, -1) + panOffset),
									) * 1000,
								) / 1000;
						}

						// Already playing?
						if (audioBufferId !== undefined) {
							if (gRadius && tagStates[hash].volumePercentage !== volumePercentage) {
								// Update audio volume by fading the duration of this interval for smooth audio voluming
								if (!AudioEngine.controlFade(audioBufferId, timingResolution, volumePercentage)) {
									// Audio ended before volume could be adjusted
									delete activeAudioTag[hash];
									continue;
								}

								tagStates[hash].volumePercentage = volumePercentage;
							}

							if (!panIgnored && tagStates[hash].pan !== pan) {
								// Update audio pan by panning the duration of this interval for smooth audio voluming
								if (!AudioEngine.controlPan(audioBufferId, timingResolution, pan)) {
									// Audio ended before pan could be adjusted
									delete activeAudioTag[hash];
									continue;
								}

								tagStates[hash].pan = pan;
							}
						} else {
							audioOptions = {
								loop: gridAudioTag.alwaysOn,
								pan: pan,
								volumePercentage: volumePercentage,
							};

							gridAudioBlock = audioPrimaryBlocks.hashes[cameraHash];
							if (gridAudioBlock) {
								audioOptions.modulation = AudioModulation.find(gridAudioBlock.modulationId) || AudioModulation.NONE;
							}

							// Play audio
							position = tagMeta[hash];
							if (position) {
								activate = false;

								// Already triggered
								if (position.oneshot && position.activationCount) {
									continue;
								}

								// Requires specification activation
								switch (position.activationType) {
									case GridAudioTagActivationType.CONTACT:
										if (
											gx >= gridAudioTag.gx &&
											gx <= gridAudioTag.gx + 1 &&
											gy >= gridAudioTag.gy &&
											gy <= gridAudioTag.gy + 1
										) {
											if (!position.contacted) {
												activate = true;
												position.contacted = true;
											}
										} else {
											position.contacted = false;
										}
										break;
									case GridAudioTagActivationType.HORIZONTAL:
										if (position.left !== gridAudioTag.gx < gx) {
											position.left = gridAudioTag.gx < gx;

											activate = true;
										}
										break;
									case GridAudioTagActivationType.VERTICAL:
										if (position.up !== gridAudioTag.gy < gy) {
											position.up = gridAudioTag.gy < gy;

											activate = true;
										}
										break;
								}

								if (activate) {
									audioBufferId = await AudioEngine.controlPlay(gridAudioTag.assetId, audioOptions);
									position.activationCount++;

									if (audioBufferId) {
										activeAudioTag[hash] = audioBufferId;
										tagStates[hash] = {
											pan: pan,
											volumePercentage: volumePercentage,
										};
									}
								}
							} else {
								audioBufferId = await AudioEngine.controlPlay(gridAudioTag.assetId, audioOptions);

								if (audioBufferId) {
									activeAudioTag[hash] = audioBufferId;
									tagStates[hash] = {
										pan: pan,
										volumePercentage: volumePercentage,
									};
								}
							}
						}
					}
				}
			}
		} catch (error: any) {
			console.log('error', error);
		}
	}

	public static start(): void {
		if (MapAudioAmbientEngine.active) {
			console.error('MapAudioAmbientEngine > start: already started');
			return;
		}
		MapAudioAmbientEngine.active = true;
		MapAudioAmbientEngine.calc();
		MapAudioAmbientEngine.requestFrame = requestAnimationFrame(MapAudioAmbientEngine.loop);
	}

	public static stop(): void {
		let j: string,
			stop: { [key: number]: number }[] = [
				MapAudioAmbientEngine.activeAudioLightForegroundAmbient,
				MapAudioAmbientEngine.activeAudioLightForegroundSwitchOff,
				MapAudioAmbientEngine.activeAudioLightForegroundSwitchOn,
				MapAudioAmbientEngine.activeAudioLightPrimaryAmbient,
				MapAudioAmbientEngine.activeAudioLightPrimarySwitchOff,
				MapAudioAmbientEngine.activeAudioLightPrimarySwitchOn,
				MapAudioAmbientEngine.activeAudioTag,
			],
			stopInstance: { [key: number]: number };

		MapAudioAmbientEngine.active = false;
		cancelAnimationFrame(MapAudioAmbientEngine.requestFrame);

		for (let i in stop) {
			stopInstance = stop[i];

			for (j in stopInstance) {
				AudioEngine.controlStop(stopInstance[j]);
				delete stopInstance[j];
			}
		}

		MapAudioAmbientEngine.lightForegroundMetaByGrid = <any>new Object();
		MapAudioAmbientEngine.lightForegroundTagStatesByGrid = <any>new Object();

		MapAudioAmbientEngine.lightPrimaryMetaByGrid = <any>new Object();
		MapAudioAmbientEngine.lightPrimaryTagStatesByGrid = <any>new Object();

		MapAudioAmbientEngine.tagMetaByGrid = <any>new Object();
		MapAudioAmbientEngine.tagStatesByGrid = <any>new Object();
	}

	public static updateCamera(videoBusOutputCmdEditCameraUpdate: VideoBusOutputCmdEditCameraUpdate): void {
		MapAudioAmbientEngine.mapActive.camera = Object.assign(MapAudioAmbientEngine.mapActive.camera, videoBusOutputCmdEditCameraUpdate);
	}

	public static setMapActive(mapActive: MapActive): void {
		MapAudioAmbientEngine.mapActive = mapActive;
	}

	public static setVolumePercentage(volumePercentage: number): void {
		MapAudioAmbientEngine.volumePercentage = volumePercentage;
	}
}
