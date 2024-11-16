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
	srcs: AssetImageSrc[]; // requires atleast one, missing qualitys will load from a smaller quality, smallest first
	type: AssetImageType;
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
	GRID_BLOCK_FOLIAGE,
	GRID_BLOCK_LIQUID,
	GRID_BLOCK_SOLID,
	LOGO,
	NULL,
}

export interface AssetManifest {
	audio?: AssetAudio[];
	images?: AssetImage[];
	maps?: AssetMap[];
}

export interface AssetManifestMaster {
	audio: { [key: string]: AssetAudio };
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
