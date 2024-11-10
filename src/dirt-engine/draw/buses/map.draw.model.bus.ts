import { Grid, GridConfig } from '../../models/grid.model';

/**
 * @author tknight-dev
 */

export enum MapDrawBusInputCmd {
	INITIALIZE,
	SET_ASSETS,
	SET_CAMERA,
	SET_GRID_ACTIVE,
	SET_GRIDS,
	SET_RESOLUTION,
	SET_SETTINGS,
	SET_TIME_FORCED,
}

export interface MapDrawBusInputPlayload {
	cmd: MapDrawBusInputCmd;
	data:
		| MapDrawBusInputPlayloadAssets
		| MapDrawBusInputPlayloadCamera
		| MapDrawBusInputPlayloadGridActive
		| MapDrawBusInputPlayloadGrids
		| MapDrawBusInputPlayloadResolution
		| MapDrawBusInputPlayloadSettings
		| MapDrawBusInputPlayloadTimeForced;
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
	viewportGh: number;
	windowPh: number;
	windowPw: number;
	zoom: number;
}

export interface MapDrawBusInputPlayloadGridActive {
	id: string;
}

export interface MapDrawBusInputPlayloadGrids {
	grids: { [key: string]: Grid };
	gridConfigs: { [key: string]: GridConfig };
}

export interface MapDrawBusInputPlayloadResolution {
	height: number;
	width: number;
}

export interface MapDrawBusInputPlayloadSettings {
	darknessMax: number;
	foregroundViewerEnable: boolean;
	foregroundViewerPercentageOfViewport: number;
	mapVisible: boolean;
}

export interface MapDrawBusInputPlayloadTimeForced {
	forced: boolean;
}
