import { AssetImageSrcQuality } from '../../models/asset.model';
import {
	Grid,
	GridConfig,
	GridBlockTable,
	GridBlockTableComplex,
	GridImageBlock,
	GridImageBlockReference,
	GridLight,
} from '../../models/grid.model';
import { LightingEngine } from '../../engines/lighting.engine';
import { MapActive } from '../../models/map.model';
import { MapEditEngine } from '../../engines/map-edit.engine';
import {
	MapDrawBusInputCmd,
	MapDrawBusInputPlayload,
	MapDrawBusInputPlayloadAssets,
	MapDrawBusInputPlayloadCamera,
	MapDrawBusInputPlayloadGridActive,
	MapDrawBusInputPlayloadGrids,
	MapDrawBusInputPlayloadInitial,
	MapDrawBusInputPlayloadResolution,
	MapDrawBusInputPlayloadSettings,
	MapDrawBusInputPlayloadTimeForced,
} from '../buses/map.draw.model.bus';
import { UtilEngine } from '../../engines/util.engine';
import { VideoBusInputCmdGameModeEditApplyZ } from '../../engines/buses/video.model.bus';

/**
 * @author tknight-dev
 */

self.onmessage = (event: MessageEvent) => {
	let payload: MapDrawBusInputPlayload = event.data;

	switch (payload.cmd) {
		case MapDrawBusInputCmd.INITIALIZE:
			MapDrawWorkerEngine.initialize(self, <MapDrawBusInputPlayloadInitial>payload.data);
			break;
		case MapDrawBusInputCmd.SET_ASSETS:
			MapDrawWorkerEngine.inputSetAssets(<MapDrawBusInputPlayloadAssets>payload.data);
			break;
		case MapDrawBusInputCmd.SET_CAMERA:
			MapDrawWorkerEngine.inputSetCamera(<MapDrawBusInputPlayloadCamera>payload.data);
			break;
		case MapDrawBusInputCmd.SET_GRID_ACTIVE:
			MapDrawWorkerEngine.inputSetGridActive(<MapDrawBusInputPlayloadGridActive>payload.data);
			break;
		case MapDrawBusInputCmd.SET_GRIDS:
			MapDrawWorkerEngine.inputSetGrids(<MapDrawBusInputPlayloadGrids>payload.data);
			break;
		case MapDrawBusInputCmd.SET_RESOLUTION:
			MapDrawWorkerEngine.inputSetResolution(<MapDrawBusInputPlayloadResolution>payload.data);
			break;
		case MapDrawBusInputCmd.SET_SETTINGS:
			MapDrawWorkerEngine.inputSetSettings(<MapDrawBusInputPlayloadSettings>payload.data);
			break;
		case MapDrawBusInputCmd.SET_TIME_FORCED:
			MapDrawWorkerEngine.inputSetTimeForced(<MapDrawBusInputPlayloadTimeForced>payload.data);
			break;
	}
};

class MapDrawWorkerEngine {
	private static busy: boolean;
	private static canvas: OffscreenCanvas;
	private static canvasTmp: OffscreenCanvas;
	private static canvasTmpGh: number = 1080;
	private static canvasTmpGw: number = 1920;
	private static camera: MapDrawBusInputPlayloadCamera;
	private static ctx: OffscreenCanvasRenderingContext2D;
	private static ctxTmp: OffscreenCanvasRenderingContext2D;
	private static gridActiveId: string;
	private static grids: { [key: string]: Grid };
	private static gridConfigs: { [key: string]: GridConfig };
	private static height: number;
	private static initialized: boolean;
	private static mapVisible: boolean;
	private static self: Window & typeof globalThis;
	private static vanishingEnable: boolean;
	private static vanishingPercentageOfViewport: number;
	private static width: number;
	private static zGroup: VideoBusInputCmdGameModeEditApplyZ[] = [
		VideoBusInputCmdGameModeEditApplyZ.BACKGROUND,
		VideoBusInputCmdGameModeEditApplyZ.SECONDARY,
		VideoBusInputCmdGameModeEditApplyZ.PRIMARY,
		VideoBusInputCmdGameModeEditApplyZ.FOREGROUND,
		VideoBusInputCmdGameModeEditApplyZ.VANISHING,
	];

