/**
 * Edges of the grid may fall outside of viewer as they may reside in buffer space
 *
 * @author tknight-dev
 */

export class Grid {
	audioPrimaryBlocks: GridBlockTable<GridAudioBlock>; // (gx,gy), Precision 0
	audioPrimaryTagTriggers: GridBlockTable<GridAudioTrigger>; // (gx,gy), Precision 3
	id: string;
	imageBlocksBackgroundFoliage: { [key: number]: GridImageBlockFoliage }; // (gx,gy), Precision 0
	imageBlocksBackgroundLiquid: { [key: number]: GridImageBlockLiquid }; // (gx,gy), Precision 0
	imageBlocksBackgroundReference: GridBlockTable<GridImageBlockReference>; // (gx,gy), Precision 0
	imageBlocksBackgroundSolid: { [key: number]: GridImageBlockSolid }; // (gx,gy), Precision 0
	imageBlocksForegroundFoliage: { [key: number]: GridImageBlockFoliage }; // (gx,gy), Precision 0
	imageBlocksForegroundLiquid: { [key: number]: GridImageBlockLiquid }; // (gx,gy), Precision 0
	imageBlocksForegroundReference: GridBlockTable<GridImageBlockReference>; // (gx,gy), Precision 0
	imageBlocksForegroundSolid: { [key: number]: GridImageBlockSolid }; // (gx,gy), Precision 0
	imageBlocksPrimaryFoliage: { [key: number]: GridImageBlockFoliage }; // (gx,gy), Precision 0
	imageBlocksPrimaryLiquid: { [key: number]: GridImageBlockLiquid }; // (gx,gy), Precision 0
	imageBlocksPrimaryReference: GridBlockTable<GridImageBlockReference>; // (gx,gy), Precision 0
	imageBlocksPrimarySolid: { [key: number]: GridImageBlockSolid }; // (gx,gy), Precision 0
	imageBlocksVanishingFoliage: { [key: number]: GridImageBlockFoliage }; // (gx,gy), Precision 0
	imageBlocksVanishingLiquid: { [key: number]: GridImageBlockLiquid }; // (gx,gy), Precision 0
	imageBlocksVanishingReference: GridBlockTable<GridImageBlockReference>; // (gx,gy), Precision 0
	imageBlocksVanishingSolid: { [key: number]: GridImageBlockSolid }; // (gx,gy), Precision 0
	lightsForeground: GridBlockTable<GridLight>; // (gx,gy), Precision 3
	lightsPrimary: GridBlockTable<GridLight>; // (gx,gy), Precision 3

	constructor(data: any) {
		this.audioPrimaryBlocks = data.audioPrimaryBlocks;
		this.audioPrimaryTagTriggers = data.audioPrimaryTagTriggers;
		this.id = data.id;
		this.imageBlocksBackgroundFoliage = data.imageBlocksBackgroundFoliage;
		this.imageBlocksBackgroundLiquid = data.imageBlocksBackgroundLiquid;
		this.imageBlocksBackgroundSolid = data.imageBlocksBackgroundSolid;
		this.imageBlocksForegroundFoliage = data.imageBlocksForegroundFoliage;
		this.imageBlocksForegroundLiquid = data.imageBlocksForegroundLiquid;
		this.imageBlocksForegroundSolid = data.imageBlocksForegroundSolid;
		this.imageBlocksPrimaryFoliage = data.imageBlocksPrimaryFoliage;
		this.imageBlocksPrimaryLiquid = data.imageBlocksPrimaryLiquid;
		this.imageBlocksPrimarySolid = data.imageBlocksPrimarySolid;
		this.imageBlocksVanishingFoliage = data.imageBlocksVanishingFoliage;
		this.imageBlocksVanishingLiquid = data.imageBlocksVanishingLiquid;
		this.imageBlocksVanishingSolid = data.imageBlocksVanishingSolid;
		this.lightsForeground = data.lightsForeground;
		this.lightsPrimary = data.lightsPrimary;
	}

	toJSON(): string {
		return JSON.stringify({
			audioPrimaryBlocks: this.audioPrimaryBlocks,
			audioPrimaryTagTriggers: this.audioPrimaryTagTriggers,
			id: this.id,
			imageBlocksBackgroundFoliage: this.imageBlocksBackgroundFoliage,
			imageBlocksBackgroundLiquid: this.imageBlocksBackgroundLiquid,
			imageBlocksBackgroundSolid: this.imageBlocksBackgroundSolid,
			imageBlocksForegroundFoliage: this.imageBlocksForegroundFoliage,
			imageBlocksForegroundLiquid: this.imageBlocksForegroundLiquid,
			imageBlocksForegroundSolid: this.imageBlocksForegroundSolid,
			imageBlocksPrimaryFoliage: this.imageBlocksPrimaryFoliage,
			imageBlocksPrimaryLiquid: this.imageBlocksPrimaryLiquid,
			imageBlocksPrimarySolid: this.imageBlocksPrimarySolid,
			imageBlocksVanishingFoliage: this.imageBlocksVanishingFoliage,
			imageBlocksVanishingLiquid: this.imageBlocksVanishingLiquid,
			imageBlocksVanishingSolid: this.imageBlocksVanishingSolid,
			lightsForeground: this.lightsForeground,
			lightsPrimary: this.lightsPrimary,
		});
	}
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
	id: string; // Matches associate grid.id
	outside: boolean;
	physics: GridPhysics;
	startGxCamera: number; // Precision 3
	startGyCamera: number; // Precision 3
	startGxPlayer: number; // Precision 3
	startGyPlayer: number; // Precision 3
	zoomDefault: number; // defaulted by MapEngine
}

