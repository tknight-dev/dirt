import { Camera } from '../models/camera.model';
import { LightingEngine } from '../engines/lighting.engine';
import {
	Grid,
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
import { VideoBusInputCmdGameModeEditApplyZ } from '../engines/buses/video.model.bus';
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
	private static ctxBackground: OffscreenCanvasRenderingContext2D;
	private static ctxForeground: OffscreenCanvasRenderingContext2D;
	private static ctxPrimary: OffscreenCanvasRenderingContext2D;
	private static ctxSecondary: OffscreenCanvasRenderingContext2D;
	private static ctxVanishing: OffscreenCanvasRenderingContext2D;
	private static editing: boolean;
	private static initialized: boolean;
	private static mapActive: MapActive;
	private static mapActiveCamera: Camera;
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
			let audioPrimaryTags: GridBlockTable<GridAudioTag> | undefined,
				audioPrimaryTagHashes: { [key: number]: GridAudioTag },
				brightness: number,
				canvas: OffscreenCanvas = new OffscreenCanvas(camera.windowPw, camera.windowPh),
				ctx: OffscreenCanvasRenderingContext2D = <OffscreenCanvasRenderingContext2D>canvas.getContext('2d'),
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
				night: boolean = LightingEngine.isLightNight(),
				outside: boolean = gridConfig.outside,
				radius: number,
				radius2: number,
				reference: GridBlockTable<GridImageBlockReference>,
				referenceHashes: { [key: number]: GridImageBlockReference },
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
			ctx.imageSmoothingEnabled = false;

			imageBitmapsBlend = Math.round((imageBitmapsBlend - Math.floor(imageBitmapsBlend)) * 1000) / 1000;
			imageBitmapsBlend = Math.round((1 - imageBitmapsBlend) * 1000) / 1000;

			radius = Math.round(((camera.viewportPh / 2) * ImageBlockDrawEngine.vanishingPercentageOfViewport) / camera.zoom);
			radius2 = radius * 2;

			/*
			 * Iterate through z layers
			 */
			for (let i in zGroup) {
				// Config
				z = zGroup[i];
				switch (z) {
					case VideoBusInputCmdGameModeEditApplyZ.BACKGROUND:
						audioPrimaryTags = undefined;
						extendedHash = <any>new Object();
						lights = undefined;
						reference = grid.imageBlocksBackgroundReference;
						break;
					case VideoBusInputCmdGameModeEditApplyZ.FOREGROUND:
						audioPrimaryTags = undefined;
						extendedHash = <any>new Object();
						lights = grid.lightsForeground;
						reference = grid.imageBlocksForegroundReference;
						break;
					case VideoBusInputCmdGameModeEditApplyZ.PRIMARY:
						audioPrimaryTags = grid.audioPrimaryTags;
						extendedHash = <any>new Object();
						lights = grid.lightsPrimary;
						reference = grid.imageBlocksPrimaryReference;
						break;
					case VideoBusInputCmdGameModeEditApplyZ.SECONDARY:
						audioPrimaryTags = undefined;
						extendedHash = <any>new Object();
						lights = undefined;
						reference = grid.imageBlocksSecondaryReference;
						break;
					case VideoBusInputCmdGameModeEditApplyZ.VANISHING:
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

					if (gx < startGxEff || gx > stopGx) {
						continue;
					}

					drawGx = Math.round((gx - startGx) * gInPw);

					for (k in complexes) {
						gy = complexes[k].value;
						if (gy < startGyEff || gy > stopGy) {
							continue;
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
									drawGx = Math.round((gx - startGx) * gInPw);
								}
								gy = <number>gridImageBlock.gy;
							}
						} else {
							if (gx !== <number>gridImageBlock.gx) {
								gx = <number>gridImageBlock.gx;
								drawGx = Math.round((gx - startGx) * gInPw);
							}
						}

						// Cache calculations
						drawGy = Math.round((gy - startGy) * gInPh);
						if (gSizeHPrevious !== gridImageBlock.gSizeH) {
							gSizeHPrevious = gridImageBlock.gSizeH;
							gInPhEff = Math.round(gInPh * gSizeHPrevious + 1);
						}
						if (gSizeWPrevious !== gridImageBlock.gSizeW) {
							gSizeWPrevious = gridImageBlock.gSizeW;
							gInPwEff = Math.round(gInPw * gSizeWPrevious + 1);
						}

						// Transforms
						ctx.setTransform(
							gridImageBlock.flipH ? -1 : 1,
							0,
							0,
							gridImageBlock.flipV ? -1 : 1,
							drawGx + (gridImageBlock.flipH ? gInPwEff : 0),
							drawGy + (gridImageBlock.flipV ? gInPhEff : 0),
						);

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
									ctx.drawImage(
										imageBitmap,
										0,
										Math.round(imageBitmap.height / 2),
										imageBitmap.width,
										imageBitmap.height,
										0,
										Math.round(gInPhEff / 2),
										gInPwEff,
										gInPhEff,
									);
								} else {
									ctx.drawImage(
										imageBitmap,
										0,
										0,
										imageBitmap.width,
										Math.round(imageBitmap.height / 2),
										0,
										0,
										gInPwEff,
										Math.round(gInPhEff / 2),
									);
								}
							} else {
								ctx.drawImage(imageBitmap, 0, 0, gInPwEff, gInPhEff);
							}

							// If not the same image
							if (imageBitmaps[0] !== imageBitmaps[1]) {
								imageBitmap = imageBitmaps[1];
								ctx.globalAlpha = imageBitmapsBlend;

								// Draw previous image (blended) [6:00 - 100%, 6:30 - 50%, 6:55 - 8%]
								// Provides smooth shading transitions
								if (gridImageBlock.halved !== undefined) {
									if (gridImageBlock.halved === GridImageBlockHalved.DOWN) {
										ctx.drawImage(
											imageBitmap,
											0,
											Math.round(imageBitmap.height / 2),
											imageBitmap.width,
											imageBitmap.height,
											0,
											Math.round(gInPhEff / 2),
											gInPwEff,
											gInPhEff,
										);
									} else {
										ctx.drawImage(
											imageBitmap,
											0,
											0,
											imageBitmap.width,
											Math.round(imageBitmap.height / 2),
											0,
											0,
											gInPwEff,
											Math.round(gInPhEff / 2),
										);
									}
								} else {
									ctx.drawImage(imageBitmap, 0, 0, gInPwEff, gInPhEff);
								}

								// Done
								ctx.globalAlpha = 1;
							}
						} else {
							// Get pre-rendered asset variation based on hash
							brightness = getCacheBrightness(grid.id, gridImageBlock.hash, z);
							imageBitmap = getCacheLitByBrightness(gridImageBlock.assetId, brightness);

							ctx.drawImage(imageBitmap, drawGx, drawGy, gInPwEff, gInPhEff);
						}
					}
				}
				// Reset transforms
				ctx.setTransform(1, 0, 0, 1, 0, 0);

				// Audio Tags
				if (editing && audioPrimaryTags && audioPrimaryTags.hashesGyByGx) {
					complexesByGx = audioPrimaryTags.hashesGyByGx;
					audioPrimaryTagHashes = audioPrimaryTags.hashes;

					gInPhEff = gInPh + 1;
					gInPwEff = gInPw + 1;

					for (j in complexesByGx) {
						complexes = complexesByGx[j];
						gx = Number(j);

						if (gx < startGx || gx > stopGx) {
							continue;
						}

						drawGx = Math.round((gx - startGx) * gInPw);

						for (k in complexes) {
							gridAudioTag = audioPrimaryTagHashes[complexes[k].hash];

							gy = <number>gridAudioTag.gy;
							if (gy < startGy || gy > stopGy) {
								continue;
							}

							// Calc
							if (gx !== <number>gridAudioTag.gx) {
								gx = <number>gridAudioTag.gx;
								drawGx = Math.round((gx - startGx) * gInPw);
							}
							drawGy = Math.round((gy - startGy) * gInPh);

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

				// Lights
				if (lights && lights.hashesGyByGx) {
					complexesByGx = lights.hashesGyByGx;
					lightHashes = lights.hashes;

					for (j in complexesByGx) {
						complexes = complexesByGx[j];
						gx = Number(j);

						if (gx < startGx || gx > stopGx) {
							continue;
						}

						drawGx = Math.round((gx - startGx) * gInPw);

						for (k in complexes) {
							gridLight = lightHashes[complexes[k].hash];

							if (gridLight.null && !editing) {
								continue;
							}

							gy = <number>gridLight.gy;
							if (gy < startGy || gy > stopGy) {
								continue;
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
										drawGx = Math.round((gx - startGx) * gInPw);
									}
									gy = <number>gridLight.gy;
								}
							} else {
								if (gx !== <number>gridLight.gx) {
									gx = <number>gridLight.gx;
									drawGx = Math.round((gx - startGx) * gInPw);
								}
							}

							// Cache calculations
							drawGy = Math.round((gy - startGy) * gInPh);
							if (gSizeHPrevious !== gridLight.gSizeH) {
								gSizeHPrevious = gridLight.gSizeH;
								gInPhEff = gInPh * gSizeHPrevious + 1;
							}
							if (gSizeWPrevious !== gridLight.gSizeW) {
								gSizeWPrevious = gridLight.gSizeW;
								gInPwEff = gInPw * gSizeWPrevious + 1;
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

				// CacheIt
				switch (z) {
					case VideoBusInputCmdGameModeEditApplyZ.BACKGROUND:
						ImageBlockDrawEngine.cacheBackground = canvas.transferToImageBitmap();
						break;
					case VideoBusInputCmdGameModeEditApplyZ.FOREGROUND:
						ImageBlockDrawEngine.cacheForeground = canvas.transferToImageBitmap();
						break;
					case VideoBusInputCmdGameModeEditApplyZ.PRIMARY:
						ImageBlockDrawEngine.cachePrimary = canvas.transferToImageBitmap();
						break;
					case VideoBusInputCmdGameModeEditApplyZ.SECONDARY:
						ImageBlockDrawEngine.cacheSecondary = canvas.transferToImageBitmap();
						break;
					case VideoBusInputCmdGameModeEditApplyZ.VANISHING:
						if (ImageBlockDrawEngine.vanishingEnable) {
							x = Math.round((camera.gx - startGx) * gInPw);
							y = Math.round((camera.gy - startGy) * gInPh);

							gradient = ctx.createRadialGradient(x, y, 0, x, y, radius);
							gradient.addColorStop(0, 'white');
							gradient.addColorStop(0.75, 'white');
							gradient.addColorStop(1, 'transparent');

							ctx.globalCompositeOperation = 'destination-out';
							ctx.fillStyle = gradient;
							ctx.fillRect(x - radius, y - radius, radius2, radius2);
							ctx.globalCompositeOperation = 'source-over'; // restore default setting
						}

						ImageBlockDrawEngine.cacheVanishing = canvas.transferToImageBitmap();
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
	}

	public static setEditing(editing: boolean) {
		ImageBlockDrawEngine.editing = editing;
	}

	public static setVanishingEnable(vanishingEnable: boolean) {
		ImageBlockDrawEngine.vanishingEnable = vanishingEnable;
		MapDrawEngineBus.setVanishingEnable(vanishingEnable);
	}

	public static setVanishingPercentageOfViewport(vanishingPercentageOfViewport: number) {
		ImageBlockDrawEngine.vanishingPercentageOfViewport = vanishingPercentageOfViewport;
		MapDrawEngineBus.setVanishingPercentageOfViewport(ImageBlockDrawEngine.vanishingPercentageOfViewport);
	}
}
