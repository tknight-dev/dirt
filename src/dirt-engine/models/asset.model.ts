/**
 * @author tknight-dev
 */

export interface Asset {
	id: string;
	meta: AssetMeta | undefined;
}

export enum AssetAudioType {
	EFFECT,
	MUSIC,
}

export interface AssetAudio extends Asset {
	collection: AssetCollection;
	src: string; // eg: 'ui/audio/music/music.mp3' from the shared assets archive
	type: AssetAudioType;
	volumeOffset: number; // range is 0-1 (Precision3)
}

export enum AssetCollection {
	SHARED,
	UI,
	VIDEO,
}

export interface AssetDeclarations {
	customS?: string; // filename of your asset pack
	customU?: string; // filename of your asset pack
	customV?: string; // filename of your asset pack
	dirCustom?: string; // defaults to current directory
	dirDefault?: string; // defaults to current directory
	manifest?: AssetManifest;
}

export interface AssetImage extends Asset {
	gHeight: number;
	gWidth: number;
	srcs: AssetImageSrc[]; // requires atleast one, missing qualities will load from a lesser quality
	type: AssetImageType;
}

export interface AssetImageAnimation extends AssetImage {
	seriesId: string; // must be unique to AssetImageType (organizes images in animation loops amongst other images)
	seriesIndex: number; // must be unique to seriesId
}

export interface AssetImageCharacter extends AssetImage {
	collectionId: string;
	hitboxes: AssetImageHitbox[]; // required for characters
	seriesId: string; // must be unique to AssetImageType (organizes images in animation loops amongst other images)
	seriesIndex: number; // must be unique to seriesId
}

export interface AssetImageHitbox {
	damage: AssetImageHitboxDamage;
	gh: number; // Precision3
	gw: number; // Precision3
	gx: number; // Precision3
	gy: number; // Precision3
}

export enum AssetImageHitboxDamage {
	HIGH,
	LOW,
	MEDIUM,
}

export interface AssetImageSrc {
	collection: AssetCollection;
	quality: AssetImageSrcQuality;
	src: string;
}

export enum AssetImageSrcQuality {
	LOW,
	MEDIUM,
	HIGH,
}

export enum AssetImageType {
	CHARACTER,
	GRID_BLOCK_ACTION,
	GRID_BLOCK_FOLIAGE,
	GRID_BLOCK_LIQUID,
	GRID_BLOCK_SOLID,
	GRID_LIGHT,
	GRID_LIQUID,
	LOGO,
	NULL,
	SYSTEM,
	UNDERLAY,
}

export interface AssetManifest {
	audio?: AssetAudio[];
	images?: AssetImage[];
	maps?: AssetMap[];
}

export interface AssetManifestMaster {
	audio: { [key: string]: AssetAudio };
	charactersBySeriesIdByCollectionId: { [key: string]: { [key: string]: AssetImageCharacter[] } }; // generated from images
	images: { [key: string]: AssetImage };
	maps: { [key: string]: AssetMap };
}

export interface AssetMap extends Asset {
	collection: AssetCollection;
	src: string; // eg: 'video/maps/level01.map' from the shared assets archive
	order: number; // start from 0 (Precision 0)
}

export interface AssetMeta {
	author: string;
	authorWebsite?: string;
	license?: string;
	publicDomain: boolean;
	title?: string;
}
