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
		let canvas: OffscreenCanvas = UnderlayDrawWorkerEngine.canvas,
			ctx: OffscreenCanvasRenderingContext2D = UnderlayDrawWorkerEngine.ctx,
			height: number = UnderlayDrawWorkerEngine.height,
			hourPreciseOfDayEff: number = UnderlayDrawWorkerEngine.hourPreciseOfDayEff,
			width: number = UnderlayDrawWorkerEngine.width;

		// is ready
		if (height === 0 || hourPreciseOfDayEff === -1) {
			return;
		}

		// config
		if (canvas.height !== height || canvas.width !== width) {
			canvas.height = height;
			canvas.width = width;
		}

		// override
		if (UnderlayDrawWorkerEngine.timeForced) {
			hourPreciseOfDayEff = 12;
		}

		// draw
		const gradient = ctx.createLinearGradient(0, 0, 0, height);
		gradient.addColorStop(0.1, 'black');
		gradient.addColorStop(0.3, 'blue');
		gradient.addColorStop(0.5, 'blue');
		gradient.addColorStop(1, 'cyan');
		ctx.fillStyle = gradient;
		ctx.fillRect(0, 0, width, height);

		// done
		UnderlayDrawWorkerEngine.outputBitmap(canvas.transferToImageBitmap());
	}
}
