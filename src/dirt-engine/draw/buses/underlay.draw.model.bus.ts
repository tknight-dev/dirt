/**
 * @author tknight-dev
 */

export enum UnderlayDrawBusInputCmd {
	INITIALIZE,
	SET_RESOLUTION,
	SET_TIME,
	SET_TIME_FORCED,
}

export interface UnderlayDrawBusInputPlayload {
	cmd: UnderlayDrawBusInputCmd;
	data:
		| UnderlayDrawBusInputPlayloadInitial
		| UnderlayDrawBusInputPlayloadResolution
		| UnderlayDrawBusInputPlayloadTime
		| UnderlayDrawBusInputPlayloadTimeForced;
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
