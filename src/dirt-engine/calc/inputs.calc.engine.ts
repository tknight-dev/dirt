import { CameraEngine } from '../engines/camera.engine';
import { KeyAction, KeyCommon } from '../engines/keyboard.engine';
import { MapDrawEngine } from '../draw/map.draw.engine';
import { MouseAction, MouseCmd } from '../engines/mouse.engine';
import { TouchAction, TouchCmd, TouchPosition } from '../engines/touch.engine';

/**
 * @author tknight-dev
 */

export class InputsCalcEngine {
	private static initialized: boolean;
	private static mapVisible: boolean;
	private static paused: boolean;
	private static stateAction: { [key: number]: boolean } = {};
	private static stateModifier: { [key: number]: boolean } = {};
	private static stateMove: { [key: number]: boolean } = {};
	private static status: boolean;

	public static async initialize(): Promise<void> {
		if (InputsCalcEngine.initialized) {
			console.error('InputsCalcEngine > initialize: already initialized');
			return;
		}
		InputsCalcEngine.initialized = true;

		// Last
		InputsCalcEngine.startBind();
		InputsCalcEngine.touchInputBind();
	}

	// Function set by binder, this is just a placeholder
	public static start(timestampDelta: number): void {}

	/**
	 * This binding structure greatly reduces GC build up
	 */
	private static startBind(): void {
		let horizontal: number,
			stateAction: { [key: number]: boolean } = InputsCalcEngine.stateAction,
			stateModifier: { [key: number]: boolean } = InputsCalcEngine.stateModifier,
			stateMove: { [key: number]: boolean } = InputsCalcEngine.stateMove,
			vertical: number;

		InputsCalcEngine.start = (timestampDelta: number) => {
			horizontal = 0;
			vertical = 0;

			if (stateMove[KeyCommon.DOWN]) {
				vertical = timestampDelta;
			} else if (stateMove[KeyCommon.UP]) {
				vertical = -timestampDelta;
			}

			if (stateMove[KeyCommon.LEFT]) {
				horizontal = -timestampDelta;
			} else if (stateMove[KeyCommon.RIGHT]) {
				horizontal = timestampDelta;
			}

			if (horizontal || vertical) {
				CameraEngine.moveIncremental(horizontal, vertical);
			}
		};
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

	public static inputTouch(action: TouchAction): void {}

	public static touchInputBind(): void {
		let absX: number,
			absY: number,
			absZoom: number,
			distance: number,
			touchDistanceActive: boolean,
			touchDistanceOrig: number,
			touchDistanceOrigX: number,
			touchDistanceOrigY: number,
			touchPosition: TouchPosition,
			x: number,
			y: number;

		InputsCalcEngine.inputTouch = (action: TouchAction) => {
			if (InputsCalcEngine.paused || !InputsCalcEngine.status) {
				return;
			}

			switch (action.cmd) {
				case TouchCmd.ZOOM:
					if (action.down) {
						touchDistanceActive = true;
						touchPosition = action.positions[0];

						touchDistanceOrig = <number>touchPosition.distance;
						touchDistanceOrigX = touchPosition.x;
						touchDistanceOrigY = touchPosition.y;
					} else {
						touchDistanceActive = false;

						InputsCalcEngine.stateMove[KeyCommon.DOWN] = false;
						InputsCalcEngine.stateMove[KeyCommon.LEFT] = false;
						InputsCalcEngine.stateMove[KeyCommon.RIGHT] = false;
						InputsCalcEngine.stateMove[KeyCommon.UP] = false;
					}
					break;
				case TouchCmd.ZOOM_MOVE:
					if (touchDistanceActive) {
						touchPosition = action.positions[0];

						(distance = <number>touchPosition.distance),
							(x = touchPosition.x),
							(y = touchPosition.y),
							(absX = Math.abs(touchDistanceOrigX - x)),
							(absY = Math.abs(touchDistanceOrigY - y)),
							(absZoom = Math.abs(touchDistanceOrig - distance));

						// Move X
						if (absX > 40) {
							if (touchDistanceOrigX - x > 0) {
								InputsCalcEngine.stateMove[KeyCommon.LEFT] = !action.down;
								InputsCalcEngine.stateMove[KeyCommon.RIGHT] = action.down;
							} else {
								InputsCalcEngine.stateMove[KeyCommon.LEFT] = action.down;
								InputsCalcEngine.stateMove[KeyCommon.RIGHT] = !action.down;
							}
							touchDistanceOrigX = x;
						}

						// Move Y
						if (absY > 40) {
							if (touchDistanceOrigY - y > 0) {
								InputsCalcEngine.stateMove[KeyCommon.DOWN] = action.down;
								InputsCalcEngine.stateMove[KeyCommon.UP] = !action.down;
							} else {
								InputsCalcEngine.stateMove[KeyCommon.DOWN] = !action.down;
								InputsCalcEngine.stateMove[KeyCommon.UP] = action.down;
							}
							touchDistanceOrigY = y;
						}

						// Zoom
						if (absZoom > 40) {
							if (touchDistanceOrig - distance > 0) {
								CameraEngine.zoom(false);
							} else {
								CameraEngine.zoom(true);
							}
							touchDistanceOrig = distance;
						}
					}
					break;
			}
		};
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
