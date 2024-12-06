import { AudioModulation } from '../models/audio-modulation.model';
import { Camera } from '../models/camera.model';
import { LightingEngine } from '../engines/lighting.engine';
import {
	Grid,
	GridAudioBlock,
	GridAudioTag,
	GridAudioTagType,
	GridBlockPipelineAsset,
	GridBlockTable,
	GridBlockTableComplex,
	GridImageBlockReference,
	GridConfig,
	GridImageBlock,
	GridImageBlockHalved,
	GridLight,
} from '../models/grid.model';
import { MapActive } from '../models/map.model';
import { MapDrawEngineBus } from './buses/map.draw.engine.bus';
import { VideoBusInputCmdGameModeEditApplyZ, VideoBusInputCmdSettingsShadingQuality } from '../engines/buses/video.model.bus';
import { UtilEngine } from '../engines/util.engine';

/**
 * @author tknight-dev
 */

interface ZGroup {
	ctx: OffscreenCanvasRenderingContext2D;
	z: VideoBusInputCmdGameModeEditApplyZ;
}

export class ImageBlockDrawEngine {
	private static caches: ImageBitmap[];
	private static cacheCanvases: OffscreenCanvas[] = [];
	private static cacheHashGx: number;
	private static cacheHashGy: number;
	private static cacheHashPh: number;
	private static cacheHashPw: number;
	private static cacheHourPrecise: number;
	private static cacheZoom: number;
	private static ctxs: OffscreenCanvasRenderingContext2D[] = [];
	private static ctxsFinal: OffscreenCanvasRenderingContext2D[] = [];
	private static ctxBackground: OffscreenCanvasRenderingContext2D;
	private static ctxForeground: OffscreenCanvasRenderingContext2D;
	private static ctxPrimary: OffscreenCanvasRenderingContext2D;
	private static ctxSecondary: OffscreenCanvasRenderingContext2D;
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
		ImageBlockDrawEngine.ctxForeground = ctxForeground;
		ImageBlockDrawEngine.ctxPrimary = ctxPrimary;
		ImageBlockDrawEngine.ctxSecondary = ctxSecondary;
		ImageBlockDrawEngine.ctxVanishing = ctxVanishing;

