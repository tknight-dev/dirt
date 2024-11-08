import { ClockCalcEngine } from '../../../calc/clock.calc.engine';
import { MapActive } from '../../../models/map.model';

/**
 * @author tknight-dev
 */

export class CalcEditEngine {
	private static mapActive: MapActive;

	public static start(timestampDelta: number): void {
		ClockCalcEngine.start(timestampDelta);
	}

	public static setMapActive(mapActive: MapActive) {
		CalcEditEngine.mapActive = mapActive;
	}
}
