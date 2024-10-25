/**
 * @author tknight-dev
 */

export interface Grid {
	blocks: { [key: number]: GridBlock }; // key is hash
	height: number;
	width: number;
}

export interface GridCoordinate {
	gx: number;
	gy: number;
}

export interface GridBlock extends GridObject {
	hash: number;
	type: GridBlockType;
}

export enum GridBlockType { // number is grid size
	DIRT = 1,
}

export interface GridObject extends GridCoordinate {
	grounded: boolean;
	gSize: number; // refers to number of grid squares the object takes up
	timeSinceLastUpdate: number;
	velX: number; // kph
	velY: number; // kph
	weight: number; // kg
}
