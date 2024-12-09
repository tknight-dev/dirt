import { AudioModulation } from '../models/audio-modulation.model';
import { Camera } from '../models/camera.model';
import { LightingEngine } from '../engines/lighting.engine';
import {
	Grid,
	GridAnimation,
	GridAnimationCalc,
	GridAudioBlock,
	GridAudioTag,
	GridAudioTagType,
	GridBlockPipelineAsset,
	GridImageBlock,
	GridImageBlockHalved,
	GridImageTransform,
	GridLight,
} from '../models/grid.model';
import { MapActive } from '../models/map.model';
import { MapDrawEngineBus } from './buses/map.draw.engine.bus';
import { VideoBusInputCmdGameModeEditApplyZ, VideoBusInputCmdSettingsShadingQuality } from '../engines/buses/video.model.bus';
import { UtilEngine } from '../engines/util.engine';

/**
 * @author tknight-dev
 */

export class ImageBlockDrawEngine {
	private static animationUpdate: boolean;
	private static caches: ImageBitmap[];
	private static cacheCanvases: OffscreenCanvas[] = [];
	private static cacheEditing: boolean;
	private static cacheHashGx: number;
	private static cacheHashGy: number;
	private static cacheHashPh: number;
	private static cacheHashPw: number;
	private static cacheHourPrecise: number;
	private static cacheZoom: number;
	private static ctxBackground: OffscreenCanvasRenderingContext2D;
	private static ctxForeground: OffscreenCanvasRenderingContext2D;
	private static ctxPrimary: OffscreenCanvasRenderingContext2D;
	private static ctxs: OffscreenCanvasRenderingContext2D[] = [];
	private static ctxSecondary: OffscreenCanvasRenderingContext2D;
	private static ctxsOptimized: OffscreenCanvasRenderingContext2D[] = [];
	private static ctxVanishing: OffscreenCanvasRenderingContext2D;
	private static editing: boolean;
	private static initialized: boolean;
	private static mapActive: MapActive;
	private static mapActiveCamera: Camera;
	private static shadingQuality: VideoBusInputCmdSettingsShadingQuality = VideoBusInputCmdSettingsShadingQuality.HIGH;
	private static vanishingEnable: boolean;
	private static vanishingPercentageOfViewport: number;
	private static zGroup: VideoBusInputCmdGameModeEditApplyZ[];

	public static async initialize(
		ctxBackground: OffscreenCanvasRenderingContext2D,
		ctxForeground: OffscreenCanvasRenderingContext2D,
		ctxPrimary: OffscreenCanvasRenderingContext2D,
		ctxSecondary: OffscreenCanvasRenderingContext2D,
		ctxVanishing: OffscreenCanvasRenderingContext2D,
	): Promise<void> {
		if (ImageBlockDrawEngine.initialized) {
			console.error('ImageBlockDrawEngine > initialize: already initialized');
			return;
		}
		ImageBlockDrawEngine.initialized = true;
		ImageBlockDrawEngine.ctxBackground = ctxBackground;
		ImageBlockDrawEngine.ctxSecondary = ctxSecondary;
		ImageBlockDrawEngine.ctxPrimary = ctxPrimary;
		ImageBlockDrawEngine.ctxForeground = ctxForeground;
		ImageBlockDrawEngine.ctxVanishing = ctxVanishing;

		ImageBlockDrawEngine.zGroup = [
			VideoBusInputCmdGameModeEditApplyZ.BACKGROUND,
			VideoBusInputCmdGameModeEditApplyZ.SECONDARY,
			VideoBusInputCmdGameModeEditApplyZ.PRIMARY,
			VideoBusInputCmdGameModeEditApplyZ.FOREGROUND,
			VideoBusInputCmdGameModeEditApplyZ.VANISHING,
		];

		// Caching System
		let cacheCanvas: OffscreenCanvas;

		ImageBlockDrawEngine.caches = new Array(ImageBlockDrawEngine.zGroup.length);
		for (let i in ImageBlockDrawEngine.zGroup) {
			cacheCanvas = new OffscreenCanvas(0, 0);

			ImageBlockDrawEngine.cacheCanvases.push(cacheCanvas);
			ImageBlockDrawEngine.ctxs.push(<OffscreenCanvasRenderingContext2D>cacheCanvas.getContext('2d'));
			ImageBlockDrawEngine.ctxs[ImageBlockDrawEngine.ctxs.length - 1].imageSmoothingEnabled = false;
		}
		ImageBlockDrawEngine.ctxsOptimized = [
			ImageBlockDrawEngine.ctxs[0], // Write to just one background canvas
			ImageBlockDrawEngine.ctxs[0], // Write to just one background canvas
			ImageBlockDrawEngine.ctxs[0], // Write to just one background canvas
			ImageBlockDrawEngine.ctxs[3], // Write to just one foreground canvas
			ImageBlockDrawEngine.ctxs[4], // Write to just one foreground canvas
		];

		// Last
		ImageBlockDrawEngine.startBind();
	}

