import { GridObject } from './grid.model';

/**
 * @author tknight-dev
 */

/**
 * Grid cooridnate precision 3
 */
export interface Camera extends GridObject {
	gInPh: number; // Precision 3
	gInPw: number; // Precision 3
	viewportGh: number; // Precision 3
	viewportGhEff: number; // Precision 3
	viewportGw: number; // Precision 0
	viewportGwEff: number; // Precision 3
	viewportGx: number; // Precision 3
	viewportGy: number; // Precision 3
	viewportPh: number; // Precision 0
	viewportPw: number; // Precision 0
	viewportPx: number; // Precision 0
	viewportPx2: number; // Precision 0 (2nd is right most value)
	viewportPy: number; // Precision 0
	viewportPy2: number; // Precision 0 (2nd is bottom most value)
	windowPh: number; // Precision 0
	windowPw: number; // Precision 0
	windowPx: number; // Precision 0
	windowPy: number; // Precision 0
	zoom: number; // Precision 3
}
