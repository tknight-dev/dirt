import { AssetDeclarations, AssetImageSrcQuality } from '../../models/asset.model';
import {
	GridAudioBlock,
	GridAudioTrigger,
	GridImageBlockFoliage,
	GridImageBlockLiquid,
	GridImageBlockSolid,
	GridLight,
} from '../../models/grid.model';
import { KeyAction } from '../keyboard.engine';
import { MapActive, MapConfig } from '../../models/map.model';
import { MouseAction } from '../mouse.engine';
import { TouchAction } from '../touch.engine';

/**
 * Defines input and output date types for the communication bus between the UI thread and the VideoBus thread
 *
 * ? Spawn a background thread that renders the entire background all the time. THis thread snapshots an area of this render to display here.
 *
 * @author tknight-dev
 */

export enum VideoBusInputCmd {
	GAME_MODE_EDIT,
	GAME_MODE_EDIT_APPLY,
	GAME_MODE_EDIT_APPLY_GROUP,
	GAME_MODE_EDIT_DRAW,
	GAME_MODE_EDIT_REDO,
	GAME_MODE_EDIT_SETTINGS,
	GAME_MODE_EDIT_TIME_FORCED,
	GAME_MODE_EDIT_UNDO,
	GAME_MODE_PLAY,
	GAME_PAUSE,
	GAME_SAVE,
	GAME_START,
	GAME_UNPAUSE,
	INIT,
	KEY,
	MAP_LOAD,
	MAP_LOAD_BY_ID,
	MOUSE,
	RESIZE,
	SETTINGS,
	TOUCH,
}

export interface VideoBusInputCmdInit extends VideoBusInputCmdResize, VideoBusInputCmdSettings {
	assetDeclarations: AssetDeclarations;
	canvasOffscreenBackground: OffscreenCanvas;
	canvasOffscreenForeground: OffscreenCanvas;
	canvasOffscreenOverlay: OffscreenCanvas;
	canvasOffscreenPrimary: OffscreenCanvas;
	canvasOffscreenUnderlay: OffscreenCanvas;
	canvasOffscreenVanishing: OffscreenCanvas;
}

export interface VideoBusInputCmdMapLoad {
	data: string;
}

export interface VideoBusInputCmdMapLoadById {
	id?: string; // undefined for new map
}

export interface VideoBusInputCmdResize {
	devicePixelRatio: number; // precision 1
	force?: boolean;
	height: number;
	scaler: number;
	width: number;
}

export interface VideoBusInputCmdGameModeEdit {
	edit: boolean;
	vanishingEnable: boolean;
}

export interface VideoBusInputCmdGameModeEditApply {
	applyType: VideoBusInputCmdGameModeEditApplyType;
	gHashes: number[];
}

export interface VideoBusInputCmdGameModeEditApplyAudioBlock extends GridAudioBlock, VideoBusInputCmdGameModeEditApply {}

export interface VideoBusInputCmdGameModeEditApplyAudioTrigger extends GridAudioTrigger, VideoBusInputCmdGameModeEditApply {}

export interface VideoBusInputCmdGameModeEditApplyErase extends VideoBusInputCmdGameModeEditApply {
	type: VideoBusInputCmdGameModeEditApplyType;
	z: VideoBusInputCmdGameModeEditApplyZ;
}

export interface VideoBusInputCmdGameModeEditApplyImageBlock extends VideoBusInputCmdGameModeEditApply {
	z: VideoBusInputCmdGameModeEditApplyZ;
}

export interface VideoBusInputCmdGameModeEditApplyImageBlockFoliage
	extends GridImageBlockFoliage,
		VideoBusInputCmdGameModeEditApplyImageBlock {}

export interface VideoBusInputCmdGameModeEditApplyImageBlockLiquid
	extends GridImageBlockLiquid,
		VideoBusInputCmdGameModeEditApplyImageBlock {}

export interface VideoBusInputCmdGameModeEditApplyImageBlockSolid
	extends GridImageBlockSolid,
		VideoBusInputCmdGameModeEditApplyImageBlock {}

export interface VideoBusInputCmdGameModeEditApplyLight extends GridLight, VideoBusInputCmdGameModeEditApply {}

export enum VideoBusInputCmdGameModeEditApplyType {
	AUDIO_BLOCK,
	AUDIO_TRIGGER,
	ERASE,
	IMAGE_BLOCK_FOLIAGE,
	IMAGE_BLOCK_LIQUID,
	IMAGE_BLOCK_SOLID,
	LIGHT,
}

export enum VideoBusInputCmdGameModeEditApplyZ {
	BACKGROUND,
	FOREGROUND,
	PRIMARY,
	VANISHING,
}

export enum VideoBusInputCmdGameModeEditApplyView {
	AUDIO,
	IMAGE,
	LIGHT,
}

export interface VideoBusInputCmdGameModeEditDraw {
	grid: boolean;
	vanishingEnable: boolean;
}

export interface VideoBusInputCmdGameModePlay {}

export interface VideoBusInputCmdGamePause {
	reason: VideoBusInputCmdGamePauseReason;
}

