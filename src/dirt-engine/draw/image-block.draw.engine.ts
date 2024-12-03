import { AudioModulation } from '../models/audio-modulation.model';
import { Camera } from '../models/camera.model';
import { LightingEngine } from '../engines/lighting.engine';
import {
	Grid,
	GridAudioBlock,
	GridAudioTag,
	GridAudioTagType,
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
	private static cacheBackground: ImageBitmap;
	private static cacheCanvas: OffscreenCanvas;
	private static cacheForeground: ImageBitmap;
	private static cachePrimary: ImageBitmap;
	private static cacheSecondary: ImageBitmap;
	private static cacheVanishing: ImageBitmap;
	private static cacheHashGx: number;
	private static cacheHashGy: number;
	private static cacheHashPh: number;
	private static cacheHashPw: number;
	private static cacheHourPrecise: number;
	private static cacheZoom: number;
	private static ctx: OffscreenCanvasRenderingContext2D;
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

		ImageBlockDrawEngine.cacheCanvas = new OffscreenCanvas(0, 0);
		ImageBlockDrawEngine.ctx = <OffscreenCanvasRenderingContext2D>ImageBlockDrawEngine.cacheCanvas.getContext('2d');
		ImageBlockDrawEngine.ctx.imageSmoothingEnabled = false;

		ImageBlockDrawEngine.zGroup = [
			VideoBusInputCmdGameModeEditApplyZ.BACKGROUND,
			VideoBusInputCmdGameModeEditApplyZ.SECONDARY,
			VideoBusInputCmdGameModeEditApplyZ.PRIMARY,
			VideoBusInputCmdGameModeEditApplyZ.FOREGROUND,
			VideoBusInputCmdGameModeEditApplyZ.VANISHING,
		];
	}

	public static cacheReset(): void {
		ImageBlockDrawEngine.cacheZoom = -1;
	}

	public static start(): void {
		let camera: Camera = ImageBlockDrawEngine.mapActiveCamera,
			hourPreciseOfDayEff: number = LightingEngine.getHourPreciseOfDayEff();

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
				ctx: OffscreenCanvasRenderingContext2D = ImageBlockDrawEngine.ctx,
				complexes: GridBlockTableComplex[],
				complexesByGx: { [key: number]: GridBlockTableComplex[] },
				drawGx: number,
				drawGy: number,
				editing: boolean = ImageBlockDrawEngine.editing,
				extendedHash: { [key: number]: null },
				getCacheInstance = LightingEngine.getCacheInstance,
				getCacheBrightness = LightingEngine.getCacheBrightness,
				getCacheLitByBrightness = LightingEngine.getCacheLitByBrightness,
				getCacheLitOutside = LightingEngine.getCacheLitOutside,
				gInPh: number = camera.gInPh,
				gInPhEff: number = 0,
				gInPw: number = camera.gInPw,
				gInPwEff: number = 0,
				gradient: CanvasGradient,
				grid: Grid = ImageBlockDrawEngine.mapActive.gridActive,
				gridAudioBlock: GridAudioBlock,
				gridAudioTag: GridAudioTag,
				gridConfig: GridConfig = ImageBlockDrawEngine.mapActive.gridConfigActive,
				gridImageBlock: GridImageBlock,
				gridLight: GridLight,
				gSizeHPrevious: number = -1,
				gSizeWPrevious: number = -1,
				gx: number,
				gy: number,
				imageBitmap: ImageBitmap,
				imageBitmaps: ImageBitmap[],
				imageBitmapsBlend: number = LightingEngine.getHourPreciseOfDayEff(),
				lightHashes: { [key: number]: GridLight },
				lights: GridBlockTable<GridLight> | undefined = undefined,
				j: string,
				k: string,
				night: boolean = UtilEngine.isLightNight(LightingEngine.getHourPreciseOfDayEff()),
				outside: boolean = gridConfig.outside,
				radius: number,
				radius2: number,
				reference: GridBlockTable<GridImageBlockReference>,
				referenceHashes: { [key: number]: GridImageBlockReference },
				transform: boolean,
				shadingQuality: VideoBusInputCmdSettingsShadingQuality = ImageBlockDrawEngine.shadingQuality,
				startGx: number = camera.viewportGx,
				startGxEff: number = startGx - 1,
				startGy: number = camera.viewportGy,
				startGyEff: number = startGy - 1,
				stopGx: number = startGx + camera.viewportGwEff,
				stopGy: number = startGy + camera.viewportGwEff,
				x: number,
				y: number,
				z: VideoBusInputCmdGameModeEditApplyZ,
				zGroup: VideoBusInputCmdGameModeEditApplyZ[] = ImageBlockDrawEngine.zGroup;

			// Config
			if (ImageBlockDrawEngine.cacheCanvas.height !== camera.windowPh || ImageBlockDrawEngine.cacheCanvas.width !== camera.windowPw) {
				ImageBlockDrawEngine.cacheCanvas.height = camera.windowPh;
				ImageBlockDrawEngine.cacheCanvas.width = camera.windowPw;
			}
			imageBitmapsBlend = Math.round((imageBitmapsBlend - Math.floor(imageBitmapsBlend)) * 1000) / 1000;
			imageBitmapsBlend = Math.round((1 - imageBitmapsBlend) * 1000) / 1000;

			radius = (((camera.viewportPh / 2) * ImageBlockDrawEngine.vanishingPercentageOfViewport) / camera.zoom) | 0;
			radius2 = radius * 2;

			/*
			 * Iterate through z layers
			 */
			for (let i in zGroup) {
				// Config
				z = zGroup[i];
				switch (z) {
					case VideoBusInputCmdGameModeEditApplyZ.BACKGROUND:
						audioPrimaryBlocks = undefined;
						audioPrimaryTags = undefined;
						extendedHash = <any>new Object();
						lights = undefined;
						reference = grid.imageBlocksBackgroundReference;
						break;
					case VideoBusInputCmdGameModeEditApplyZ.FOREGROUND:
						audioPrimaryBlocks = undefined;
						audioPrimaryTags = undefined;
						extendedHash = <any>new Object();
						lights = grid.lightsForeground;
						reference = grid.imageBlocksForegroundReference;
						break;
					case VideoBusInputCmdGameModeEditApplyZ.PRIMARY:
						audioPrimaryBlocks = grid.audioPrimaryBlocks;
						audioPrimaryTags = grid.audioPrimaryTags;
						extendedHash = <any>new Object();
						lights = grid.lightsPrimary;
						reference = grid.imageBlocksPrimaryReference;
						break;
					case VideoBusInputCmdGameModeEditApplyZ.SECONDARY:
						audioPrimaryBlocks = undefined;
						audioPrimaryTags = undefined;
						extendedHash = <any>new Object();
						lights = undefined;
						reference = grid.imageBlocksSecondaryReference;
						break;
					case VideoBusInputCmdGameModeEditApplyZ.VANISHING:
						audioPrimaryBlocks = undefined;
						audioPrimaryTags = undefined;
						extendedHash = <any>new Object();
						lights = undefined;
						reference = grid.imageBlocksVanishingReference;
						break;
				}
				referenceHashes = reference.hashes;

				// Applicable hashes
				complexesByGx = <any>reference.hashesGyByGx;

				// Image blocks
				for (j in complexesByGx) {
					complexes = complexesByGx[j];
					gx = Number(j);

					if (gx < startGxEff) {
						continue;
					} else if (gx > stopGx) {
						break;
					}

					drawGx = ((gx - startGx) * gInPw) | 0;

					for (k in complexes) {
						gy = complexes[k].value;
						if (gy < startGyEff) {
							continue;
						} else if (gy > stopGy) {
							break;
						}
						gridImageBlock = referenceHashes[complexes[k].hash].block;

						if (gridImageBlock.null && !editing) {
							continue;
						}

						// Extended check
						if (gridImageBlock.extends) {
							if (gridImageBlock.extends) {
								// extention block
								gridImageBlock = referenceHashes[gridImageBlock.extends].block;
							}

							if (extendedHash[gridImageBlock.hash] === null) {
								// Skip block as its hash parent's image has already drawn over it
								continue;
							} else {
								// Draw large block
								extendedHash[gridImageBlock.hash] = null;

								if (gx !== <number>gridImageBlock.gx) {
									gx = <number>gridImageBlock.gx;
									drawGx = ((gx - startGx) * gInPw) | 0;
								}
								gy = <number>gridImageBlock.gy;
							}
						} else {
							if (gx !== <number>gridImageBlock.gx) {
								gx = <number>gridImageBlock.gx;
								drawGx = ((gx - startGx) * gInPw) | 0;
							}
						}

						// Cache calculations
						drawGy = ((gy - startGy) * gInPh) | 0;
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
						} else {
							transform = false;
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
						}
					}
				}

				// Lights
				if (lights && lights.hashesGyByGx) {
					complexesByGx = lights.hashesGyByGx;
					lightHashes = lights.hashes;

					for (j in complexesByGx) {
						complexes = complexesByGx[j];
						gx = Number(j);

						if (gx < startGx) {
							continue;
						} else if (gx > stopGx) {
							break;
						}

						drawGx = ((gx - startGx) * gInPw) | 0;

						for (k in complexes) {
							gridLight = lightHashes[complexes[k].hash];

							if (gridLight.null && !editing) {
								continue;
							}

							gy = <number>gridLight.gy;
							if (gy < startGy) {
								continue;
							} else if (gy > stopGy) {
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

							if (gx < startGx) {
								continue;
							} else if (gx > stopGx) {
								break;
							}

							drawGx = ((gx - startGx) * gInPw) | 0;

							for (k in complexes) {
								gridAudioBlock = audioPrimaryBlockHashes[complexes[k].hash];

								gy = <number>gridAudioBlock.gy;
								if (gy < startGy) {
									continue;
								} else if (gy > stopGy) {
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

							if (gx < startGx) {
								continue;
							} else if (gx > stopGx) {
								break;
							}

							drawGx = ((gx - startGx) * gInPw) | 0;

							for (k in complexes) {
								gridAudioTag = audioPrimaryTagHashes[complexes[k].hash];

								gy = <number>gridAudioTag.gy;
								if (gy < startGy) {
									continue;
								} else if (gy > stopGy) {
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

				// CacheIt
				switch (z) {
					case VideoBusInputCmdGameModeEditApplyZ.BACKGROUND:
						ImageBlockDrawEngine.cacheBackground = ImageBlockDrawEngine.cacheCanvas.transferToImageBitmap();
						break;
					case VideoBusInputCmdGameModeEditApplyZ.FOREGROUND:
						ImageBlockDrawEngine.cacheForeground = ImageBlockDrawEngine.cacheCanvas.transferToImageBitmap();
						break;
					case VideoBusInputCmdGameModeEditApplyZ.PRIMARY:
						ImageBlockDrawEngine.cachePrimary = ImageBlockDrawEngine.cacheCanvas.transferToImageBitmap();
						break;
					case VideoBusInputCmdGameModeEditApplyZ.SECONDARY:
						ImageBlockDrawEngine.cacheSecondary = ImageBlockDrawEngine.cacheCanvas.transferToImageBitmap();
						break;
					case VideoBusInputCmdGameModeEditApplyZ.VANISHING:
						if (ImageBlockDrawEngine.vanishingEnable) {
							x = ((camera.gx - startGx) * gInPw) | 0;
							y = ((camera.gy - startGy) * gInPh) | 0;

							gradient = ctx.createRadialGradient(x, y, 0, x, y, radius);
							gradient.addColorStop(0, 'white');
							gradient.addColorStop(0.75, 'white');
							gradient.addColorStop(1, 'transparent');

							ctx.globalCompositeOperation = 'destination-out';
							ctx.fillStyle = gradient;
							ctx.fillRect(x - radius, y - radius, radius2, radius2);
							ctx.globalCompositeOperation = 'source-over'; // restore default setting
						}

						ImageBlockDrawEngine.cacheVanishing = ImageBlockDrawEngine.cacheCanvas.transferToImageBitmap();
						break;
				}
			}

			// Cache it
			ImageBlockDrawEngine.cacheHashGx = camera.gx;
			ImageBlockDrawEngine.cacheHashGy = camera.gy;
			ImageBlockDrawEngine.cacheHashPh = camera.windowPh;
			ImageBlockDrawEngine.cacheHashPw = camera.windowPw;
			ImageBlockDrawEngine.cacheHourPrecise = hourPreciseOfDayEff;
			ImageBlockDrawEngine.cacheZoom = camera.zoom;
		}

		ImageBlockDrawEngine.ctxBackground.drawImage(ImageBlockDrawEngine.cacheBackground, 0, 0);
		ImageBlockDrawEngine.ctxForeground.drawImage(ImageBlockDrawEngine.cacheForeground, 0, 0);
		ImageBlockDrawEngine.ctxPrimary.drawImage(ImageBlockDrawEngine.cachePrimary, 0, 0);
		ImageBlockDrawEngine.ctxSecondary.drawImage(ImageBlockDrawEngine.cacheSecondary, 0, 0);
		ImageBlockDrawEngine.ctxVanishing.drawImage(ImageBlockDrawEngine.cacheVanishing, 0, 0);
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
