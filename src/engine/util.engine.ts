import { GridCoordinate } from './models/grid.model';
import { Map } from './models/map.model';

/**
 * @author tknight-dev
 */

export class UtilEngine {
	private static initialized: boolean;

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
	 * Grid hashes are 32bit
	 */
	public static gridHashFrom(hash: number): GridCoordinate {
		return {
			gx: (hash >> 16) & 0xffff,
			gy: hash & 0xffff,
		};
	}

	/**
	 * Grid hashes are 32bit
	 */
	public static gridHashTo(gx: number, gy: number): number {
		return ((gx & 0xffff) << 16) | (gy & 0xffff);
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

	public static scale(input: number, inputMax: number, inputMin: number, outputMax: number, outputMin: number, round: boolean = false): number {
		let value: number = ((input - inputMin) / (inputMax - inputMin)) * (outputMax - outputMin) + outputMin;
		return round ? Math.round(value) : value;
	}
}
