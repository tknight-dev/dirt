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
} from '../models/grid.model';
import { MapActive } from '../models/map.model';
import { VideoBusOutputCmdEditCameraUpdate } from '../engines/buses/video.model.bus';
import { UtilEngine } from './util.engine';

/**
 * Track camera position on map via UI thread for static map audio assets
 *
 * @author tknight-dev
 */

interface Position {
	activationCount: number;
	activationType: GridAudioTagActivationType;
	contacted: boolean;
	leftCurrent: boolean;
	leftPrevious: boolean;
	oneshot: boolean;
	upCurrent: boolean;
	upPrevious: boolean;
}

interface State {
	pan: number;
	volumePercentage: number;
}

export class MapAudioAmbientEngine {
	private static active: boolean;
	private static activeAudio: { [key: number]: number } = {};
	private static initialized: boolean;
	private static mapActive: MapActive;
	private static requestFrame: number;
	private static tagPositionsByGrid: { [key: string]: { [key: number]: Position } } = {};
	private static tagStatesByGrid: { [key: string]: { [key: number]: State } } = {};
	private static timingResolution: number = 30;
	private static timestampDelta: number;
	private static timestampNow: number;
	private static timestampThen: number = performance.now();
	private static volumePercentage: number = 1;

	private static calc(): void {
		// determine positions of all activation by trip tags (left: boolean, up: boolean, currentStateLeft: boolean, currentStateUp: boolean)
		let mapActive: MapActive = MapAudioAmbientEngine.mapActive,
			grid: Grid,
			gridAudioTagActivationType: GridAudioTagActivationType | undefined,
			gridAudioTag: GridAudioTag,
			hashes: { [key: number]: GridAudioTag },
			j: string,
			gx: number = mapActive.camera.gx,
			gy: number = mapActive.camera.gy,
			tagPositions: { [key: number]: Position },
			tagPositionsByGrid: { [key: string]: { [key: number]: Position } } = MapAudioAmbientEngine.tagPositionsByGrid,
			tagStatesByGrid: { [key: string]: { [key: number]: State } } = MapAudioAmbientEngine.tagStatesByGrid;

		for (let i in mapActive.grids) {
			grid = mapActive.grids[i];
			hashes = grid.audioPrimaryTags.hashes;

			if (tagPositionsByGrid[grid.id] === undefined) {
				tagPositionsByGrid[grid.id] = {};
			}
			if (tagStatesByGrid[grid.id] === undefined) {
				tagStatesByGrid[grid.id] = {};
			}
			tagPositions = tagPositionsByGrid[grid.id];

			for (j in hashes) {
				gridAudioTag = hashes[j];

				if (gridAudioTag.alwaysOn) {
					continue;
				}

				gridAudioTagActivationType = (<GridAudioTagEffect>gridAudioTag).activation;
				if (gridAudioTagActivationType) {
					tagPositions[gridAudioTag.hash] = {
						activationCount: 0,
						activationType: gridAudioTagActivationType,
						contacted: false,
						leftCurrent: gridAudioTag.gx < gx,
						leftPrevious: gridAudioTag.gx < gx,
						oneshot: !!(<GridAudioTagEffect>gridAudioTag).oneshot,
						upCurrent: gridAudioTag.gy < gy,
						upPrevious: gridAudioTag.gy < gy,
					};
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

		//Start the request for the next frame
		MapAudioAmbientEngine.requestFrame = requestAnimationFrame(MapAudioAmbientEngine.loop);
		MapAudioAmbientEngine.timestampNow = performance.now();

		MapAudioAmbientEngine.timestampDelta = MapAudioAmbientEngine.timestampNow - MapAudioAmbientEngine.timestampThen;
		if (MapAudioAmbientEngine.timestampDelta > MapAudioAmbientEngine.timingResolution) {
			MapAudioAmbientEngine.timestampThen =
				MapAudioAmbientEngine.timestampNow - (MapAudioAmbientEngine.timestampDelta % MapAudioAmbientEngine.timingResolution);

			// Start
			let activate: boolean,
				activeAudio: { [key: number]: number } = MapAudioAmbientEngine.activeAudio,
				audioBufferId: number | undefined,
				audioOptions: AudioOptions,
				mapActive: MapActive = MapAudioAmbientEngine.mapActive,
				audioPrimaryBlocks: GridBlockTable<GridAudioBlock> = mapActive.gridActive.audioPrimaryBlocks,
				audioPrimaryTags: GridBlockTable<GridAudioTag> = mapActive.gridActive.audioPrimaryTags,
				complex: GridBlockTableComplex,
				distance: number,
				distanceGx: number,
				distanceGy: number,
				gRadius: number | undefined,
				gridAudioBlock: GridAudioBlock,
				gridAudioTag: GridAudioTag,
				gridAudioTagEffect: GridAudioTagEffect,
				gridAudioTagMusic: GridAudioTagMusic,
				gx: number = mapActive.camera.gx,
				gy: number = mapActive.camera.gy,
				hash: number,
				hashesGy: GridBlockTableComplex[],
				hashesGyByGx: { [key: number]: GridBlockTableComplex[] } = <any>audioPrimaryTags.hashesGyByGx,
				i: string,
				pan: number,
				panIgnored: boolean,
				panOffset: number,
				position: Position,
				tagStates: { [key: number]: State } = MapAudioAmbientEngine.tagStatesByGrid[mapActive.gridActiveId],
				tagPositions: { [key: number]: Position } = MapAudioAmbientEngine.tagPositionsByGrid[mapActive.gridActiveId],
				timingResolution: number = MapAudioAmbientEngine.timingResolution,
				viewportGxStart: number = mapActive.camera.viewportGx,
				viewportGxStop: number = viewportGxStart + Math.round((mapActive.camera.viewportPw / mapActive.camera.gInPw) * 1000) / 1000,
				volumePercentage: number,
				volumePercentageMax: number = MapAudioAmbientEngine.volumePercentage;

			// Offset pan when camera isn't perfectly center
			if (viewportGxStart === 0 || viewportGxStart + mapActive.camera.viewportGwEff === mapActive.gridConfigActive.gWidth) {
				panOffset = Math.max(
					-1,
					Math.min(1, Math.round(UtilEngine.scale(mapActive.camera.gx, viewportGxStop, viewportGxStart, -1, 1) * 1000) / 1000),
				);
			} else {
				panOffset = 0;
			}

			for (let gxString in hashesGyByGx) {
				hashesGy = hashesGyByGx[gxString];

				for (i in hashesGy) {
					complex = hashesGy[i];
					hash = complex.hash;

					audioBufferId = activeAudio[hash];
					gridAudioTag = audioPrimaryTags.hashes[hash];
					gRadius = gridAudioTag.gRadius;
					panIgnored = !!gridAudioTag.panIgnored;

					// Is effected by distance?
					if (gRadius) {
						distanceGx = gridAudioTag.gx - gx;
						distanceGy = gridAudioTag.gy - gy;
						distance = Math.round(Math.sqrt(distanceGx * distanceGx + distanceGy * distanceGy) * 1000) / 1000;

						if (distance > gRadius) {
							// stop if currently playing
							if (audioBufferId !== undefined) {
								AudioEngine.controlStop(activeAudio[hash]);
								continue;
							}
						}

						// Audio volume based on distance
						if (gridAudioTag.type === GridAudioTagType.EFFECT) {
							volumePercentage = UtilEngine.scale(distance, 0, gRadius, volumePercentageMax, 0);
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
								delete activeAudio[hash];
								delete tagStates[hash];
								continue;
							}

							tagStates[hash].volumePercentage = volumePercentage;
						}

						if (!panIgnored && tagStates[hash].pan !== pan) {
							// Update audio pan by panning the duration of this interval for smooth audio voluming
							if (!AudioEngine.controlPan(audioBufferId, timingResolution, pan)) {
								// Audio ended before pan could be adjusted
								delete activeAudio[hash];
								delete tagStates[hash];
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

						gridAudioBlock = audioPrimaryBlocks.hashes[hash];
						if (gridAudioBlock) {
							audioOptions.modulation = AudioModulation.find(gridAudioBlock.modulationId) || AudioModulation.NONE;
						}

						// Play audio
						position = tagPositions[hash];
						if (position) {
							activate = false;

							// Already triggered
							if (position.oneshot && position.activationCount) {
								continue;
							}

							// Requires specification activation
							switch (position.activationType) {
								case GridAudioTagActivationType.CONTACT:
									if (Math.round(gridAudioTag.gx) === Math.round(gx) && Math.round(gridAudioTag.gy) === Math.round(gy)) {
										if (!position.contacted) {
											activate = true;
											position.contacted = true;
										}
									} else {
										position.contacted = false;
									}
									break;
								case GridAudioTagActivationType.HORIZONTAL:
									if (position.leftCurrent === position.leftPrevious) {
										position.leftCurrent = gridAudioTag.gy < gy;

										if (position.leftCurrent !== position.leftPrevious) {
											activate = true;
											position.leftPrevious = position.leftCurrent;
										}
									}
									break;
								case GridAudioTagActivationType.VERTICAL:
									if (position.upCurrent === position.upPrevious) {
										position.upCurrent = gridAudioTag.gy < gy;

										if (position.upCurrent !== position.upPrevious) {
											activate = true;
											position.upPrevious = position.upCurrent;
										}
									}
									break;
							}

							if (activate) {
								audioBufferId = await AudioEngine.controlPlay(gridAudioTag.assetId, audioOptions);

								if (audioBufferId) {
									activeAudio[hash] = audioBufferId;
									position.activationCount++;
									tagStates[hash] = {
										pan: pan,
										volumePercentage: volumePercentage,
									};
								}
							}
						} else {
							audioBufferId = await AudioEngine.controlPlay(gridAudioTag.assetId, audioOptions);

							if (audioBufferId) {
								activeAudio[hash] = audioBufferId;
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
		let activeAudio: { [key: number]: number } = MapAudioAmbientEngine.activeAudio;

		MapAudioAmbientEngine.active = false;
		cancelAnimationFrame(MapAudioAmbientEngine.requestFrame);

		for (let i in activeAudio) {
			AudioEngine.controlStop(activeAudio[i]);
			delete activeAudio[i];
		}
		MapAudioAmbientEngine.tagPositionsByGrid = <any>new Object();
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
