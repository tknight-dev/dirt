/**
 * @author tknight-dev
 */

export interface Asset {
	id: string;
	collection: AssetCollection;
	meta: AssetMeta | undefined;
}

export enum AssetAudioType {
	EFFECT,
	MUSIC,
}

export interface AssetAudio extends Asset {
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
	customS: string | undefined; // filename of your asset pack
	customU: string | undefined; // filename of your asset pack
	customV: string | undefined; // filename of your asset pack
	dir: string | undefined; // defaults to current directory
	manifest: AssetManifest | undefined;
}

export interface AssetImage extends Asset {
	srcs: AssetImageSrc[]; // requires atleast one, missing resolutions will load from a smaller resolution, smallest first
	type: AssetImageType;
}

export interface AssetImageSrc {
	resolution: AssetImageSrcResolution;
	src: string;
}

export enum AssetImageSrcResolution {
	ONLY,
	_16_16,
	_32_32,
	_64_64,
	_128_128,
	_256_256,
	_512_512,
	_1024_1024,
	_2048_2048,
}

export enum AssetImageType {
	GRID_BLOCK,
	LOGO,
}

export interface AssetManifest {
	audio: AssetAudio[] | undefined;
	images: AssetImage[] | undefined;
	maps: AssetMap[] | undefined;
}

export interface AssetManifestMaster {
	audio: { [key: string]: AssetAudio };
	images: { [key: string]: AssetImage };
	maps: { [key: string]: AssetMap };
}

export interface AssetMap extends Asset {
	src: string; // eg: 'video/maps/level01.map' from the shared assets archive
	order: number; // start from 0 (Precision 0)
}

export interface AssetMeta {
	author: string;
	authorWebsite: string | undefined;
	license: string | undefined;
	publicDomain: boolean;
	title: string | undefined;
}
