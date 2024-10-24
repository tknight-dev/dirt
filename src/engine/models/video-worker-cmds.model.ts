/**
 * @author tknight-dev
 */

export enum VideoCmd {
	INIT,
	RESIZE,
}

export interface VideoCmdInit extends VideoCmdResize {
	canvasOffscreen: OffscreenCanvas;
	canvasOffscreenBackground: OffscreenCanvas;
	canvasOffscreenForeground: OffscreenCanvas;
	canvasOffscreenOverlay: OffscreenCanvas;
}

export interface VideoCmdResize {
	devicePixelRatio: number;
	height: number;
	width: number;
}

export interface VideoPayload {
	cmd: VideoCmd;
	data: VideoCmdInit | VideoCmdResize;
}

export enum VideoWorkerCmd {
	AUDIO_EFFECT,
	AUDIO_MUSIC,
}

export interface VideoWorkerCmdAudioEffect {
	id: string; // AudioAsset->Id
	pan: number; // -1 left, 0 center, 1 right
	volumePercentage: number; // 0%-100%
}

export interface VideoWorkerCmdAudioMusic {
	id: string; // AudioAsset->Id
	volumePercentage: number; // 0%-100%
}

export interface VideoWorkerPayload {
	cmd: VideoWorkerCmd;
	data: VideoWorkerCmdAudioEffect | VideoWorkerCmdAudioMusic;
}
