import { Camera } from '../models/camera.model';
import { GridConfig } from '../models/grid.model';
import { MapActive } from '../models/map.model';
import { KernelEngine } from './kernel.engine';
import { UtilEngine } from './util.engine';

/**
 * @author tknight-dev
 */

export class CameraEngine {
	private static callback: (camera: Camera) => void;
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

		mapActive.camera.gx += gx * 0.75;
		mapActive.camera.gy += gy * 0.75;

		CameraEngine.updatePosition();
	}

	public static reset(): void {
		let mapActive = CameraEngine.mapActive,
			camera: Camera = mapActive.camera;

		camera.gx = mapActive.gridConfigActive.startGxCamera;
		camera.gy = mapActive.gridConfigActive.startGyCamera;
		camera.zoom = mapActive.gridConfigActive.zoomDefault;

		CameraEngine.zoom(null);
	}

	public static updateDimensions(ctxDimensionHeight: number, ctxDimensionWidth: number): void {
		let mapActive = CameraEngine.mapActive,
			camera: Camera = mapActive.camera,
			renderOverflowP: number = UtilEngine.renderOverflowP;

		camera.viewportPh = ctxDimensionHeight - 2 * renderOverflowP;
		camera.viewportPw = ctxDimensionWidth - 2 * renderOverflowP;
		camera.viewportPx = renderOverflowP;
		camera.viewportPx2 = renderOverflowP + camera.viewportPw;
		camera.viewportPy = renderOverflowP;
		camera.viewportPy2 = renderOverflowP + camera.viewportPh;
		camera.windowPh = ctxDimensionHeight;
		camera.windowPw = ctxDimensionWidth;
		camera.windowPx = 0;
		camera.windowPy = 0;

		CameraEngine.zoom(null);
	}

	public static updatePosition(): void {
		let mapActive = CameraEngine.mapActive,
			camera: Camera = mapActive.camera,
			gridConfig: GridConfig = mapActive.gridConfigActive;

		camera.gx = Math.max(0, Math.min(gridConfig.gWidth, camera.gx));
		camera.gy = Math.max(0, Math.min(gridConfig.gHeight, camera.gy));

		camera.viewportGx = Math.max(
			0,
			Math.min(
				gridConfig.gWidth - camera.viewportGwEff,
				Math.round((camera.gx - camera.viewportGwEff / 2) * 1000) / 1000,
			),
		);
		camera.viewportGy = Math.max(
			0,
			Math.min(
				gridConfig.gHeight - camera.viewportGhEff,
				Math.round((camera.gy - camera.viewportGhEff / 2) * 1000) / 1000,
			),
		);

		// console.log('camera.gx', camera.gx);
		// console.log('camera.viewportGx', camera.viewportGx);
		setTimeout(() => {
			KernelEngine.updateZoom();
		});
		setTimeout(() => {
			CameraEngine.callback(camera);
		});
	}

	/**
	 * Solve smooth zooming
	 */
	public static zoom(zoomIn: boolean | null): void {
		let mapActive = CameraEngine.mapActive,
			camera: Camera = mapActive.camera,
			gridConfig: GridConfig = mapActive.gridConfigActive,
			viewportGhEff: number,
			viewportGwEff: number,
			zoom: number = camera.zoom;

		// Zoom step
		if (zoomIn !== null) {
			zoom = Math.round((zoom + (zoomIn ? -0.05 : 0.05)) * 1000) / 1000;
		}

		// viewport
		viewportGhEff = Math.round(camera.viewportGh * zoom * 1000) / 1000;
		viewportGwEff = Math.round(camera.viewportGw * zoom * 1000) / 1000;

		if (viewportGhEff < 2 || viewportGwEff < 2) {
			// Max zoom in (min 3 blocks)
			return;
		} else if (viewportGhEff > gridConfig.gHeight + 1 || viewportGwEff > gridConfig.gWidth + 1) {
			// Max zoom out
			return;
		}

		camera.viewportGhEff = viewportGhEff;
		camera.viewportGwEff = viewportGwEff;
		camera.zoom = zoom;

		// gInP
		camera.gInPh = Math.round((camera.windowPh / viewportGhEff) * 1000) / 1000;
		camera.gInPw = Math.round((camera.windowPw / viewportGwEff) * 1000) / 1000;

		CameraEngine.updatePosition();
	}

	public static setMapActive(mapActive: MapActive) {
		CameraEngine.mapActive = mapActive;
	}

	public static setCallback(callback: (camera: Camera) => void): void {
		CameraEngine.callback = callback;
	}
}
