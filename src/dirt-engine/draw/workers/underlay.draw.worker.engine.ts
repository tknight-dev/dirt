import {
	UnderlayDrawBusInputCmd,
	UnderlayDrawBusInputPlayload,
	UnderlayDrawBusInputPlayloadInitial,
	UnderlayDrawBusInputPlayloadResolution,
	UnderlayDrawBusInputPlayloadTime,
	UnderlayDrawBusInputPlayloadTimeForced,
} from '../buses/underlay.draw.model.bus';

/**
 * @author tknight-dev
 */

self.onmessage = (event: MessageEvent) => {
	let payload: UnderlayDrawBusInputPlayload = event.data;

	switch (payload.cmd) {
		case UnderlayDrawBusInputCmd.INITIALIZE:
			UnderlayDrawWorkerEngine.initialize(self, <UnderlayDrawBusInputPlayloadInitial>payload.data);
			break;
		case UnderlayDrawBusInputCmd.SET_RESOLUTION:
			UnderlayDrawWorkerEngine.inputSetResolution(<UnderlayDrawBusInputPlayloadResolution>payload.data);
			break;
		case UnderlayDrawBusInputCmd.SET_TIME:
			UnderlayDrawWorkerEngine.inputSetTime(<UnderlayDrawBusInputPlayloadTime>payload.data);
			break;
		case UnderlayDrawBusInputCmd.SET_TIME_FORCED:
			UnderlayDrawWorkerEngine.inputSetTimeForced(<UnderlayDrawBusInputPlayloadTimeForced>payload.data);
			break;
	}
};

class UnderlayDrawWorkerEngine {
	private static imagePrevious: ImageBitmap;
	private static imagePreviousHour: ImageBitmap;
	private static canvas: OffscreenCanvas;
	private static ctx: OffscreenCanvasRenderingContext2D;
	private static height: number = 0;
	private static hourPreciseOfDayEff: number = -1;
	private static initialized: boolean;
	private static timeForced: boolean;
	private static self: Window & typeof globalThis;
	private static width: number;

	public static async initialize(self: Window & typeof globalThis, data: UnderlayDrawBusInputPlayloadInitial): Promise<void> {
		if (UnderlayDrawWorkerEngine.initialized) {
			console.error('UnderlayDrawWorkerEngine > initialize: already initialized');
			return;
		}
		UnderlayDrawWorkerEngine.initialized = true;
		UnderlayDrawWorkerEngine.self = self;

		UnderlayDrawWorkerEngine.canvas = new OffscreenCanvas(1, 1);
		UnderlayDrawWorkerEngine.ctx = <OffscreenCanvasRenderingContext2D>UnderlayDrawWorkerEngine.canvas.getContext('2d');
		UnderlayDrawWorkerEngine.ctx.imageSmoothingEnabled = false;
	}

	public static inputSetResolution(data: UnderlayDrawBusInputPlayloadResolution): void {
		UnderlayDrawWorkerEngine.height = data.height;
		UnderlayDrawWorkerEngine.width = Math.round(data.width * 1.05); // parallaxing
		UnderlayDrawWorkerEngine._draw();
	}

	public static inputSetTime(data: UnderlayDrawBusInputPlayloadTime): void {
		UnderlayDrawWorkerEngine.hourPreciseOfDayEff = data.hourPreciseOfDayEff;
		UnderlayDrawWorkerEngine._draw();
	}

	public static inputSetTimeForced(data: UnderlayDrawBusInputPlayloadTimeForced): void {
		UnderlayDrawWorkerEngine.timeForced = data.forced;
		UnderlayDrawWorkerEngine._draw();
	}

	private static outputBitmap(image: ImageBitmap): void {
		(<any>UnderlayDrawWorkerEngine.self).postMessage(image, [image]);
	}

