import { MapActive } from '../models/map.model';

/**
 * @author tknight-dev
 */

export class ClockCalcEngine {
	private static callbackHourOfDay: (hourOfDayEff: number) => void;
	private static mapActive: MapActive;

	public static start(timestampDelta: number): void {
		let mapActive: MapActive = ClockCalcEngine.mapActive,
			clockSpeedRelativeToEarthEff = Math.round(86400000 / mapActive.clockSpeedRelativeToEarth);

		mapActive.clockTicker += timestampDelta;
		mapActive.durationInMS += timestampDelta;

		if (mapActive.clockTicker >= clockSpeedRelativeToEarthEff) {
			mapActive.clockTicker -= clockSpeedRelativeToEarthEff;
			mapActive.hourOfDayEff = (mapActive.hourOfDayEff + 1) % 24;

			setTimeout(() => {
				ClockCalcEngine.callbackHourOfDay(mapActive.hourOfDayEff);
			});
		}
	}

	public static setCallbackHourOfDay(callbackHourOfDay: (hourOfDayEff: number) => void) {
		ClockCalcEngine.callbackHourOfDay = callbackHourOfDay;
	}

	public static setMapActive(mapActive: MapActive) {
		ClockCalcEngine.mapActive = mapActive;
	}
}
