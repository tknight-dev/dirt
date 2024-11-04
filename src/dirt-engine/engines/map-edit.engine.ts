import { DoubleLinkedList } from '../models/double-linked-list.model';
import { Camera } from '../models/camera.model';
import { Grid, GridConfig } from '../models/grid.model';
import { KernelEngine } from './kernel.engine';
import { MapActive, MapConfig } from '../models/map.model';
import { MouseAction } from './mouse.engine';
import {
	VideoCmdGameModeEditApply,
	VideoCmdGameModeEditApplyAudioBlock,
	VideoCmdGameModeEditApplyAudioTriggerEffect,
	VideoCmdGameModeEditApplyAudioTriggerMusic,
	VideoCmdGameModeEditApplyAudioTriggerMusicFade,
	VideoCmdGameModeEditApplyAudioTriggerMusicPause,
	VideoCmdGameModeEditApplyAudioTriggerMusicUnpause,
	VideoCmdGameModeEditApplyImageBlock,
	VideoCmdGameModeEditApplyLight,
	VideoCmdGameModeEditApplyType,
	VideoWorkerCmdEditCameraUpdate,
} from '../models/video-worker-cmds.model';
import { UtilEngine } from './util.engine';

/**
 * Mainted by UI and Video threads for map editing. Allows for full object restores, and minimizes bus communication.
 *
 * @author tknight-dev
 */

export class MapEditEngine {
	public static readonly gHeightMax: number = 0xffff - 1000;
	public static readonly gWidthMax: number = 0xffff - 1000;
	private static initialized: boolean;
	private static mapActive: MapActive;
	private static mapHistoryLength: number = 10;
	private static mapHistoryRedo: DoubleLinkedList<MapActive> = new DoubleLinkedList<MapActive>();
	private static mapHistoryUndo: DoubleLinkedList<MapActive> = new DoubleLinkedList<MapActive>();
	private static modeUI: boolean;
	public static uiChanged: boolean;
	public static uiLoaded: boolean;

	public static apply(apply: VideoCmdGameModeEditApply): void {
		switch (apply.applyType) {
			case VideoCmdGameModeEditApplyType.AUDIO_BLOCK:
				MapEditEngine.applyAudioBlock(<VideoCmdGameModeEditApplyAudioBlock>apply);
				break;
			case VideoCmdGameModeEditApplyType.AUDIO_TRIGGER_EFFECT:
				MapEditEngine.applyAudioTriggerEffect(<VideoCmdGameModeEditApplyAudioTriggerEffect>apply);
				break;
			case VideoCmdGameModeEditApplyType.AUDIO_TRIGGER_MUSIC:
				MapEditEngine.applyAudioTriggerMusic(<VideoCmdGameModeEditApplyAudioTriggerMusic>apply);
				break;
			case VideoCmdGameModeEditApplyType.AUDIO_TRIGGER_MUSIC_FADE:
				MapEditEngine.applyAudioTriggerMusicFade(<VideoCmdGameModeEditApplyAudioTriggerMusicFade>apply);
				break;
			case VideoCmdGameModeEditApplyType.AUDIO_TRIGGER_MUSIC_PAUSE:
				MapEditEngine.applyAudioTriggerMusicPause(<VideoCmdGameModeEditApplyAudioTriggerMusicPause>apply);
				break;
			case VideoCmdGameModeEditApplyType.AUDIO_TRIGGER_MUSIC_UNPAUSE:
				MapEditEngine.applyAudioTriggerMusicUnpause(<VideoCmdGameModeEditApplyAudioTriggerMusicUnpause>apply);
				break;
			case VideoCmdGameModeEditApplyType.IMAGE_BLOCK:
				MapEditEngine.applyImageBlock(<VideoCmdGameModeEditApplyImageBlock>apply);
				break;
			case VideoCmdGameModeEditApplyType.LIGHT:
				MapEditEngine.applyLight(<VideoCmdGameModeEditApplyLight>apply);
				break;
		}
	}

	private static applyAudioBlock(apply: VideoCmdGameModeEditApplyAudioBlock): void {
		console.warn('MapEditEngine > applyAudioArea: not yet implemented');
	}

	private static applyAudioTriggerEffect(apply: VideoCmdGameModeEditApplyAudioTriggerEffect): void {
		console.warn('MapEditEngine > applyAudioTriggerEffect: not yet implemented');
	}

	private static applyAudioTriggerMusic(apply: VideoCmdGameModeEditApplyAudioTriggerMusic): void {
		console.warn('MapEditEngine > applyAudioTriggerMusic: not yet implemented');
	}

