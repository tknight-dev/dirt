import { UnderlayDrawBusInputCmd } from './underlay.draw.model.bus';

/**
 * @author tknight-dev
 */

export class UnderlayDrawEngineBus {
	private static callbackBitmap: (image: ImageBitmap) => void;
	private static initialized: boolean;
	private static worker: Worker;

	public static async initialize(): Promise<void> {
		if (UnderlayDrawEngineBus.initialized) {
			console.error('UnderlayDrawEngineBus > initialize: already initialized');
			return;
		}
		UnderlayDrawEngineBus.initialized = true;
		UnderlayDrawEngineBus.worker = new Worker(new URL('../workers/underlay.draw.worker.engine', import.meta.url), {
			name: 'UnderlayDrawWorkerEngine',
		});
		UnderlayDrawEngineBus.input();

		UnderlayDrawEngineBus.worker.postMessage({
			cmd: UnderlayDrawBusInputCmd.INITIALIZE,
			data: {},
		});
	}

	private static input(): void {
		UnderlayDrawEngineBus.worker.onmessage = (event: MessageEvent) => {
			UnderlayDrawEngineBus.callbackBitmap(event.data);
		};
	}

	public static outputHorizon(gHorizon: number): void {
		UnderlayDrawEngineBus.worker.postMessage({
			cmd: UnderlayDrawBusInputCmd.SET_HORIZON,
			data: {
				gHorizon: gHorizon,
			},
		});
	}

	/**
	 * Size of map container
	 */
	public static outputResolution(height: number, width: number): void {
		if (!UnderlayDrawEngineBus.initialized) {
			console.error('UnderlayDrawEngineBus > outputResolution: not initialized');
			return;
		}
		UnderlayDrawEngineBus.worker.postMessage({
			cmd: UnderlayDrawBusInputCmd.SET_RESOLUTION,
			data: {
				height: height,
				width: width,
			},
		});
	}

	public static outputTime(hourPreciseOfDayEff: number): void {
		UnderlayDrawEngineBus.worker.postMessage({
			cmd: UnderlayDrawBusInputCmd.SET_TIME,
			data: {
				hourPreciseOfDayEff: hourPreciseOfDayEff,
			},
		});
	}

	public static outputTimeForced(forced: boolean): void {
		UnderlayDrawEngineBus.worker.postMessage({
			cmd: UnderlayDrawBusInputCmd.SET_TIME_FORCED,
			data: {
				forced: forced,
			},
		});
	}

	public static setCallbackBitmap(callbackBitmap: (image: ImageBitmap) => void): void {
		UnderlayDrawEngineBus.callbackBitmap = callbackBitmap;
	}
}
