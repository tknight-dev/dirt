import { CameraEngine } from '../engines/camera.engine';
import { KeyAction, KeyCommon } from '../engines/keyboard.engine';
import { MapDrawEngine } from '../draw/map.draw.engine';
import { MouseAction, MouseCmd } from '../engines/mouse.engine';
import { TouchAction, TouchCmd } from '../engines/touch.engine';

/**
 * @author tknight-dev
 */

export class InputsCalcEngine {
	private static mapVisible: boolean;
	private static paused: boolean;
	private static stateAction: { [key: number]: boolean } = {};
	private static stateModifier: { [key: number]: boolean } = {};
	private static stateMove: { [key: number]: boolean } = {};
	private static status: boolean;
	private static timestampDelta: number = 0;
	private static touchDistanceActive: boolean;
	private static touchDistanceOrig: number;
	private static touchDistanceOrigX: number;
	private static touchDistanceOrigY: number;

	public static start(timestampDelta: number): void {
		InputsCalcEngine.timestampDelta += timestampDelta;

		// Limit input changes to Xms
		if (InputsCalcEngine.timestampDelta > 32) {
			InputsCalcEngine.timestampDelta = 0;

			let stateAction: { [key: number]: boolean } = InputsCalcEngine.stateAction,
				stateModifier: { [key: number]: boolean } = InputsCalcEngine.stateModifier,
				stateMove: { [key: number]: boolean } = InputsCalcEngine.stateMove;

			if (stateMove[KeyCommon.DOWN]) {
				CameraEngine.moveIncremental(0, 33);
			} else if (stateMove[KeyCommon.UP]) {
				CameraEngine.moveIncremental(0, -33);
			}

			if (stateMove[KeyCommon.LEFT]) {
				CameraEngine.moveIncremental(-33, 0);
			} else if (stateMove[KeyCommon.RIGHT]) {
				CameraEngine.moveIncremental(33, 0);
			}
		}
	}

	public static inputKey(action: KeyAction): void {
		switch (action.key) {
			case KeyCommon.CROUCH:
			case KeyCommon.JUMP:
			case KeyCommon.RUN:
				InputsCalcEngine.stateModifier[action.key] = action.down;
				break;
			case KeyCommon.DOWN:
			case KeyCommon.LEFT:
			case KeyCommon.RIGHT:
			case KeyCommon.UP:
				InputsCalcEngine.stateMove[action.key] = action.down;
				break;
			case KeyCommon.INTERACT:
			case KeyCommon.MEELE:
				InputsCalcEngine.stateAction[action.key] = action.down;
				break;
		}
	}

	public static inputMouse(action: MouseAction): void {
		if (InputsCalcEngine.paused || !InputsCalcEngine.status) {
			return;
		}

		switch (action.cmd) {
			case MouseCmd.LEFT_CLICK:
				if (InputsCalcEngine.mapVisible && MapDrawEngine.isPixelInMap(action.position.xRel, action.position.yRel)) {
					MapDrawEngine.moveToPx(action.position.xRel, action.position.yRel);
				}
				break;
			case MouseCmd.WHEEL:
				if (action.down) {
					CameraEngine.zoom(false);
				} else {
					CameraEngine.zoom(true);
				}
				break;
		}
	}

	public static inputTouch(action: TouchAction): void {
		if (InputsCalcEngine.paused || !InputsCalcEngine.status) {
			return;
		}

		switch (action.cmd) {
			case TouchCmd.ZOOM:
				if (action.down) {
					InputsCalcEngine.touchDistanceActive = true;
					InputsCalcEngine.touchDistanceOrig = <number>action.positions[0].distance;
					InputsCalcEngine.touchDistanceOrigX = <number>action.positions[0].x;
					InputsCalcEngine.touchDistanceOrigY = <number>action.positions[0].y;
				} else {
					InputsCalcEngine.touchDistanceActive = false;
				}
				break;
			case TouchCmd.ZOOM_MOVE:
				if (InputsCalcEngine.touchDistanceActive) {
					let distance: number = <number>action.positions[0].distance,
						x: number = <number>action.positions[0].x,
						y: number = <number>action.positions[0].y,
						absX: number = Math.abs(InputsCalcEngine.touchDistanceOrigX - x),
						absY: number = Math.abs(InputsCalcEngine.touchDistanceOrigY - y),
						absZoom: number = Math.abs(InputsCalcEngine.touchDistanceOrig - distance);

					// Move X
					if (absX > 40) {
						if (InputsCalcEngine.touchDistanceOrigX - x > 0) {
							InputsCalcEngine.stateMove[KeyCommon.RIGHT] = action.down;
						} else {
							InputsCalcEngine.stateMove[KeyCommon.LEFT] = action.down;
						}
						InputsCalcEngine.touchDistanceOrigX = x;
					}

					// Move Y
					if (absY > 40) {
						if (InputsCalcEngine.touchDistanceOrigY - y > 0) {
							InputsCalcEngine.stateMove[KeyCommon.DOWN] = action.down;
						} else {
							InputsCalcEngine.stateMove[KeyCommon.UP] = action.down;
						}
						InputsCalcEngine.touchDistanceOrigY = y;
					}

					// Zoom
					if (absZoom > 40) {
						if (InputsCalcEngine.touchDistanceOrig - distance > 0) {
							CameraEngine.zoom(false);
						} else {
							CameraEngine.zoom(true);
						}
						InputsCalcEngine.touchDistanceOrig = distance;
					}
				}
				break;
		}
	}

	public static setMapVisible(mapVisible: boolean): void {
		InputsCalcEngine.mapVisible = mapVisible;
	}

	public static setPaused(paused: boolean): void {
		InputsCalcEngine.paused = paused;
	}

	public static setStatus(status: boolean): void {
		InputsCalcEngine.status = status;
	}
}
