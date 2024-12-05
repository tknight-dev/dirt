import { AssetEngine } from '../engines/asset.engine';
import { AssetImage, AssetImageType } from '../models/asset.model';
import { MapActive } from '../models/map.model';
import { MapDrawEngine } from './map.draw.engine';
import { UnderlayDrawEngineBus } from './buses/underlay.draw.engine.bus';
import { UtilEngine } from '../engines/util.engine';

/**
 * @author tknight-dev
 */

export class UnderlayDrawEngine {
	private static cacheSky: ImageBitmap | undefined;
	private static cacheStarfield: ImageBitmap | undefined;
	private static cleared: boolean;
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

		await UnderlayDrawEngineBus.initialize(assetIds, images);
		UnderlayDrawEngineBus.setCallbackBitmaps((imageBitmaps: ImageBitmap[]) => {
			UnderlayDrawEngine.cacheSky = imageBitmaps[0];
			UnderlayDrawEngine.cacheStarfield = imageBitmaps[1];
			MapDrawEngine.setBackgroundSky(imageBitmaps);
		});
	}

	public static start(): void {
		// Is the sky in the view port?
		if (
			UnderlayDrawEngine.mapActive.gridConfigActive.outside &&
			UnderlayDrawEngine.cacheSky &&
			UnderlayDrawEngine.cacheStarfield &&
			UnderlayDrawEngine.mapActive.gridConfigActive.gHorizon > UnderlayDrawEngine.mapActive.camera.viewportGy
		) {
			let height: number = UnderlayDrawEngine.mapActive.camera.gInPh * UnderlayDrawEngine.mapActive.gridConfigActive.gHorizon,
				offsetMaxX: number = UnderlayDrawEngine.cacheSky.width - UnderlayDrawEngine.width,
				offsetX: number =
					UtilEngine.scale(
						UnderlayDrawEngine.mapActive.camera.gx,
						(UnderlayDrawEngine.mapActive.camera.viewportGw / 2) | 0,
						(UnderlayDrawEngine.mapActive.gridConfigActive.gWidth - UnderlayDrawEngine.mapActive.camera.viewportGw / 2) | 0,
						0,
						offsetMaxX,
					) | 0,
				offsetY: number =
					UtilEngine.scale(
						UnderlayDrawEngine.mapActive.camera.viewportGy,
						UnderlayDrawEngine.mapActive.gridConfigActive.gHorizon,
						0,
						height,
						0,
					) | 0;

			offsetX = Math.max(0, Math.min(offsetMaxX, offsetX));

			// Done
			UnderlayDrawEngine.ctxUnderlay.drawImage(
				UnderlayDrawEngine.cacheSky,
				offsetX,
				0,
				UnderlayDrawEngine.mapActive.camera.windowPw,
				UnderlayDrawEngine.mapActive.camera.windowPh,
				0,
				-offsetY,
				UnderlayDrawEngine.mapActive.camera.windowPw,
				height,
			);
			UnderlayDrawEngine.ctxUnderlay.drawImage(
				UnderlayDrawEngine.cacheStarfield,
				0,
				0,
				UnderlayDrawEngine.mapActive.camera.windowPw,
				UnderlayDrawEngine.mapActive.camera.windowPh,
				0,
				-offsetY,
				UnderlayDrawEngine.mapActive.camera.windowPw,
				height,
			);
			UnderlayDrawEngine.cleared = false;
		} else if (!UnderlayDrawEngine.cleared) {
			UnderlayDrawEngine.cleared = true;
			UnderlayDrawEngine.ctxUnderlay.clearRect(
				0,
				0,
				UnderlayDrawEngine.mapActive.camera.windowPw,
				UnderlayDrawEngine.mapActive.camera.windowPh,
			);
		}
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
