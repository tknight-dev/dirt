/**
 * @author tknight-dev
 */

export enum UnderlayDrawBusInputCmd {
	INITIALIZE,
	RESET_TIME,
	SET_RESOLUTION,
	SET_TIME,
}

export interface UnderlayDrawBusInputPlayload {
	cmd: UnderlayDrawBusInputCmd;
	data:
		| UnderlayDrawBusInputPlayloadInitial
		| UnderlayDrawBusInputPlayloadResetTime
		| UnderlayDrawBusInputPlayloadResolution
		| UnderlayDrawBusInputPlayloadTime;
}

export interface UnderlayDrawBusInputPlayloadInitial {
	assetIds: string[];
	images: ImageBitmap[];
}

export interface UnderlayDrawBusInputPlayloadResetTime {
	hourPreciseOfDayEff: number;
}

export interface UnderlayDrawBusInputPlayloadResolution {
	height: number;
	width: number;
}

export interface UnderlayDrawBusInputPlayloadTime {
	hourPreciseOfDayEff: number;
}
