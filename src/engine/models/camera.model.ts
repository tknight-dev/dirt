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
	viewPortGh: number; // Precision 3
	viewPortGhEff: number; // Precision 3
	viewPortGw: number; // Precision 0
	viewPortGwEff: number; // Precision 3
	viewPortGx: number; // Precision 3
	viewPortGy: number; // Precision 3
	viewPortPh: number; // Precision 0
	viewPortPw: number; // Precision 0
	viewPortPx: number; // Precision 0
	viewPortPy: number; // Precision 0
	windowPh: number; // Precision 0
	windowPw: number; // Precision 0
	windowPx: number; // Precision 0
	windowPy: number; // Precision 0
	zoom: number; // Precision 3
}
