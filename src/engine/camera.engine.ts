import { Camera } from './models/camera.model';
import { Grid } from './models/grid.model';
import { MapActive } from './models/map.model';
import { UtilEngine } from './util.engine';

/**
 * @author tknight-dev
 */

export class CameraEngine {
	private static initialized: boolean;
	private static tmpStepMove: number = 0.5;
	private static tmpStepZoom: number = 0.1;

	public static async initialize(): Promise<void> {
		if (CameraEngine.initialized) {
			return;
		}
		CameraEngine.initialized = true;
	}

	public static moveDown(mapActive: MapActive, ctxDimensionHeight: number, ctxDimensionWidth: number): void {
		mapActive.camera.gy += CameraEngine.tmpStepMove;

		CameraEngine.updatePosition(mapActive, ctxDimensionHeight, ctxDimensionWidth);
	}

	public static moveLeft(mapActive: MapActive, ctxDimensionHeight: number, ctxDimensionWidth: number): void {
		mapActive.camera.gx -= CameraEngine.tmpStepMove;

		CameraEngine.updatePosition(mapActive, ctxDimensionHeight, ctxDimensionWidth);
	}

	public static moveRight(mapActive: MapActive, ctxDimensionHeight: number, ctxDimensionWidth: number): void {
		mapActive.camera.gx += CameraEngine.tmpStepMove;

		CameraEngine.updatePosition(mapActive, ctxDimensionHeight, ctxDimensionWidth);
	}

	public static moveUp(mapActive: MapActive, ctxDimensionHeight: number, ctxDimensionWidth: number): void {
		mapActive.camera.gy -= CameraEngine.tmpStepMove;

		CameraEngine.updatePosition(mapActive, ctxDimensionHeight, ctxDimensionWidth);
	}

	public static reset(mapActive: MapActive, ctxDimensionHeight: number, ctxDimensionWidth: number): void {
		let camera: Camera = mapActive.camera;

		camera.gx = mapActive.gridActive.startGxCamera;
		camera.gy = mapActive.gridActive.startGyCamera;
		camera.zoom = mapActive.gridActive.zoomDefault;

		CameraEngine.updateDimensions(mapActive, ctxDimensionHeight, ctxDimensionWidth);
		CameraEngine.updatePosition(mapActive, ctxDimensionHeight, ctxDimensionWidth);
	}

	public static updateDimensions(mapActive: MapActive, ctxDimensionHeight: number, ctxDimensionWidth: number): void {
		let camera: Camera = mapActive.camera,
			renderOverflowP: number = UtilEngine.renderOverflowP;

		console.log('grid.gHeight', mapActive.gridActive.gHeight);
		console.log('grid.gWidth', mapActive.gridActive.gWidth);

		camera.gInPh = Math.round((ctxDimensionHeight / camera.viewPortGh) * 1000) / 1000;
		camera.gInPw = Math.round((ctxDimensionWidth / camera.viewPortGw) * 1000) / 1000;

		camera.viewPortPh = ctxDimensionHeight - 2 * renderOverflowP;
		camera.viewPortPw = ctxDimensionWidth - 2 * renderOverflowP;
		camera.viewPortPx = renderOverflowP;
		camera.viewPortPy = renderOverflowP;
	}

	public static updatePosition(mapActive: MapActive, ctxDimensionHeight: number, ctxDimensionWidth: number): void {
		let camera: Camera = mapActive.camera,
			grid: Grid = mapActive.gridActive;

		camera.gx = Math.max(0, Math.min(grid.gWidth, camera.gx));
		camera.gy = Math.max(0, Math.min(grid.gHeight, camera.gy));

		camera.viewPortGx = Math.max(
			0,
			Math.min(grid.gWidth - camera.viewPortGw, Math.round((camera.gx - (camera.viewPortGw / 2) * camera.zoom) * 1000) / 1000),
		);
		camera.viewPortGy = Math.max(
			0,
			Math.min(grid.gHeight - camera.viewPortGh, Math.round((camera.gy - (camera.viewPortGh / 2) * camera.zoom) * 1000) / 1000),
		);

		// console.log('camera.gx', camera.gx);
		// console.log('camera.viewPortGx', camera.viewPortGx);
	}

	public static zoomIn(mapActive: MapActive, ctxDimensionHeight: number, ctxDimensionWidth: number): void {
		mapActive.camera.zoom += CameraEngine.tmpStepZoom;

		console.log('zoomIn');

		CameraEngine.updatePosition(mapActive, ctxDimensionHeight, ctxDimensionWidth);
	}

	public static zoomOut(mapActive: MapActive, ctxDimensionHeight: number, ctxDimensionWidth: number): void {
		mapActive.camera.zoom -= CameraEngine.tmpStepZoom;

		console.log('zoomOut');

		CameraEngine.updatePosition(mapActive, ctxDimensionHeight, ctxDimensionWidth);
	}
}
