import { AssetDeclarations } from './asset.model';
import { KeyAction } from '../engines/keyboard.engine';
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
	GAME_START,
	GAME_UNPAUSE,
	INIT,
	KEY,
	MAP_LOAD,
	MOUSE,
	RESIZE,
	SETTINGS,
}

export interface VideoCmdInit extends VideoCmdResize, VideoCmdSettings {
	assetDeclarations: AssetDeclarations;
	canvasOffscreen: OffscreenCanvas;
	canvasOffscreenBackground: OffscreenCanvas;
	canvasOffscreenForeground: OffscreenCanvas;
	canvasOffscreenOverlay: OffscreenCanvas;
	modeEdit: boolean;
}

export interface VideoCmdMapLoad {
	data: string;
}

export interface VideoCmdResize {
	devicePixelRatio: number; // precision 1
	height: number;
	width: number;
}

export interface VideoCmdGameModeEdit {}

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

export interface VideoCmdGameStart {}

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
	data: KeyAction | MouseAction | VideoCmdGamePause | VideoCmdGameStart | VideoCmdGameUnpause | VideoCmdInit | VideoCmdMapLoad | VideoCmdResize;
}

export enum VideoWorkerCmd {
	AUDIO_EFFECT,
	AUDIO_MUSIC_FADE,
	AUDIO_MUSIC_PLAY,
	AUDIO_MUSIC_PAUSE,
	AUDIO_MUSIC_UNPAUSE,
	AUDIO_VOLUME,
	MAP_LOAD_STATUS,
	MAP_SAVE,
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
		| VideoWorkerCmdMapLoadStatus
		| VideoWorkerCmdMapSave
		| null;
}
