import { MapActive } from '../models/map.model';
import { UnderlayDrawEngineBus } from './buses/underlay.draw.engine.bus';

/**
 * @author tknight-dev
 */

export class UnderlayDrawEngine {
	private static cache: ImageBitmap | undefined;
	private static cleared: boolean;
	private static ctxUnderlay: OffscreenCanvasRenderingContext2D;
	private static gHorizon: number;
	private static initialized: boolean;
	private static mapActive: MapActive;

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
		if (UnderlayDrawEngine.gHorizon !== UnderlayDrawEngine.mapActive.gridConfigActive.gHorizon) {
			UnderlayDrawEngine.gHorizon = UnderlayDrawEngine.mapActive.gridConfigActive.gHorizon;
			UnderlayDrawEngineBus.outputHorizon(UnderlayDrawEngine.gHorizon);
			UnderlayDrawEngine.cache = undefined;
		}

		if (UnderlayDrawEngine.mapActive.gridConfigActive.outside && UnderlayDrawEngine.cache) {
			UnderlayDrawEngine.cleared = false;
			UnderlayDrawEngine.ctxUnderlay.drawImage(UnderlayDrawEngine.cache, 0, 0);
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
	}

	public static setDimensions(height: number, width: number) {
		UnderlayDrawEngineBus.outputResolution(height, width);
	}
}
