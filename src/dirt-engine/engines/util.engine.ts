import { Coordinate } from '../models/px.model';
import {
	Grid,
	GridCoordinate,
	GridBlockTable,
	GridImageBlock,
	GridObject,
	GridImageBlockReference,
	GridBlockTableComplex,
} from '../models/grid.model';
import { Map } from '../models/map.model';
import { VideoBusInputCmdGameModeEditApplyType, VideoBusInputCmdGameModeEditApplyZ } from '../engines/buses/video.model.bus';

/**
 * @author tknight-dev
 */

export class UtilEngine {
	private static characters: string = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
	private static initialized: boolean;
	public static readonly renderOverflowP: number = 20; // Sync with "dirt.scss -> $dirt-engine-feed-overflow-p"
	public static renderOverflowPEff: number = UtilEngine.renderOverflowP; // Changes with the DPI of the screen
	private static timeoutCount: number = 0;
	private static timeouts: { [key: number]: ReturnType<typeof setTimeout> } = {};

	/**
	 * @param count is the returned number from UtilEngine.setInterval()
	 */
	public static clearInterval(count: number): void {
		clearTimeout(UtilEngine.timeouts[count]);
		delete UtilEngine.timeouts[count];
	}

	/**
	 * Interval that offsets the drift (setInterval and setTimeout use optimistic timing [drifting clocks])
	 *
	 * @return use the number with UtilEngine.clearInterval() to stop this interval
	 */
	public static setInterval(method: () => void, intervalInMs?: number): number {
		intervalInMs = Math.max(0, Math.min(2000000000, intervalInMs || 0));
		let count: number = UtilEngine.timeoutCount++,
			delta: number,
			deltaAvg: number,
			history: number[],
			historyIndex: number = 0,
			now: number,
			then: number = performance.now(),
			trigger: () => void = () => {
				// Fire associated method
				now = performance.now();
				method();

				// Adjust for drift
				delta = now - then - intervalInMs;
				then = now;
				if (history) {
					history[historyIndex] = delta;
					historyIndex = (historyIndex + 1) % 5;
				} else {
					history = [delta, delta, delta, delta, delta];
				}
				deltaAvg = Math.round((history.reduce((a, b) => a + b) / 5 + intervalInMs) / 2);

				// Next interval
				UtilEngine.timeouts[count] = setTimeout(trigger, intervalInMs - deltaAvg);
			};

		UtilEngine.timeouts[count] = setTimeout(trigger, intervalInMs);
		return count;
	}

	public static async initialize(): Promise<void> {
		if (UtilEngine.initialized) {
			return;
		}
		UtilEngine.initialized = true;
	}

	public static delayInMs(ms: number): Promise<void> {
		return new Promise((resolve: any) => {
			setTimeout(() => {
				resolve();
			}, ms);
		});
	}

	/**
	 * Grid hashes are 32bit with a max precision of 3, min 0
	 */
	public static gridHashFrom(hash: number, precision: number): GridCoordinate {
		switch (precision) {
			case 3:
				return {
					gx: ((hash >> 16) & 0xffff) / 1000,
					gy: (hash & 0xffff) / 1000,
				};
			case 2:
				return {
					gx: ((hash >> 16) & 0xffff) / 100,
					gy: (hash & 0xffff) / 100,
				};
			case 1:
				return {
					gx: ((hash >> 16) & 0xffff) / 10,
					gy: (hash & 0xffff) / 10,
				};
			case 0:
			default:
				return {
					gx: (hash >> 16) & 0xffff,
					gy: hash & 0xffff,
				};
		}
	}

	/**
	 * Grid hashes are 32bit with a max precision of 3, min 0
	 */
	public static gridHashTo(gx: number, gy: number, precision: number): number {
		switch (precision) {
			case 3:
				return (((gx * 1000) & 0xffff) << 16) | ((gy * 1000) & 0xffff);
			case 2:
				return (((gx * 100) & 0xffff) << 16) | ((gy * 100) & 0xffff);
			case 1:
				return (((gx * 10) & 0xffff) << 16) | ((gy * 10) & 0xffff);
			case 0:
			default:
				return ((gx & 0xffff) << 16) | (gy & 0xffff);
		}
	}