export interface GridAudioBlock extends GridObject {
	modulationId: string;
}

export interface GridAudioTrigger extends GridObject {
	trip: GridAudioTriggerTripType;
	type: GridAudioTriggerType;
}

export interface GridAudioTriggerEffect extends GridAudioTrigger {
	assetId: string;
	oneshot: boolean; // true and the trigger fires everytime it's tripped
	volumePercentage: number; // between 0 and 1 with a precision of 3
}

export interface GridAudioTriggerMusic extends GridAudioTrigger {
	assetId: string;
	tagId: string;
	volumePercentage: number; // between 0 and 1 with a precision of 3
}

export interface GridAudioTriggerMusicFade extends GridAudioTrigger {
	fadeDurationInMs: number; // between 0 and 1 with a precision of 3
	fadeTo: number; // between 0 and 1 with a precision of 3
	tagId: string;
}

export interface GridAudioTriggerMusicPause extends GridAudioTrigger {
	tagId: string;
}

export interface GridAudioTriggerMusicUnpause extends GridAudioTrigger {
	tagId: string;
}

export enum GridAudioTriggerType {
	EFFECT,
	MUSIC,
	MUSIC_FADE,
	MUSIC_PAUSE,
	MUSIC_UNPAUSE,
}

export enum GridAudioTriggerTripType {
	CONTACT, // Charactor touches the gBlock
	HORIZONTAL, // Charactor passes top-to-bottom or vice versa
	VERTICAL, // Charactor passes left-to-right or vice versa
}

export interface GridCoordinate {
	gx: number; // Precision 3
	gy: number; // Precision 3
}

export interface GridImageBlock extends GridObject {
	assetId: string;
}

export interface GridImageBlockFoliage extends GridImageBlock {
	assetIdDamaged?: string; // replaces assetId on damage
	damageable?: boolean;
	destructible?: boolean;
	extends?: number;
	strengthToDamangeInN?: number; // newtons of force required to destroy
	strengthToDestroyInN?: number; // newtons of force required to destroy
}

export interface GridImageBlockLiquid extends GridImageBlock {
	assetIdAudioEffectAmbient?: string;
	assetIdAudioEffectSwim?: string; // fallback is no audio
	assetIdAudioEffectTread?: string; // fallback is no audio
	viscocity: number; // how thick the liquid is
}

export interface GridImageBlockReference {
	block: GridImageBlock;
	blocks: { [key: number]: GridImageBlock };
	hash: number;
	hashesGyByGx: { [key: number]: number[] };
	objectType: GridObjectType;
}

export interface GridImageBlockSolid extends GridImageBlock {
	assetIdDamaged?: string; // replaces assetId on damage
	assetIdAudioEffectWalkedOn?: string; // fallback is no audio
	assetIdAudioEffectWalkedOnDamaged?: string; // replaces assetIdAudioEffectWalkedOn on damage
	damageable?: boolean;
	destructible?: boolean;
	extends?: number;
	strengthToDamangeInN?: number; // newtons of force required to destroy
	strengthToDestroyInN?: number; // newtons of force required to destroy
}

export interface GridLight extends GridObject {
	assetId: string;
	assetIdAudioEffectAmbient?: string;
	destructible?: boolean;
	directionOmni?: boolean;
	directionOmniBrightness?: number;
	directionOmniGRadius?: number;
	directions?: GridLightDirection[];
	nightOnly?: boolean;
	rounded?: boolean;
	strengthToDestroyInN?: number; // newtons of force required to destroy
}

export interface GridLightDirection {
	brightness: number; // max 6 [6 is full sun], min 1 (Precision 0)
	gRadius: number;
	type: GridLightType;
}

export enum GridLightType {
	DOWN,
	LEFT,
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
	AUDIO_TRIGGER,
	IMAGE_BLOCK_FOLIAGE,
	IMAGE_BLOCK_LIQUID,
	IMAGE_BLOCK_SOLID,
	LIGHT,
}

export enum GridPhysics {
	SIDE_SCROLLER,
	TOP_DOWN,
}
