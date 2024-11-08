import { AssetDeclarations, AssetImageSrcResolution } from './asset.model';
import {
	GridAudioBlock,
	GridAudioTriggerEffect,
	GridAudioTriggerMusic,
	GridAudioTriggerMusicFade,
	GridAudioTriggerMusicPause,
	GridAudioTriggerMusicUnpause,
	GridImageBlock,
	GridLight,
} from '../models/grid.model';
import { KeyAction } from '../engines/keyboard.engine';
import { Map, MapActive, MapConfig } from '../models/map.model';
import { MouseAction } from '../engines/mouse.engine';

/**
 * Defines input and output date types for the communication bus between the UI thread and the Video thread
 *
 * ? Spawn a background thread that renders the entire background all the time. THis thread snapshots an area of this render to display here.
 *
 * @author tknight-dev
 */

export enum VideoInputCmd {
	GAME_MODE_EDIT,
	GAME_MODE_EDIT_APPLY,
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
}

export interface VideoInputCmdInit extends VideoInputCmdResize, VideoInputCmdSettings {
	assetDeclarations: AssetDeclarations;
	canvasOffscreenBackground: OffscreenCanvas;
	canvasOffscreenForeground: OffscreenCanvas;
	canvasOffscreenOverlay: OffscreenCanvas;
	canvasOffscreenPrimary: OffscreenCanvas;
	canvasOffscreenUnderlay: OffscreenCanvas;
}

export interface VideoInputCmdMapLoad {
	data: string;
}

export interface VideoInputCmdMapLoadById {
	id?: string; // undefined for new map
}

export interface VideoInputCmdResize {
	devicePixelRatio: number; // precision 1
	force?: boolean;
	height: number;
	width: number;
}

export interface VideoInputCmdGameModeEdit {
	edit: boolean;
}

export interface VideoInputCmdGameModeEditApply {
	applyType: VideoInputCmdGameModeEditApplyType;
	gHashes: number[];
}

export interface VideoInputCmdGameModeEditApplyAudioBlock extends GridAudioBlock, VideoInputCmdGameModeEditApply {}

export interface VideoInputCmdGameModeEditApplyAudioTriggerEffect
	extends GridAudioTriggerEffect,
		VideoInputCmdGameModeEditApply {}
export interface VideoInputCmdGameModeEditApplyAudioTriggerMusic
	extends GridAudioTriggerMusic,
		VideoInputCmdGameModeEditApply {}
export interface VideoInputCmdGameModeEditApplyAudioTriggerMusicFade
	extends GridAudioTriggerMusicFade,
		VideoInputCmdGameModeEditApply {}
export interface VideoInputCmdGameModeEditApplyAudioTriggerMusicPause
	extends GridAudioTriggerMusicPause,
		VideoInputCmdGameModeEditApply {}
export interface VideoInputCmdGameModeEditApplyAudioTriggerMusicUnpause
	extends GridAudioTriggerMusicUnpause,
		VideoInputCmdGameModeEditApply {}

export interface VideoInputCmdGameModeEditApplyErase extends VideoInputCmdGameModeEditApply {
	z: VideoInputCmdGameModeEditApplyZ;
}

export interface VideoInputCmdGameModeEditApplyImageBlock extends GridImageBlock, VideoInputCmdGameModeEditApply {
	z: VideoInputCmdGameModeEditApplyZ;
}

export interface VideoInputCmdGameModeEditApplyLight extends GridLight, VideoInputCmdGameModeEditApply {}

export enum VideoInputCmdGameModeEditApplyType {
	AUDIO_BLOCK,
	AUDIO_TRIGGER_EFFECT,
	AUDIO_TRIGGER_MUSIC,
	AUDIO_TRIGGER_MUSIC_FADE,
	AUDIO_TRIGGER_MUSIC_PAUSE,
	AUDIO_TRIGGER_MUSIC_UNPAUSE,
	ERASE,
	IMAGE_BLOCK,
	LIGHT,
}

export enum VideoInputCmdGameModeEditApplyZ {
	BACKGROUND,
	FOREGROUND,
	PRIMARY,
}

export enum VideoInputCmdGameModeEditApplyView {
	AUDIO,
	IMAGE,
	LIGHT,
}

export interface VideoInputCmdGameModeEditDraw {
	foregroundViewer: boolean;
	grid: boolean;
}

