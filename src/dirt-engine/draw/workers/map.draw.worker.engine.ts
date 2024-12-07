import { AssetImageSrcQuality } from '../../models/asset.model';
import { Grid, GridConfig, GridImageBlock, GridLight, GridBlockPipelineAsset } from '../../models/grid.model';
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
	private static canvas: OffscreenCanvas;
	private static canvasTmp: OffscreenCanvas;
	private static canvasTmpVanishing: OffscreenCanvas;
	private static canvasTmpGh: number = 1080;
	private static canvasTmpGw: number = 1920;
	private static camera: MapDrawBusInputPlayloadCamera;
	private static ctx: OffscreenCanvasRenderingContext2D;
	private static ctxTmp: OffscreenCanvasRenderingContext2D;
	private static ctxTmpVanishing: OffscreenCanvasRenderingContext2D;
	private static drawIntervalInMs: number = 250;
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
		MapDrawWorkerEngine.canvasTmpVanishing = new OffscreenCanvas(1, 1);
		MapDrawWorkerEngine.ctx = <OffscreenCanvasRenderingContext2D>MapDrawWorkerEngine.canvas.getContext('2d');
		MapDrawWorkerEngine.ctx.imageSmoothingEnabled = false;
		MapDrawWorkerEngine.ctxTmp = <OffscreenCanvasRenderingContext2D>MapDrawWorkerEngine.canvasTmp.getContext('2d');
		MapDrawWorkerEngine.ctxTmp.imageSmoothingEnabled = false;
		MapDrawWorkerEngine.ctxTmpVanishing = <OffscreenCanvasRenderingContext2D>MapDrawWorkerEngine.canvasTmpVanishing.getContext('2d');
		MapDrawWorkerEngine.ctxTmpVanishing.imageSmoothingEnabled = false;

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

	private static outputBitmap(image: ImageBitmap): void {
		(<any>MapDrawWorkerEngine.self).postMessage(image, [image]);
	}

	/**
	 * 1g = 1px
	 *
	 * Rendering logic is largely a copy-n-paste from image-block.draw.engine.ts
	 */
	private static async _draw(): Promise<void> {
		let camera: MapDrawBusInputPlayloadCamera,
			canvas: OffscreenCanvas = MapDrawWorkerEngine.canvas,
			canvasHeight: number,
			canvasTmp: OffscreenCanvas = MapDrawWorkerEngine.canvasTmp,
			canvasTmpGh: number,
			canvasTmpGhEff: number,
			canvasTmpGw: number,
			canvasTmpGwEff: number,
			canvasTmpVanishing: OffscreenCanvas = MapDrawWorkerEngine.canvasTmpVanishing,
			canvasWidth: number,
			ctx: OffscreenCanvasRenderingContext2D,
			ctxTmp: OffscreenCanvasRenderingContext2D,
			ctxTmpSelect: OffscreenCanvasRenderingContext2D,
			ctxTmpVanishing: OffscreenCanvasRenderingContext2D,
			drawGx: number,
			drawGy: number,
			extendedHash: { [key: number]: null },
			extendedHashes: { [key: number]: null }[],
			extendedHashesLights: { [key: number]: null }[],
			gInPhEff: number,
			gInPwEff: number,
			gradient: CanvasGradient,
			grid: Grid,
			gridConfig: GridConfig,
			gridImageBlock: GridImageBlock,
			gHeight: number,
			gHeightMax: number,
			gHeightMaxEff: number,
			gridBlockPipelineAsset: GridBlockPipelineAsset,
			gridBlockPipelineAssets: GridBlockPipelineAsset[],
			gridLight: GridLight,
			gSizeHPrevious: number,
			gSizeWPrevious: number,
			gWidth: number,
			gWidthMax: number,
			gWidthMaxEff: number,
			gx: number,
			gxString: string,
			gy: number,
			gys: number[],
			i: string,
			imageBitmap: ImageBitmap,
			j: string,
			pipelineAssetsByGy: { [key: number]: GridBlockPipelineAsset[] },
			pipelineAssetsByGyByGx: { [key: number]: { [key: number]: GridBlockPipelineAsset[] } },
			pipelineGy: { [key: number]: number[] },
			radius: number,
			radius2: number,
			resolutionMultiple: number = 4,
			scaledImageHeight: number,
			scaledImageWidth: number,
			skip: boolean,
			start: number,
			stopGx: number,
			stopGy: number,
			transform: boolean,
			vanishingEnable: boolean,
			vanishingPercentageOfViewport: number,
			x: number,
			y: number,
			__draw = () => {
				camera = MapDrawWorkerEngine.camera;
				canvasHeight = MapDrawWorkerEngine.height;
				canvasTmpGh = MapDrawWorkerEngine.canvasTmpGh;
				canvasTmpGw = MapDrawWorkerEngine.canvasTmpGw;
				canvasWidth = MapDrawWorkerEngine.width;
				ctx = MapDrawWorkerEngine.ctx;
				ctxTmp = MapDrawWorkerEngine.ctxTmp;
				ctxTmpVanishing = MapDrawWorkerEngine.ctxTmpVanishing;
				(extendedHashes = new Array()), (extendedHashesLights = new Array()), (gInPhEff = 0);
				gInPwEff = 0;
				grid = MapDrawWorkerEngine.grids[MapDrawWorkerEngine.gridActiveId];
				gridConfig = MapDrawWorkerEngine.gridConfigs[MapDrawWorkerEngine.gridActiveId];
				pipelineAssetsByGyByGx = grid.imageBlocksRenderPipelineAssetsByGyByGx;
				pipelineGy = grid.imageBlocksRenderPipelineGy;
				gHeightMax = gridConfig.gHeight;
				gSizeHPrevious = 0;
				gSizeWPrevious = 0;
				gWidthMax = gridConfig.gWidth;
				scaledImageHeight = (canvasHeight * (canvasTmpGh / gHeightMax)) | 0;
				scaledImageWidth = (canvasWidth * (canvasTmpGw / gWidthMax)) | 0;
				vanishingEnable = MapDrawWorkerEngine.vanishingEnable;
				vanishingPercentageOfViewport = MapDrawWorkerEngine.vanishingPercentageOfViewport;

				// Config
				canvasTmpGhEff = canvasTmpGh * resolutionMultiple;
				canvasTmpGwEff = canvasTmpGw * resolutionMultiple;
				gHeightMaxEff = gHeightMax * resolutionMultiple;
				gWidthMaxEff = gWidthMax * resolutionMultiple;
				radius = ((((camera.viewportGh / 2) * vanishingPercentageOfViewport) / camera.zoom) * resolutionMultiple) | 0;
				radius2 = radius * 2;

				// Config - Canvas
				if (canvas.height !== canvasHeight || canvas.width !== canvasWidth) {
					canvas.height = canvasHeight;
					canvas.width = canvasWidth;
				}
				if (canvasTmp.height !== canvasTmpGhEff || canvasTmp.width !== canvasTmpGwEff) {
					canvasTmp.height = canvasTmpGhEff;
					canvasTmp.width = canvasTmpGwEff;
					canvasTmpVanishing.height = canvasTmpGhEff;
					canvasTmpVanishing.width = canvasTmpGwEff;
				}

				for (gWidth = 0; gWidth < gWidthMax; gWidth += canvasTmpGw) {
					for (gHeight = 0; gHeight < gHeightMax; gHeight += canvasTmpGh) {
						stopGx = gWidth + canvasTmpGw;
						stopGy = gHeight + canvasTmpGh;

						for (gxString in pipelineAssetsByGyByGx) {
							gx = Number(gxString);

							// Viewport check
							if (gx < gWidth) {
								continue;
							} else if (gx > stopGx) {
								break;
							}

							drawGx = ((gx - gWidth) * resolutionMultiple) | 0;
							gys = pipelineGy[gxString];
							pipelineAssetsByGy = pipelineAssetsByGyByGx[gxString];
							for (i in gys) {
								gy = Number(gys[i]);

								// Viewport check
								if (gy < gHeight) {
									continue;
								} else if (gy > stopGy) {
									break;
								}

								drawGy = ((gy - gHeight) * resolutionMultiple) | 0;
								gridBlockPipelineAssets = pipelineAssetsByGy[gy];

								for (j in gridBlockPipelineAssets) {
									gridBlockPipelineAsset = gridBlockPipelineAssets[j];

									// Is asset available on this z level?
									if (!gridBlockPipelineAsset) {
										continue;
									}

									// Config
									if (j === '4') {
										ctxTmpSelect = ctxTmpVanishing;
									} else {
										ctxTmpSelect = ctxTmp;
									}

									/**
									 * Draw: Image Blocks
									 */
									if (gridBlockPipelineAsset.asset && !gridBlockPipelineAsset.asset.null) {
										gridImageBlock = gridBlockPipelineAsset.asset;
										skip = false;

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
											if (gridBlockPipelineAsset.extends) {
												if (gridBlockPipelineAsset.asset.gx !== gx) {
													drawGx = ((gridBlockPipelineAsset.asset.gx - gWidth) * resolutionMultiple) | 0;
												}
												if (gridBlockPipelineAsset.asset.gy !== gy) {
													drawGy = ((gridBlockPipelineAsset.asset.gy - gHeight) * resolutionMultiple) | 0;
												}
											}

											// Config
											if (gSizeHPrevious !== gridImageBlock.gSizeH) {
												gSizeHPrevious = gridImageBlock.gSizeH;
												gInPhEff = (resolutionMultiple * gridImageBlock.gSizeH) | 0;
											}
											if (gSizeWPrevious !== gridImageBlock.gSizeW) {
												gSizeWPrevious = gridImageBlock.gSizeW;
												gInPwEff = (resolutionMultiple * gridImageBlock.gSizeW) | 0;
											}

											// Transforms
											if (gridImageBlock.flipH || gridImageBlock.flipV) {
												transform = true;
												ctxTmpSelect.setTransform(
													gridImageBlock.flipH ? -1 : 1,
													0,
													0,
													gridImageBlock.flipV ? -1 : 1,
													(drawGx + (gridImageBlock.flipH ? gInPwEff : 0)) | 0,
													(drawGy + (gridImageBlock.flipV ? gInPhEff : 0)) | 0,
												);
											}

											imageBitmap = LightingEngine.getCacheInstance(gridImageBlock.assetId).image;
											ctxTmpSelect.drawImage(imageBitmap, drawGx, drawGy, gInPwEff, gInPhEff);

											// Reset transforms
											if (transform) {
												ctxTmpSelect.setTransform(1, 0, 0, 1, 0, 0);
												transform = false;
											}

											// Reset extension displacement
											if (gridBlockPipelineAsset.extends) {
												if (gridBlockPipelineAsset.asset.gx !== gx) {
													drawGx = ((gx - gWidth) * resolutionMultiple) | 0;
												}
												if (gridBlockPipelineAsset.asset.gy !== gy) {
													drawGy = ((gy - gHeight) * resolutionMultiple) | 0;
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
											if (gridBlockPipelineAsset.extends) {
												if (gridLight.gx !== gx) {
													drawGx = ((gridLight.gx - gWidth) * resolutionMultiple) | 0;
												}
												if (gridLight.gy !== gy) {
													drawGy = ((gridLight.gy - gHeight) * resolutionMultiple) | 0;
												}
											}

											// Config
											if (gSizeHPrevious !== gridLight.gSizeH) {
												gSizeHPrevious = gridLight.gSizeH;
												gInPhEff = (resolutionMultiple * gridLight.gSizeH) | 0;
											}
											if (gSizeWPrevious !== gridLight.gSizeW) {
												gSizeWPrevious = gridLight.gSizeW;
												gInPwEff = (resolutionMultiple * gridLight.gSizeW) | 0;
											}

											// Transforms
											if (gridLight.flipH || gridLight.flipV) {
												transform = true;
												ctxTmpSelect.setTransform(
													gridLight.flipH ? -1 : 1,
													0,
													0,
													gridLight.flipV ? -1 : 1,
													(drawGx + (gridLight.flipH ? gInPwEff : 0)) | 0,
													(drawGy + (gridLight.flipV ? gInPhEff : 0)) | 0,
												);
											}

											imageBitmap = LightingEngine.getCacheInstance(gridLight.assetId).image;
											ctxTmpSelect.drawImage(imageBitmap, drawGx, drawGy, gInPwEff, gInPhEff);

											// Reset transforms
											if (transform) {
												ctxTmpSelect.setTransform(1, 0, 0, 1, 0, 0);
												transform = false;
											}

											// Reset extension displacement
											if (gridBlockPipelineAsset.extends) {
												if (gridLight.gx !== gx) {
													drawGx = ((gx - gWidth) * resolutionMultiple) | 0;
												}
												if (gridLight.gy !== gy) {
													drawGy = ((gy - gHeight) * resolutionMultiple) | 0;
												}
											}
										}
									}
								}
							}
						}

						if (vanishingEnable) {
							x = Math.floor((camera.gx - gWidth) * resolutionMultiple);
							y = Math.floor((camera.gy - gHeight) * resolutionMultiple);

							gradient = ctxTmpVanishing.createRadialGradient(x, y, 0, x, y, radius);
							gradient.addColorStop(0, 'white');
							gradient.addColorStop(0.75, 'white');
							gradient.addColorStop(1, 'transparent');

							ctxTmpVanishing.globalCompositeOperation = 'destination-out';
							ctxTmpVanishing.fillStyle = gradient;
							ctxTmpVanishing.fillRect(x - radius, y - radius, radius2, radius2);
							ctxTmpVanishing.globalCompositeOperation = 'source-over'; // restore default setting
						}

						// Build final cut of the map
						ctxTmp.drawImage(canvasTmpVanishing, 0, 0);

						if (canvasTmpGw > canvasWidth) {
							// Resize to correct size
							ctx.drawImage(canvasTmp, 0, 0, gWidthMaxEff, gHeightMaxEff, 0, 0, canvasWidth, canvasHeight);
						} else {
							// Resize & offset to correct size
							ctx.drawImage(
								canvasTmp,
								0,
								0,
								canvasTmpGwEff,
								canvasTmpGhEff,
								(canvasWidth * (gWidth / gWidthMax)) | 0,
								(canvasHeight * (gHeight / gHeightMax)) | 0,
								scaledImageWidth,
								scaledImageHeight,
							);
						}

						ctxTmp.clearRect(0, 0, canvasTmp.width, canvasTmp.height);
						ctxTmpVanishing.clearRect(0, 0, canvasTmpVanishing.width, canvasTmpVanishing.height);
					}
				}

				// Done
				MapDrawWorkerEngine.outputBitmap(canvas.transferToImageBitmap());
			};

		while (true) {
			start = performance.now();

			if (MapDrawWorkerEngine.mapVisible) {
				try {
					__draw();
				} catch (e: any) {
					// console.error('e', e);
				}
			}

			// Offset delay by duration of draw function to more consistently equal the drawIntervalInMs setpoint by cycle
			await UtilEngine.delayInMs(Math.max(0, MapDrawWorkerEngine.drawIntervalInMs - (performance.now() - start)));
		}
	}
}
