import { Grid, GridCoordinate, GridBlockTable, GridImageBlockReference } from '../models/grid.model';
import { Map, MapActive } from '../models/map.model';

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

	public static gridMinimize(grid: Grid) {
		delete (<any>grid).imageBlocksCalcPipelineAnimations;
		delete (<any>grid).imageBlocksRenderPipelineAssetsByGyByGx;
		delete (<any>grid).imageBlocksRenderPipelineGy;

		delete (<any>grid).imageBlocksBackground1Reference;
		delete (<any>grid).imageBlocksBackground2Reference;
		delete (<any>grid).imageBlocksForeground1Reference;
		delete (<any>grid).imageBlocksForeground2Reference;
		delete (<any>grid).imageBlocksInteractiveReference;
		delete (<any>grid).imageBlocksMiddlegroundReference;
		delete (<any>grid).imageBlocksVanishingReference;
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
			let value = Number(event.target.value);
			inputNumber.value = String(value);
			inputRange.value = String(value);
			callback(value);
		};
		inputNumber.oninput = (event: any) => {
			let value = Number(event.target.value);
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
			let value = Number(event.target.value);
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

	public static isLightNight(hourOfDayEff: number): boolean {
		if (hourOfDayEff < 8 || hourOfDayEff > 19) {
			return true;
		} else {
			return false;
		}
	}

	public static mapClone(mapActive: MapActive, deep?: boolean): MapActive {
		let grid: Grid,
			mapActiveClone: MapActive,
			pipelines: { [key: string]: { [key: string]: any } } = {},
			references: { [key: string]: { [key: string]: GridBlockTable<GridImageBlockReference> } } = {};

		if (deep) {
			mapActiveClone = structuredClone(mapActive);
		} else {
			// Prepare
			delete (<any>mapActive).gridActive;
			delete (<any>mapActive).gridConfigActive;

			for (let i in mapActive.grids) {
				grid = mapActive.grids[i];

				pipelines[grid.id] = {
					imageBlocksCalcPipelineAnimations: grid.imageBlocksCalcPipelineAnimations,
					imageBlocksRenderPipelineGy: grid.imageBlocksRenderPipelineGy,
					imageBlocksRenderPipelineAssetsByGyByGx: grid.imageBlocksRenderPipelineAssetsByGyByGx,
				};
				delete (<any>grid).imageBlocksCalcPipelineAnimations;
				delete (<any>grid).imageBlocksRenderPipelineGy;
				delete (<any>grid).imageBlocksRenderPipelineAssetsByGyByGx;

				references[grid.id] = {
					imageBlocksBackground1Reference: grid.imageBlocksBackground1Reference,
					imageBlocksBackground2Reference: grid.imageBlocksBackground2Reference,
					imageBlocksForeground1Reference: grid.imageBlocksForeground1Reference,
					imageBlocksForeground2Reference: grid.imageBlocksForeground2Reference,
					imageBlocksInteractiveReference: grid.imageBlocksInteractiveReference,
					imageBlocksMiddlegroundReference: grid.imageBlocksMiddlegroundReference,
					imageBlocksVanishingReference: grid.imageBlocksVanishingReference,
				};
				delete (<any>grid).imageBlocksBackground1Reference;
				delete (<any>grid).imageBlocksBackground2Reference;
				delete (<any>grid).imageBlocksForeground1Reference;
				delete (<any>grid).imageBlocksForeground2Reference;
				delete (<any>grid).imageBlocksInteractiveReference;
				delete (<any>grid).imageBlocksMiddlegroundReference;
				delete (<any>grid).imageBlocksVanishingReference;
			}

			// Clone
			mapActiveClone = JSON.parse(JSON.stringify(mapActive));

			// Repair
			mapActive.gridActive = mapActive.grids[mapActive.gridActiveId];
			mapActive.gridConfigActive = mapActive.gridConfigs[mapActive.gridActiveId];

			for (let i in mapActive.grids) {
				grid = mapActive.grids[i];

				grid.imageBlocksCalcPipelineAnimations = pipelines[grid.id].imageBlocksCalcPipelineAnimations;
				grid.imageBlocksRenderPipelineGy = pipelines[grid.id].imageBlocksRenderPipelineGy;
				grid.imageBlocksRenderPipelineAssetsByGyByGx = pipelines[grid.id].imageBlocksRenderPipelineAssetsByGyByGx;

				grid.imageBlocksBackground1Reference = references[grid.id].imageBlocksBackground1Reference;
				grid.imageBlocksBackground2Reference = references[grid.id].imageBlocksBackground2Reference;
				grid.imageBlocksForeground1Reference = references[grid.id].imageBlocksForeground1Reference;
				grid.imageBlocksForeground2Reference = references[grid.id].imageBlocksForeground2Reference;
				grid.imageBlocksInteractiveReference = references[grid.id].imageBlocksInteractiveReference;
				grid.imageBlocksMiddlegroundReference = references[grid.id].imageBlocksMiddlegroundReference;
				grid.imageBlocksVanishingReference = references[grid.id].imageBlocksVanishingReference;
			}
		}

		return mapActiveClone;
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

	public static mapMinimize(mapActive: MapActive) {
		let gridMinimize = UtilEngine.gridMinimize;

		for (let i in mapActive.grids) {
			gridMinimize(mapActive.grids[i]);
		}
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
