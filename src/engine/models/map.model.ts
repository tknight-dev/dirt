import { Camera } from './camera.model';
import { Grid } from './grid.model';

/**
 * @author tknight-dev
 */

export interface Map {
	camera: Camera;
	grids: { [key: string]: Grid }; // key is gridID
	name: string;
}

export interface MapActive extends Map {
	gridActive: Grid;
	gridActiveId: string;
}
