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

	public static scale(input: number, inputMax: number, inputMin: number, outputMax: number, outputMin: number, round: boolean = false): number {
		let value: number = ((input - inputMin) / (inputMax - inputMin)) * (outputMax - outputMin) + outputMin;
		return round ? Math.round(value) : value;
	}
}