	public static async initialize(self: Window & typeof globalThis, data: MapDrawBusInputPlayloadInitial): Promise<void> {
		if (MapDrawWorkerEngine.initialized) {
			console.error('MapDrawWorkerEngine > initialize: already initialized');
			return;
		}
		MapDrawWorkerEngine.initialized = true;
		MapDrawWorkerEngine.self = self;

		await LightingEngine.initialize(true, true);

		MapDrawWorkerEngine.canvas = new OffscreenCanvas(1, 1);
		MapDrawWorkerEngine.canvasTmp = new OffscreenCanvas(1, 1);
		MapDrawWorkerEngine.ctx = <OffscreenCanvasRenderingContext2D>MapDrawWorkerEngine.canvas.getContext('2d');
		MapDrawWorkerEngine.ctxTmp = <OffscreenCanvasRenderingContext2D>MapDrawWorkerEngine.canvasTmp.getContext('2d');

		// Done
		MapDrawWorkerEngine._draw();
	}

	public static inputSetAssets(data: MapDrawBusInputPlayloadAssets): void {
		// console.log('MapDrawWorkerEngine > inputSetAssets', data);
		MapDrawWorkerEngine.camera && LightingEngine.cacheWorkerImport(data.assets);
	}

	public static inputSetCamera(data: MapDrawBusInputPlayloadCamera): void {
		// console.log('MapDrawWorkerEngine > inputSetCamera', data);
		MapDrawWorkerEngine.camera = data;
	}

	public static inputSetGridActive(data: MapDrawBusInputPlayloadGridActive): void {
		// console.log('MapDrawWorkerEngine > inputSetGridActive', data);
		MapDrawWorkerEngine.gridActiveId = data.id;
	}

	public static inputSetGrids(data: MapDrawBusInputPlayloadGrids): void {
		// console.log('MapDrawWorkerEngine > inputSetGrids', data);
		let grids: { [key: string]: Grid } = {};

		for (let i in data.grids) {
			grids[i] = JSON.parse(data.grids[i]);
		}

		let mapActive: MapActive = MapEditEngine.gridBlockTableInflate(<MapActive>{
			gridConfigs: data.gridConfigs,
			grids: grids,
		});
		MapDrawWorkerEngine.grids = mapActive.grids;
		MapDrawWorkerEngine.gridConfigs = mapActive.gridConfigs;
	}

	public static inputSetResolution(data: MapDrawBusInputPlayloadResolution): void {
		// console.log('MapDrawWorkerEngine > inputSetResolution', data);
		MapDrawWorkerEngine.height = data.height;
		MapDrawWorkerEngine.width = data.width;
	}

	public static inputSetSettings(data: MapDrawBusInputPlayloadSettings): void {
		//console.log('MapDrawWorkerEngine > inputSetSettings', data);
		LightingEngine.settings(data.darknessMax * 0.3, 0, AssetImageSrcQuality.LOW);
		MapDrawWorkerEngine.mapVisible = data.mapVisible;
		MapDrawWorkerEngine.vanishingEnable = data.vanishingEnable;
		MapDrawWorkerEngine.vanishingPercentageOfViewport = data.vanishingPercentageOfViewport;
	}

	public static inputSetTimeForced(data: MapDrawBusInputPlayloadTimeForced): void {
		//console.log('MapDrawWorkerEngine > inputSetTimeForced', data);
		LightingEngine.setTimeForced(data.forced);
	}

	protected static outputBitmap(image: ImageBitmap): void {
		(<any>MapDrawWorkerEngine.self).postMessage(image, [image]);
	}

