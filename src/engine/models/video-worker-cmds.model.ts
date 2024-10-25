import { KeyAction } from '../keyboard.engine';
import { MouseAction } from '../mouse.engine';

/**
 * Defines input and output date types for the communication bus between the UI thread and the Video thread
 *
 * @author tknight-dev
 */

export enum VideoCmd {
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
	canvasOffscreen: OffscreenCanvas;
	canvasOffscreenBackground: OffscreenCanvas;
	canvasOffscreenForeground: OffscreenCanvas;
	canvasOffscreenOverlay: OffscreenCanvas;
}

export interface VideoCmdMapLoad {
	data: string;
}

export interface VideoCmdResize {
	devicePixelRatio: number; // precision 1
	height: number;
	width: number;
}

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
