import { UtilEngine } from './util.engine';

/**
 * @author tknight-dev
 */

export interface MouseAction {
	cmd: MouseCmd;
	down: boolean | undefined;
	position: MousePosition | undefined;
}

export enum MouseCmd {
	LEFT,
	LEFT_CLICK,
	WHEEL,
}

export interface MousePosition {
	x: number; // 0 is left of canvas (precision 0)
	xRel: number; // between 0 and 1 (precision 3)
	y: number; // 0 is top of canvas (precision 0)
	yRel: number; // between 0 and 1 (precision 3)
}

export class MouseEngine {
	private static callback: (action: MouseAction) => void;
	private static canvas: HTMLCanvasElement;
	private static initialized: boolean;

	private static calc(event: MouseEvent): MousePosition {
		let domRect: DOMRect = MouseEngine.canvas.getBoundingClientRect(),
			xEff: number = Math.round(Math.max(domRect.x, Math.min(domRect.right, event.clientX)) - domRect.x),
			yEff: number = Math.round(Math.max(domRect.y, Math.min(domRect.bottom, event.clientY)) - domRect.y);

		return {
			x: xEff,
			xRel: Math.round((xEff / domRect.width) * 1000) / 1000,
			y: yEff,
			yRel: Math.round((yEff / domRect.height) * 1000) / 1000,
		};
	}

	public static async initialize(canvas: HTMLCanvasElement): Promise<void> {
		if (MouseEngine.initialized) {
			return;
		}
		MouseEngine.initialized = true;
		MouseEngine.canvas = canvas;

		document.addEventListener('click', (event) => {
			if (MouseEngine.callback) {
				MouseEngine.callback({
					cmd: MouseCmd.LEFT_CLICK,
					down: undefined,
					position: MouseEngine.calc(event),
				});
			}
		});
		document.addEventListener('mousedown', (event: MouseEvent) => {
			if (MouseEngine.callback) {
				MouseEngine.callback({
					cmd: MouseCmd.LEFT,
					down: true,
					position: MouseEngine.calc(event),
				});
			}
		});
		document.addEventListener('mouseup', (event: MouseEvent) => {
			if (MouseEngine.callback) {
				MouseEngine.callback({
					cmd: MouseCmd.LEFT,
					down: false,
					position: MouseEngine.calc(event),
				});
			}
		});
		document.addEventListener('wheel', (event: any) => {
			if (MouseEngine.callback) {
				if (event.deltaY > 0) {
					MouseEngine.callback({
						cmd: MouseCmd.WHEEL,
						down: true,
						position: MouseEngine.calc(event),
					});
				} else {
					MouseEngine.callback({
						cmd: MouseCmd.WHEEL,
						down: false,
						position: MouseEngine.calc(event),
					});
				}
			}
		});
	}

	public static setCallback(callback: (action: MouseAction) => void) {
		MouseEngine.callback = callback;
	}
}
