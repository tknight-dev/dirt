import { ImageBlockDrawEngine } from '../draw/image-block.draw.engine';
import { DoubleLinkedList, DoubleLinkedListNode } from '../models/double-linked-list.model';
import { GridAnimation, GridAnimationCalc } from '../models/grid.model';
import { MapActive } from '../models/map.model';

/**
 * @author tknight-dev
 */

export class AnimationsCalcEngine {
	private static initialized: boolean;
	private static mapActive: MapActive;

	public static async initialize(): Promise<void> {
		if (AnimationsCalcEngine.initialized) {
			console.error('AnimationsCalcEngine > initialize: already initialized');
			return;
		}
		AnimationsCalcEngine.initialized = true;

		// Last
		AnimationsCalcEngine.startBind();
	}

	// Function set by binder, this is just a placeholder
	public static start(timestampDelta: number): void {}

	/**
	 * This binding structure greatly reduces GC build up
	 */
	private static startBind(): void {
		let animationUpdate: boolean,
			gridAnimation: GridAnimation,
			gridAnimationCalc: GridAnimationCalc,
			imageBlocksCalcPipelineAnimations: DoubleLinkedList<GridAnimation>,
			node: DoubleLinkedListNode<GridAnimation> | undefined;

		AnimationsCalcEngine.start = (timestampDelta: number) => {
			imageBlocksCalcPipelineAnimations = AnimationsCalcEngine.mapActive.gridActive.imageBlocksCalcPipelineAnimations;

			if (!imageBlocksCalcPipelineAnimations.length) {
				return;
			}

			animationUpdate = false;
			node = imageBlocksCalcPipelineAnimations.getStart();
			while (node) {
				gridAnimation = node.data;
				gridAnimationCalc = <GridAnimationCalc>gridAnimation.calc;

				if (!gridAnimationCalc.ended) {
					// Start
					gridAnimationCalc.durationInMs += timestampDelta;

					// Next frame?
					if (gridAnimationCalc.durationInMs > gridAnimation.frameDurationInMs) {
						if (!animationUpdate) {
							animationUpdate = true;
						}
						gridAnimationCalc.durationInMs = 0;

						if (gridAnimation.reverse) {
							gridAnimationCalc.index--;

							// Loop index?
							if (gridAnimationCalc.index === -1) {
								gridAnimationCalc.count++;
								gridAnimationCalc.index = gridAnimation.assetIds.length - 1;
							}
						} else {
							gridAnimationCalc.index++;

							// Loop index?
							if (gridAnimationCalc.index === gridAnimation.assetIds.length) {
								gridAnimationCalc.count++;
								gridAnimationCalc.index = 0;
							}
						}

						// Ended?
						if (gridAnimation.loopCount && gridAnimation.loopCount === gridAnimationCalc.count) {
							gridAnimationCalc.ended;

							if (gridAnimation.finishOnLastFrame) {
								gridAnimationCalc.index = gridAnimation.assetIds.length - 1;
							}
						}
					}
				}

				// Done
				node = node.next;
			}
			if (animationUpdate) {
				ImageBlockDrawEngine.setAnimationUpdate(true);
			}
		};
	}

	public static setMapActive(mapActive: MapActive) {
		AnimationsCalcEngine.mapActive = mapActive;
	}
}
