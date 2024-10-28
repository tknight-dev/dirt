/**
 * Edges of the grid may fall outside of viewer as they may reside in buffer space
 *
 * @author tknight-dev
 */

export interface Grid {
	blocks: { [key: number]: GridBlock }; // key is hash
	gHeight: number; // calculated, Precision 0
	gWidth: number; // Precision 0
	id: string;
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

export interface GridBlock extends GridObject {
	blockType: GridBlockType;
	hash: number;
}

export enum GridBlockType {
	DIRT,
}

export interface GridObject extends GridCoordinate {
	grounded: boolean;
	gSize: number; // refers to number of grid squares the object takes up
	timeSinceLastUpdate: number;
	type: GridObjectType;
	velX: number; // kph
	velY: number; // kph
	weight: number; // kg
}

export enum GridObjectType {
	BLOCK,
	CAMERA,
}