	public static gridLightingHashTo(gx: number, gy: number, precision: number): number {
		switch (precision) {
			case 3:
				return (((gx * 1000) & 0xffff) << 16) | ((gy * 1000) & 0xffff);
			case 2:
				return (((gx * 100) & 0xffff) << 16) | ((gy * 100) & 0xffff);
			case 1:
				return (((gx * 10) & 0xffff) << 16) | ((gy * 10) & 0xffff);
			case 0:
			default:
				return ((gx & 0xffff) << 16) | (gy & 0xffff);
		}
	}

	/**
	 * Grid hashes are 32bit with a max precision of 3
	 */
	public static gridBlockTableSliceHashes(
		gridBlockTable: GridBlockTable<any>,
		startGx: number,
		startGy: number,
		stopGx: number,
		stopGy: number,
	): { [key: number]: GridBlockTableComplex[] } {
		let gx: number,
			gxs: number[] = <number[]>gridBlockTable.gx,
			gy: GridBlockTableComplex,
			gyMinByGx: { [key: number]: number } = {},
			gys: GridBlockTableComplex[],
			hashesGyByGx: { [key: number]: GridBlockTableComplex[] } = <any>gridBlockTable.hashesGyByGx,
			hashesGyByGxSlice: { [key: number]: GridBlockTableComplex[] } = {},
			j: string;

		startGx--;
		startGy--;
		stopGx++;
		stopGy++;
		for (let i in gxs) {
			gx = gxs[i];
			gys = hashesGyByGx[gx];

			// Slice g in the viewport
			if (gx > startGx && gx < stopGx) {
				for (j in gys) {
					gy = gys[j];

					// Detect the min y value for the LightingEngine effect
					if (gyMinByGx[gx] === undefined || gy.value < gyMinByGx[gx]) {
						gyMinByGx[gx] = gy.value;
					}

					if (gy.value > startGy && gy.value < stopGy) {
						if (hashesGyByGxSlice[gx] === undefined) {
							hashesGyByGxSlice[gx] = [
								{
									gx: gx,
									gy: gy.value,
									hash: gy.hash,
									value: 0,
								},
							];
						} else {
							hashesGyByGxSlice[gx].push({
								gx: gx,
								gy: gy.value,
								hash: gy.hash,
								value: 0,
							});
						}
					}
				}
			}
		}

		return hashesGyByGxSlice;
	}

	/**
	 * From Base64
	 */
	public static mapDecode(map: string): Map {
		return JSON.parse(atob(map));
	}

	/**
	 * To Base64
	 */
	public static mapEncode(map: Map): string {
		return btoa(JSON.stringify(map));
	}

	public static percentage(input: number, inputMax: number, inputMin: number): number {
		return (input - inputMin) / (inputMax - inputMin);
	}

	/**
	 * Px hashes are 64bit
	 */
	public static pixelHashFrom(hash: number): Coordinate {
		return {
			x: (hash >> 32) & 0xffffffff,
			y: hash & 0xffffffff,
		};
	}

	/**
	 * Px hashes are 64bit
	 */
	public static pixelHashTo(x: number, y: number): number {
		return ((x & 0xffffffff) << 32) | (y & 0xffffffff);
	}

	public static randomAlphaNumeric(length: number): string {
		let characters: string = UtilEngine.characters,
			charactersLength: number = characters.length,
			string: string = '';

		while (length) {
			length--;
			string += characters.charAt(Math.floor(Math.random() * charactersLength));
		}

		return string;
	}

	public static scale(
		input: number,
		inputMax: number,
		inputMin: number,
		outputMax: number,
		outputMin: number,
		round: boolean = false,
	): number {
		let value: number = ((input - inputMin) / (inputMax - inputMin)) * (outputMax - outputMin) + outputMin;
		return round ? Math.round(value) : value;
	}

	public static getGridHashPrecisionMax(gWidth: number): number {
		if (gWidth > 0x1999) {
			// 6553
			return 0;
		} else if (gWidth > 0x28f) {
			// 655
			return 1;
		} else if (gWidth > 0x41) {
			//65
			return 2;
		} else {
			return 3;
		}
	}
}
