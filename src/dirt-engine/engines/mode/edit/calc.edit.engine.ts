import { AnimationImageBlocksCalcEngine } from '../../../calc/animation-image-blocks.calc.engine';
import { ClockCalcEngine } from '../../../calc/clock.calc.engine';
import { InputsCalcEngine } from '../../../calc/inputs.calc.engine';
import { MapActive } from '../../../models/map.model';

/**
 * @author tknight-dev
 */

export class CalcEditEngine {
	private static mapActive: MapActive;

	public static start(timestampDelta: number): void {
		// First
		InputsCalcEngine.start(timestampDelta);

		// Normal
		AnimationImageBlocksCalcEngine.start(timestampDelta);
		ClockCalcEngine.start(timestampDelta);
	}

	public static setMapActive(mapActive: MapActive) {
		CalcEditEngine.mapActive = mapActive;
	}
}
