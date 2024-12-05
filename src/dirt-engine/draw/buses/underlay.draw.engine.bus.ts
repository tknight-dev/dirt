import { UnderlayDrawBusInputCmd } from './underlay.draw.model.bus';

/**
 * @author tknight-dev
 */

export class UnderlayDrawEngineBus {
	private static callbackBitmaps: (image: ImageBitmap[]) => void;
	private static initialized: boolean;
	private static worker: Worker;

	public static async initialize(assetIds: string[], images: ImageBitmap[]): Promise<void> {
		if (UnderlayDrawEngineBus.initialized) {
			console.error('UnderlayDrawEngineBus > initialize: already initialized');
			return;
		}
		UnderlayDrawEngineBus.initialized = true;
		UnderlayDrawEngineBus.worker = new Worker(new URL('../workers/underlay.draw.worker.engine', import.meta.url), {
			name: 'UnderlayDrawWorkerEngine',
		});
		UnderlayDrawEngineBus.input();

		UnderlayDrawEngineBus.worker.postMessage(
			{
				cmd: UnderlayDrawBusInputCmd.INITIALIZE,
				data: {
					assetIds: assetIds,
					images: images,
				},
			},
			images,
		);
	}

	private static input(): void {
		UnderlayDrawEngineBus.worker.onmessage = (event: MessageEvent) => {
			UnderlayDrawEngineBus.callbackBitmaps(event.data);
		};
	}

	public static outputHourPreciseOfDayEff(hourPreciseOfDayEff: number): void {
		UnderlayDrawEngineBus.worker.postMessage({
			cmd: UnderlayDrawBusInputCmd.SET_TIME,
			data: {
				hourPreciseOfDayEff: hourPreciseOfDayEff,
			},
		});
	}

	public static outputHourPreciseOfDayEffReset(hourPreciseOfDayEff: number): void {
		UnderlayDrawEngineBus.worker.postMessage({
			cmd: UnderlayDrawBusInputCmd.RESET_TIME,
			data: {
				hourPreciseOfDayEff: hourPreciseOfDayEff,
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

	/**
	 * @return [0] is sky, [1] is starfield
	 */
	public static setCallbackBitmaps(callbackBitmaps: (image: ImageBitmap[]) => void): void {
		UnderlayDrawEngineBus.callbackBitmaps = callbackBitmaps;
	}
}