	private static _draw(): void {
		let brightnessOutsideDayMax: number = 6,
			brightnessOutsideNightMax: number = 3,
			canvas: OffscreenCanvas = UnderlayDrawWorkerEngine.canvas,
			ctx: OffscreenCanvasRenderingContext2D = UnderlayDrawWorkerEngine.ctx,
			gradient: CanvasGradient,
			height: number = UnderlayDrawWorkerEngine.height,
			hourOfDayEff: number = (UnderlayDrawWorkerEngine.hourPreciseOfDayEff | 0) + 1,
			hourOfDayEffOutsideModifier: number = hourOfDayEff % 12,
			width: number = UnderlayDrawWorkerEngine.width;

		// is ready
		if (height === 0 || hourOfDayEff === 0) {
			return;
		}

		// config
		if (canvas.height !== height || canvas.width !== width) {
			canvas.height = height;
			canvas.width = width;
		}
		gradient = ctx.createLinearGradient(0, 0, 0, height);

		// override
		if (UnderlayDrawWorkerEngine.timeForced) {
			hourOfDayEff = 12;
		}

		if (hourOfDayEff === 1) {
			// Small Hours
			hourOfDayEffOutsideModifier = Math.min(brightnessOutsideNightMax, 2);
		} else if (hourOfDayEff < 6) {
			// Small Hours
			hourOfDayEffOutsideModifier = Math.min(brightnessOutsideNightMax, 5 - hourOfDayEff);
		} else if (hourOfDayEff < 10) {
			// Morning
			hourOfDayEffOutsideModifier = Math.min(brightnessOutsideDayMax, hourOfDayEff - 4);
		} else if (hourOfDayEff < 18) {
			// Afternoon
			hourOfDayEffOutsideModifier = brightnessOutsideDayMax;
		} else if (hourOfDayEff < 23) {
			// Evening
			hourOfDayEffOutsideModifier = Math.min(brightnessOutsideDayMax, 23 - hourOfDayEff);
		} else {
			// Dusk
			hourOfDayEffOutsideModifier = Math.min(brightnessOutsideNightMax, hourOfDayEff - 23);
			hourOfDayEffOutsideModifier++;
		}

		if (hourOfDayEff === 1) {
			// Small Hours
			gradient.addColorStop(0.1, 'black');
			gradient.addColorStop(0.3, 'black');
			gradient.addColorStop(0.5, 'black');
			gradient.addColorStop(1, 'rgb(47,132,199)');
		} else if (hourOfDayEff < 6) {
			// Small Hours
			gradient.addColorStop(0.1, 'black');
			gradient.addColorStop(0.2, 'rgb(1,1,13)');
			gradient.addColorStop(0.5, 'rgb(0,26,61)');
			gradient.addColorStop(1, 'rgb(0,34,82)');
		} else if (hourOfDayEff < 10) {
			// Morning
			gradient.addColorStop(0.1, 'rgb(0,27,93)');
			gradient.addColorStop(0.3, 'rgb(0,54,131)');
			gradient.addColorStop(0.75, 'rgb(11,97,146)');
			gradient.addColorStop(1, 'rgb(11,97,146)');
		} else if (hourOfDayEff < 18) {
			// Afternoon
			gradient.addColorStop(0.05, 'rgb(0,27,93)');
			gradient.addColorStop(0.2, 'rgb(11,97,146)');
			gradient.addColorStop(0.75, 'rgb(118,162,197)');
			gradient.addColorStop(1, 'rgb(118,162,197)');
		} else if (hourOfDayEff < 23) {
			// Evening
			gradient.addColorStop(0.1, 'rgb(50,131,194)');
			gradient.addColorStop(0.5, 'rgb(96,126,154)');
			gradient.addColorStop(0.75, 'rgb(200,117,21)');
			gradient.addColorStop(1, 'rgb(236,72,19)');
		} else {
			// Dusk
			gradient.addColorStop(0.1, 'black');
			gradient.addColorStop(0.2, 'rgb(1,1,13)');
			gradient.addColorStop(0.5, 'rgb(0,26,61)');
			gradient.addColorStop(1, 'rgb(0,34,82)');
		}

		// draw
		ctx.fillStyle = gradient;
		ctx.fillRect(0, 0, width, height);

		// done
		UnderlayDrawWorkerEngine.outputBitmap(canvas.transferToImageBitmap());
	}
}
