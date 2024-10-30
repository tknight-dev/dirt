import { AssetAudio, AssetAudioType, AssetImage } from './asset.model';

/**
 * Edges of the grid may fall outside of viewer as they may reside in buffer space
 *
 * @author tknight-dev
 */

export interface Grid {
	audio: { [key: number]: GridAudio }; // key is hash
	blocks: { [key: number]: GridBlock }; // key is hash
	gHeight: number; // calculated, Precision 0
	gHorizon: number; // Precision 0
	gWidth: number; // Precision 0
	id: string;
	lights: { [key: number]: GridLight }; // key is hash
	lightIntensityGlobal: number; // defaulted by MapEngine (Precision 3)
	outside: boolean; // defaulted by MapEngine
	startGxCamera: number; // Precision 3
	startGyCamera: number; // Precision 3
	startGxPlayer: number; // Precision 3
	startGyPlayer: number; // Precision 3
	zoomDefault: number; // defaulted by MapEngine
}

export interface GridCoordinate {
	gx: number; // Precision 3
	gy: number; // Precision 3
}

export interface GridAudio extends GridObject {
	asset: AssetAudio;
	hash: number;
	type: AssetAudioType;
}

export interface GridBlock extends GridObject {
	asset: AssetImage;
	hash: number;
	type: GridBlockType;
}

export enum GridBlockType {
	DIRT,
}

export interface GridLight extends GridCoordinate {
	decay: number;
	destructible: boolean;
	hash: number;
	intensity: number;
	type: GridLightType;
}

export enum GridLightType {
	DOWN,
	LEFT,
	OMNI,
	RIGHT,
	UP,
}

export interface GridObject extends GridCoordinate {
	grounded: boolean;
	gSize: number; // refers to number of grid squares the object takes up
	timeSinceLastUpdate: number;
	velX: number; // kph
	velY: number; // kph
	weight: number; // kg
}
