import { AnimationsCalcEngine } from '../../../calc/animations.calc.engine';
import { ClockCalcEngine } from '../../../calc/clock.calc.engine';
import { InputsCalcEngine } from '../../../calc/inputs.calc.engine';
import { MapActive } from '../../../models/map.model';

/**
 * @author tknight-dev
 */

export class CalcPlayEngine {
	private static mapActive: MapActive;

	public static start(timestampDelta: number): void {
		// First
		InputsCalcEngine.start(timestampDelta);

		// Normal
		AnimationsCalcEngine.start(timestampDelta);
		ClockCalcEngine.start(timestampDelta);
	}

	public static setMapActive(mapActive: MapActive) {
		CalcPlayEngine.mapActive = mapActive;
	}
}