	private static applyAudioTriggerMusicFade(apply: VideoCmdGameModeEditApplyAudioTriggerMusicFade): void {
		console.warn('MapEditEngine > applyAudioTriggerMusicFade: not yet implemented');
	}

	private static applyAudioTriggerMusicPause(apply: VideoCmdGameModeEditApplyAudioTriggerMusicPause): void {
		console.warn('MapEditEngine > applyAudioTriggerMusicPause: not yet implemented');
	}

	private static applyAudioTriggerMusicUnpause(apply: VideoCmdGameModeEditApplyAudioTriggerMusicUnpause): void {
		console.warn('MapEditEngine > applyAudioTriggerMusicUnpause: not yet implemented');
	}

	private static applyImageBlock(apply: VideoCmdGameModeEditApplyImageBlock): void {
		console.warn('MapEditEngine > applyImageBlock: not yet implemented');
	}

	private static applyLight(apply: VideoCmdGameModeEditApplyLight): void {
		console.warn('MapEditEngine > applyLight: not yet implemented');
	}

	private static historyAdd(): void {
		MapEditEngine.mapHistoryUndo.pushEnd(JSON.parse(JSON.stringify(MapEditEngine.mapActive)));
		MapEditEngine.mapHistoryRedo.clear();

		if (MapEditEngine.mapHistoryUndo.getLength() > MapEditEngine.mapHistoryLength) {
			MapEditEngine.mapHistoryUndo.popStart();
		}
	}

	/**
	 * UI: call directly and pass call to the comunication bus
	 *
	 * Video: only call directly on bus communication
	 */
	public static historyRedo(): MapActive | undefined {
		if (!MapEditEngine.mapHistoryRedo.getLength()) {
			return;
		}
		let mapActive: MapActive = <MapActive>MapEditEngine.mapHistoryRedo.popEnd();
		MapEditEngine.mapHistoryUndo.pushEnd(mapActive);

		if (!MapEditEngine.modeUI) {
			// Restart the kernel with the new map
			if (KernelEngine.isRunning()) {
				KernelEngine.stop();
			}
			KernelEngine.start(mapActive);
		}

		return mapActive;
	}

	/**
	 * UI: call directly and pass call to bus
	 * Video: only call directly on bus communication
	 */
	public static historyUndo(): MapActive | undefined {
		if (!MapEditEngine.mapHistoryUndo.getLength()) {
			return;
		}
		let mapActive: MapActive = <MapActive>MapEditEngine.mapHistoryUndo.popEnd();
		MapEditEngine.mapHistoryRedo.pushEnd(mapActive);

		if (!MapEditEngine.modeUI) {
			// Restart the kernel with the new map
			if (KernelEngine.isRunning()) {
				KernelEngine.stop();
			}
			KernelEngine.start(mapActive);
		}

		return mapActive;
	}

	public static async initialize(ui: boolean): Promise<void> {
		if (MapEditEngine.initialized) {
			console.error('MapEditEngine > initialize: already initialized');
			return;
		}
		MapEditEngine.initialized = true;
		MapEditEngine.modeUI = ui;
	}

	public static load(mapActive: MapActive): void {
		if (!MapEditEngine.modeUI) {
			// Restart the kernel with the new map
			if (KernelEngine.isRunning()) {
				KernelEngine.stop();
			}
			KernelEngine.start(mapActive);
		}

		MapEditEngine.mapActive = mapActive;
		MapEditEngine.mapHistoryRedo.clear();
		MapEditEngine.mapHistoryUndo.clear();
		MapEditEngine.uiChanged = false;
		MapEditEngine.uiLoaded = true;
	}

	/**
	 * UI only, the video thread sent a camera update through the bus to the UI. So the UI has to update it's cache of the map's camera.
	 */
	public static uiCameraUpdate(videoWorkerCmdEditCameraUpdate: VideoWorkerCmdEditCameraUpdate) {
		MapEditEngine.mapActive.camera = Object.assign(MapEditEngine.mapActive.camera, videoWorkerCmdEditCameraUpdate);
	}

