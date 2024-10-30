import { AssetDeclarations } from './asset.model';
import { KeyAction } from '../engines/keyboard.engine';
import { Map } from '../models/map.model';
import { MouseAction } from '../engines/mouse.engine';

/**
 * Defines input and output date types for the communication bus between the UI thread and the Video thread
 *
 * ? Spawn a background thread that renders the entire background all the time. THis thread snapshots an area of this render to display here.
 *
 * @author tknight-dev
 */

export enum VideoCmd {
	GAME_MODE_EDIT,
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

export interface VideoCmdInit extends VideoCmdResize, VideoCmdSettings {
	assetDeclarations: AssetDeclarations;
	canvasOffscreenBackground: OffscreenCanvas;
	canvasOffscreenForeground: OffscreenCanvas;
	canvasOffscreenOverlay: OffscreenCanvas;
	canvasOffscreenPrimary: OffscreenCanvas;
	canvasOffscreenUnderlay: OffscreenCanvas;
}

export interface VideoCmdMapLoad {
	data: string;
}

export interface VideoCmdMapLoadById {
	id: string | undefined; // undefined for new map
}

export interface VideoCmdResize {
	devicePixelRatio: number; // precision 1
	height: number;
	width: number;
}

export interface VideoCmdGameModeEdit {
	edit: boolean;
}

export enum VideoCmdGameModeEditZLayer {
	BACKGROUND,
	FOREGROUND,
	PRIMARY,
}

export interface VideoCmdGameModePlay {}

export interface VideoCmdGamePause {
	reason: VideoCmdGamePauseReason;
}

export enum VideoCmdGamePauseReason {
	FULLSCREEN,
	RESIZE,
	VISIBILITY,
}

export interface VideoCmdGameUnpause {}

export interface VideoCmdGameSave {}

export interface VideoCmdGameStart {
	modeEdit: boolean;
}

export interface VideoCmdSettings {
	fps: VideoCmdSettingsFPS;
	fpsVisible: boolean;
	mapVisible: boolean;
}

export enum VideoCmdSettingsFPS {
	_30 = 30,
	_60 = 60,
	_120 = 120,
	_unlimited = 1,
}

export interface VideoPayload {
	cmd: VideoCmd;
	data:
		| KeyAction
		| MouseAction
		| VideoCmdGameModeEdit
		| VideoCmdGamePause
		| VideoCmdGameSave
		| VideoCmdGameStart
		| VideoCmdGameUnpause
		| VideoCmdInit
		| VideoCmdMapLoad
		| VideoCmdMapLoadById
		| VideoCmdResize;
}

export enum VideoWorkerCmd {
	AUDIO_EFFECT,
	AUDIO_MUSIC_FADE,
	AUDIO_MUSIC_PLAY,
	AUDIO_MUSIC_PAUSE,
	AUDIO_MUSIC_UNPAUSE,
	AUDIO_VOLUME,
	MAP_ASSET,
	MAP_LOAD_STATUS,
	MAP_SAVE,
	STATUS_INITIALIZED,
}

export interface VideoWorkerCmdAudioEffect {
	id: string; // AudioAsset->Id
	modulationId: string; // EffectModulation->Id
	pan: number; // -1 left, 0 center, 1 right (precision 3)
	volumePercentage: number; // 0-1 (precision 3)
}

export interface VideoWorkerCmdAudioMusicFade {
	durationInMs: number; // min 100 (precision 0)
	id: string; // AudioAsset->Id
	volumePercentage: number; // 0-1 (precision 3)
}

export interface VideoWorkerCmdAudioMusicPlay {
	id: string; // AudioAsset->Id
	timeInS: number; // 0-duration (precision 3)
	volumePercentage: number; // 0-1 (precision 3)
}

export interface VideoWorkerCmdAudioMusicPause {
	id: string; // AudioAsset->Id
}

export interface VideoWorkerCmdAudioMusicUnpause {
	id: string; // AudioAsset->Id
}

export interface VideoWorkerCmdAudioVolume {
	id: string; // AudioAsset->Id
	volumePercentage: number; // 0-1 (precision 3)
}

export interface VideoWorkerCmdMapAsset {
	map: Map | undefined;
}

export interface VideoWorkerCmdMapLoadStatus {
	status: boolean;
}

export interface VideoWorkerCmdMapSave {
	data: string;
	name: string;
}

export interface VideoWorkerPayload {
	cmd: VideoWorkerCmd;
	data:
		| VideoWorkerCmdAudioEffect
		| VideoWorkerCmdAudioMusicFade
		| VideoWorkerCmdAudioMusicPlay
		| VideoWorkerCmdAudioMusicPause
		| VideoWorkerCmdAudioMusicUnpause
		| VideoWorkerCmdAudioVolume
		| VideoWorkerCmdMapAsset
		| VideoWorkerCmdMapLoadStatus
		| VideoWorkerCmdMapSave
		| VideoWorkerStatusInitialized
		| null;
}

export interface VideoWorkerStatusInitialized {
	durationInMs: number;
}
