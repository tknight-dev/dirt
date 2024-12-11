import { AssetImage } from '../../models/asset.model';
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
		| MapDrawBusInputPlayloadInitial
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
	grids: { [key: string]: string };
	gridConfigs: { [key: string]: string };
}

export interface MapDrawBusInputPlayloadInitial {
	assetImages: { [key: string]: AssetImage };
}

export interface MapDrawBusInputPlayloadResolution {
	height: number;
	width: number;
}

export interface MapDrawBusInputPlayloadSettings {
	darknessMax: number;
	mapVisible: boolean;
	vanishingEnable: boolean;
	vanishingPercentageOfViewport: number;
}

export interface MapDrawBusInputPlayloadTimeForced {
	forced: boolean;
}
