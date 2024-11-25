import { Camera } from '../models/camera.model';
import { GridConfig } from '../models/grid.model';
import { MapActive } from '../models/map.model';
import { MapDrawEngineBus } from '../draw/buses/map.draw.engine.bus';
import { UtilEngine } from './util.engine';

/**
 * @author tknight-dev
 */

export class CameraEngine {
	private static callback: (camera: Camera) => void;
	private static initialized: boolean;
	private static mapActive: MapActive;
	private static loopPositionGx: number;
	private static loopPositionGy: number;
	private static loopZoom: number;

	public static async initialize(): Promise<void> {
		if (CameraEngine.initialized) {
			return;
		}
		CameraEngine.initialized = true;
	}

	public static dimensions(ctxDimensionHeight: number, ctxDimensionWidth: number): void {
		let camera: Camera = CameraEngine.mapActive.camera,
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
		CameraEngine.update(true);
	}

	public static moveG(gx: number, gy: number): void {
		CameraEngine.loopPositionGx = gx;
		CameraEngine.loopPositionGy = gy;
	}

	/**
	 * Solve smooth moving... and remove this function?
	 */
	public static moveIncremental(gx: number, gy: number): void {
		CameraEngine.loopPositionGx += gx * 0.5;
		CameraEngine.loopPositionGy += gy * 0.5;
	}

	public static reset(): void {
		let gridConfig: GridConfig = CameraEngine.mapActive.gridConfigActive;

		CameraEngine.loopPositionGx = gridConfig.startGxCamera;
		CameraEngine.loopPositionGy = gridConfig.startGyCamera;
		CameraEngine.loopZoom = gridConfig.zoomDefault;
		CameraEngine.update();
	}

	public static update(forced?: boolean): void {
		let mapActive = CameraEngine.mapActive,
			camera: Camera = mapActive.camera,
			gridConfig: GridConfig = mapActive.gridConfigActive,
			gHeight: number = gridConfig.gHeight,
			gWidth: number = gridConfig.gWidth,
			viewportGhEff: number = camera.viewportGhEff,
			viewportGwEff: number = camera.viewportGwEff,
			zoomUpdated: boolean = false;

		// Zoom
		if (forced || camera.zoom !== CameraEngine.loopZoom) {
			camera.zoom = Math.round(CameraEngine.loopZoom * 1000) / 1000;

			// viewport
			viewportGhEff = Math.round(camera.viewportGh * camera.zoom * 1000) / 1000;
			viewportGwEff = Math.round(camera.viewportGw * camera.zoom * 1000) / 1000;

			if (viewportGhEff < 2 || viewportGwEff < 2) {
				// Max zoom in (min 3 blocks)
				return;
			} else if (viewportGhEff > gHeight + 1 || viewportGwEff > gWidth + 1) {
				// Max zoom out
				return;
			}

			camera.viewportGhEff = viewportGhEff;
			camera.viewportGwEff = viewportGwEff;

			// gInP
			camera.gInPh = Math.round((camera.windowPh / viewportGhEff) * 1000) / 1000;
			camera.gInPw = Math.round((camera.windowPw / viewportGwEff) * 1000) / 1000;

			// Done
			zoomUpdated = true;
			CameraEngine.loopZoom = camera.zoom;
		}

		// Gx Gy
		if (zoomUpdated || camera.gx !== CameraEngine.loopPositionGx || camera.gy !== CameraEngine.loopPositionGy) {
			camera.gx = Math.max(0, Math.min(gWidth, CameraEngine.loopPositionGx));
			camera.gy = Math.max(0, Math.min(gHeight, CameraEngine.loopPositionGy));

			camera.viewportGx = Math.max(0, Math.min(gWidth - viewportGwEff, Math.round((camera.gx - viewportGwEff / 2) * 1000) / 1000));
			camera.viewportGy = Math.max(0, Math.min(gHeight - viewportGhEff, Math.round((camera.gy - viewportGhEff / 2) * 1000) / 1000));

			// Done
			setTimeout(() => {
				MapDrawEngineBus.outputCamera(camera);
				CameraEngine.callback(camera); // Goes to UI thread
			});
			CameraEngine.loopPositionGx = camera.gx;
			CameraEngine.loopPositionGy = camera.gy;
		}
	}

	/**
	 * Solve smooth zooming
	 */
	public static zoom(zoomIn: boolean): void {
		let camera: Camera = CameraEngine.mapActive.camera,
			gridConfig: GridConfig = CameraEngine.mapActive.gridConfigActive,
			viewportGhEff: number,
			viewportGwEff: number,
			zoom: number = Math.round((camera.zoom + (zoomIn ? -0.05 : 0.05)) * 1000) / 1000;

		viewportGhEff = camera.viewportGh * zoom;
		viewportGwEff = camera.viewportGw * zoom;

		if (viewportGhEff < 3 || viewportGwEff < 3) {
			// Max zoom in (min 3 blocks)
			return;
		} else if (viewportGhEff > gridConfig.gHeight + 1 || viewportGwEff > gridConfig.gWidth + 1) {
			// Max zoom out
			return;
		}

		CameraEngine.loopZoom = zoom;
	}

	public static setMapActive(mapActive: MapActive) {
		CameraEngine.mapActive = mapActive;
	}

	public static setCallback(callback: (camera: Camera) => void): void {
		CameraEngine.callback = callback;
	}
}
