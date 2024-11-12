/**
 * Edges of the grid may fall outside of viewer as they may reside in buffer space
 *
 * @author tknight-dev
 */

export interface Grid {
	audioBlocks: GridBlockTable<GridAudioBlock>; // (gx,gy), Precision 0
	audioTagTriggersEffect: GridBlockTable<GridAudioTriggerEffect>; // (gx,gy), Precision 3
	audioTagTriggersMusic: GridBlockTable<GridAudioTriggerMusic>; // (gx,gy), Precision 3
	audioTagTriggersMusicFade: GridBlockTable<GridAudioTriggerMusicFade>; // (gx,gy), Precision 3
	audioTagTriggersMusicPause: GridBlockTable<GridAudioTriggerMusicPause>; // (gx,gy), Precision 3
	audioTagTriggersMusicUnpause: GridBlockTable<GridAudioTriggerMusicUnpause>; // (gx,gy), Precision 3
	imageBlocksBackground: GridBlockTable<GridImageBlock>; // (gx,gy), Precision 0
	imageBlocksForeground: GridBlockTable<GridImageBlock>; // (gx,gy), Precision 0
	imageBlocksPrimary: GridBlockTable<GridImageBlock>; // (gx,gy), Precision 0
	lights: GridBlockTable<GridLight>; // (gx,gy), Precision 3
}

export interface GridBlockTable<T> {
	gx?: number[]; // array is sorted
	hashes: { [key: number]: T };
	hashesGyByGx?: { [key: number]: GridBlockTableComplex[] }; // array is sorted
}

export interface GridBlockTableComplex {
	gx?: number;
	gy?: number;
	hash: number;
	value: number;
}

export interface GridConfig {
	gHeight: number; // calculated, Precision 0
	gHorizon: number; // Precision 0
	gWidth: number; // Precision 0
	id: string;
	lightIntensityGlobal: number; // 1.000 is default (Precision 3)
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
	assetIdDamagedImage?: string; // replaces assetId on damage
	assetIdDamangedWalkedOnAudioEffect?: string; // replaces assetIdWalkedOnAudioEffect on damage
	assetIdWalkedOnAudioEffect?: string; // fallback is no audio
	damageable?: boolean;
	destructible?: boolean;
	passthrough?: boolean;
	strengthToDamangeInN?: number; // newtons of force required to destroy
	strengthToDestroyInN?: number; // newtons of force required to destroy
	type: GridImageBlockType;
	viscocity?: number; // how thick the liquid is
}

export enum GridImageBlockType {
	LIQUID,
	SOLID,
}

export interface GridLight extends GridCoordinate {
	color: number; // hexadecimal
	destructible: boolean;
	gRadius: number;
	nightOnly: boolean;
	strengthToDestroyInN?: number; // newtons of force required to destroy
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
	extends?: number; // reference parent hash (g height/width > 1) [top left most]
	gSizeH: number; // refers to number of grid squares the object takes up
	gSizeW: number; // refers to number of grid squares the object takes up
	hash: number;
	objectType: GridObjectType;
	weight: number; // kg
}

export interface GridObjectActive extends GridObject {
	grounded: boolean;
	timeSinceLastUpdate: number;
	velX: number; // kph
	velY: number; // kph
}

export enum GridObjectType {
	AUDIO_BLOCK,
	AUDIO_TRIGGER_EFFECT,
	AUDIO_TRIGGER_MUSIC,
	AUDIO_TRIGGER_MUSIC_FADE,
	AUDIO_TRIGGER_MUSIC_PAUSE,
	AUDIO_TRIGGER_MUSIC_UNPAUSE,
	IMAGE_BLOCK,
	LIGHT,
}
