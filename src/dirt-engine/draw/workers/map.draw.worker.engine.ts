import { Camera } from '../../models/camera.model';
import { LightingEngine } from '../../engines/lighting.engine';
import { Grid } from '../../models/grid.model';
import {
	MapDrawBusInputCmd,
	MapDrawBusInputPlayload,
	MapDrawBusInputPlayloadAssets,
	MapDrawBusInputPlayloadCamera,
	MapDrawBusInputPlayloadForegroundViewer,
	MapDrawBusInputPlayloadGridActive,
	MapDrawBusInputPlayloadGrids,
	MapDrawBusInputPlayloadHourPreciseOfDayEff,
	MapDrawBusInputPlayloadInitial,
	MapDrawBusInputPlayloadResolution,
	MapDrawBusOutputCmd,
	MapDrawBusOutputPlayload,
	MapDrawBusOutputPlayloadBitmap,
} from '../buses/map.draw.model.bus';

/**
 * @author tknight-dev
 */

self.onmessage = (event: MessageEvent) => {
	let payload: MapDrawBusInputPlayload = event.data;

	switch (payload.cmd) {
		case MapDrawBusInputCmd.INITIALIZE:
			MapDrawWorkerEngine.initialize(self, <MapDrawBusInputPlayloadInitial>payload.data);
			break;
		case MapDrawBusInputCmd.SET_ASSETS:
			MapDrawWorkerEngine.inputSetAssets(<MapDrawBusInputPlayloadAssets>payload.data);
			break;
		case MapDrawBusInputCmd.SET_CAMERA:
			MapDrawWorkerEngine.inputSetCamera(<MapDrawBusInputPlayloadCamera>payload.data);
			break;
		case MapDrawBusInputCmd.SET_FOREGROUND_VIEWER:
			MapDrawWorkerEngine.inputSetForegroundViewer(<MapDrawBusInputPlayloadForegroundViewer>payload.data);
			break;
		case MapDrawBusInputCmd.SET_GRID_ACTIVE:
			MapDrawWorkerEngine.inputSetGridActive(<MapDrawBusInputPlayloadGridActive>payload.data);
			break;
		case MapDrawBusInputCmd.SET_GRIDS:
			MapDrawWorkerEngine.inputSetGrids(<MapDrawBusInputPlayloadGrids>payload.data);
			break;
		case MapDrawBusInputCmd.SET_HOUR_PRECISE_OF_DAY_EFF:
			MapDrawWorkerEngine.inputSetHourPreciseOfDayEff(<MapDrawBusInputPlayloadHourPreciseOfDayEff>payload.data);
			break;
		case MapDrawBusInputCmd.SET_RESOLUTION:
			MapDrawWorkerEngine.inputSetResolution(<MapDrawBusInputPlayloadResolution>payload.data);
			break;
	}
};

class MapDrawWorkerEngine {
	private static canvas: OffscreenCanvas;
	private static canvasTmp: OffscreenCanvas;
	private static camera: MapDrawBusInputPlayloadCamera;
	private static ctx: OffscreenCanvasRenderingContext2D;
	private static ctxTmp: OffscreenCanvasRenderingContext2D;
	private static foregroundViewerEnable: boolean;
	private static foregroundViewerPercentageOfViewport: number;
	private static gridActiveId: string;
	private static grids: { [key: string]: Grid };
	private static height: number;
	private static initialized: boolean;
	private static ready: { [key: string]: null } = {};
	private static self: Window & typeof globalThis;
	private static width: number;

