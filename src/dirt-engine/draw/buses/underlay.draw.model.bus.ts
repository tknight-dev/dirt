/**
 * @author tknight-dev
 */

export enum UnderlayDrawBusInputCmd {
	INITIALIZE,
	SET_HORIZON,
	SET_RESOLUTION,
	SET_TIME,
	SET_TIME_FORCED,
}

export interface UnderlayDrawBusInputPlayload {
	cmd: UnderlayDrawBusInputCmd;
	data: UnderlayDrawBusInputPlayloadInitial | UnderlayDrawBusInputPlayloadResolution | UnderlayDrawBusInputPlayloadTimeForced;
}

export interface UnderlayDrawBusInputPlayloadHorizon {
	gHorizon: number;
}

export interface UnderlayDrawBusInputPlayloadInitial {}

export interface UnderlayDrawBusInputPlayloadResolution {
	height: number;
	width: number;
}

export interface UnderlayDrawBusInputPlayloadTime {
	hourPreciseOfDayEff: number;
}

export interface UnderlayDrawBusInputPlayloadTimeForced {
	forced: boolean;
}
