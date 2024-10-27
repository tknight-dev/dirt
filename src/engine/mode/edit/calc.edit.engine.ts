import { MapActive } from '../../models/map.model';

/**
 * @author tknight-dev
 */

export class CalcEditEngine {
	private static mapActive: MapActive;

	public static start(timestampNow: number, timestampThen: number): void {}

	public static setMapActive(mapActive: MapActive) {
		CalcEditEngine.mapActive = mapActive;
	}
}
