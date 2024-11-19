import { AssetEngine } from '../../engines/asset.engine';
import { Camera } from '../../models/camera.model';
import { Grid, GridConfig } from '../../models/grid.model';
import { MapDrawEngine } from '../map.draw.engine';
import { MapDrawBusInputCmd, MapDrawBusInputPlayload, MapDrawBusInputPlayloadAsset } from './map.draw.model.bus';

/**
 * @author tknight-dev
 */

export class MapDrawEngineBus {
	private static callbackBitmap: (image: ImageBitmap) => void;
	private static darknessMax: number = 0.7;
	private static initialized: boolean;
	private static mapVisible: boolean;
	private static vanishingEnable: boolean;
	private static vanishingPercentageOfViewport: number;
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
				assetImages: AssetEngine.getAssetManifestMaster().images,
			},
		});
	}

	private static input(): void {
		MapDrawEngineBus.worker.onmessage = (event: MessageEvent) => {
			MapDrawEngineBus.callbackBitmap(event.data);
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
				gInPh: 4,
				gInPw: 4,
				gx: camera.gx,
				gy: camera.gy,
				viewportGh: camera.viewportGh,
				windowPh: camera.windowPh,
				windowPw: camera.windowPw,
				zoom: camera.zoom,
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

	public static outputGrids(grids: { [key: string]: Grid }, gridConfigs: { [key: string]: GridConfig }): void {
		let gridsOptimized: { [key: string]: string } = {};

		for (let i in grids) {
			gridsOptimized[i] = grids[i].toJSON();
		}

		MapDrawEngineBus.worker.postMessage({
			cmd: MapDrawBusInputCmd.SET_GRIDS,
			data: {
				grids: gridsOptimized,
				gridConfigs: gridConfigs,
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

	private static outputSettings(): void {
		MapDrawEngineBus.worker.postMessage({
			cmd: MapDrawBusInputCmd.SET_SETTINGS,
			data: {
				darknessMax: MapDrawEngineBus.darknessMax,
				mapVisible: MapDrawEngineBus.mapVisible,
				vanishingEnable: MapDrawEngineBus.vanishingEnable,
				vanishingPercentageOfViewport: MapDrawEngineBus.vanishingPercentageOfViewport,
			},
		});
	}

	public static outputTimeForced(forced: boolean): void {
		MapDrawEngineBus.worker.postMessage({
			cmd: MapDrawBusInputCmd.SET_TIME_FORCED,
			data: {
				forced: forced,
			},
		});
	}

	public static setCallbackBitmap(callbackBitmap: (image: ImageBitmap) => void): void {
		MapDrawEngineBus.callbackBitmap = callbackBitmap;
	}

	public static setDarknessMax(darknessMax: number): void {
		MapDrawEngineBus.darknessMax = darknessMax;
		MapDrawEngineBus.outputSettings();
	}

	public static setVanishingEnable(vanishingEnable: boolean) {
		MapDrawEngineBus.vanishingEnable = vanishingEnable;
		MapDrawEngineBus.outputSettings();
	}

	public static setVanishingPercentageOfViewport(vanishingPercentageOfViewport: number) {
		MapDrawEngineBus.vanishingPercentageOfViewport = vanishingPercentageOfViewport;
		MapDrawEngineBus.outputSettings();
	}

	public static setMapVisible(mapVisible: boolean) {
		MapDrawEngineBus.mapVisible = mapVisible;
		MapDrawEngineBus.outputSettings();
	}
}