export interface VideoInputCmdGameModePlay {}

export interface VideoInputCmdGamePause {
	reason: VideoInputCmdGamePauseReason;
}

export enum VideoInputCmdGamePauseReason {
	FULLSCREEN,
	RESIZE,
	VISIBILITY,
}

export interface VideoInputCmdGameUnpause {}

export interface VideoInputCmdGameSave {}

export interface VideoInputCmdGameStart {
	modeEdit: boolean;
}

export interface VideoInputCmdSettings {
	darknessMax: number; // between 0 and 1, 1 is totally black, default is .8 (Precision 3)
	foregroundViewerPercentageOfViewport: number; // between 0 and 2, default is .25 (Precision 3)
	fps: VideoInputCmdSettingsFPS;
	fpsVisible: boolean;
	mapVisible: boolean;
	resolution: AssetImageSrcResolution;
}

export enum VideoInputCmdSettingsFPS {
	_30 = 30,
	_60 = 60,
	_120 = 120,
	_unlimited = 1,
}

export interface VideoPayload {
	cmd: VideoInputCmd;
	data:
		| boolean
		| KeyAction
		| MapConfig
		| MouseAction
		| VideoInputCmdGameModeEdit
		| VideoInputCmdGameModeEditApply
		| VideoInputCmdGamePause
		| VideoInputCmdGameSave
		| VideoInputCmdGameStart
		| VideoInputCmdGameUnpause
		| VideoInputCmdInit
		| VideoInputCmdMapLoad
		| VideoInputCmdMapLoadById
		| VideoInputCmdResize
		| null;
}

export enum VideoOutputCmd {
	AUDIO_EFFECT,
	AUDIO_MUSIC_FADE,
	AUDIO_MUSIC_PLAY,
	AUDIO_MUSIC_PAUSE,
	AUDIO_MUSIC_UNPAUSE,
	AUDIO_VOLUME,
	EDIT_CAMERA_UPDATE,
	EDIT_COMPLETE,
	MAP_ASSET,
	MAP_HOUR_OF_DAY_EFF,
	MAP_LOAD_STATUS,
	MAP_SAVE,
	STATUS_INITIALIZED,
}

export interface VideoOutputCmdAudioEffect {
	id: string; // AudioAsset->Id
	modulationId: string; // EffectModulation->Id
	pan: number; // -1 left, 0 center, 1 right (precision 3)
	volumePercentage: number; // 0-1 (precision 3)
}

export interface VideoOutputCmdAudioMusicFade {
	durationInMs: number; // min 100 (precision 0)
	id: string; // AudioAsset->Id
	volumePercentage: number; // 0-1 (precision 3)
}

export interface VideoOutputCmdAudioMusicPlay {
	id: string; // AudioAsset->Id
	timeInS: number; // 0-duration (precision 3)
	volumePercentage: number; // 0-1 (precision 3)
}

export interface VideoOutputCmdAudioMusicPause {
	id: string; // AudioAsset->Id
}

export interface VideoOutputCmdAudioMusicUnpause {
	id: string; // AudioAsset->Id
}

export interface VideoOutputCmdAudioVolume {
	id: string; // AudioAsset->Id
	volumePercentage: number; // 0-1 (precision 3)
}

export interface VideoOutputCmdEditCameraUpdate {
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

export interface VideoOutputCmdMapAsset {
	mapActive?: MapActive;
}

export interface VideoOutputCmdMapLoadStatus {
	status: boolean;
}

export interface VideoOutputCmdMapSave {
	data: string;
	name: string;
}

export interface VideoWorkerPayload {
	cmd: VideoOutputCmd;
	data:
		| number
		| VideoOutputCmdAudioEffect
		| VideoOutputCmdAudioMusicFade
		| VideoOutputCmdAudioMusicPlay
		| VideoOutputCmdAudioMusicPause
		| VideoOutputCmdAudioMusicUnpause
		| VideoOutputCmdAudioVolume
		| VideoOutputCmdEditCameraUpdate
		| VideoOutputCmdMapAsset
		| VideoOutputCmdMapLoadStatus
		| VideoOutputCmdMapSave
		| VideoWorkerStatusInitialized
		| null;
}

export interface VideoWorkerStatusInitialized {
	durationInMs: number;
}
