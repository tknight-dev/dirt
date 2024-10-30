import { Camera } from './camera.model';
import { Grid } from './grid.model';

/**
 * @author tknight-dev
 */

/**
 * clockSpeedRelativeToEarth:
 * 		1 is 24hr (1440min) [min]
 * 		2 is 12hr (770min)
 * 		76 is 15min
 * 		288 is 5min
 * 		1440 is 1min
 * 		2880 is 30s
 * 		5760 is 15s [max]
 */
export interface Map {
	camera: Camera;
	clockSpeedRelativeToEarth: number; // default by MapEngine (Precision 3)
	grids: { [key: string]: Grid }; // key is gridID
	name: string;
	hourOfDay: number; // 24hour clock, defaulted by MapEngine (Precision 0)
}

export interface MapActive extends Map {
	gridActive: Grid;
	gridActiveId: string;
	hourOfDayEff: number; // current time in game
}