	/**
	 * 1g = 1px
	 */
	private static _draw(): void {
		let camera: MapDrawBusInputPlayloadCamera,
			canvas: OffscreenCanvas,
			canvasHeight: number,
			canvasTmp: OffscreenCanvas,
			canvasTmpGh: number,
			canvasTmpGhEff: number,
			canvasTmpGw: number,
			canvasTmpGwEff: number,
			canvasWidth: number,
			ctx: OffscreenCanvasRenderingContext2D,
			ctxTmp: OffscreenCanvasRenderingContext2D,
			complexes: GridBlockTableComplex[],
			complexesByGx: { [key: number]: GridBlockTableComplex[] },
			drawGx: number,
			drawGy: number,
			extendedHash: { [key: number]: null },
			gInPhEff: number,
			gInPwEff: number,
			gradient: CanvasGradient,
			grid: Grid,
			gridConfig: GridConfig,
			gridImageBlock: GridImageBlock,
			gHeight: number,
			gHeightMax: number,
			gHeightMaxEff: number,
			gridLight: GridLight,
			gSizeHPrevious: number,
			gSizeWPrevious: number,
			gWidth: number,
			gWidthMax: number,
			gWidthMaxEff: number,
			gx: number,
			gy: number,
			i: string,
			imageBitmap: ImageBitmap,
			j: string,
			k: string,
			lightHashes: { [key: number]: GridLight },
			lights: GridBlockTable<GridLight> | undefined,
			radius: number,
			radius2: number,
			reference: GridBlockTable<GridImageBlockReference>,
			referenceHashes: { [key: number]: GridImageBlockReference },
			resolutionMultiple: number,
			scaledImageHeight: number,
			scaledImageWidth: number,
			stopGx: number,
			stopGy: number,
			vanishingEnable: boolean,
			vanishingPercentageOfViewport: number,
			x: number,
			y: number,
			z: VideoBusInputCmdGameModeEditApplyZ,
			zBitmapBackground: ImageBitmap,
			zBitmapForeground: ImageBitmap,
			zBitmapPrimary: ImageBitmap,
			zBitmapSecondary: ImageBitmap,
			zBitmapVanishing: ImageBitmap,
			zGroup: VideoBusInputCmdGameModeEditApplyZ[];

		// Draw interval
		UtilEngine.setInterval(() => {
			if(MapDrawWorkerEngine.mapVisible) {
				try {
					camera = MapDrawWorkerEngine.camera;
					canvas = MapDrawWorkerEngine.canvas;
					canvasHeight = MapDrawWorkerEngine.height;
					canvasTmp = MapDrawWorkerEngine.canvasTmp;
					canvasTmpGh = MapDrawWorkerEngine.canvasTmpGh;
					canvasTmpGw = MapDrawWorkerEngine.canvasTmpGw;
					canvasWidth = MapDrawWorkerEngine.width;
					ctx = MapDrawWorkerEngine.ctx;
					ctxTmp = MapDrawWorkerEngine.ctxTmp;
					gInPhEff = 0;
					gInPwEff = 0;
					grid = MapDrawWorkerEngine.grids[MapDrawWorkerEngine.gridActiveId];
					gridConfig = MapDrawWorkerEngine.gridConfigs[MapDrawWorkerEngine.gridActiveId];
					gHeightMax = gridConfig.gHeight;
					gSizeHPrevious = 0;
					gSizeWPrevious = 0;
					gWidthMax = gridConfig.gWidth;
					lights = undefined;
					resolutionMultiple = 4;
					scaledImageHeight = Math.round(canvasHeight * (canvasTmpGh / gHeightMax));
					scaledImageWidth = Math.round(canvasWidth * (canvasTmpGw / gWidthMax));
					vanishingEnable = MapDrawWorkerEngine.vanishingEnable;
					vanishingPercentageOfViewport = MapDrawWorkerEngine.vanishingPercentageOfViewport;
					zBitmapBackground = canvas.transferToImageBitmap();
					zBitmapForeground = canvas.transferToImageBitmap();
					zBitmapPrimary = canvas.transferToImageBitmap();
					zBitmapSecondary = canvas.transferToImageBitmap();
					zBitmapVanishing = canvas.transferToImageBitmap();
					zGroup = MapDrawWorkerEngine.zGroup;

					// Config
					canvas.height = canvasHeight;
					canvas.width = canvasWidth;
					canvasTmp.height = canvasTmpGh * resolutionMultiple;
					canvasTmp.width = canvasTmpGw * resolutionMultiple;
					ctx.imageSmoothingEnabled = false;
					ctxTmp.imageSmoothingEnabled = false;

					canvasTmpGhEff = canvasTmpGh * resolutionMultiple;
					canvasTmpGwEff = canvasTmpGw * resolutionMultiple;
					gHeightMaxEff = gHeightMax * resolutionMultiple;
					gWidthMaxEff = gWidthMax * resolutionMultiple;
					radius = Math.round((((camera.viewportGh / 2) * vanishingPercentageOfViewport) / camera.zoom) * resolutionMultiple);
					radius2 = radius * 2;

					for (gWidth = 0; gWidth < gWidthMax; gWidth += canvasTmpGw) {
						for (gHeight = 0; gHeight < gHeightMax; gHeight += canvasTmpGh) {
							for (i in zGroup) {
								z = zGroup[i];
								switch (z) {
									case VideoBusInputCmdGameModeEditApplyZ.BACKGROUND:
										extendedHash = <any>new Object();
										lights = undefined;
										reference = grid.imageBlocksBackgroundReference;
										break;
									case VideoBusInputCmdGameModeEditApplyZ.FOREGROUND:
										extendedHash = <any>new Object();
										lights = grid.lightsForeground;
										reference = grid.imageBlocksForegroundReference;
										break;
									case VideoBusInputCmdGameModeEditApplyZ.PRIMARY:
										extendedHash = <any>new Object();
										lights = grid.lightsPrimary;
										reference = grid.imageBlocksPrimaryReference;
										break;
									case VideoBusInputCmdGameModeEditApplyZ.SECONDARY:
										extendedHash = <any>new Object();
										lights = undefined;
										reference = grid.imageBlocksSecondaryReference;
										break;
									case VideoBusInputCmdGameModeEditApplyZ.VANISHING:
										extendedHash = <any>new Object();
										lights = undefined;
										reference = grid.imageBlocksVanishingReference;
										break;
								}
								referenceHashes = reference.hashes;

								// Prepare
								stopGx = gWidth + canvasTmpGw;
								stopGy = gHeight + canvasTmpGh;

								// Applicable hashes
								complexesByGx = <any>reference.hashesGyByGx;

								// Image Blocks
								for (j in complexesByGx) {
									complexes = complexesByGx[j];
									gx = Number(j);

									if (gx < gWidth || gx > stopGx) {
										continue;
									}

									drawGx = Math.round((gx - gWidth) * resolutionMultiple);

									for (k in complexes) {
										gy = complexes[k].value;
										if (gy < gHeight || gy > stopGy) {
											continue;
										}
										gridImageBlock = referenceHashes[complexes[k].hash].block;

										if (gridImageBlock.null) {
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
													drawGx = Math.round((gx - gWidth) * resolutionMultiple);
												}
												gy = <number>gridImageBlock.gy;
											}
										} else {
											if (gx !== <number>gridImageBlock.gx) {
												gx = <number>gridImageBlock.gx;
												drawGx = Math.round((gx - gWidth) * resolutionMultiple);
											}
										}

										// Cache calculations
										drawGy = Math.round((gy - gHeight) * resolutionMultiple);
										if (gSizeHPrevious !== gridImageBlock.gSizeH) {
											gSizeHPrevious = gridImageBlock.gSizeH;
											gInPhEff = resolutionMultiple * gridImageBlock.gSizeH;
										}
										if (gSizeWPrevious !== gridImageBlock.gSizeW) {
											gSizeWPrevious = gridImageBlock.gSizeW;
											gInPwEff = resolutionMultiple * gridImageBlock.gSizeW;
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

										imageBitmap = LightingEngine.getCacheInstance(gridImageBlock.assetId).image;
										ctxTmp.drawImage(imageBitmap, drawGx, drawGy, gInPwEff, gInPhEff);
									}
								}
								// Reset transforms
								ctx.setTransform(1, 0, 0, 1, 0, 0);

								// Lights
								if (lights && lights.hashesGyByGx) {
									complexesByGx = lights.hashesGyByGx;
									lightHashes = lights.hashes;

									for (j in complexesByGx) {
										complexes = complexesByGx[j];
										gx = Number(j);

										if (gx < gWidth || gx > stopGx) {
											continue;
										}

										drawGx = Math.round((gx - gWidth) * resolutionMultiple);

										for (k in complexes) {
											gridLight = lightHashes[complexes[k].hash];

											if (gridLight.null) {
												continue;
											}

											gy = <number>gridLight.gy;
											if (gy < gHeight || gy > stopGy) {
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
														drawGx = Math.round((gx - gWidth) * resolutionMultiple);
													}
													gy = <number>gridLight.gy;
												}
											} else {
												if (gx !== <number>gridLight.gx) {
													gx = <number>gridLight.gx;
													drawGx = Math.round((gx - gWidth) * resolutionMultiple);
												}
											}

											// Cache calculations
											drawGy = Math.round((gy - gHeight) * resolutionMultiple);
											if (gSizeHPrevious !== gridLight.gSizeH) {
												gSizeHPrevious = gridLight.gSizeH;
												gInPhEff = Math.round(resolutionMultiple * gridLight.gSizeH);
											}
											if (gSizeWPrevious !== gridLight.gSizeW) {
												gSizeWPrevious = gridLight.gSizeW;
												gInPwEff = Math.round(resolutionMultiple * gridLight.gSizeW);
											}

											imageBitmap = LightingEngine.getCacheInstance(gridLight.assetId).image;
											ctxTmp.drawImage(imageBitmap, drawGx, drawGy, gInPwEff, gInPhEff);
										}
									}
								}

								switch (z) {
									case VideoBusInputCmdGameModeEditApplyZ.BACKGROUND:
										zBitmapBackground = canvasTmp.transferToImageBitmap();
										break;
									case VideoBusInputCmdGameModeEditApplyZ.FOREGROUND:
										zBitmapForeground = canvasTmp.transferToImageBitmap();
										break;
									case VideoBusInputCmdGameModeEditApplyZ.PRIMARY:
										zBitmapPrimary = canvasTmp.transferToImageBitmap();
										break;
									case VideoBusInputCmdGameModeEditApplyZ.SECONDARY:
										zBitmapSecondary = canvasTmp.transferToImageBitmap();
										break;
									case VideoBusInputCmdGameModeEditApplyZ.VANISHING:
										if (vanishingEnable) {
											x = Math.round((camera.gx - gWidth) * resolutionMultiple);
											y = Math.round((camera.gy - gHeight) * resolutionMultiple);

											gradient = ctxTmp.createRadialGradient(x, y, 0, x, y, radius);
											gradient.addColorStop(0, 'white');
											gradient.addColorStop(0.75, 'white');
											gradient.addColorStop(1, 'transparent');

											ctxTmp.globalCompositeOperation = 'destination-out';
											ctxTmp.fillStyle = gradient;
											ctxTmp.fillRect(x - radius, y - radius, radius2, radius2);
											ctxTmp.globalCompositeOperation = 'source-over'; // restore default setting
										}

										zBitmapVanishing = canvasTmp.transferToImageBitmap();
										break;
								}
							}

							// Build final cut of the map
							ctxTmp.drawImage(zBitmapBackground, 0, 0);
							ctxTmp.drawImage(zBitmapSecondary, 0, 0);
							ctxTmp.drawImage(zBitmapPrimary, 0, 0);
							ctxTmp.drawImage(zBitmapForeground, 0, 0);
							ctxTmp.drawImage(zBitmapVanishing, 0, 0);

							if (canvasTmpGw > canvasWidth) {
								// Resize to correct size (good)
								ctx.drawImage(canvasTmp, 0, 0, gWidthMaxEff, gHeightMaxEff, 0, 0, canvasWidth, canvasHeight);
								// Loop ends after this argument
							} else {
								// Resize & offset to correct size (bad)
								ctx.drawImage(
									canvasTmp,
									0,
									0,
									canvasTmpGwEff,
									canvasTmpGhEff,
									Math.round(canvasWidth * (gWidth / gWidthMax)),
									Math.round(canvasHeight * (gHeight / gHeightMax)),
									scaledImageWidth,
									scaledImageHeight,
								);
							}
						}
					}

					// Done
					MapDrawWorkerEngine.outputBitmap(canvas.transferToImageBitmap());
				} catch (e: any) {
					//console.error('e', e);
				}
			}
		}, 1000);
	}
}
