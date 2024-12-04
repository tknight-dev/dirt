import { MapActive } from '../models/map.model';
import { UnderlayDrawEngineBus } from './buses/underlay.draw.engine.bus';
import { UtilEngine } from '../engines/util.engine';

/**
 * @author tknight-dev
 */

export class UnderlayDrawEngine {
	private static cache: ImageBitmap | undefined;
	private static cleared: boolean;
	private static ctxUnderlay: OffscreenCanvasRenderingContext2D;
	private static gHeight: number;
	private static gHorizon: number;
	private static height: number;
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

		await UnderlayDrawEngineBus.initialize();
		UnderlayDrawEngineBus.setCallbackBitmap((imageBitmap: ImageBitmap) => {
			UnderlayDrawEngine.cache = imageBitmap;
		});
	}

	public static start(): void {
		// Is the sky in the view port?
		if (
			UnderlayDrawEngine.mapActive.gridConfigActive.outside &&
			UnderlayDrawEngine.cache &&
			UnderlayDrawEngine.mapActive.gridConfigActive.gHorizon > UnderlayDrawEngine.mapActive.camera.viewportGy
		) {
			let offsetMaxX: number = UnderlayDrawEngine.cache.width - UnderlayDrawEngine.width,
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
						UnderlayDrawEngine.mapActive.gridConfigActive.gHorizon,
						UnderlayDrawEngine.mapActive.camera.viewportGy,
						UnderlayDrawEngine.mapActive.camera.viewportGy + UnderlayDrawEngine.mapActive.camera.viewportGh,
						UnderlayDrawEngine.mapActive.camera.windowPh / UnderlayDrawEngine.mapActive.camera.zoom,
						0,
					) | 0;

			offsetX = Math.max(0, Math.min(offsetMaxX, offsetX));

			// Done
			UnderlayDrawEngine.ctxUnderlay.drawImage(
				UnderlayDrawEngine.cache,
				offsetX,
				0,
				UnderlayDrawEngine.mapActive.camera.windowPw,
				UnderlayDrawEngine.mapActive.camera.windowPh,
				0,
				-offsetY,
				UnderlayDrawEngine.mapActive.camera.windowPw,
				UnderlayDrawEngine.mapActive.camera.windowPh,
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
		UnderlayDrawEngineBus.outputTimeForced(editing);
	}

	public static setMapActive(mapActive: MapActive) {
		UnderlayDrawEngine.mapActive = mapActive;
		UnderlayDrawEngineBus.outputTime(mapActive.hourOfDayEff);
	}

	public static setDimensions(height: number, width: number) {
		UnderlayDrawEngine.height = height;
		UnderlayDrawEngine.width = width;
		UnderlayDrawEngineBus.outputResolution(height, width);
	}
}
