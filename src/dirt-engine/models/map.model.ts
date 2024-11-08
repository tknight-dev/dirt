import { Camera } from './camera.model';
import { Grid, GridConfig } from './grid.model';

/**
 * @author tknight-dev
 */

/**
 * clockSpeedRelativeToEarth:
 * 		1 is 24hr (smin) [min]
 * 		2 is 12hr (770min)
 * 		76 is 15min
 * 		288 is 5min
 * 		1440 is 1min
 * 		2880 is 30s
 * 		5760 is 15s [max]
 * 		17280 is 5s [max]
 * 		86400 is 1s [max]
 */
export interface Map extends MapConfig {
	camera: Camera;
	grids: { [key: string]: Grid }; // key is gridID
}

export interface MapConfig {
	clockSpeedRelativeToEarth: number; // default by MapEngine (Precision 3)
	gridConfigs: { [key: string]: GridConfig }; // key is gridID
	name: string;
	hourOfDay: number; // 24hour clock [0-23], defaulted by MapEngine (Precision 0)
}

export interface MapActive extends Map {
	clockTicker: number;
	durationInMS: number; // ms count since map started
	gridActive: Grid;
	gridActiveId: string;
	gridConfigActive: GridConfig;
	hourOfDayEff: number; // current time in game
	minuteOfHourEff: number; // current time in game
}
