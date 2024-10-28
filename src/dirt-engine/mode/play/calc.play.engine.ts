import { MapActive } from '../../models/map.model';

/**
 * @author tknight-dev
 */

export class CalcPlayEngine {
	private static mapActive: MapActive;

	public static start(timestampNow: number, timestampThen: number): void {}

	public static setMapActive(mapActive: MapActive) {
		CalcPlayEngine.mapActive = mapActive;
	}
}
