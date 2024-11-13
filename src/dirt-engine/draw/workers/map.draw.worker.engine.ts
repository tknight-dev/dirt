import { AssetEngine } from '../../engines/asset.engine';
import { AssetImage } from '../../models/asset.model';
import { Camera } from '../../models/camera.model';
import { Grid, GridConfig, GridBlockTable, GridBlockTableComplex, GridImageBlock } from '../../models/grid.model';
import { LightingEngine } from '../../engines/lighting.engine';
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
	private static assetImages: { [key: string]: AssetImage };
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
		VideoBusInputCmdGameModeEditApplyZ.FOREGROUND,
		VideoBusInputCmdGameModeEditApplyZ.PRIMARY, // After Foreground
		VideoBusInputCmdGameModeEditApplyZ.VANISHING,
	];

	public static async initialize(self: Window & typeof globalThis, data: MapDrawBusInputPlayloadInitial): Promise<void> {
		if (MapDrawWorkerEngine.initialized) {
			console.error('MapDrawWorkerEngine > initialize: already initialized');
			return;
		}
		MapDrawWorkerEngine.initialized = true;
		(MapDrawWorkerEngine.assetImages = data.assetImages), (MapDrawWorkerEngine.self = self);

		await LightingEngine.initialize(true);

		MapDrawWorkerEngine.canvas = new OffscreenCanvas(1, 1);
		MapDrawWorkerEngine.canvasTmp = new OffscreenCanvas(1, 1);
		MapDrawWorkerEngine.ctx = <OffscreenCanvasRenderingContext2D>MapDrawWorkerEngine.canvas.getContext('2d');
		MapDrawWorkerEngine.ctxTmp = <OffscreenCanvasRenderingContext2D>MapDrawWorkerEngine.canvasTmp.getContext('2d');

		// Draw interval
		UtilEngine.setInterval(() => {
			MapDrawWorkerEngine._draw();
		}, 1000);
	}

	public static inputSetAssets(data: MapDrawBusInputPlayloadAssets): void {
		// console.log('MapDrawWorkerEngine > inputSetAssets', data);
		MapDrawWorkerEngine.camera && LightingEngine.cacheWorkerImport(data.assets, <Camera>MapDrawWorkerEngine.camera);
	}

	public static inputSetCamera(data: MapDrawBusInputPlayloadCamera): void {
		// console.log('MapDrawWorkerEngine > inputSetCamera', data);
		MapDrawWorkerEngine.camera = data;
		LightingEngine.updateZoom(undefined, true, <Camera>data);
	}

	public static inputSetGridActive(data: MapDrawBusInputPlayloadGridActive): void {
		// console.log('MapDrawWorkerEngine > inputSetGridActive', data);
		MapDrawWorkerEngine.gridActiveId = data.id;
	}

	public static inputSetGrids(data: MapDrawBusInputPlayloadGrids): void {
		// console.log('MapDrawWorkerEngine > inputSetGrids', data);
		MapDrawWorkerEngine.grids = data.grids;
		MapDrawWorkerEngine.gridConfigs = data.gridConfigs;
	}

	public static inputSetResolution(data: MapDrawBusInputPlayloadResolution): void {
		// console.log('MapDrawWorkerEngine > inputSetResolution', data);
		MapDrawWorkerEngine.height = data.height;
		MapDrawWorkerEngine.width = data.width;
	}

	public static inputSetSettings(data: MapDrawBusInputPlayloadSettings): void {
		//console.log('MapDrawWorkerEngine > inputSetSettings', data);
		LightingEngine.setDarknessMax(data.darknessMax * 0.3, <Camera>MapDrawWorkerEngine.camera);
		MapDrawWorkerEngine.mapVisible = data.mapVisible;
		MapDrawWorkerEngine.vanishingEnable = data.vanishingEnable;
		MapDrawWorkerEngine.vanishingPercentageOfViewport = data.vanishingPercentageOfViewport;
	}

	public static inputSetTimeForced(data: MapDrawBusInputPlayloadTimeForced): void {
		//console.log('MapDrawWorkerEngine > inputSetTimeForced', data);
		LightingEngine.setTimeForced(data.forced, <Camera>MapDrawWorkerEngine.camera);
	}

	protected static outputBitmap(image: ImageBitmap): void {
		MapDrawWorkerEngine.self.postMessage(image);
	}

	/**
	 * 1g = 1px
	 *
	 * grid gHeight max is 36301
	 *
	 * grid gWidth max is 64535
	 */
	private static _draw(): void {
		if (MapDrawWorkerEngine.busy || !MapDrawWorkerEngine.mapVisible) {
			return;
		}
		MapDrawWorkerEngine.busy = true;
		try {
			let assetId: string,
				assetImage: AssetImage,
				camera: MapDrawBusInputPlayloadCamera = MapDrawWorkerEngine.camera,
				canvas: OffscreenCanvas = MapDrawWorkerEngine.canvas,
				canvasHeight: number = MapDrawWorkerEngine.height,
				canvasTmp: OffscreenCanvas = MapDrawWorkerEngine.canvasTmp,
				canvasTmpGh: number = MapDrawWorkerEngine.canvasTmpGh,
				canvasTmpGhEff: number,
				canvasTmpGw: number = MapDrawWorkerEngine.canvasTmpGw,
				canvasTmpGwEff: number,
				canvasWidth: number = MapDrawWorkerEngine.width,
				ctx: OffscreenCanvasRenderingContext2D = MapDrawWorkerEngine.ctx,
				ctxTmp: OffscreenCanvasRenderingContext2D = MapDrawWorkerEngine.ctxTmp,
				complex: GridBlockTableComplex,
				complexes: GridBlockTableComplex[],
				complexesByGx: { [key: number]: GridBlockTableComplex[] },
				extended: boolean,
				extendedHash: { [key: number]: null },
				extendedHashBackground: { [key: number]: null } = {},
				extendedHashForeground: { [key: number]: null } = {},
				extendedHashPrimary: { [key: number]: null } = {},
				extendedHashVanishing: { [key: number]: null } = {},
				getAssetImageLit: any = LightingEngine.getAssetImageLit,
				getAssetImageUnlit: any = LightingEngine.getAssetImageUnlit,
				getAssetImageUnlitMax: any = LightingEngine.cacheZoomedUnlitLength - 1,
				gradient: CanvasGradient,
				grid: Grid = MapDrawWorkerEngine.grids[MapDrawWorkerEngine.gridActiveId],
				gridConfig: GridConfig = MapDrawWorkerEngine.gridConfigs[MapDrawWorkerEngine.gridActiveId],
				gridImageBlock: GridImageBlock,
				gHeight: number,
				gHeightMax: number = gridConfig.gHeight,
				gHeightMaxEff: number,
				gWidth: number,
				gWidthMax: number = gridConfig.gWidth,
				gWidthMaxEff: number,
				gx: number,
				gy: number,
				gyMin: number,
				hashesGyByGx: { [key: number]: GridBlockTableComplex[] },
				i: string,
				imageBitmap: ImageBitmap,
				imageBitmaps: ImageBitmap[],
				imageBlocks: GridBlockTable<GridImageBlock>,
				imageBlockHashes: { [key: number]: GridImageBlock },
				j: string,
				k: number,
				outside: boolean = gridConfig.outside,
				oversized: boolean,
				radius: number,
				radius2: number,
				resolutionMultiple: number = 4,
				scaledImageHeight: number = Math.round(canvasHeight * (canvasTmpGh / gHeightMax)),
				scaledImageWidth: number = Math.round(canvasWidth * (canvasTmpGw / gWidthMax)),
				scratch: number,
				vanishingEnable: boolean = MapDrawWorkerEngine.vanishingEnable,
				vanishingPercentageOfViewport: number = MapDrawWorkerEngine.vanishingPercentageOfViewport,
				x: number,
				y: number,
				z: VideoBusInputCmdGameModeEditApplyZ,
				zBitmapBackground: ImageBitmap = canvas.transferToImageBitmap(),
				zBitmapForeground: ImageBitmap = canvas.transferToImageBitmap(),
				zBitmapPrimary: ImageBitmap = canvas.transferToImageBitmap(),
				zBitmapVanishing: ImageBitmap = canvas.transferToImageBitmap(),
				zGroup: VideoBusInputCmdGameModeEditApplyZ[] = MapDrawWorkerEngine.zGroup;

			// Config
			canvas.height = canvasHeight;
			canvas.width = canvasWidth;
			canvasTmp.height = canvasTmpGh * resolutionMultiple;
			canvasTmp.width = canvasTmpGw * resolutionMultiple;
			ctx.imageSmoothingEnabled = false;
			ctxTmp.imageSmoothingEnabled = false;

			ctx.filter = 'brightness(' + gridConfig.lightIntensityGlobal + ')';

			canvasTmpGhEff = canvasTmpGh * resolutionMultiple;
			canvasTmpGwEff = canvasTmpGw * resolutionMultiple;
			gHeightMaxEff = gHeightMax * resolutionMultiple;
			gWidthMaxEff = gWidthMax * resolutionMultiple;
			radius = Math.round((((camera.viewportGh / 2) * vanishingPercentageOfViewport) / camera.zoom) * resolutionMultiple);
			radius2 = radius * 2;

			for (gWidth = 0; gWidth < gWidthMax; gWidth += canvasTmpGw) {
				for (gHeight = 0; gHeight < gHeightMax; gHeight += canvasTmpGh) {
					ctxTmp.clearRect(0, 0, canvasTmpGw, canvasTmpGh);

					for (i in zGroup) {
						z = zGroup[i];
						switch (z) {
							case VideoBusInputCmdGameModeEditApplyZ.BACKGROUND:
								extendedHash = extendedHashBackground;
								imageBlocks = grid.imageBlocksBackground;
								break;
							case VideoBusInputCmdGameModeEditApplyZ.FOREGROUND:
								extendedHash = extendedHashForeground;
								imageBlocks = grid.imageBlocksForeground;
								break;
							case VideoBusInputCmdGameModeEditApplyZ.PRIMARY:
								extendedHash = extendedHashPrimary;
								imageBlocks = grid.imageBlocksPrimary;
								break;
							case VideoBusInputCmdGameModeEditApplyZ.VANISHING:
								extendedHash = extendedHashVanishing;
								imageBlocks = grid.imageBlocksVanishing;
								break;
						}
						imageBlockHashes = imageBlocks.hashes;

						// Applicable hashes
						complexesByGx = UtilEngine.gridBlockTableSliceHashes(
							imageBlocks,
							gWidth,
							gHeight,
							gWidth + canvasTmpGw,
							gHeight + canvasTmpGh,
						);
						hashesGyByGx = <any>imageBlocks.hashesGyByGx;

						for (j in complexesByGx) {
							complexes = complexesByGx[j];
							gyMin = hashesGyByGx[Number(j)][0].value;

							for (k = 0; k < complexes.length; k++) {
								complex = complexes[k];
								assetId = imageBlockHashes[complex.hash].assetId;

								// Null check
								if (assetId === 'null' || assetId === 'null2') {
									continue;
								}

								// Extended check
								gridImageBlock = imageBlockHashes[complex.hash];
								if (gridImageBlock.extends || gridImageBlock.gSizeH !== 1 || gridImageBlock.gSizeW !== 1) {
									if (gridImageBlock.extends) {
										// extention block
										gridImageBlock = imageBlockHashes[gridImageBlock.extends];
										assetId = gridImageBlock.assetId;
									}

									if (extendedHash[gridImageBlock.hash] === null) {
										// Skip block as its hash parent's image has already drawn over it
										continue;
									} else {
										// Draw large block
										extended = true;
										extendedHash[gridImageBlock.hash] = null;
										gx = <number>gridImageBlock.gx;
										gy = <number>gridImageBlock.gy;
									}
								} else {
									extended = false;
									gx = <number>complex.gx;
									gy = <number>complex.gy;
								}

								// Grab global illumination images if outside
								if (outside) {
									scratch = gy - gyMin;

									if (scratch > 2) {
										imageBitmaps = getAssetImageUnlit(assetId);
										imageBitmap = imageBitmaps[Math.min(scratch - 3, getAssetImageUnlitMax)];
									} else {
										imageBitmap = getAssetImageLit(assetId);
									}
								} else {
									imageBitmap = getAssetImageUnlit(assetId)[getAssetImageUnlitMax];
								}

								assetImage = MapDrawWorkerEngine.assetImages[assetId];
								if ((assetImage.gHeight || 1) !== 1 || (assetImage.gWidth || 1) !== 1) {
									oversized = true;
								} else {
									oversized = false;
								}

								// Use draw resize overload for image blocks larger than 1x1
								if (extended || oversized) {
									//console.log(gx, gWidth, gx - gWidth, (gx - gWidth) * resolutionMultiple);
									ctxTmp.drawImage(
										imageBitmap,
										0,
										0,
										imageBitmap.width,
										imageBitmap.height,
										Math.round((gx - gWidth) * resolutionMultiple),
										Math.round((gy - gHeight) * resolutionMultiple),
										resolutionMultiple * gridImageBlock.gSizeW,
										resolutionMultiple * gridImageBlock.gSizeH,
									);
								} else {
									ctxTmp.drawImage(
										imageBitmap,
										Math.round((gx - gWidth) * resolutionMultiple),
										Math.round((gy - gHeight) * resolutionMultiple),
									);
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
		MapDrawWorkerEngine.busy = false;
	}
}
