import { Camera } from '../models/camera.model';
import { Grid } from '../models/grid.model';
import { MapActive } from '../models/map.model';
import { UtilEngine } from '../util.engine';

/**
 * @author tknight-dev
 */

export class CameraDrawEngine {
	public static ctxDimensionHeight: number;
	public static ctxDimensionWidth: number;
	public static ctxOverlay: OffscreenCanvasRenderingContext2D;
	public static mapActive: MapActive;
	// private static count: number = 0;
	// private static sum: number = 0;
	private static tmp: boolean = false;

	public static start(): void {
		let start: number = performance.now();

		// bottom right of map doesn't work

		let px: number;
		let py: number;
		if (CameraDrawEngine.mapActive.camera.viewPortGx === 0) {
			px = CameraDrawEngine.mapActive.camera.gx * CameraDrawEngine.mapActive.camera.gInPw;
		} else {
			px = CameraDrawEngine.mapActive.camera.viewPortPx + CameraDrawEngine.mapActive.camera.viewPortPw / 2;
		}
		if (CameraDrawEngine.mapActive.camera.viewPortGy === 0) {
			py = CameraDrawEngine.mapActive.camera.gy * CameraDrawEngine.mapActive.camera.gInPh;
		} else {
			py = CameraDrawEngine.mapActive.camera.viewPortPy + CameraDrawEngine.mapActive.camera.viewPortPh / 2;
		}

		CameraDrawEngine.ctxOverlay.beginPath();
		CameraDrawEngine.ctxOverlay.lineWidth = 2;
		CameraDrawEngine.ctxOverlay.fillStyle = 'rgba(255,0,0,.25)';
		CameraDrawEngine.ctxOverlay.strokeStyle = 'red';
		CameraDrawEngine.ctxOverlay.arc(px, py, 15, 0, 2 * Math.PI);
		CameraDrawEngine.ctxOverlay.fill();
		CameraDrawEngine.ctxOverlay.stroke();
	}
}
