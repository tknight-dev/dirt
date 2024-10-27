import { Camera } from '../models/camera.model';
import { Grid } from '../models/grid.model';
import { MapActive } from '../models/map.model';
import { UtilEngine } from '../util.engine';

/**
 * @author tknight-dev
 */

export class CameraDrawEngine {
	private static ctxOverlay: OffscreenCanvasRenderingContext2D;
	private static initialized: boolean;
	private static mapActive: MapActive;
	private static mapActiveCamera: Camera;
	// private static count: number = 0;
	// private static sum: number = 0;

	public static async initialize(
		ctx: OffscreenCanvasRenderingContext2D,
		ctxBackground: OffscreenCanvasRenderingContext2D,
		ctxForeground: OffscreenCanvasRenderingContext2D,
		ctxOverlay: OffscreenCanvasRenderingContext2D,
	): Promise<void> {
		if (CameraDrawEngine.initialized) {
			console.error('CameraDrawEngine > initialize: already initialized');
			return;
		}
		CameraDrawEngine.initialized = true;
		CameraDrawEngine.ctxOverlay = ctxOverlay;
	}

	public static start(): void {
		let start: number = performance.now();

		// TODO, optimize

		let px: number;
		let py: number;
		if (CameraDrawEngine.mapActiveCamera.viewPortGx === 0) {
			px = CameraDrawEngine.mapActiveCamera.gx * CameraDrawEngine.mapActiveCamera.gInPw;
		} else {
			px = CameraDrawEngine.mapActiveCamera.viewPortPx + CameraDrawEngine.mapActiveCamera.viewPortPw / 2;
		}
		if (CameraDrawEngine.mapActiveCamera.viewPortGy === 0) {
			py = CameraDrawEngine.mapActiveCamera.gy * CameraDrawEngine.mapActiveCamera.gInPh;
		} else {
			py = CameraDrawEngine.mapActiveCamera.viewPortPy + CameraDrawEngine.mapActiveCamera.viewPortPh / 2;
		}

		CameraDrawEngine.ctxOverlay.beginPath();
		CameraDrawEngine.ctxOverlay.lineWidth = 2;
		CameraDrawEngine.ctxOverlay.fillStyle = 'rgba(255,0,0,.25)';
		CameraDrawEngine.ctxOverlay.strokeStyle = 'red';
		CameraDrawEngine.ctxOverlay.arc(px, py, 15, 0, 2 * Math.PI);
		CameraDrawEngine.ctxOverlay.fill();
		CameraDrawEngine.ctxOverlay.stroke();
	}

	public static setMapActive(mapActive: MapActive) {
		CameraDrawEngine.mapActive = mapActive;
		CameraDrawEngine.mapActiveCamera = mapActive.camera;
	}
}