	public static cacheReset(): void {
		ImageBlockDrawEngine.cacheZoom = -1;
	}

	// Function set by binder, this is just a placeholder
	public static start(): void {}

	/**
	 * This binding structure greatly reduces GC build up
	 */
	private static startBind(): void {
		let assetId: string,
			audioModulation: AudioModulation,
			audioModulations: { [key: string]: AudioModulation },
			brightness: number,
			cacheCanvases: OffscreenCanvas[],
			caches: ImageBitmap[] = ImageBlockDrawEngine.caches,
			camera: Camera,
			ctx: OffscreenCanvasRenderingContext2D,
			ctxs: OffscreenCanvasRenderingContext2D[],
			drawGx: number,
			drawGy: number,
			editing: boolean,
			extendedHash: { [key: number]: null },
			extendedHashes: { [key: number]: null }[],
			extendedHashesLights: { [key: number]: null }[],
			getCacheInstance = LightingEngine.getCacheInstance,
			getCacheBrightness = LightingEngine.getCacheBrightness,
			getCacheLitByBrightness = LightingEngine.getCacheLitByBrightness,
			getCacheLitOutside = LightingEngine.getCacheLitOutside,
			getHourPreciseOfDayEff = LightingEngine.getHourPreciseOfDayEff,
			gInPh: number,
			gInPhEff: number = 0,
			gInPw: number,
			gInPwEff: number = 0,
			gradient: CanvasGradient,
			gridBlockPipelineAsset: GridBlockPipelineAsset,
			gridBlockPipelineAssets: GridBlockPipelineAsset[],
			grid: Grid,
			gridAnimation: GridAnimation,
			gridAudioBlock: GridAudioBlock,
			gridAudioTag: GridAudioTag,
			gridImageBlock: GridImageBlock,
			gridImageTransform: GridImageTransform,
			gridLight: GridLight,
			gSizeHPrevious: number,
			gSizeWPrevious: number,
			gx: number,
			gxString: string,
			gy: number,
			gys: number[],
			hourPreciseOfDayEff: number,
			i: string,
			index: number,
			imageBitmap: ImageBitmap,
			imageBitmaps: ImageBitmap[],
			imageBitmapsBlend: number,
			imageBitmapsBlendEff: number,
			isLightNight = UtilEngine.isLightNight,
			j: string,
			night: boolean,
			outside: boolean,
			pipelineAssetsByGy: { [key: number]: GridBlockPipelineAsset[] },
			pipelineAssetsByGyByGx: { [key: number]: { [key: number]: GridBlockPipelineAsset[] } },
			pipelineGy: { [key: number]: number[] },
			radius: number,
			radius2: number,
			shadingQuality: VideoBusInputCmdSettingsShadingQuality,
			skip: boolean,
			startGx: number,
			startGxEff: number,
			startGy: number,
			startGyEff: number,
			stopGxEff: number,
			stopGyEff: number,
			transform: boolean,
			z: VideoBusInputCmdGameModeEditApplyZ,
			zGroup: VideoBusInputCmdGameModeEditApplyZ[];

		ImageBlockDrawEngine.start = () => {
			camera = ImageBlockDrawEngine.mapActiveCamera;
			editing = ImageBlockDrawEngine.editing;
			hourPreciseOfDayEff = getHourPreciseOfDayEff();

			if (
				ImageBlockDrawEngine.animationUpdate ||
				ImageBlockDrawEngine.cacheHourPrecise !== hourPreciseOfDayEff ||
				ImageBlockDrawEngine.cacheHashGx !== camera.gx ||
				ImageBlockDrawEngine.cacheHashGy !== camera.gy ||
				ImageBlockDrawEngine.cacheZoom !== camera.zoom ||
				ImageBlockDrawEngine.cacheHashPh !== camera.windowPh ||
				ImageBlockDrawEngine.cacheHashPw !== camera.windowPw ||
				ImageBlockDrawEngine.cacheEditing !== editing
			) {
				// Draw cache
				audioModulations = AudioModulation.valuesWithoutNoneMap;
				cacheCanvases = ImageBlockDrawEngine.cacheCanvases;
				extendedHash = {};
				extendedHashes = [];
				extendedHashesLights = [];
				gInPh = camera.gInPh;
				gInPhEff = 0;
				gInPw = camera.gInPw;
				gInPwEff = 0;
				grid = ImageBlockDrawEngine.mapActive.gridActive;
				gSizeHPrevious = -1;
				gSizeWPrevious = -1;
				night = isLightNight(hourPreciseOfDayEff);
				outside = ImageBlockDrawEngine.mapActive.gridConfigActive.outside;
				pipelineAssetsByGyByGx = grid.imageBlocksRenderPipelineAssetsByGyByGx;
				pipelineGy = grid.imageBlocksRenderPipelineGy;
				shadingQuality = ImageBlockDrawEngine.shadingQuality;
				startGx = camera.viewportGx;
				startGxEff = startGx | 0;
				startGy = camera.viewportGy;
				startGyEff = startGy | 0;
				stopGxEff = Math.ceil(startGx + camera.viewportGwEff);
				stopGyEff = Math.ceil(startGy + camera.viewportGhEff);
				transform = false;
				zGroup = ImageBlockDrawEngine.zGroup;

				// Config
				if (editing) {
					ctxs = ImageBlockDrawEngine.ctxs;
				} else {
					ctxs = ImageBlockDrawEngine.ctxsOptimized;
				}

				imageBitmapsBlend = Math.round((1 - (hourPreciseOfDayEff - (hourPreciseOfDayEff | 0))) * 1000) / 1000;
				imageBitmapsBlendEff = imageBitmapsBlend;
				radius = (((camera.viewportPh / 2) * ImageBlockDrawEngine.vanishingPercentageOfViewport) / camera.zoom) | 0;
				radius2 = radius * 2;

				// Resize canvases
				if (ImageBlockDrawEngine.cacheHashPh !== camera.windowPh || ImageBlockDrawEngine.cacheHashPw !== camera.windowPw) {
					for (i in cacheCanvases) {
						cacheCanvases[i].height = camera.windowPh;
						cacheCanvases[i].width = camera.windowPw;
					}
				}

				/**
				 * Draw to canvas
				 */
				for (gxString in pipelineAssetsByGyByGx) {
					gx = Number(gxString);

					// Viewport check
					if (gx < startGxEff) {
						continue;
					} else if (gx > stopGxEff) {
						break;
					}

					drawGx = ((gx - startGx) * gInPw) | 0;
					gys = pipelineGy[gxString];
					pipelineAssetsByGy = pipelineAssetsByGyByGx[gxString];
					for (i in gys) {
						gy = Number(gys[i]);

						// Viewport check
						if (gy < startGyEff) {
							continue;
						} else if (gy > stopGyEff) {
							break;
						}

						drawGy = ((gy - startGy) * gInPh) | 0;
						gridBlockPipelineAssets = pipelineAssetsByGy[gy];
						for (j in gridBlockPipelineAssets) {
							gridBlockPipelineAsset = gridBlockPipelineAssets[j];

							// Is asset available on this z level?
							if (!gridBlockPipelineAsset) {
								continue;
							}

							// Config
							ctx = ctxs[j];
							z = zGroup[j];

							/**
							 * Draw: Image Blocks
							 */
							if (gridBlockPipelineAsset.asset) {
								gridImageBlock = gridBlockPipelineAsset.asset;
								skip = false;

								// Is it a drawable asset?
								if (editing || !gridImageBlock.null) {
									// Extensions
									if (extendedHashes[j] === undefined) {
										extendedHashes[j] = {};
									}
									extendedHash = extendedHashes[j];

									if (gridBlockPipelineAsset.assetLarge || gridBlockPipelineAsset.extends) {
										if (extendedHash[gridBlockPipelineAsset.asset.hash] !== undefined) {
											// Asset already drawn
											skip = true;
										} else {
											extendedHash[gridBlockPipelineAsset.asset.hash] = null;
										}
									}

									if (!skip) {
										// Animated?
										if (gridImageBlock.assetAnimation) {
											gridAnimation = gridImageBlock.assetAnimation;
											index = (<any>gridAnimation.calc).index;

											assetId = gridAnimation.assetIds[index];
											gridImageTransform = gridAnimation.assetOptions[index];
										} else {
											assetId = gridImageBlock.assetId;
											gridImageTransform = gridImageBlock;
										}

										// Extension?
										if (gridBlockPipelineAsset.extends) {
											if (gridImageBlock.gx !== gx) {
												drawGx = ((gridImageBlock.gx - startGx) * gInPw) | 0;
											}
											if (gridImageBlock.gy !== gy) {
												drawGy = ((gridImageBlock.gy - startGy) * gInPh) | 0;
											}
										}

										// Config
										if (gSizeHPrevious !== gridImageBlock.gSizeH) {
											gSizeHPrevious = gridImageBlock.gSizeH;
											gInPhEff = (gInPh * gSizeHPrevious + 1) | 0;
										}
										if (gSizeWPrevious !== gridImageBlock.gSizeW) {
											gSizeWPrevious = gridImageBlock.gSizeW;
											gInPwEff = (gInPw * gSizeWPrevious + 1) | 0;
										}

										// Transforms
										if (gridImageTransform.flipH || gridImageTransform.flipV) {
											transform = true;
											ctx.setTransform(
												gridImageTransform.flipH ? -1 : 1,
												0,
												0,
												gridImageTransform.flipV ? -1 : 1,
												(drawGx + (gridImageTransform.flipH ? gInPwEff : 0)) | 0,
												(drawGy + (gridImageTransform.flipV ? gInPhEff : 0)) | 0,
											);
										}

										// Transparency
										if (gridImageBlock.transparency) {
											ctx.globalAlpha = 1 - gridImageBlock.transparency;
											imageBitmapsBlendEff -= gridImageBlock.transparency;
										}

										if (outside) {
											// Get pre-rendered asset variation based on hash
											imageBitmaps = getCacheLitOutside(assetId, grid.id, gridImageBlock.hash, z);

											// Draw current image
											imageBitmap = imageBitmaps[0];
											if (gridImageBlock.halved !== undefined) {
												if (gridImageBlock.halved === GridImageBlockHalved.DOWN) {
													if (transform) {
														ctx.drawImage(
															imageBitmap,
															0,
															(imageBitmap.height / 2) | 0,
															imageBitmap.width,
															imageBitmap.height,
															0,
															(gInPhEff / 2) | 0,
															gInPwEff,
															gInPhEff,
														);
													} else {
														ctx.drawImage(
															imageBitmap,
															0,
															(imageBitmap.height / 2) | 0,
															imageBitmap.width,
															imageBitmap.height,
															drawGx,
															(drawGy + gInPhEff / 2) | 0,
															gInPwEff,
															gInPhEff,
														);
													}
												} else {
													if (transform) {
														ctx.drawImage(
															imageBitmap,
															0,
															0,
															imageBitmap.width,
															(imageBitmap.height / 2) | 0,
															0,
															0,
															gInPwEff,
															(gInPhEff / 2) | 0,
														);
													} else {
														ctx.drawImage(
															imageBitmap,
															0,
															0,
															imageBitmap.width,
															(imageBitmap.height / 2) | 0,
															drawGx,
															(drawGy + gInPhEff / 2) | 0,
															gInPwEff,
															(gInPhEff / 2) | 0,
														);
													}
												}
											} else {
												if (transform) {
													ctx.drawImage(imageBitmap, 0, 0, gInPwEff, gInPhEff);
												} else {
													ctx.drawImage(imageBitmap, drawGx, drawGy, gInPwEff, gInPhEff);
												}
											}

											// If not the same image
											if (
												shadingQuality === VideoBusInputCmdSettingsShadingQuality.HIGH &&
												imageBitmaps[0] !== imageBitmaps[1]
											) {
												imageBitmap = imageBitmaps[1];
												ctx.globalAlpha = imageBitmapsBlend;
												ctx.globalCompositeOperation = 'source-atop';

												// Draw previous image (blended) [6:00 - 100%, 6:30 - 50%, 6:55 - 8%]
												// Provides smooth shading transitions
												if (gridImageBlock.halved !== undefined) {
													if (gridImageBlock.halved === GridImageBlockHalved.DOWN) {
														if (transform) {
															ctx.drawImage(
																imageBitmap,
																0,
																(imageBitmap.height / 2) | 0,
																imageBitmap.width,
																imageBitmap.height,
																0,
																(gInPhEff / 2) | 0,
																gInPwEff,
																gInPhEff,
															);
														} else {
															ctx.drawImage(
																imageBitmap,
																0,
																(imageBitmap.height / 2) | 0,
																imageBitmap.width,
																imageBitmap.height,
																drawGx,
																(drawGy + gInPhEff / 2) | 0,
																gInPwEff,
																gInPhEff,
															);
														}
													} else {
														if (transform) {
															ctx.drawImage(
																imageBitmap,
																0,
																0,
																imageBitmap.width,
																(imageBitmap.height / 2) | 0,
																0,
																0,
																gInPwEff,
																(gInPhEff / 2) | 0,
															);
														} else {
															ctx.drawImage(
																imageBitmap,
																0,
																0,
																imageBitmap.width,
																(imageBitmap.height / 2) | 0,
																drawGx,
																(drawGy + gInPhEff / 2) | 0,
																gInPwEff,
																(gInPhEff / 2) | 0,
															);
														}
													}
												} else {
													if (transform) {
														ctx.drawImage(imageBitmap, 0, 0, gInPwEff, gInPhEff);
													} else {
														ctx.drawImage(imageBitmap, drawGx, drawGy, gInPwEff, gInPhEff);
													}
												}

												// Done
												ctx.globalAlpha = 1;
												ctx.globalCompositeOperation = 'source-over'; // restore default setting
											}
										} else {
											// Get pre-rendered asset variation based on hash
											brightness = getCacheBrightness(grid.id, gridImageBlock.hash, z);
											imageBitmap = getCacheLitByBrightness(assetId, brightness);

											if (transform) {
												ctx.drawImage(imageBitmap, 0, 0, gInPwEff, gInPhEff);
											} else {
												ctx.drawImage(imageBitmap, drawGx, drawGy, gInPwEff, gInPhEff);
											}
										}

										// Reset transforms
										if (transform) {
											ctx.setTransform(1, 0, 0, 1, 0, 0);
											transform = false;
										}

										// Reset transparency
										if (gridImageBlock.transparency) {
											ctx.globalAlpha = 1;
											imageBitmapsBlendEff = imageBitmapsBlend;
										}

										// Reset extension displacement
										if (gridBlockPipelineAsset.extends) {
											if (gridBlockPipelineAsset.asset.gx !== gx) {
												drawGx = ((gx - startGx) * gInPw) | 0;
											}
											if (gridBlockPipelineAsset.asset.gy !== gy) {
												drawGy = ((gy - startGy) * gInPh) | 0;
											}
										}
									}
								}
							}

							/**
							 * Draw: Lights
							 */
							if (gridBlockPipelineAsset.light) {
								gridLight = gridBlockPipelineAsset.light;
								skip = false;

								// Extensions
								if (extendedHashesLights[j] === undefined) {
									extendedHashesLights[j] = {};
								}
								extendedHash = extendedHashesLights[j];

								if (gridBlockPipelineAsset.lightLarge || gridBlockPipelineAsset.lightExtends) {
									if (extendedHash[gridLight.hash] !== undefined) {
										// Asset already drawn
										skip = true;
									} else {
										extendedHash[gridLight.hash] = null;
									}
								}
								if (!skip) {
									// Animated?
									if (gridLight.assetAnimation) {
										gridAnimation = gridLight.assetAnimation;
										index = (<any>gridAnimation.calc).index;

										assetId = gridAnimation.assetIds[index];
										gridImageTransform = gridAnimation.assetOptions[index];
									} else {
										assetId = gridLight.assetId;
										gridImageTransform = gridLight;
									}

									// Extension?
									if (gridBlockPipelineAsset.lightExtends) {
										if (gridLight.gx !== gx) {
											drawGx = ((gridLight.gx - startGx) * gInPw) | 0;
										}
										if (gridLight.gy !== gy) {
											drawGy = ((gridLight.gy - startGy) * gInPh) | 0;
										}
									}

									// Config
									if (gSizeHPrevious !== gridLight.gSizeH) {
										gSizeHPrevious = gridLight.gSizeH;
										gInPhEff = (gInPh * gSizeHPrevious + 1) | 0;
									}
									if (gSizeWPrevious !== gridLight.gSizeW) {
										gSizeWPrevious = gridLight.gSizeW;
										gInPwEff = (gInPw * gSizeWPrevious + 1) | 0;
									}

									// Transforms
									if (gridImageTransform.flipH || gridImageTransform.flipV) {
										transform = true;
										ctx.setTransform(
											gridImageTransform.flipH ? -1 : 1,
											0,
											0,
											gridImageTransform.flipV ? -1 : 1,
											(drawGx + (gridImageTransform.flipH ? gInPwEff : 0)) | 0,
											(drawGy + (gridImageTransform.flipV ? gInPhEff : 0)) | 0,
										);
									}

									// Transparency
									if (gridImageBlock.transparency) {
										ctx.globalAlpha = 1 - gridImageBlock.transparency;
									}

									// Get pre-rendered asset variation based on hash
									if (gridLight.nightOnly && !night) {
										imageBitmaps = getCacheLitOutside(assetId, grid.id, gridLight.hash, z);

										ctx.drawImage(imageBitmaps[0], drawGx, drawGy, gInPwEff, gInPhEff);
									} else {
										imageBitmap = getCacheInstance(assetId).image;

										ctx.drawImage(imageBitmap, drawGx, drawGy, gInPwEff, gInPhEff);
									}

									// Reset transforms
									if (transform) {
										ctx.setTransform(1, 0, 0, 1, 0, 0);
										transform = false;
									}

									// Reset transparency
									if (gridImageBlock.transparency) {
										ctx.globalAlpha = 1;
									}

									// Reset extension displacement
									if (gridBlockPipelineAsset.lightExtends) {
										if (gridLight.gx !== gx) {
											drawGx = ((gx - startGx) * gInPw) | 0;
										}
										if (gridLight.gy !== gy) {
											drawGy = ((gy - startGy) * gInPh) | 0;
										}
									}
								}
							}

							if (editing) {
								/**
								 * Draw: Audio Blocks
								 */
								if (gridBlockPipelineAsset.audioBlock) {
									gridAudioBlock = gridBlockPipelineAsset.audioBlock;

									//Config
									if (gSizeHPrevious !== -1) {
										gInPhEff = (gInPh + 1) | 0;
										gInPwEff = (gInPw + 1) | 0;
										gSizeHPrevious = -1;
										gSizeWPrevious = -1;
									}

									// Draw
									audioModulation = audioModulations[gridAudioBlock.modulationId];
									ctx.fillStyle = 'rgba(' + audioModulation.colorRGB + ',.15)';
									ctx.fillRect(drawGx, drawGy, gInPwEff, gInPhEff);
								}

								/**
								 * Draw: Audio Tags
								 */
								if (gridBlockPipelineAsset.audioTag) {
									gridAudioTag = gridBlockPipelineAsset.audioTag;

									//Config
									if (gSizeHPrevious !== -1) {
										gInPhEff = (gInPh + 1) | 0;
										gInPwEff = (gInPw + 1) | 0;
										gSizeHPrevious = -1;
										gSizeWPrevious = -1;
									}

									// Draw
									if (gridAudioTag.type === GridAudioTagType.EFFECT) {
										imageBitmap = getCacheInstance('audio_tag_effect').image;
									} else {
										imageBitmap = getCacheInstance('audio_tag_music').image;
									}

									ctx.drawImage(imageBitmap, drawGx, drawGy, gInPwEff, gInPhEff);
								}
							}
						}
					}
				}

				/**
				 * Vanishing circle
				 */
				if (ImageBlockDrawEngine.vanishingEnable) {
					ctx = ctxs[4];
					gx = ((camera.gx - startGx) * gInPw) | 0;
					gy = ((camera.gy - startGy) * gInPh) | 0;

					gradient = ctx.createRadialGradient(gx, gy, 0, gx, gy, radius);
					gradient.addColorStop(0, 'white');
					gradient.addColorStop(0.75, 'white');
					gradient.addColorStop(1, 'transparent');

					ctx.globalCompositeOperation = 'destination-out';
					ctx.fillStyle = gradient;
					ctx.fillRect(gx - radius, gy - radius, radius2, radius2);
					ctx.globalCompositeOperation = 'source-over'; // restore default setting
				}

				/**
				 * Canvas to cache
				 */
				if (editing) {
					caches[0] = cacheCanvases[0].transferToImageBitmap();
					caches[1] = cacheCanvases[1].transferToImageBitmap();
					caches[2] = cacheCanvases[2].transferToImageBitmap();
					caches[3] = cacheCanvases[3].transferToImageBitmap();
					caches[4] = cacheCanvases[4].transferToImageBitmap();
				} else {
					// 0-2 written to 0 when not editing
					caches[0] = cacheCanvases[0].transferToImageBitmap();

					// 3-4 written to 3 when not editing
					ctxs[3].drawImage(cacheCanvases[4], 0, 0);
					ctxs[4].clearRect(0, 0, camera.windowPw, camera.windowPh);

					caches[3] = cacheCanvases[3].transferToImageBitmap();
				}

				// Cache misc
				ImageBlockDrawEngine.animationUpdate = false;
				ImageBlockDrawEngine.cacheEditing = editing;
				ImageBlockDrawEngine.cacheHashGx = camera.gx;
				ImageBlockDrawEngine.cacheHashGy = camera.gy;
				ImageBlockDrawEngine.cacheHashPh = camera.windowPh;
				ImageBlockDrawEngine.cacheHashPw = camera.windowPw;
				ImageBlockDrawEngine.cacheHourPrecise = hourPreciseOfDayEff;
				ImageBlockDrawEngine.cacheZoom = camera.zoom;
			}

			if (editing) {
				ImageBlockDrawEngine.ctxBackground.drawImage(caches[0], 0, 0);
				ImageBlockDrawEngine.ctxSecondary.drawImage(caches[1], 0, 0);
				ImageBlockDrawEngine.ctxPrimary.drawImage(caches[2], 0, 0);
				ImageBlockDrawEngine.ctxForeground.drawImage(caches[3], 0, 0);
				ImageBlockDrawEngine.ctxVanishing.drawImage(caches[4], 0, 0);
			} else {
				// 0-2 written to 0 when not editing
				ImageBlockDrawEngine.ctxBackground.drawImage(caches[0], 0, 0);

				// 3-4 written to 3 when not editing
				ImageBlockDrawEngine.ctxForeground.drawImage(caches[3], 0, 0);
			}
		};
	}