	public static async initialize(
		self: Window & typeof globalThis,
		data: MapDrawBusInputPlayloadInitial,
	): Promise<void> {
		if (MapDrawWorkerEngine.initialized) {
			console.error('MapDrawWorkerEngine > initialize: already initialized');
			return;
		}
		MapDrawWorkerEngine.initialized = true;
		MapDrawWorkerEngine.self = self;

		await LightingEngine.initialize(true);

		MapDrawWorkerEngine.canvas = new OffscreenCanvas(0, 0);
		MapDrawWorkerEngine.canvasTmp = new OffscreenCanvas(0, 0);
		MapDrawWorkerEngine.ctx = <OffscreenCanvasRenderingContext2D>MapDrawWorkerEngine.canvas.getContext('2d');
		MapDrawWorkerEngine.ctxTmp = <OffscreenCanvasRenderingContext2D>MapDrawWorkerEngine.canvasTmp.getContext('2d');

		MapDrawWorkerEngine.foregroundViewerEnable = data.foregroundViewerEnable;
		MapDrawWorkerEngine.foregroundViewerPercentageOfViewport = data.foregroundViewerPercentageOfViewport;
	}

	public static inputSetAssets(data: MapDrawBusInputPlayloadAssets): void {
		// console.log('MapDrawWorkerEngine > inputSetAssets', data);
		LightingEngine.cacheWorkerImport(data.assets);
	}

	public static inputSetCamera(data: MapDrawBusInputPlayloadCamera): void {
		// console.log('MapDrawWorkerEngine > inputSetCamera', data);
		MapDrawWorkerEngine.camera = data;
	}

	public static inputSetForegroundViewer(data: MapDrawBusInputPlayloadForegroundViewer): void {
		// console.log('MapDrawWorkerEngine > inputSetForegroundViewer', data);
		MapDrawWorkerEngine.foregroundViewerEnable = data.foregroundViewerEnable;
		MapDrawWorkerEngine.foregroundViewerPercentageOfViewport = data.foregroundViewerPercentageOfViewport;
	}

	public static inputSetGridActive(data: MapDrawBusInputPlayloadGridActive): void {
		// console.log('MapDrawWorkerEngine > inputSetGridActive', data);
		MapDrawWorkerEngine.gridActiveId = data.id;
	}

	public static inputSetGrids(data: MapDrawBusInputPlayloadGrids): void {
		// console.log('MapDrawWorkerEngine > inputSetGrids', data);
		MapDrawWorkerEngine.grids = data.grids;
	}

	public static inputSetHourPreciseOfDayEff(data: MapDrawBusInputPlayloadHourPreciseOfDayEff): void {
		// console.log('MapDrawWorkerEngine > inputSetHourPreciseOfDayEff', data);
		LightingEngine.clock(data.hourPreciseOfDayEff);
		MapDrawWorkerEngine._draw();
	}

	public static inputSetResolution(data: MapDrawBusInputPlayloadResolution): void {
		// console.log('MapDrawWorkerEngine > inputSetResolution', data);
		MapDrawWorkerEngine.height = data.height;
		MapDrawWorkerEngine.width = data.width;
	}

	protected static outputBitmap(image: ImageBitmap): void {
		MapDrawWorkerEngine.post({
			cmd: MapDrawBusOutputCmd.SET_BITMAP,
			data: {
				image: image,
			},
		});
	}

	private static post(data: MapDrawBusOutputPlayload): void {
		MapDrawWorkerEngine.self.postMessage({
			payload: data,
		});
	}

	private static _draw(): void {
		try {
			// Config
			MapDrawWorkerEngine.canvas.height = MapDrawWorkerEngine.height;
			MapDrawWorkerEngine.canvas.width = MapDrawWorkerEngine.width;

			// canvasTmp
			// ctxTmp
			// grids can be too large, so use multiple convasTmp to get sections of the overall grid
			// then scale the image down accordingly and draw onto the canvas object with the right offset

			MapDrawWorkerEngine.ctx.fillStyle = 'rgba(0,0,0,.25)';
			MapDrawWorkerEngine.ctx.fillRect(0, 0, MapDrawWorkerEngine.width, MapDrawWorkerEngine.height);

			// Done
			MapDrawWorkerEngine.outputBitmap(MapDrawWorkerEngine.canvas.transferToImageBitmap());
		} catch (e: any) {
			// Maybe a needed asset hasn't loaded in, this should only happen during a couple ms of inits
		}
	}
}