export enum VideoBusInputCmdGamePauseReason {
	FULLSCREEN,
	RESIZE,
	VISIBILITY,
}

export interface VideoBusInputCmdGameUnpause {}

export interface VideoBusInputCmdGameSave {}

export interface VideoBusInputCmdGameStart {
	modeEdit: boolean;
}

export interface VideoBusInputCmdSettings {
	darknessMax: number; // between 0 and 1, 1 is totally black, default is .8 (Precision 3)
	fps: VideoBusInputCmdSettingsFPS;
	fpsVisible: boolean;
	mapVisible: boolean;
	quality: AssetImageSrcQuality;
	resolution: null | 256 | 384 | 512 | 640 | 1280 | 1920; // null is native resolution
	screenShakeEnable: boolean;
	vanishingPercentageOfViewport: number; // between 0 and 2, default is .25 (Precision 3)
}

export enum VideoBusInputCmdSettingsFPS {
	_30 = 30,
	_60 = 60,
	_120 = 120,
	_unlimited = 1,
}

export interface VideoBusPayload {
	cmd: VideoBusInputCmd;
	data:
		| boolean
		| KeyAction
		| MapConfig
		| MouseAction
		| TouchAction
		| VideoBusInputCmdGameModeEdit
		| VideoBusInputCmdGameModeEditApply
		| VideoBusInputCmdGamePause
		| VideoBusInputCmdGameSave
		| VideoBusInputCmdGameStart
		| VideoBusInputCmdGameUnpause
		| VideoBusInputCmdInit
		| VideoBusInputCmdMapLoad
		| VideoBusInputCmdMapLoadById
		| VideoBusInputCmdResize
		| null;
}

export enum VideoBusOutputCmd {
	AUDIO_EFFECT,
	AUDIO_MUSIC_FADE,
	AUDIO_MUSIC_PLAY,
	AUDIO_MUSIC_PAUSE,
	AUDIO_MUSIC_UNPAUSE,
	AUDIO_VOLUME,
	EDIT_CAMERA_UPDATE,
	EDIT_COMPLETE,
	FPS,
	MAP_ASSET,
	MAP_HOUR_OF_DAY_EFF,
	MAP_LOAD_STATUS,
	MAP_SAVE,
	RUMBLE,
	STATUS_INITIALIZED,
}

export interface VideoBusOutputCmdAudioEffect {
	id: string; // AudioAsset->Id
	modulationId: string; // EffectModulation->Id
	pan: number; // -1 left, 0 center, 1 right (precision 3)
	volumePercentage: number; // 0-1 (precision 3)
}

export interface VideoBusOutputCmdAudioMusicFade {
	durationInMs: number; // min 100 (precision 0)
	id: string; // AudioAsset->Id
	volumePercentage: number; // 0-1 (precision 3)
}

export interface VideoBusOutputCmdAudioMusicPlay {
	id: string; // AudioAsset->Id
	timeInS: number; // 0-duration (precision 3)
	volumePercentage: number; // 0-1 (precision 3)
}

export interface VideoBusOutputCmdAudioMusicPause {
	id: string; // AudioAsset->Id
}

export interface VideoBusOutputCmdAudioMusicUnpause {
	id: string; // AudioAsset->Id
}

export interface VideoBusOutputCmdAudioVolume {
	id: string; // AudioAsset->Id
	volumePercentage: number; // 0-1 (precision 3)
}

export interface VideoBusOutputCmdEditCameraUpdate {
	gInPh: number; // Precision 3
	gInPw: number; // Precision 3
	viewportPh: number; // Precision 0
	viewportPw: number; // Precision 0
	viewportPx: number; // Precision 0
	viewportPy: number; // Precision 0
	viewportGx: number; // Precision 3
	viewportGy: number; // Precision 3
	zoom: number; // Precision 3
}

export interface VideoBusOutputCmdMapAsset {
	mapActive?: MapActive;
}

export interface VideoBusOutputCmdMapLoadStatus {
	status: boolean;
}

export interface VideoBusOutputCmdMapSave {
	data: string;
	name: string;
}

export interface VideoBusOutputCmdRumble {
	enable: boolean;
	durationInMS: number; // 0 = INF, max 10000
	intensity: number; // 0-10
}

export interface VideoBusWorkerPayload {
	cmd: VideoBusOutputCmd;
	data:
		| number
		| VideoBusOutputCmdAudioEffect
		| VideoBusOutputCmdAudioMusicFade
		| VideoBusOutputCmdAudioMusicPlay
		| VideoBusOutputCmdAudioMusicPause
		| VideoBusOutputCmdAudioMusicUnpause
		| VideoBusOutputCmdAudioVolume
		| VideoBusOutputCmdEditCameraUpdate
		| VideoBusOutputCmdMapAsset
		| VideoBusOutputCmdMapLoadStatus
		| VideoBusOutputCmdMapSave
		| VideoBusOutputCmdRumble
		| VideoBusWorkerStatusInitialized
		| null;
}

export interface VideoBusWorkerStatusInitialized {
	durationInMs: number;
}
