import { AudioModulation } from './audio-modulation.model';

/**
 * Edges of the grid may fall outside of viewer as they may reside in buffer space
 *
 * @author tknight-dev
 */

export interface Grid {
	audioBlocks: { [key: number]: GridAudioBlock }; // key is hash, Precision 0
	audioTagTriggersEffect: { [key: number]: GridAudioTriggerEffect }; // key is hash, Precision 3
	audioTagTriggersMusic: { [key: number]: GridAudioTriggerMusic }; // key is hash, Precision 3
	audioTagTriggersMusicFade: { [key: number]: GridAudioTriggerMusicFade }; // key is hash, Precision 3
	audioTagTriggersMusicPause: { [key: number]: GridAudioTriggerMusicPause }; // key is hash, Precision 3
	audioTagTriggersMusicUnpause: { [key: number]: GridAudioTriggerMusicUnpause }; // key is hash, Precision 3
	imageBlocksBackground: { [key: number]: GridImageBlock }; // key is hash, Precision 0
	imageBlocksForeground: { [key: number]: GridImageBlock }; // key is hash, Precision 0
	imageBlocksPrimary: { [key: number]: GridImageBlock }; // key is hash, Precision 0
	lights: { [key: number]: GridLight }; // key is hash, Precision 3
}

export interface GridConfig {
	gHeight: number; // calculated, Precision 0
	gHorizon: number; // Precision 0
	gWidth: number; // Precision 0
	id: string;
	lightIntensityGlobal: number; // defaulted by MapEngine (Precision 3)
	outside: boolean; // defaulted by MapEngine
	startGxCamera: number; // Precision 3
	startGyCamera: number; // Precision 3
	startGxPlayer: number; // Precision 3
	startGyPlayer: number; // Precision 3
	zoomDefault: number; // defaulted by MapEngine
}

export interface GridCoordinate {
	gx: number; // Precision 3
	gy: number; // Precision 3
}

export interface GridAudioBlock extends GridObject {
	modulationId: string;
}

export interface GridAudioTriggerEffect extends GridObject {
	assetId: string;
	oneshot: boolean; // true and the trigger fires everytime it's tripped
	trip: GridAudioTriggerTripType;
	volumePercentage: number; // between 0 and 1 with a precision of 3
}

export interface GridAudioTriggerMusic extends GridObject {
	assetId: string;
	tagId: string;
	trip: GridAudioTriggerTripType;
	volumePercentage: number; // between 0 and 1 with a precision of 3
}

export interface GridAudioTriggerMusicFade extends GridObject {
	fadeDurationInMs: number; // between 0 and 1 with a precision of 3
	fadeTo: number; // between 0 and 1 with a precision of 3
	tagId: string;
	trip: GridAudioTriggerTripType;
}

export interface GridAudioTriggerMusicPause extends GridObject {
	tagId: string;
	trip: GridAudioTriggerTripType;
}

export interface GridAudioTriggerMusicUnpause extends GridObject {
	tagId: string;
	trip: GridAudioTriggerTripType;
}

export enum GridAudioTriggerTripType {
	CONTACT, // Charactor touches the gBlock
	HORIZONTAL, // Charactor passes top-to-bottom or vice versa
	VERTICAL, // Charactor passes left-to-right or vice versa
}

export interface GridImageBlock extends GridObject {
	assetId: string;
	assetIdDamagedImage: string | undefined; // fallback is assetId
	assetIdDamangedWalkedOnAudioEffect: string | undefined; // fallback is Undamanged
	assetIdWalkedOnAudioEffect: string | undefined; // fallback is no audio
	damageable: boolean;
	destructible: boolean;
	hash: number;
	strengthToDamangeInN: number | undefined; // newtons of force required to destroy
	strengthToDestroyInN: number | undefined; // newtons of force required to destroy
	type: GridImageBlockType;
	viscocity: number | undefined; // how thick the liquid is
}

export enum GridImageBlockType {
	LIQUID,
	SOLID,
}

export interface GridLight extends GridCoordinate {
	color: number; // hexadecimal
	decay: number;
	destructible: boolean;
	hash: number;
	intensity: number;
	nightOnly: boolean;
	strengthToDamangeInN: number | undefined; // newtons of force required to destroy
	type: GridLightType;
}

export enum GridLightType {
	DOWN,
	DOWN_UP,
	LEFT,
	LEFT_RIGHT,
	OMNI,
	RIGHT,
	UP,
}

export interface GridObject extends GridCoordinate {
	grounded: boolean;
	gSizeH: number; // refers to number of grid squares the object takes up
	gSizeW: number; // refers to number of grid squares the object takes up
	timeSinceLastUpdate: number;
	velX: number; // kph
	velY: number; // kph
	weight: number; // kg
}