		ImageBlockDrawEngine.ctxsFinal = [ctxBackground, ctxSecondary, ctxPrimary, ctxForeground, ctxVanishing];

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
	}

	public static getCTXs(): OffscreenCanvasRenderingContext2D[] {
		return ImageBlockDrawEngine.ctxs;
	}

	public static cacheReset(): void {
		ImageBlockDrawEngine.cacheZoom = -1;
	}

	public static start(): void {
		let caches: ImageBitmap[] = ImageBlockDrawEngine.caches,
			camera: Camera = ImageBlockDrawEngine.mapActiveCamera,
			ctxsFinal: OffscreenCanvasRenderingContext2D[] = ImageBlockDrawEngine.ctxsFinal,
			hourPreciseOfDayEff: number = LightingEngine.getHourPreciseOfDayEff(),
			i: string,
			zGroup: VideoBusInputCmdGameModeEditApplyZ[] = ImageBlockDrawEngine.zGroup;

		if (
			ImageBlockDrawEngine.cacheHashGx !== camera.gx ||
			ImageBlockDrawEngine.cacheHashGy !== camera.gy ||
			ImageBlockDrawEngine.cacheHashPh !== camera.windowPh ||
			ImageBlockDrawEngine.cacheHashPw !== camera.windowPw ||
			ImageBlockDrawEngine.cacheHourPrecise !== hourPreciseOfDayEff ||
			ImageBlockDrawEngine.cacheZoom !== camera.zoom
		) {
			// Draw cache
			let audioModulation: AudioModulation,
				audioModulations: { [key: string]: AudioModulation } = AudioModulation.valuesWithoutNoneMap,
				audioPrimaryBlocks: GridBlockTable<GridAudioBlock> | undefined,
				audioPrimaryBlockHashes: { [key: number]: GridAudioBlock },
				audioPrimaryTags: GridBlockTable<GridAudioTag> | undefined,
				audioPrimaryTagHashes: { [key: number]: GridAudioTag },
				brightness: number,
				cacheCanvases: OffscreenCanvas[] = ImageBlockDrawEngine.cacheCanvases,
				complexes: GridBlockTableComplex[],
				complexesByGx: { [key: number]: GridBlockTableComplex[] },
				ctx: OffscreenCanvasRenderingContext2D,
				ctxs: OffscreenCanvasRenderingContext2D[] = ImageBlockDrawEngine.ctxs,
				drawGx: number,
				drawGy: number,
				editing: boolean = ImageBlockDrawEngine.editing,
				extendedHash: { [key: number]: null } = {},
				extendedHashes: { [key: number]: null }[] = [],
				getCacheInstance = LightingEngine.getCacheInstance,
				getCacheBrightness = LightingEngine.getCacheBrightness,
				getCacheLitByBrightness = LightingEngine.getCacheLitByBrightness,
				getCacheLitOutside = LightingEngine.getCacheLitOutside,
				gInPh: number = camera.gInPh,
				gInPhEff: number = 0,
				gInPw: number = camera.gInPw,
				gInPwEff: number = 0,
				gradient: CanvasGradient,
				gridBlockPipelineAsset: GridBlockPipelineAsset,
				gridBlockPipelineAssets: GridBlockPipelineAsset[],
				grid: Grid = ImageBlockDrawEngine.mapActive.gridActive,
				gridAudioBlock: GridAudioBlock,
				gridAudioTag: GridAudioTag,
				gridImageBlock: GridImageBlock,
				gridLight: GridLight,
				gSizeHPrevious: number = -1,
				gSizeWPrevious: number = -1,
				gx: number,
				gxString: string,
				gy: number,
				gys: number[],
				imageBitmap: ImageBitmap,
				imageBitmaps: ImageBitmap[],
				imageBitmapsBlend: number = LightingEngine.getHourPreciseOfDayEff(),
				j: string,
				k: string,
				lightHashes: { [key: number]: GridLight },
				lights: GridBlockTable<GridLight> | undefined = undefined,
				night: boolean = UtilEngine.isLightNight(LightingEngine.getHourPreciseOfDayEff()),
				outside: boolean = ImageBlockDrawEngine.mapActive.gridConfigActive.outside,
				pipelineAssetsByGy: { [key: number]: GridBlockPipelineAsset[] },
				pipelineAssetsByGyByGx: { [key: number]: { [key: number]: GridBlockPipelineAsset[] } } =
					grid.imageBlocksRenderPipelineAssetsByGyByGx,
				pipelineGy: { [key: number]: number[] } = grid.imageBlocksRenderPipelineGy,
				radius: number,
				radius2: number,
				shadingQuality: VideoBusInputCmdSettingsShadingQuality = ImageBlockDrawEngine.shadingQuality,
				startGx: number = camera.viewportGx,
				startGxEff: number = startGx | 0,
				startGy: number = camera.viewportGy,
				startGyEff: number = startGy | 0,
				stopGxEff: number = Math.ceil(startGx + camera.viewportGwEff),
				stopGyEff: number = Math.ceil(startGy + camera.viewportGhEff),
				transform: boolean = false,
				z: VideoBusInputCmdGameModeEditApplyZ;

			// Config
			imageBitmapsBlend = Math.round((1 - (imageBitmapsBlend - Math.floor(imageBitmapsBlend))) * 1000) / 1000;
			radius = (((camera.viewportPh / 2) * ImageBlockDrawEngine.vanishingPercentageOfViewport) / camera.zoom) | 0;
			radius2 = radius * 2;

			// Resize canvases
			if (ImageBlockDrawEngine.cacheHashPh !== camera.windowPh || ImageBlockDrawEngine.cacheHashPw !== camera.windowPw) {
				for (i in cacheCanvases) {
					cacheCanvases[i].height = camera.windowPh;
					cacheCanvases[i].width = camera.windowPw;
				}
			}

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
						gridImageBlock = gridBlockPipelineAsset.asset;

						// Is it a drawable asset?
						if (gridImageBlock.null && !editing) {
							continue;
						}

						// Extensions
						if (extendedHashes[j] === undefined) {
							extendedHashes[j] = {};
						}
						extendedHash = extendedHashes[j];

						if (gridBlockPipelineAsset.assetLarge || gridBlockPipelineAsset.extends) {
							if (extendedHash[gridBlockPipelineAsset.asset.hash] !== undefined) {
								// Asset already drawn
								continue;
							}
							extendedHash[gridBlockPipelineAsset.asset.hash] = null;
						}
						if (gridBlockPipelineAsset.extends) {
							if (gridBlockPipelineAsset.asset.gx !== gx) {
								drawGx = ((gridBlockPipelineAsset.asset.gx - startGx) * gInPw) | 0;
							}
							if (gridBlockPipelineAsset.asset.gy !== gy) {
								drawGy = ((gridBlockPipelineAsset.asset.gy - startGy) * gInPh) | 0;
							}
						}

						// Config
						ctx = gridBlockPipelineAsset.ctx;
						z = zGroup[j];
						if (gSizeHPrevious !== gridImageBlock.gSizeH) {
							gSizeHPrevious = gridImageBlock.gSizeH;
							gInPhEff = (gInPh * gSizeHPrevious + 1) | 0;
						}
						if (gSizeWPrevious !== gridImageBlock.gSizeW) {
							gSizeWPrevious = gridImageBlock.gSizeW;
							gInPwEff = (gInPw * gSizeWPrevious + 1) | 0;
						}

						// Transforms
						if (gridImageBlock.flipH || gridImageBlock.flipV) {
							transform = true;
							ctx.setTransform(
								gridImageBlock.flipH ? -1 : 1,
								0,
								0,
								gridImageBlock.flipV ? -1 : 1,
								drawGx + (gridImageBlock.flipH ? gInPwEff : 0),
								drawGy + (gridImageBlock.flipV ? gInPhEff : 0),
							);
						}

						if (outside) {
							// Get pre-rendered asset variation based on hash
							imageBitmaps = getCacheLitOutside(gridImageBlock.assetId, grid.id, gridImageBlock.hash, z);

							// Draw current image
							imageBitmap = imageBitmaps[0];

							if (imageBitmap === undefined) {
								console.log(
									'undefined',
									gridImageBlock.assetId,
									gridImageBlock.hash,
									UtilEngine.gridHashFrom(gridImageBlock.hash),
								);
								continue;
							}

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
							if (shadingQuality === VideoBusInputCmdSettingsShadingQuality.HIGH && imageBitmaps[0] !== imageBitmaps[1]) {
								imageBitmap = imageBitmaps[1];
								ctx.globalAlpha = imageBitmapsBlend;

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
							}
						} else {
							// Get pre-rendered asset variation based on hash
							brightness = getCacheBrightness(grid.id, gridImageBlock.hash, z);
							imageBitmap = getCacheLitByBrightness(gridImageBlock.assetId, brightness);

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

			for (i in zGroup) {
				ctx = ctxs[i];
				z = zGroup[i];
				switch (z) {
					case VideoBusInputCmdGameModeEditApplyZ.BACKGROUND:
						audioPrimaryBlocks = undefined;
						audioPrimaryTags = undefined;
						lights = undefined;
						break;
					case VideoBusInputCmdGameModeEditApplyZ.FOREGROUND:
						audioPrimaryBlocks = undefined;
						audioPrimaryTags = undefined;
						lights = grid.lightsForeground;
						break;
					case VideoBusInputCmdGameModeEditApplyZ.PRIMARY:
						audioPrimaryBlocks = grid.audioPrimaryBlocks;
						audioPrimaryTags = grid.audioPrimaryTags;
						lights = grid.lightsPrimary;
						break;
					case VideoBusInputCmdGameModeEditApplyZ.SECONDARY:
						audioPrimaryBlocks = undefined;
						audioPrimaryTags = undefined;
						lights = undefined;
						break;
					case VideoBusInputCmdGameModeEditApplyZ.VANISHING:
						audioPrimaryBlocks = undefined;
						audioPrimaryTags = undefined;
						lights = undefined;
						break;
				}

				// Lights
				if (lights && lights.hashesGyByGx) {
					complexesByGx = lights.hashesGyByGx;
					lightHashes = lights.hashes;

					for (j in complexesByGx) {
						complexes = complexesByGx[j];
						gx = Number(j);

						if (gx < startGxEff) {
							continue;
						} else if (gx > stopGxEff) {
							break;
						}

						drawGx = ((gx - startGx) * gInPw) | 0;

						for (k in complexes) {
							gridLight = lightHashes[complexes[k].hash];

							if (gridLight.null && !editing) {
								continue;
							}

							gy = <number>gridLight.gy;
							if (gy < startGyEff) {
								continue;
							} else if (gy > stopGyEff) {
								break;
							}

							// Extended check
							if (gridLight.extends) {
								if (gridLight.extends) {
									// extention block
									gridLight = lightHashes[gridLight.extends];
								}

								if (extendedHash[gridLight.hash] === null) {
									// Skip block as its hash parent's image has already drawn over it
									continue;
								} else {
									// Draw large block
									extendedHash[gridLight.hash] = null;

									if (gx !== <number>gridLight.gx) {
										gx = <number>gridLight.gx;
										drawGx = ((gx - startGx) * gInPw) | 0;
									}
									gy = <number>gridLight.gy;
								}
							} else {
								if (gx !== <number>gridLight.gx) {
									gx = <number>gridLight.gx;
									drawGx = ((gx - startGx) * gInPw) | 0;
								}
							}

							// Cache calculations
							drawGy = ((gy - startGy) * gInPh) | 0;
							if (gSizeHPrevious !== gridLight.gSizeH) {
								gSizeHPrevious = gridLight.gSizeH;
								gInPhEff = (gInPh * gSizeHPrevious + 1) | 0;
							}
							if (gSizeWPrevious !== gridLight.gSizeW) {
								gSizeWPrevious = gridLight.gSizeW;
								gInPwEff = (gInPw * gSizeWPrevious + 1) | 0;
							}

							// Get pre-rendered asset variation based on hash
							if (gridLight.nightOnly && !night) {
								imageBitmaps = getCacheLitOutside(gridLight.assetId, grid.id, gridLight.hash, z);

								ctx.drawImage(imageBitmaps[0], drawGx, drawGy, gInPwEff, gInPhEff);
							} else {
								imageBitmap = getCacheInstance(gridLight.assetId).image;

								ctx.drawImage(imageBitmap, drawGx, drawGy, gInPwEff, gInPhEff);
							}
						}
					}
				}

				// Edit mode only
				if (editing) {
					// Audio Blocks
					if (audioPrimaryBlocks && audioPrimaryBlocks.hashesGyByGx) {
						complexesByGx = audioPrimaryBlocks.hashesGyByGx;
						audioPrimaryBlockHashes = audioPrimaryBlocks.hashes;

						gInPhEff = gInPh + 1;
						gInPwEff = gInPw + 1;

						for (j in complexesByGx) {
							complexes = complexesByGx[j];
							gx = Number(j);

							if (gx < startGxEff) {
								continue;
							} else if (gx > stopGxEff) {
								break;
							}

							drawGx = ((gx - startGx) * gInPw) | 0;

							for (k in complexes) {
								gridAudioBlock = audioPrimaryBlockHashes[complexes[k].hash];

								gy = <number>gridAudioBlock.gy;
								if (gy < startGyEff) {
									continue;
								} else if (gy > stopGyEff) {
									break;
								}

								// Calc
								if (gx !== <number>gridAudioBlock.gx) {
									gx = <number>gridAudioBlock.gx;
									drawGx = ((gx - startGx) * gInPw) | 0;
								}
								drawGy = ((gy - startGy) * gInPh) | 0;

								// Draw
								audioModulation = audioModulations[gridAudioBlock.modulationId];
								ctx.fillStyle = 'rgba(' + audioModulation.colorRGB + ',.25)';
								ctx.fillRect(drawGx, drawGy, gInPwEff, gInPhEff);
							}
						}
					}

					// Audio Tags
					if (audioPrimaryTags && audioPrimaryTags.hashesGyByGx) {
						complexesByGx = audioPrimaryTags.hashesGyByGx;
						audioPrimaryTagHashes = audioPrimaryTags.hashes;

						gInPhEff = gInPh + 1;
						gInPwEff = gInPw + 1;

						for (j in complexesByGx) {
							complexes = complexesByGx[j];
							gx = Number(j);

							if (gx < startGxEff) {
								continue;
							} else if (gx > stopGxEff) {
								break;
							}

							drawGx = ((gx - startGx) * gInPw) | 0;

							for (k in complexes) {
								gridAudioTag = audioPrimaryTagHashes[complexes[k].hash];

								gy = <number>gridAudioTag.gy;
								if (gy < startGyEff) {
									continue;
								} else if (gy > stopGyEff) {
									break;
								}

								// Calc
								if (gx !== <number>gridAudioTag.gx) {
									gx = <number>gridAudioTag.gx;
									drawGx = ((gx - startGx) * gInPw) | 0;
								}
								drawGy = ((gy - startGy) * gInPh) | 0;

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

				// Vanishing circle
				if (z === VideoBusInputCmdGameModeEditApplyZ.VANISHING && ImageBlockDrawEngine.vanishingEnable) {
					ctx = ctxs[i];
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

				// CacheIt
				caches[i] = cacheCanvases[i].transferToImageBitmap();
			}

			// Cache it
			ImageBlockDrawEngine.cacheHashGx = camera.gx;
			ImageBlockDrawEngine.cacheHashGy = camera.gy;
			ImageBlockDrawEngine.cacheHashPh = camera.windowPh;
			ImageBlockDrawEngine.cacheHashPw = camera.windowPw;
			ImageBlockDrawEngine.cacheHourPrecise = hourPreciseOfDayEff;
			ImageBlockDrawEngine.cacheZoom = camera.zoom;
		}

		for (i in zGroup) {
			ctxsFinal[i].drawImage(caches[i], 0, 0);
		}
	}

	public static setMapActive(mapActive: MapActive) {
		ImageBlockDrawEngine.mapActive = mapActive;
		ImageBlockDrawEngine.mapActiveCamera = mapActive.camera;
		ImageBlockDrawEngine.cacheReset();
	}

	public static setEditing(editing: boolean) {
		ImageBlockDrawEngine.editing = editing;
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
