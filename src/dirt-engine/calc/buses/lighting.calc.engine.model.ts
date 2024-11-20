import { GridConfig } from '../../models/grid.model';
import { VideoBusInputCmdGameModeEditApplyZ } from '../../engines/buses/video.model.bus';

/**
 * @author tknight-dev
 */

export interface LightingCalcBusHashStack {
	hashBackground: number;
	hashGroup: number;
}

export enum LightingCalcBusInputCmd {
	FLASH,
	INITIALIZE,
	REMOVE_LIGHT,
	SET_GRID_ACTIVE,
	SET_GRIDS,
	SET_HOUR_PRECISE_OF_DAY_EFF,
}

export interface LightingCalcBusInputPlayload {
	cmd: LightingCalcBusInputCmd;
	data:
		| LightingCalcBusInputPlayloadFlash
		| LightingCalcBusInputPlayloadGridActive
		| LightingCalcBusInputPlayloadGrids
		| LightingCalcBusInputPlayloadHourOfDayEff
		| undefined;
}

export interface LightingCalcBusInputPlayloadFlash {
	durationInMS: number;
	gHash: number;
	intensity: number; // between 0 and 10, Precision 3
	then?: number;
	z: VideoBusInputCmdGameModeEditApplyZ;
}

export interface LightingCalcBusInputPlayloadGridActive {
	id: string;
}

/**
 * Trim Grid model down to image-blocks and lights before sending on bus
 */
export interface LightingCalcBusInputPlayloadGrids {
	grids: { [key: string]: string };
	gridConfigs: { [key: string]: GridConfig };
}

export interface LightingCalcBusInputPlayloadHourOfDayEff {
	hourPreciseOfDayEff: number;
}

export interface LightingCalcBusOutputDecompressed {
	backgroundBrightness: number;
	backgroundBrightnessOutside: number;
	groupBrightness: number;
	groupBrightnessOutside: number;
}