	/**
	 * UI only, send the returned object to the communication bus
	 */
	public static uiApply(
		gHashes: number[],
		properties: VideoCmdGameModeEditApply,
		type: VideoCmdGameModeEditApplyType,
	): VideoCmdGameModeEditApply | undefined {
		let apply: VideoCmdGameModeEditApply;

		MapEditEngine.historyAdd();
		MapEditEngine.uiChanged = true;

		switch (type) {
			case VideoCmdGameModeEditApplyType.AUDIO_BLOCK:
				apply = MapEditEngine.uiApplyAudioBlock(gHashes, properties);
				break;
			case VideoCmdGameModeEditApplyType.AUDIO_TRIGGER_EFFECT:
				apply = MapEditEngine.uiApplyAudioTriggerEffect(gHashes, properties);
				break;
			case VideoCmdGameModeEditApplyType.AUDIO_TRIGGER_MUSIC:
				apply = MapEditEngine.uiApplyAudioTriggerMusic(gHashes, properties);
				break;
			case VideoCmdGameModeEditApplyType.AUDIO_TRIGGER_MUSIC_FADE:
				apply = MapEditEngine.uiApplyAudioTriggerMusicFade(gHashes, properties);
				break;
			case VideoCmdGameModeEditApplyType.AUDIO_TRIGGER_MUSIC_PAUSE:
				apply = MapEditEngine.uiApplyAudioTriggerMusicPause(gHashes, properties);
				break;
			case VideoCmdGameModeEditApplyType.AUDIO_TRIGGER_MUSIC_UNPAUSE:
				apply = MapEditEngine.uiApplyAudioTriggerMusicUnpause(gHashes, properties);
				break;
			case VideoCmdGameModeEditApplyType.IMAGE_BLOCK:
				apply = MapEditEngine.uiApplyImageBlock(gHashes, properties);
				break;
			case VideoCmdGameModeEditApplyType.LIGHT:
				apply = MapEditEngine.uiApplyLight(gHashes, properties);
				break;
			default:
				console.error("MapEditEngine > uiApply: unknown type '" + type + "'");
				return undefined;
		}
		apply.applyType = type;

		MapEditEngine.apply(apply);
		return apply;
	}

	// Try to have unique colors for every area tag.. maybe array of colors?
	private static uiApplyAudioBlock(
		gHashes: number[],
		properties: VideoCmdGameModeEditApply,
	): VideoCmdGameModeEditApplyAudioBlock {
		return <any>{};
	}

	private static uiApplyAudioTriggerEffect(
		gHashes: number[],
		properties: VideoCmdGameModeEditApply,
	): VideoCmdGameModeEditApplyAudioTriggerEffect {
		return <any>{};
	}

	private static uiApplyAudioTriggerMusic(
		gHashes: number[],
		properties: VideoCmdGameModeEditApply,
	): VideoCmdGameModeEditApplyAudioTriggerMusic {
		return <any>{};
	}

	private static uiApplyAudioTriggerMusicFade(
		gHashes: number[],
		properties: VideoCmdGameModeEditApply,
	): VideoCmdGameModeEditApplyAudioTriggerMusicFade {
		return <any>{};
	}

	private static uiApplyAudioTriggerMusicPause(
		gHashes: number[],
		properties: VideoCmdGameModeEditApply,
	): VideoCmdGameModeEditApplyAudioTriggerMusicPause {
		return <any>{};
	}

	private static uiApplyAudioTriggerMusicUnpause(
		gHashes: number[],
		properties: VideoCmdGameModeEditApply,
	): VideoCmdGameModeEditApplyAudioTriggerMusicUnpause {
		return <any>{};
	}

	private static uiApplyImageBlock(
		gHashes: number[],
		properties: VideoCmdGameModeEditApply,
	): VideoCmdGameModeEditApplyImageBlock {
		return <any>{};
	}

	private static uiApplyLight(
		gHashes: number[],
		properties: VideoCmdGameModeEditApply,
	): VideoCmdGameModeEditApplyLight {
		return <any>{};
	}

	/**
	 * Only for initial grid block positions (precision 0)
	 */
	public static uiRelXYToGBlockHash(mouseAction: MouseAction): number {
		let camera: Camera = MapEditEngine.mapActive.camera;

		return UtilEngine.gridHashTo(
			Math.floor(
				(camera.viewportPx + camera.viewportPw * mouseAction.position.xRel) /
					camera.gInPw /
					window.devicePixelRatio +
					camera.viewportGx,
			),
			Math.floor(
				(camera.viewportPy + camera.viewportPh * mouseAction.position.yRel) /
					camera.gInPh /
					window.devicePixelRatio +
					camera.viewportGy,
			),
		);
	}

	public static updateMapSettings(mapConfig: MapConfig): void {
		MapEditEngine.mapActive = Object.assign(MapEditEngine.mapActive, mapConfig);
	}

	public static getGridActive(): Grid {
		return MapEditEngine.mapActive.gridActive;
	}

	public static getGridConfigActive(): GridConfig {
		return MapEditEngine.mapActive.gridConfigActive;
	}

	public static getHistoryRedoLength(): number {
		return MapEditEngine.mapHistoryRedo.getLength();
	}

	public static getHistoryUndoLength(): number {
		return MapEditEngine.mapHistoryUndo.getLength();
	}
}
