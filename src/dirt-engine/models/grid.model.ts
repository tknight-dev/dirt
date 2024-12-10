import { DoubleLinkedList } from '../models/double-linked-list.model';

/**
 * Edges of the grid may fall outside of viewer as they may reside in buffer space
 *
 * @author tknight-dev
 */

export class Grid {
	audioInteractiveBlocks: GridBlockTable<GridAudioBlock>; // (gx,gy), Precision 0
	audioInteractiveTags: GridBlockTable<GridAudioTag>; // (gx,gy), Precision 3
	id: string;
	imageBlocksBackground1Foliage: { [key: number]: GridImageBlockFoliage }; // (gx,gy), Precision 0
	imageBlocksBackground1Liquid: { [key: number]: GridImageBlockLiquid }; // (gx,gy), Precision 0
	imageBlocksBackground1Reference: GridBlockTable<GridImageBlockReference>; // (gx,gy), Precision 0
	imageBlocksBackground1Solid: { [key: number]: GridImageBlockSolid }; // (gx,gy), Precision 0
	imageBlocksBackground2Foliage: { [key: number]: GridImageBlockFoliage }; // (gx,gy), Precision 0
	imageBlocksBackground2Liquid: { [key: number]: GridImageBlockLiquid }; // (gx,gy), Precision 0
	imageBlocksBackground2Reference: GridBlockTable<GridImageBlockReference>; // (gx,gy), Precision 0
	imageBlocksBackground2Solid: { [key: number]: GridImageBlockSolid }; // (gx,gy), Precision 0
	imageBlocksCalcPipelineAnimations: DoubleLinkedList<GridAnimation>;
	imageBlocksForeground1Foliage: { [key: number]: GridImageBlockFoliage }; // (gx,gy), Precision 0
	imageBlocksForeground1Liquid: { [key: number]: GridImageBlockLiquid }; // (gx,gy), Precision 0
	imageBlocksForeground1Reference: GridBlockTable<GridImageBlockReference>; // (gx,gy), Precision 0
	imageBlocksForeground1Solid: { [key: number]: GridImageBlockSolid }; // (gx,gy), Precision 0
	imageBlocksForeground2Foliage: { [key: number]: GridImageBlockFoliage }; // (gx,gy), Precision 0
	imageBlocksForeground2Liquid: { [key: number]: GridImageBlockLiquid }; // (gx,gy), Precision 0
	imageBlocksForeground2Reference: GridBlockTable<GridImageBlockReference>; // (gx,gy), Precision 0
	imageBlocksForeground2Solid: { [key: number]: GridImageBlockSolid }; // (gx,gy), Precision 0
	imageBlocksInteractiveFoliage: { [key: number]: GridImageBlockFoliage }; // (gx,gy), Precision 0
	imageBlocksInteractiveLiquid: { [key: number]: GridImageBlockLiquid }; // (gx,gy), Precision 0
	imageBlocksInteractiveReference: GridBlockTable<GridImageBlockReference>; // (gx,gy), Precision 0
	imageBlocksInteractiveSolid: { [key: number]: GridImageBlockSolid }; // (gx,gy), Precision 0
	imageBlocksMiddlegroundFoliage: { [key: number]: GridImageBlockFoliage }; // (gx,gy), Precision 0
	imageBlocksMiddlegroundLiquid: { [key: number]: GridImageBlockLiquid }; // (gx,gy), Precision 0
	imageBlocksMiddlegroundReference: GridBlockTable<GridImageBlockReference>; // (gx,gy), Precision 0
	imageBlocksMiddlegroundSolid: { [key: number]: GridImageBlockSolid }; // (gx,gy), Precision 0
	imageBlocksRenderPipelineAssetsByGyByGx: { [key: number]: { [key: number]: GridBlockPipelineAsset[] } };
	imageBlocksRenderPipelineGy: { [key: number]: number[] };
	imageBlocksVanishingFoliage: { [key: number]: GridImageBlockFoliage }; // (gx,gy), Precision 0
	imageBlocksVanishingLiquid: { [key: number]: GridImageBlockLiquid }; // (gx,gy), Precision 0
	imageBlocksVanishingReference: GridBlockTable<GridImageBlockReference>; // (gx,gy), Precision 0
	imageBlocksVanishingSolid: { [key: number]: GridImageBlockSolid }; // (gx,gy), Precision 0
	lightsForeground1: GridBlockTable<GridLight>; // (gx,gy), Precision 3
	lightsInteractive: GridBlockTable<GridLight>; // (gx,gy), Precision 3

