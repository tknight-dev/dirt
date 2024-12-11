import { GridCoordinate, GridBlockTable, GridBlockTableComplex } from '../models/grid.model';
import { Map } from '../models/map.model';

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

	public static htmlRangeAndNumber(
		max: number,
		min: number,
		step: number,
		value: number,
		callback: (value: number) => void,
		appendTo?: HTMLElement,
	): HTMLInputElement[] {
		let inputRange: HTMLInputElement = document.createElement('input'),
			inputNumber: HTMLInputElement = document.createElement('input');

		inputNumber.autocomplete = 'off';
		inputNumber.max = String(max);
		inputNumber.min = String(min);
		inputNumber.onblur = (event: any) => {
			let value = Math.round(Number(event.target.value) / step);
			inputNumber.value = String(value);
			inputRange.value = String(value);
			callback(value);
		};
		inputNumber.oninput = (event: any) => {
			let value = Math.round(Number(event.target.value) / step);
			inputRange.value = String(value);
			callback(value);
		};
		inputNumber.step = String(step);
		inputNumber.type = 'number';
		inputNumber.value = String(value);

		inputRange.autocomplete = 'off';
		inputRange.max = String(max);
		inputRange.min = String(min);
		inputRange.oninput = (event: any) => {
			let value = Math.round(Number(event.target.value) / step);
			inputNumber.value = String(value);
			callback(value);
		};
		inputRange.step = String(step);
		inputRange.type = 'range';
		inputRange.value = String(value);

		if (appendTo) {
			appendTo.appendChild(inputRange);
			appendTo.appendChild(inputNumber);
		}

		return [inputRange, inputNumber];
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
	 * Grid hashes are 16bit
	 */
	public static gridHashFrom(hash: number): GridCoordinate {
		return {
			gx: (hash >> 8) & 0xff,
			gy: hash & 0xff,
		};
	}

	/**
	 * Grid hashes are 16bit
	 */
	public static gridHashTo(gx: number, gy: number): number {
		return ((gx & 0xff) << 8) | (gy & 0xff);
	}

	public static isLightNight(hourOfDayEff: number): boolean {
		if (hourOfDayEff < 8 || hourOfDayEff > 19) {
			return true;
		} else {
			return false;
		}
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

	public static scale(input: number, inputMax: number, inputMin: number, outputMax: number, outputMin: number): number {
		return ((input - inputMin) / (inputMax - inputMin)) * (outputMax - outputMin) + outputMin;
	}
}
