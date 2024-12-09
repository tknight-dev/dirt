import {
	UnderlayDrawBusInputCmd,
	UnderlayDrawBusInputPlayload,
	UnderlayDrawBusInputPlayloadInitial,
	UnderlayDrawBusInputPlayloadResetTime,
	UnderlayDrawBusInputPlayloadResolution,
	UnderlayDrawBusInputPlayloadTime,
} from '../buses/underlay.draw.model.bus';
import { UtilEngine } from '../../engines/util.engine';
import { AssetEngine } from 'src/dirt-engine/engines/asset.engine';

/**
 * @author tknight-dev
 */

self.onmessage = (event: MessageEvent) => {
	let payload: UnderlayDrawBusInputPlayload = event.data;

	switch (payload.cmd) {
		case UnderlayDrawBusInputCmd.INITIALIZE:
			UnderlayDrawWorkerEngine.initialize(self, <UnderlayDrawBusInputPlayloadInitial>payload.data);
			break;
		case UnderlayDrawBusInputCmd.RESET_TIME:
			UnderlayDrawWorkerEngine.inputResetTime(<UnderlayDrawBusInputPlayloadResetTime>payload.data);
			break;
		case UnderlayDrawBusInputCmd.SET_RESOLUTION:
			UnderlayDrawWorkerEngine.inputSetResolution(<UnderlayDrawBusInputPlayloadResolution>payload.data);
			break;
		case UnderlayDrawBusInputCmd.SET_TIME:
			UnderlayDrawWorkerEngine.inputSetTime(<UnderlayDrawBusInputPlayloadTime>payload.data);
			break;
	}
};

class UnderlayDrawWorkerEngine {
	private static assetsStarfield: { [key: string]: ImageBitmap } = {};
	private static backfill: boolean;
	private static backfillCurrent: boolean;
	private static backfillPrevious: boolean;
	private static imageSkyCurrent: ImageBitmap | undefined;
	private static imageSkyCurrentHour: number;
	private static imageSkyPrevious: ImageBitmap | undefined;
	private static imageSkyPreviousHour: number;
	private static canvasSky: OffscreenCanvas;
	private static canvasStarfield: OffscreenCanvas;
	private static ctxSky: OffscreenCanvasRenderingContext2D;
	private static ctxStarfield: OffscreenCanvasRenderingContext2D;
	private static height: number = 0;
	private static hourPreciseOfDayEff: number = -1;
	private static initialized: boolean;
	private static self: Window & typeof globalThis;
	private static widthSky: number;
	private static widthStarfield: number;

	public static async initialize(self: Window & typeof globalThis, data: UnderlayDrawBusInputPlayloadInitial): Promise<void> {
		if (UnderlayDrawWorkerEngine.initialized) {
			console.error('UnderlayDrawWorkerEngine > initialize: already initialized');
			return;
		}
		UnderlayDrawWorkerEngine.initialized = true;
		UnderlayDrawWorkerEngine.self = self;

		UnderlayDrawWorkerEngine.canvasSky = new OffscreenCanvas(1, 1);
		UnderlayDrawWorkerEngine.ctxSky = <OffscreenCanvasRenderingContext2D>UnderlayDrawWorkerEngine.canvasSky.getContext('2d');
		UnderlayDrawWorkerEngine.ctxSky.imageSmoothingEnabled = false;

		UnderlayDrawWorkerEngine.canvasStarfield = new OffscreenCanvas(1, 1);
		UnderlayDrawWorkerEngine.ctxStarfield = <OffscreenCanvasRenderingContext2D>(
			UnderlayDrawWorkerEngine.canvasStarfield.getContext('2d')
		);
		UnderlayDrawWorkerEngine.ctxStarfield.imageSmoothingEnabled = false;

		for (let i in data.assetIds) {
			UnderlayDrawWorkerEngine.assetsStarfield[data.assetIds[i]] = data.images[i];
		}
	}