	constructor(data: any) {
		this.audioInteractiveBlocks = data.audioInteractiveBlocks;
		this.audioInteractiveTags = data.audioInteractiveTags;
		this.id = data.id;
		this.imageBlocksBackground1Foliage = data.imageBlocksBackground1Foliage;
		this.imageBlocksBackground1Liquid = data.imageBlocksBackground1Liquid;
		this.imageBlocksBackground1Solid = data.imageBlocksBackground1Solid;
		this.imageBlocksBackground2Foliage = data.imageBlocksBackground2Foliage;
		this.imageBlocksBackground2Liquid = data.imageBlocksBackground2Liquid;
		this.imageBlocksBackground2Solid = data.imageBlocksBackground2Solid;
		this.imageBlocksForeground1Foliage = data.imageBlocksForeground1Foliage;
		this.imageBlocksForeground1Liquid = data.imageBlocksForeground1Liquid;
		this.imageBlocksForeground1Solid = data.imageBlocksForeground1Solid;
		this.imageBlocksForeground2Foliage = data.imageBlocksForeground2Foliage;
		this.imageBlocksForeground2Liquid = data.imageBlocksForeground2Liquid;
		this.imageBlocksForeground2Solid = data.imageBlocksForeground2Solid;
		this.imageBlocksInteractiveFoliage = data.imageBlocksInteractiveFoliage;
		this.imageBlocksInteractiveLiquid = data.imageBlocksInteractiveLiquid;
		this.imageBlocksInteractiveSolid = data.imageBlocksInteractiveSolid;
		this.imageBlocksMiddlegroundFoliage = data.imageBlocksMiddlegroundFoliage;
		this.imageBlocksMiddlegroundLiquid = data.imageBlocksMiddlegroundLiquid;
		this.imageBlocksMiddlegroundSolid = data.imageBlocksMiddlegroundSolid;
		this.imageBlocksVanishingFoliage = data.imageBlocksVanishingFoliage;
		this.imageBlocksVanishingLiquid = data.imageBlocksVanishingLiquid;
		this.imageBlocksVanishingSolid = data.imageBlocksVanishingSolid;
		this.lightsForeground1 = data.lightsForeground1;
		this.lightsInteractive = data.lightsInteractive;
	}

	toJSON(): string {
		return JSON.stringify({
			audioInteractiveBlocks: this.audioInteractiveBlocks,
			audioInteractiveTags: this.audioInteractiveTags,
			id: this.id,
			imageBlocksBackground1Foliage: this.imageBlocksBackground1Foliage,
			imageBlocksBackground1Liquid: this.imageBlocksBackground1Liquid,
			imageBlocksBackground1Solid: this.imageBlocksBackground1Solid,
			imageBlocksBackground2Foliage: this.imageBlocksBackground2Foliage,
			imageBlocksBackground2Liquid: this.imageBlocksBackground2Liquid,
			imageBlocksBackground2Solid: this.imageBlocksBackground2Solid,
			imageBlocksForeground1Foliage: this.imageBlocksForeground1Foliage,
			imageBlocksForeground1Liquid: this.imageBlocksForeground1Liquid,
			imageBlocksForeground1Solid: this.imageBlocksForeground1Solid,
			imageBlocksForeground2Foliage: this.imageBlocksForeground2Foliage,
			imageBlocksForeground2Liquid: this.imageBlocksForeground2Liquid,
			imageBlocksForeground2Solid: this.imageBlocksForeground2Solid,
			imageBlocksInteractiveFoliage: this.imageBlocksInteractiveFoliage,
			imageBlocksInteractiveLiquid: this.imageBlocksInteractiveLiquid,
			imageBlocksInteractiveSolid: this.imageBlocksInteractiveSolid,
			imageBlocksMiddlegroundFoliage: this.imageBlocksMiddlegroundFoliage,
			imageBlocksMiddlegroundLiquid: this.imageBlocksMiddlegroundLiquid,
			imageBlocksMiddlegroundSolid: this.imageBlocksMiddlegroundSolid,
			imageBlocksVanishingFoliage: this.imageBlocksVanishingFoliage,
			imageBlocksVanishingLiquid: this.imageBlocksVanishingLiquid,
			imageBlocksVanishingSolid: this.imageBlocksVanishingSolid,
			lightsForeground1: this.lightsForeground1,
			lightsInteractive: this.lightsInteractive,
		});
	}
}

