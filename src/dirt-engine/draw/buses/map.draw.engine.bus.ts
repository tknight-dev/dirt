import { Camera } from '../../models/camera.model';
import { Grid } from '../../models/grid.model';
import {
	MapDrawBusInputCmd,
	MapDrawBusInputPlayloadAsset,
	MapDrawBusOutputCmd,
	MapDrawBusOutputPlayload,
	MapDrawBusOutputPlayloadBitmap,
} from './map.draw.model.bus';

/**
 * @author tknight-dev
 */

export class MapDrawEngineBus {
	private static callbackBitmap: (image: ImageBitmap) => void;
	private static foregroundViewerEnable: boolean = true;
	private static foregroundViewerPercentageOfViewport: number;
	private static initialized: boolean;
	private static worker: Worker;

	public static async initialize(): Promise<void> {
		if (MapDrawEngineBus.initialized) {
			console.error('MapDrawEngineBus > initialize: already initialized');
			return;
		}
		MapDrawEngineBus.initialized = true;
		MapDrawEngineBus.worker = new Worker(new URL('../workers/map.draw.worker.engine', import.meta.url));
		MapDrawEngineBus.input();

		MapDrawEngineBus.worker.postMessage({
			cmd: MapDrawBusInputCmd.INITIALIZE,
			data: {
				foregroundViewerEnable: MapDrawEngineBus.foregroundViewerEnable,
				foregroundViewerPercentageOfViewport: MapDrawEngineBus.foregroundViewerPercentageOfViewport,
			},
		});
	}

	private static input(): void {
		let mapDrawBusOutputPlayload: MapDrawBusOutputPlayload,
			mapDrawBusOutputPlayloadBitmap: MapDrawBusOutputPlayloadBitmap;

		MapDrawEngineBus.worker.onmessage = (event: MessageEvent) => {
			mapDrawBusOutputPlayload = event.data.payload;

			switch (mapDrawBusOutputPlayload.cmd) {
				case MapDrawBusOutputCmd.SET_BITMAP:
					mapDrawBusOutputPlayloadBitmap = <MapDrawBusOutputPlayloadBitmap>mapDrawBusOutputPlayload.data;
					MapDrawEngineBus.callbackBitmap(mapDrawBusOutputPlayloadBitmap.image);
					break;
			}
		};
	}

	public static outputAssets(assets: { [key: string]: MapDrawBusInputPlayloadAsset }): void {
		MapDrawEngineBus.worker.postMessage({
			cmd: MapDrawBusInputCmd.SET_ASSETS,
			data: {
				assets: assets,
			},
		});
	}

	public static outputCamera(camera: Camera): void {
		MapDrawEngineBus.worker.postMessage({
			cmd: MapDrawBusInputCmd.SET_CAMERA,
			data: {
				gInPh: camera.gInPh,
				gInPw: camera.gInPw,
				gx: camera.gx,
				gy: camera.gy,
			},
		});
	}

	public static outputGridActive(id: string): void {
		MapDrawEngineBus.worker.postMessage({
			cmd: MapDrawBusInputCmd.SET_GRID_ACTIVE,
			data: {
				id: id,
			},
		});
	}

	public static outputGrids(grids: { [key: string]: Grid }): void {
		MapDrawEngineBus.worker.postMessage({
			cmd: MapDrawBusInputCmd.SET_GRIDS,
			data: {
				grids: grids,
			},
		});
	}

	private static outputForegroundViewer(): void {
		MapDrawEngineBus.worker.postMessage({
			cmd: MapDrawBusInputCmd.SET_FOREGROUND_VIEWER,
			data: {
				foregroundViewerEnable: MapDrawEngineBus.foregroundViewerEnable,
				foregroundViewerPercentageOfViewport: MapDrawEngineBus.foregroundViewerPercentageOfViewport,
			},
		});
	}

	public static outputMinuteOfDayEff(hourOfDayEff: number, minuteOfDayEff: number): void {
		MapDrawEngineBus.worker.postMessage({
			cmd: MapDrawBusInputCmd.SET_HOUR_PRECISE_OF_DAY_EFF,
			data: {
				hourPreciseOfDayEff: hourOfDayEff + Math.round((minuteOfDayEff / 60) * 100) / 100,
			},
		});
	}

	/**
	 * Size of map container
	 */
	public static outputResolution(height: number, width: number): void {
		MapDrawEngineBus.worker.postMessage({
			cmd: MapDrawBusInputCmd.SET_RESOLUTION,
			data: {
				height: height,
				width: width,
			},
		});
	}

	public static setCallbackBitmap(callbackBitmap: (image: ImageBitmap) => void): void {
		MapDrawEngineBus.callbackBitmap = callbackBitmap;
	}

	public static setForegroundViewer(enable: boolean) {
		MapDrawEngineBus.foregroundViewerEnable = enable;
		MapDrawEngineBus.outputForegroundViewer();
	}

	public static setForegroundViewerPercentageOfViewport(foregroundViewerPercentageOfViewport: number) {
		MapDrawEngineBus.foregroundViewerPercentageOfViewport = foregroundViewerPercentageOfViewport;
		MapDrawEngineBus.outputForegroundViewer();
	}
}
