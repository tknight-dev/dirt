import { Coordinate } from '../models/px.model';
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
	 * Grid hashes are 32bit with a max precision of 3
	 */
	public static gridHashFrom(hash: number): GridCoordinate {
		return {
			gx: ((hash >> 16) & 0xffff) / 1000,
			gy: (hash & 0xffff) / 1000,
		};
	}

	/**
	 * Grid hashes are 32bit with a max precision of 3
	 */
	public static gridHashTo(gx: number, gy: number): number {
		return ((Math.round(gx * 1000) & 0xffff) << 16) | (Math.round(gy * 1000) & 0xffff);
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
	): GridBlockTableComplex[] {
		let gx: number,
			gxs: number[] = <number[]>gridBlockTable.gx,
			gy: GridBlockTableComplex,
			gys: GridBlockTableComplex[],
			hashesGyByGx: { [key: number]: GridBlockTableComplex[] } = <any>gridBlockTable.hashesGyByGx,
			hashesSlice: GridBlockTableComplex[] = [],
			j: string;

		startGx--;
		startGy--;
		stopGx++;
		stopGy++;
		for (let i in gxs) {
			gx = gxs[i];
			if (gx > startGx && gx < stopGx) {
				gys = hashesGyByGx[gx];

				for (j in gys) {
					gy = gys[j];

					if (gy.value > startGy && gy.value < stopGy) {
						hashesSlice.push({
							gx: gx,
							gy: gy.value,
							hash: gy.hash,
							value: 0,
						});
					}
				}
			}
		}

		return hashesSlice;
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
}