export interface GridAnimation {
	assetIds: string[]; // first frame is assetId from parent definition
	assetOptions: GridImageTransform[]; // first frame options are set by parent definition
	calc?: GridAnimationCalc;
	finishOnLastFrame?: boolean;
	frameDurationInMs: number;
	indexInitial?: number;
	loopCount?: number; // 0 is Inf
	reverse?: boolean;
}

export interface GridAnimationCalc {
	count: number;
	durationInMs: number;
	ended: boolean;
	index: number;
}

export interface GridBlockPipelineAsset {
	asset?: GridImageBlock;
	assetLarge?: boolean;
	audioBlock?: GridAudioBlock;
	audioTag?: GridAudioTag;
	extends?: boolean;
	light?: GridLight;
	lightExtends?: boolean;
	lightLarge?: boolean;
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

export interface GridAudioTag extends GridObject {
	alwaysOn?: boolean; // if true, ignore activation and oneshot
	assetId: string;
	gRadius?: number; // The distance from origin that the sound can be heard, 0 is everywhere
	panIgnored?: boolean;
	tagId?: string; // blank is not-tagged
	type: GridAudioTagType;
}

export interface GridAudioTagEffect extends GridAudioTag {
	activation?: GridAudioTagActivationType;
	oneshot?: boolean; // false and the trigger fires everytime it's tripped
}

export interface GridAudioTagMusic extends GridAudioTag {
	volumePercentage: number; // between 0 and 1 with a precision of 3
}

export interface GridAudioTagFade extends GridAudioTag {
	fadeDurationInMs: number; // min 0 (precision 0)
	fadeTo: number; // between 0 and 1 with a precision of 3
}

export interface GridAudioTagPause extends GridAudioTag {}

export interface GridAudioTagUnpause extends GridAudioTag {}

export interface GridAudioTagStop extends GridAudioTag {}

export enum GridAudioTagActivationType {
	CONTACT, // Charactor touches the gBlock
	HORIZONTAL, // Charactor passes top-to-bottom or vice versa
	VERTICAL, // Charactor passes left-to-right or vice versa
}

export enum GridAudioTagType {
	EFFECT,
	FADE,
	MUSIC,
	PAUSE,
	UNPAUSE,
	STOP,
}

export interface GridCoordinate {
	gx: number; // Precision 3
	gy: number; // Precision 3
}

export interface GridImageBlock extends GridImageTransform, GridObject {
	assetAnimation?: GridAnimation;
	assetId: string;
	passthroughLight?: boolean;
	transparency?: number;
}

export enum GridImageBlockHalved {
	NONE,
	DOWN,
	UP,
}

export interface GridImageBlockFoliage extends GridImageBlock {
	assetIdDamaged?: string; // replaces assetId on damage
	damageable?: boolean;
	destructible?: boolean;
	extends?: number;
	passthroughCharacter?: boolean;
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
	passthroughCharacter?: boolean;
	strengthToDamangeInN?: number; // newtons of force required to destroy
	strengthToDestroyInN?: number; // newtons of force required to destroy
}

export interface GridImageTransform {
	flipH?: boolean;
	flipV?: boolean;
	halved?: GridImageBlockHalved;
}

export interface GridLight extends GridImageTransform, GridObject {
	assetAnimation?: GridAnimation;
	assetId: string;
	assetIdAudioEffectAmbient?: string;
	assetIdAudioEffectDestroyed?: string;
	assetIdAudioEffectSwitchOff?: string;
	assetIdAudioEffectSwitchOn?: string;
	destructible?: boolean;
	directionOmni?: boolean;
	directionOmniBrightness?: number;
	directionOmniGRadius?: number;
	directions?: GridLightDirection[];
	gRadiusAudioEffect?: number;
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
	null?: boolean;
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
	AUDIO_TAG,
	IMAGE_BLOCK_FOLIAGE,
	IMAGE_BLOCK_LIQUID,
	IMAGE_BLOCK_SOLID,
	LIGHT,
}

export enum GridPhysics {
	SIDE_SCROLLER,
	TOP_DOWN,
}