	public static setAnimationUpdate(animationUpdate: boolean) {
		ImageBlockDrawEngine.animationUpdate = animationUpdate;
	}

	public static setEditing(editing: boolean) {
		ImageBlockDrawEngine.editing = editing;
		ImageBlockDrawEngine.cacheReset();
	}

	public static setMapActive(mapActive: MapActive) {
		ImageBlockDrawEngine.mapActive = mapActive;
		ImageBlockDrawEngine.mapActiveCamera = mapActive.camera;
		ImageBlockDrawEngine.cacheReset();
	}

	public static setShadingQuality(shadingQuality: VideoBusInputCmdSettingsShadingQuality) {
		ImageBlockDrawEngine.shadingQuality = shadingQuality;
		ImageBlockDrawEngine.cacheReset();
	}

	public static setVanishingEnable(vanishingEnable: boolean) {
		ImageBlockDrawEngine.vanishingEnable = vanishingEnable;
		MapDrawEngineBus.setVanishingEnable(vanishingEnable);
		ImageBlockDrawEngine.cacheReset();
	}

	public static setVanishingPercentageOfViewport(vanishingPercentageOfViewport: number) {
		ImageBlockDrawEngine.vanishingPercentageOfViewport = vanishingPercentageOfViewport;
		MapDrawEngineBus.setVanishingPercentageOfViewport(ImageBlockDrawEngine.vanishingPercentageOfViewport);
		ImageBlockDrawEngine.cacheReset();
	}
}
