import { AssetEngine } from '../engines/asset.engine';
import { AssetImage, AssetImageType } from '../models/asset.model';
import { Camera } from '../models/camera.model';
import { GridConfig } from '../models/grid.model';
import { MapActive } from '../models/map.model';
import { MapDrawEngine } from './map.draw.engine';
import { UnderlayDrawEngineBus } from './buses/underlay.draw.engine.bus';
import { UtilEngine } from '../engines/util.engine';

/**
 * @author tknight-dev
 */

export class UnderlayDrawEngine {
	private static cacheCanvas: OffscreenCanvas;
	private static cacheNew: boolean;
	private static cacheSky: ImageBitmap;
	private static cacheStarfield: ImageBitmap;
	private static ctx: OffscreenCanvasRenderingContext2D;
	private static ctxUnderlay: OffscreenCanvasRenderingContext2D;
	private static initialized: boolean;
	private static mapActive: MapActive;
	private static width: number;

	public static async initialize(ctxUnderlay: OffscreenCanvasRenderingContext2D): Promise<void> {
		if (UnderlayDrawEngine.initialized) {
			console.error('UnderlayDrawEngine > initialize: already initialized');
			return;
		}
		UnderlayDrawEngine.initialized = true;
		UnderlayDrawEngine.ctxUnderlay = ctxUnderlay;

		// Pull images needed for rendering underlay
		let assetIds: string[] = [],
			images: ImageBitmap[] = [],
			imagesManifest: { [key: string]: AssetImage } = AssetEngine.getAssetManifestMaster().images;
		for (let i in imagesManifest) {
			if (imagesManifest[i].type === AssetImageType.UNDERLAY) {
				assetIds.push(imagesManifest[i].id);
				images.push((<any>AssetEngine.getAssetAndRemoveFromCache(imagesManifest[i].srcs[0].src)).imageBitmap);
			}
		}

		UnderlayDrawEngine.cacheCanvas = new OffscreenCanvas(0, 0);
		UnderlayDrawEngine.ctx = <OffscreenCanvasRenderingContext2D>UnderlayDrawEngine.cacheCanvas.getContext('2d');
		UnderlayDrawEngine.ctx.imageSmoothingEnabled = false;

		await UnderlayDrawEngineBus.initialize(assetIds, images);
		UnderlayDrawEngineBus.setCallbackBitmaps((imageBitmaps: ImageBitmap[]) => {
			UnderlayDrawEngine.cacheSky = imageBitmaps[0];
			UnderlayDrawEngine.cacheStarfield = imageBitmaps[1];
			UnderlayDrawEngine.cacheNew = true;
			MapDrawEngine.setBackgroundSky(imageBitmaps);
		});

		// Last
		UnderlayDrawEngine.startBind();
	}

	// Function set by binder, this is just a placeholder
	public static start(): void {}

	/**
	 * This binding structure greatly reduces GC build up
	 */
	private static startBind(): void {
		let cacheCanvas: OffscreenCanvas = UnderlayDrawEngine.cacheCanvas,
			cacheCheckCameraGx: number = -1,
			cacheCheckCameraGy: number = -1,
			cacheCheckCameraZoom: number = -1,
			cacheSky: ImageBitmap,
			cacheStarfield: ImageBitmap,
			camera: Camera,
			cleared: boolean,
			ctx: OffscreenCanvasRenderingContext2D = UnderlayDrawEngine.ctx,
			ctxUnderlay: OffscreenCanvasRenderingContext2D = UnderlayDrawEngine.ctxUnderlay,
			gridConfigActive: GridConfig,
			height: number,
			offsetMaxX: number,
			offsetX: number,
			offsetY: number,
			scale = UtilEngine.scale;

		UnderlayDrawEngine.start = () => {
			camera = UnderlayDrawEngine.mapActive.camera;
			gridConfigActive = UnderlayDrawEngine.mapActive.gridConfigActive;

			// Is the sky in the view port?
			if (gridConfigActive.outside && gridConfigActive.gHorizon > camera.viewportGy) {
				if (
					UnderlayDrawEngine.cacheNew ||
					cacheCheckCameraGx !== camera.gx ||
					cacheCheckCameraGy !== camera.gy ||
					cacheCheckCameraZoom !== camera.zoom
				) {
					cacheSky = UnderlayDrawEngine.cacheSky;
					cacheStarfield = UnderlayDrawEngine.cacheStarfield;

					if (cacheSky && cacheStarfield) {
						camera = UnderlayDrawEngine.mapActive.camera;
						height = camera.gInPh * gridConfigActive.gHorizon;
						offsetMaxX = cacheSky.width - UnderlayDrawEngine.width;
						offsetX =
							scale(
								camera.gx,
								(camera.viewportGw / 2) | 0,
								(gridConfigActive.gWidth - camera.viewportGw / 2) | 0,
								0,
								offsetMaxX,
							) | 0;

						offsetX = Math.max(0, Math.min(offsetMaxX, offsetX));
						offsetY = scale(camera.viewportGy, gridConfigActive.gHorizon, 0, height, 0) | 0;

						if (cacheCanvas.height !== camera.windowPh || cacheCanvas.width !== camera.windowPw) {
							cacheCanvas.height = camera.windowPh;
							cacheCanvas.width = camera.windowPw;
						} else {
							ctx.clearRect(0, 0, cacheCanvas.width, cacheCanvas.height);
						}

						// Cache it
						ctx.drawImage(cacheSky, offsetX, 0, camera.windowPw, camera.windowPh, 0, -offsetY, camera.windowPw, height);
						ctx.drawImage(cacheStarfield, 0, 0, camera.windowPw, camera.windowPh, 0, -offsetY, camera.windowPw, height);

						// Done
						cacheCheckCameraGx = camera.gx;
						cacheCheckCameraGy = camera.gy;
						cacheCheckCameraZoom = camera.zoom;
						UnderlayDrawEngine.cacheNew = false;
					} else {
						if (cacheCanvas.height !== camera.windowPh || cacheCanvas.width !== camera.windowPw) {
							cacheCanvas.height = camera.windowPh;
							cacheCanvas.width = camera.windowPw;
						}
					}
				}

				if (cacheCanvas) {
					cleared = false;
				}
				ctxUnderlay.drawImage(cacheCanvas, 0, 0);
			} else if (!cleared) {
				camera = UnderlayDrawEngine.mapActive.camera;
				cleared = true;
				ctx.clearRect(0, 0, camera.windowPw, camera.windowPh);
			}
		};
	}

	public static setEditing(editing: boolean) {
		//UnderlayDrawEngineBus.outputTimeForced(editing);
	}

	public static setMapActive(mapActive: MapActive) {
		UnderlayDrawEngine.mapActive = mapActive;
	}

	public static setDimensions(height: number, width: number) {
		UnderlayDrawEngine.width = width;
		UnderlayDrawEngineBus.outputResolution(height, width);
	}
}
