import { Grid, GridConfig } from '../../models/grid.model';
import { LightingCalcBusInputCmd, LightingCalcBusOutputDecompressed } from './lighting.calc.engine.model';
import { VideoBusInputCmdGameModeEditApplyZ } from '../../engines/buses/video.model.bus';

/**
 * @author tknight-dev
 */

export class LightingCalcEngineBus {
	private static callback: (
		gridId: number,
		hourPreciseOfDayEff: number,
		lightingByHash: { [key: number]: LightingCalcBusOutputDecompressed },
		lightingByHashLength: number,
	) => void;
	private static initialized: boolean;
	private static worker: Worker;

	public static async initialize(): Promise<void> {
		if (LightingCalcEngineBus.initialized) {
			console.error('LightingCalcEngineBus > initialize: already initialized');
			return;
		}
		LightingCalcEngineBus.initialized = true;
		LightingCalcEngineBus.worker = new Worker(new URL('../workers/lighting.calc.worker.engine', import.meta.url));
		LightingCalcEngineBus.input();

		LightingCalcEngineBus.worker.postMessage({
			cmd: LightingCalcBusInputCmd.INITIALIZE,
			data: undefined,
		});
	}

	private static input(): void {
		LightingCalcEngineBus.worker.onmessage = (event: MessageEvent) => {
			let compressed: Uint32Array = new Uint32Array(event.data.payload),
				decompressed: { [key: number]: LightingCalcBusOutputDecompressed } = {},
				hourPreciseOfDayEff: number = event.data.hourPreciseOfDayEff,
				scratch: number;

			if (compressed.length) {
				for (let i in compressed) {
					scratch = (compressed[i] >> 16) & 0xfff;

					decompressed[compressed[i] & 0xffff] = {
						backgroundBrightness: scratch & 0x7,
						backgroundBrightnessOutside: (scratch >> 3) & 0x7,
						groupBrightness: (scratch >> 6) & 0x7,
						groupBrightnessOutside: (scratch >> 9) & 0x7,
					};
				}
			}

			LightingCalcEngineBus.callback(event.data.gridId, hourPreciseOfDayEff, decompressed, compressed.length);
		};
	}

	/**
	 * @param intensity between 0 and 10, Precision 3
	 */
	public static outputFlash(durationInMS: number, gHash: number, intensity: number, z: VideoBusInputCmdGameModeEditApplyZ): void {
		LightingCalcEngineBus.worker.postMessage({
			cmd: LightingCalcBusInputCmd.FLASH,
			data: {
				durationInMS: durationInMS,
				gHash: gHash,
				intensity: intensity,
				z: z,
			},
		});
	}

	public static outputHourPreciseOfDayEff(hourPreciseOfDayEff: number): void {
		LightingCalcEngineBus.worker.postMessage({
			cmd: LightingCalcBusInputCmd.SET_HOUR_PRECISE_OF_DAY_EFF,
			data: {
				hourPreciseOfDayEff: hourPreciseOfDayEff,
			},
		});
	}

	public static outputGridActive(id: string): void {
		LightingCalcEngineBus.worker.postMessage({
			cmd: LightingCalcBusInputCmd.SET_GRID_ACTIVE,
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

		LightingCalcEngineBus.worker.postMessage({
			cmd: LightingCalcBusInputCmd.SET_GRIDS,
			data: {
				grids: gridsOptimized,
				gridConfigs: gridConfigs,
			},
		});
	}

	public static setCallback(
		callback: (
			gridId: number,
			hourPreciseOfDayEff: number,
			lightingByHash: { [key: number]: LightingCalcBusOutputDecompressed },
			lightingByHashLength: number,
		) => void,
	): void {
		LightingCalcEngineBus.callback = callback;
	}
}