	public static inputResetTime(data: UnderlayDrawBusInputPlayloadResetTime): void {
		UnderlayDrawWorkerEngine.hourPreciseOfDayEff = data.hourPreciseOfDayEff;
		UnderlayDrawWorkerEngine.imageSkyCurrent = undefined;
		UnderlayDrawWorkerEngine.imageSkyPrevious = undefined;
		UnderlayDrawWorkerEngine._draw();
	}

	public static inputSetResolution(data: UnderlayDrawBusInputPlayloadResolution): void {
		UnderlayDrawWorkerEngine.height = data.height;
		UnderlayDrawWorkerEngine.widthSky = Math.round(data.width * 1.05); // parallaxing
		UnderlayDrawWorkerEngine.widthStarfield = data.width;

		UnderlayDrawWorkerEngine._draw();
	}

	public static inputSetTime(data: UnderlayDrawBusInputPlayloadTime): void {
		UnderlayDrawWorkerEngine.hourPreciseOfDayEff = data.hourPreciseOfDayEff;
		UnderlayDrawWorkerEngine._draw();
	}

	private static outputBitmap(images: ImageBitmap[]): void {
		(<any>UnderlayDrawWorkerEngine.self).postMessage(images, images);
	}

	private static _draw(hourPreciseOfDayEff?: number): void {
		if (hourPreciseOfDayEff === undefined) {
			hourPreciseOfDayEff = UnderlayDrawWorkerEngine.hourPreciseOfDayEff;
		}

		let brightnessOutsideDayMax: number = 6,
			brightnessOutsideNightMax: number = 4,
			canvasSky: OffscreenCanvas = UnderlayDrawWorkerEngine.canvasSky,
			canvasStarfield: OffscreenCanvas = UnderlayDrawWorkerEngine.canvasStarfield,
			ctxSky: OffscreenCanvasRenderingContext2D = UnderlayDrawWorkerEngine.ctxSky,
			ctxStarfield: OffscreenCanvasRenderingContext2D = UnderlayDrawWorkerEngine.ctxStarfield,
			fine: boolean = false,
			gradientSky: CanvasGradient,
			gradientStarfield: CanvasGradient,
			height: number = UnderlayDrawWorkerEngine.height,
			hourOfDayEff: number = (hourPreciseOfDayEff | 0) + 1,
			hourOfDayEffOutsideModifier: number = hourOfDayEff % 12,
			imageBitmapSky: ImageBitmap,
			imageBitmapStarfield: ImageBitmap,
			imageBitmapStars: ImageBitmap = UnderlayDrawWorkerEngine.assetsStarfield['stars'],
			minuteOfDayEff: number = (60 * (hourPreciseOfDayEff - hourOfDayEff + 1)) | 0,
			minuteOfDayEffPercentage: number = Math.round((hourPreciseOfDayEff - hourOfDayEff + 1) * 1000) / 1000,
			scratch: number,
			scratch2: number,
			time = (subtract: number) => {
				let time = hourOfDayEff - subtract;

				if (time === 0) {
					return 24;
				} else if (time === -1) {
					return 23;
				} else {
					return time;
				}
			},
			widthSky: number = UnderlayDrawWorkerEngine.widthSky,
			widthStarfield: number = UnderlayDrawWorkerEngine.widthStarfield;

		// is ready
		if (height === 0 || hourOfDayEff === 0) {
			return;
		}

		// config
		if (canvasSky.height !== height || canvasSky.width !== widthSky) {
			canvasSky.height = height;
			canvasSky.width = widthSky;
		}
		if (canvasStarfield.height !== height || canvasStarfield.width !== widthStarfield) {
			canvasStarfield.height = height;
			canvasStarfield.width = widthStarfield;
		}

		/**
		 * Sky
		 */
		gradientSky = ctxSky.createLinearGradient(0, 0, 0, height);
		gradientStarfield = ctxStarfield.createLinearGradient(0, 0, 0, height);

		if (hourOfDayEff === 1) {
			// Small Hours
			hourOfDayEffOutsideModifier = 2;
		} else if (hourOfDayEff < 6) {
			// Small Hours
			hourOfDayEffOutsideModifier = Math.max(0, Math.min(brightnessOutsideNightMax, 5 - hourOfDayEff));
		} else if (hourOfDayEff < 11) {
			// Morning
			hourOfDayEffOutsideModifier = Math.min(brightnessOutsideDayMax, hourOfDayEff - 5);
		} else if (hourOfDayEff < 18) {
			// Afternoon
			hourOfDayEffOutsideModifier = brightnessOutsideDayMax;
		} else if (hourOfDayEff < 23) {
			// Evening
			hourOfDayEffOutsideModifier = Math.min(brightnessOutsideDayMax, 23 - hourOfDayEff);
		} else {
			// Dusk
			hourOfDayEffOutsideModifier = Math.min(brightnessOutsideNightMax, hourOfDayEff - 23);
		}

		if (hourOfDayEff < 6) {
			fine = true;
			if (hourOfDayEff === 1) {
				scratch = UtilEngine.scale(
					Math.max(0, hourOfDayEffOutsideModifier + minuteOfDayEffPercentage),
					brightnessOutsideNightMax,
					0,
					0.3,
					1,
				);
			} else if (hourOfDayEff === 5) {
				scratch = 1;
			} else {
				scratch = UtilEngine.scale(
					Math.max(0, hourOfDayEffOutsideModifier - minuteOfDayEffPercentage),
					brightnessOutsideNightMax,
					0,
					0.3,
					1,
				);
			}

			// Small Hours
			gradientSky.addColorStop(0, 'black');
			gradientSky.addColorStop(scratch, 'black');

			if (scratch !== 1) {
				gradientSky.addColorStop(1, 'rgb(47,132,199)');
			}

			gradientStarfield.addColorStop(scratch, 'white');
			if (scratch !== 1) {
				gradientStarfield.addColorStop(1, 'transparent');
			}
		} else if (hourOfDayEff < 7) {
			scratch = UtilEngine.scale(minuteOfDayEffPercentage, 1, 0, 0.5, 1);

			// Pre-Sunrise
			gradientSky.addColorStop(0, 'black');
			gradientSky.addColorStop(0.2, 'rgb(1,1,13)');
			gradientSky.addColorStop(0.5, 'rgb(0,26,61)');
			gradientSky.addColorStop(1, 'rgb(0,34,82)');

			gradientStarfield.addColorStop(scratch, 'rgba(255,255,255,' + scratch + ')');
			gradientStarfield.addColorStop(1, 'transparent');
		} else if (hourOfDayEff < 8) {
			scratch = UtilEngine.scale(minuteOfDayEffPercentage, 1, 0, 0, 0.5);

			// Pre-Sunrise
			gradientSky.addColorStop(0, 'black');
			gradientSky.addColorStop(0.2, 'rgb(1,1,13)');
			gradientSky.addColorStop(0.5, 'rgb(0,26,61)');
			gradientSky.addColorStop(1, 'rgb(0,34,82)');

			gradientStarfield.addColorStop(scratch, 'rgba(255,255,255,' + scratch + ')');
			gradientStarfield.addColorStop(1, 'transparent');
		} else if (hourOfDayEff < 9) {
			fine = true;
			scratch = UtilEngine.scale(minuteOfDayEff, 60, 0, 0.5, 0.98);
			scratch2 = UtilEngine.scale(minuteOfDayEff, 60, 0, 0.75, 0.99);

			// Sunrise
			gradientSky.addColorStop(0, 'rgb(50,131,194)');
			gradientSky.addColorStop(scratch, 'rgb(140,126,154)');
			gradientSky.addColorStop(scratch2, 'rgb(200,117,21)');
			gradientSky.addColorStop(1, 'rgb(236,72,19)');
		} else if (hourOfDayEff < 19) {
			// Afternoon
			gradientSky.addColorStop(0, 'rgb(0,27,93)');
			gradientSky.addColorStop(0.2, 'rgb(11,97,146)');
			gradientSky.addColorStop(0.75, 'rgb(118,162,197)');
			gradientSky.addColorStop(1, 'rgb(118,162,197)');
		} else if (hourOfDayEff < 20) {
			fine = true;
			scratch = UtilEngine.scale(minuteOfDayEff, 60, 0, 0.98, 0.25);
			scratch2 = UtilEngine.scale(minuteOfDayEff, 60, 0, 0.99, 0.5);

			// Sunset
			gradientSky.addColorStop(0, 'rgb(50,131,194)');
			gradientSky.addColorStop(scratch, 'rgb(140,126,154)');
			gradientSky.addColorStop(scratch2, 'rgb(200,117,21)');
			gradientSky.addColorStop(1, 'rgb(236,72,19)');
		} else if (hourOfDayEff < 21) {
			// Post-Sunset
			gradientSky.addColorStop(0, 'rgb(0,27,93)');
			gradientSky.addColorStop(0.3, 'rgb(0,54,131)');
			gradientSky.addColorStop(0.75, 'rgb(11,97,146)');
			gradientSky.addColorStop(1, 'rgb(11,97,146)');
		} else if (hourOfDayEff < 22) {
			scratch = UtilEngine.scale(minuteOfDayEffPercentage, 1, 0, 0.5, 0);

			// Evening
			gradientSky.addColorStop(0, 'black');
			gradientSky.addColorStop(0.2, 'rgb(1,1,13)');
			gradientSky.addColorStop(0.5, 'rgb(0,26,61)');
			gradientSky.addColorStop(1, 'rgb(0,34,82)');

			gradientStarfield.addColorStop(scratch, 'rgba(255,255,255,' + scratch + ')');
			gradientStarfield.addColorStop(1, 'transparent');
		} else if (hourOfDayEff < 23) {
			scratch = UtilEngine.scale(minuteOfDayEffPercentage, 1, 0, 1, 0.5);

			// Evening
			gradientSky.addColorStop(0, 'black');
			gradientSky.addColorStop(0.2, 'rgb(1,1,13)');
			gradientSky.addColorStop(0.5, 'rgb(0,26,61)');
			gradientSky.addColorStop(1, 'rgb(0,34,82)');

			gradientStarfield.addColorStop(scratch, 'rgba(255,255,255,' + scratch + ')');
			gradientStarfield.addColorStop(1, 'transparent');
		} else {
			fine = true;
			scratch = UtilEngine.scale(hourOfDayEffOutsideModifier + minuteOfDayEffPercentage, brightnessOutsideNightMax, 0, 0.3, 1);

			// Small Hours
			gradientSky.addColorStop(0, 'black');
			gradientSky.addColorStop(scratch, 'black');

			if (scratch !== 1) {
				gradientSky.addColorStop(1, 'rgb(47,132,199)');
			}

			gradientStarfield.addColorStop(scratch, 'white');
			if (scratch !== 1) {
				gradientStarfield.addColorStop(1, 'transparent');
			}
		}

		// draw
		ctxSky.fillStyle = gradientSky;
		ctxSky.fillRect(0, 0, widthSky, height);

		// sky bitmap
		imageBitmapSky = canvasSky.transferToImageBitmap();

		// blending config
		if (!UnderlayDrawWorkerEngine.imageSkyPrevious && !UnderlayDrawWorkerEngine.backfill) {
			// Initialize
			UnderlayDrawWorkerEngine.backfill = true;

			UnderlayDrawWorkerEngine.backfillCurrent = true;
			UnderlayDrawWorkerEngine.backfillPrevious = false;
			UnderlayDrawWorkerEngine._draw(time(1));

			UnderlayDrawWorkerEngine.backfillCurrent = false;
			UnderlayDrawWorkerEngine.backfillPrevious = true;
			UnderlayDrawWorkerEngine._draw(time(2));

			UnderlayDrawWorkerEngine.backfillPrevious = false;
			UnderlayDrawWorkerEngine.backfill = false;
		} else if (
			UnderlayDrawWorkerEngine.backfillCurrent ||
			(UnderlayDrawWorkerEngine.imageSkyCurrentHour !== hourOfDayEff && UnderlayDrawWorkerEngine.imageSkyPreviousHour === time(1))
		) {
			// Cycle current image on the hour
			UnderlayDrawWorkerEngine.imageSkyCurrent = imageBitmapSky;
			UnderlayDrawWorkerEngine.imageSkyCurrentHour = hourOfDayEff;
		} else if (UnderlayDrawWorkerEngine.backfillPrevious || UnderlayDrawWorkerEngine.imageSkyPreviousHour === time(2)) {
			// Cycle previous image on the hour
			UnderlayDrawWorkerEngine.imageSkyPrevious = UnderlayDrawWorkerEngine.imageSkyCurrent;
			UnderlayDrawWorkerEngine.imageSkyPreviousHour = time(1);
		}

		/**
		 * Starfield
		 */
		ctxStarfield.fillStyle = gradientStarfield;
		ctxStarfield.fillRect(0, 0, widthStarfield, height);

		ctxStarfield.globalCompositeOperation = 'source-atop';

		if (imageBitmapStars.height < canvasStarfield.height && imageBitmapStars.width < canvasStarfield.width) {
			scratch = 0;
			while (scratch < canvasStarfield.width) {
				ctxStarfield.drawImage(imageBitmapStars, scratch, 0);
				scratch2 = imageBitmapStars.height;

				while (scratch2 < canvasStarfield.height) {
					ctxStarfield.drawImage(imageBitmapStars, scratch, scratch2);
					scratch2 += imageBitmapStars.height;
				}

				scratch += imageBitmapStars.width;
			}
		} else if (imageBitmapStars.height < canvasStarfield.height) {
			scratch = 0;
			while (scratch < canvasStarfield.height) {
				ctxStarfield.drawImage(imageBitmapStars, 0, scratch);
				scratch += imageBitmapStars.height;
			}
		} else if (imageBitmapStars.width < canvasStarfield.width) {
			scratch = 0;
			while (scratch < canvasStarfield.width) {
				ctxStarfield.drawImage(imageBitmapStars, scratch, 0);
				scratch += imageBitmapStars.width;
			}
		} else {
			ctxStarfield.drawImage(imageBitmapStars, 0, 0);
		}

		ctxStarfield.globalCompositeOperation = 'source-over';
		imageBitmapStarfield = canvasStarfield.transferToImageBitmap();

		/**
		 * Draw
		 */
		if (!UnderlayDrawWorkerEngine.backfill) {
			if (fine && UnderlayDrawWorkerEngine.imageSkyCurrentHour === hourOfDayEff) {
				UnderlayDrawWorkerEngine.imageSkyCurrent = imageBitmapSky;
			}

			// Current Sky
			ctxSky.drawImage(imageBitmapSky, 0, 0);

			// Previous Sky Blend
			ctxSky.globalAlpha = 1 - minuteOfDayEffPercentage;
			ctxSky.drawImage(<ImageBitmap>UnderlayDrawWorkerEngine.imageSkyPrevious, 0, 0);
			ctxSky.globalAlpha = 1;

			// Starfield
			scratch = Math.round(UtilEngine.scale(hourPreciseOfDayEff, 24, 0, 1, 0) * 1000) / 1000; // Orbit
			ctxStarfield.drawImage(imageBitmapStarfield, imageBitmapStarfield.width * scratch, 0);
			ctxStarfield.drawImage(imageBitmapStarfield, -imageBitmapStarfield.width * (1 - scratch), 0);

			// done
			UnderlayDrawWorkerEngine.outputBitmap([canvasSky.transferToImageBitmap(), canvasStarfield.transferToImageBitmap()]);
		}
	}
}
