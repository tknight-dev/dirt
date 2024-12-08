import { MapActive } from '../models/map.model';
import { MapDrawEngineBus } from '../draw/buses/map.draw.engine.bus';

/**
 * @author tknight-dev
 */

export class ClockCalcEngine {
	private static callbackHourOfDay: (hourOfDayEff: number) => void;
	private static callbackMinuteOfDay: (hourOfDayEff: number, minuteOfDayEff: number) => void;
	private static initialized: boolean;
	private static mapActive: MapActive;

	public static async initialize(): Promise<void> {
		if (ClockCalcEngine.initialized) {
			console.error('ClockCalcEngine > initialize: already initialized');
			return;
		}
		ClockCalcEngine.initialized = true;

		// Last
		ClockCalcEngine.startBind();
	}

	// Function set by binder, this is just a placeholder
	public static start(timestampDelta: number): void {}

	/**
	 * This binding structure greatly reduces GC build up
	 */
	private static startBind(): void {
		let clockSpeedRelativeToEarthEff: number, mapActive: MapActive, minute: number;

		ClockCalcEngine.start = (timestampDelta: number) => {
			mapActive = ClockCalcEngine.mapActive;
			clockSpeedRelativeToEarthEff = (86400000 / mapActive.clockSpeedRelativeToEarth) | 0;

			mapActive.clockTicker += timestampDelta;
			mapActive.durationInMS += timestampDelta;

			minute = Math.round((mapActive.clockTicker / clockSpeedRelativeToEarthEff) * 60);

			if (minute >= 60) {
				mapActive.clockTicker = 0;
				mapActive.hourOfDayEff = (mapActive.hourOfDayEff + 1) % 24;
				mapActive.minuteOfHourEff = minute % 60; // if triggered on minute 61 start the next hour on minute 1

				ClockCalcEngine.callbackHourOfDay(mapActive.hourOfDayEff);
				ClockCalcEngine.callbackMinuteOfDay(mapActive.hourOfDayEff, mapActive.minuteOfHourEff);
			} else if (minute !== mapActive.minuteOfHourEff) {
				mapActive.minuteOfHourEff = minute;
				ClockCalcEngine.callbackMinuteOfDay(mapActive.hourOfDayEff, mapActive.minuteOfHourEff);
			}
		};
	}

	/**
	 * Low quality
	 */
	public static setCallbackHourOfDay(callbackHourOfDay: (hourOfDayEff: number) => void) {
		ClockCalcEngine.callbackHourOfDay = callbackHourOfDay;
	}

	/**
	 * High quality
	 */
	public static setCallbackMinuteOfDay(callbackMinuteOfDay: (hourOfDayEff: number, minuteOfDayEff: number) => void) {
		ClockCalcEngine.callbackMinuteOfDay = callbackMinuteOfDay;
	}

	public static setMapActive(mapActive: MapActive) {
		ClockCalcEngine.mapActive = mapActive;
	}
}
