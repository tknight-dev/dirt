import { Grid } from '../../models/grid.model';

/**
 * @author tknight-dev
 */

export enum MapDrawBusInputCmd {
	INITIALIZE,
	SET_ASSETS,
	SET_CAMERA,
	SET_FOREGROUND_VIEWER,
	SET_GRID_ACTIVE,
	SET_GRIDS,
	SET_HOUR_PRECISE_OF_DAY_EFF,
	SET_RESOLUTION,
}

export interface MapDrawBusInputPlayload {
	cmd: MapDrawBusInputCmd;
	data:
		| MapDrawBusInputPlayloadAssets
		| MapDrawBusInputPlayloadCamera
		| MapDrawBusInputPlayloadForegroundViewer
		| MapDrawBusInputPlayloadGridActive
		| MapDrawBusInputPlayloadGrids
		| MapDrawBusInputPlayloadHourPreciseOfDayEff
		| MapDrawBusInputPlayloadInitial
		| MapDrawBusInputPlayloadResolution;
}

export interface MapDrawBusInputPlayloadAsset {
	gHeight: number;
	gWidth: number;
	image: ImageBitmap;
}

export interface MapDrawBusInputPlayloadAssets {
	assets: { [key: string]: MapDrawBusInputPlayloadAsset }; // key is assetImageId
}

export interface MapDrawBusInputPlayloadCamera {
	gInPh: number;
	gInPw: number;
	gx: number;
	gy: number;
}

export interface MapDrawBusInputPlayloadForegroundViewer {
	foregroundViewerEnable: boolean;
	foregroundViewerPercentageOfViewport: number; // between 0 and 2, default is .25 (Precision 3)
}

export interface MapDrawBusInputPlayloadGridActive {
	id: string;
}

export interface MapDrawBusInputPlayloadGrids {
	grids: { [key: string]: Grid };
}

export interface MapDrawBusInputPlayloadHourPreciseOfDayEff {
	hourPreciseOfDayEff: number;
}

export interface MapDrawBusInputPlayloadInitial extends MapDrawBusInputPlayloadForegroundViewer {}

export interface MapDrawBusInputPlayloadResolution {
	height: number;
	width: number;
}

export enum MapDrawBusOutputCmd {
	SET_BITMAP,
}

export interface MapDrawBusOutputPlayload {
	cmd: MapDrawBusOutputCmd;
	data: MapDrawBusOutputPlayloadBitmap;
}

export interface MapDrawBusOutputPlayloadBitmap {
	image: ImageBitmap;
}
