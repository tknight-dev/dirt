import { MapActive } from '../models/map.model';
import { MapDrawEngineBus } from '../draw/buses/map.draw.engine.bus';

/**
 * @author tknight-dev
 */

export class ClockCalcEngine {
	private static callbackHourOfDay: (hourOfDayEff: number) => void;
	private static callbackMinuteOfDay: (hourOfDayEff: number, minuteOfDayEff: number) => void;
	private static mapActive: MapActive;

	/**
	 * 86400000 is miliseconds in 1 day
	 */
	public static start(timestampDelta: number): void {
		let mapActive: MapActive = ClockCalcEngine.mapActive,
			clockSpeedRelativeToEarthEff = Math.round(86400000 / mapActive.clockSpeedRelativeToEarth),
			minute: number;

		mapActive.clockTicker += timestampDelta;
		mapActive.durationInMS += timestampDelta;

		minute = Math.round((mapActive.clockTicker / clockSpeedRelativeToEarthEff) * 60);

		if (minute === 60) {
			mapActive.clockTicker = 0;
			mapActive.hourOfDayEff = (mapActive.hourOfDayEff + 1) % 24;
			mapActive.minuteOfHourEff = 0;

			setTimeout(() => {
				ClockCalcEngine.callbackHourOfDay(mapActive.hourOfDayEff);
				ClockCalcEngine.callbackMinuteOfDay(mapActive.hourOfDayEff, mapActive.minuteOfHourEff);
			});
		} else if (minute !== mapActive.minuteOfHourEff) {
			mapActive.minuteOfHourEff = minute;

			setTimeout(() => {
				ClockCalcEngine.callbackMinuteOfDay(mapActive.hourOfDayEff, mapActive.minuteOfHourEff);
			});
		}
	}

	/**
	 * Low resolution
	 */
	public static setCallbackHourOfDay(callbackHourOfDay: (hourOfDayEff: number) => void) {
		ClockCalcEngine.callbackHourOfDay = callbackHourOfDay;
	}

	/**
	 * High resolution
	 */
	public static setCallbackMinuteOfDay(callbackMinuteOfDay: (hourOfDayEff: number, minuteOfDayEff: number) => void) {
		ClockCalcEngine.callbackMinuteOfDay = callbackMinuteOfDay;
	}

	public static setMapActive(mapActive: MapActive) {
		ClockCalcEngine.mapActive = mapActive;
	}
}
