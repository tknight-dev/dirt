import { Camera } from './models/camera.model';
import { Grid } from './models/grid.model';
import { MapActive } from './models/map.model';
import { UtilEngine } from './util.engine';

/**
 * @author tknight-dev
 */

export class CameraEngine {
	private static initialized: boolean;
	private static mapActive: MapActive;

	public static async initialize(): Promise<void> {
		if (CameraEngine.initialized) {
			return;
		}
		CameraEngine.initialized = true;
	}

	public static moveG(gx: number, gy: number): void {
		let mapActive = CameraEngine.mapActive;

		mapActive.camera.gx = gx;
		mapActive.camera.gy = gy;

		CameraEngine.updatePosition();
	}

	/**
	 * Solve smooth moving... and remove this function?
	 */
	public static moveIncremental(gx: number, gy: number): void {
		let mapActive = CameraEngine.mapActive;

		mapActive.camera.gx += gx * 0.5;
		mapActive.camera.gy += gy * 0.5;

		CameraEngine.updatePosition();
	}

	public static reset(): void {
		let mapActive = CameraEngine.mapActive,
			camera: Camera = mapActive.camera;

		camera.gx = mapActive.gridActive.startGxCamera;
		camera.gy = mapActive.gridActive.startGyCamera;
		camera.zoom = mapActive.gridActive.zoomDefault;

		CameraEngine.zoom(null);
	}

	public static updateDimensions(ctxDimensionHeight: number, ctxDimensionWidth: number): void {
		let mapActive = CameraEngine.mapActive,
			camera: Camera = mapActive.camera,
			renderOverflowP: number = UtilEngine.renderOverflowP;

		camera.viewPortPh = ctxDimensionHeight - 2 * renderOverflowP;
		camera.viewPortPw = ctxDimensionWidth - 2 * renderOverflowP;
		camera.viewPortPx = renderOverflowP;
		camera.viewPortPx2 = renderOverflowP + camera.viewPortPw;
		camera.viewPortPy = renderOverflowP;
		camera.viewPortPy2 = renderOverflowP + camera.viewPortPh;
		camera.windowPh = ctxDimensionHeight;
		camera.windowPw = ctxDimensionWidth;
		camera.windowPx = 0;
		camera.windowPy = 0;

		CameraEngine.zoom(null);
	}

	public static updatePosition(): void {
		let mapActive = CameraEngine.mapActive,
			camera: Camera = mapActive.camera,
			grid: Grid = mapActive.gridActive;

		camera.gx = Math.max(0, Math.min(grid.gWidth, camera.gx));
		camera.gy = Math.max(0, Math.min(grid.gHeight, camera.gy));

		camera.viewPortGx = Math.max(0, Math.min(grid.gWidth - camera.viewPortGwEff, Math.round((camera.gx - camera.viewPortGwEff / 2) * 1000) / 1000));
		camera.viewPortGy = Math.max(0, Math.min(grid.gHeight - camera.viewPortGhEff, Math.round((camera.gy - camera.viewPortGhEff / 2) * 1000) / 1000));

		// console.log('camera.gx', camera.gx);
		// console.log('camera.viewPortGx', camera.viewPortGx);
	}

	/**
	 * Solve smooth zooming
	 */
	public static zoom(zoomIn: boolean | null): void {
		let mapActive = CameraEngine.mapActive,
			camera: Camera = mapActive.camera,
			grid: Grid = mapActive.gridActive,
			viewPortGhEff: number,
			viewPortGwEff: number,
			zoom: number = camera.zoom;

		// Zoom step
		if (zoomIn !== null) {
			zoom = Math.round((zoom + (zoomIn ? -0.05 : 0.05)) * 1000) / 1000;
		}

		// ViewPort
		viewPortGhEff = Math.round(camera.viewPortGh * zoom * 1000) / 1000;
		viewPortGwEff = Math.round(camera.viewPortGw * zoom * 1000) / 1000;

		if (viewPortGhEff < 2 || viewPortGwEff < 2) {
			// Max zoom in (min 3 blocks)
			return;
		} else if (viewPortGhEff > grid.gHeight + 1 || viewPortGwEff > grid.gWidth + 1) {
			// Max zoom out
			return;
		}

		camera.viewPortGhEff = viewPortGhEff;
		camera.viewPortGwEff = viewPortGwEff;
		camera.zoom = zoom;

		// gInP
		camera.gInPh = Math.round((camera.windowPh / viewPortGhEff) * 1000) / 1000;
		camera.gInPw = Math.round((camera.windowPw / viewPortGwEff) * 1000) / 1000;

		CameraEngine.updatePosition();
	}

	public static setMapActive(mapActive: MapActive) {
		CameraEngine.mapActive = mapActive;
	}
}
