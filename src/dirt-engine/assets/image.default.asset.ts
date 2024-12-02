import { AssetCollection, AssetImage, AssetImageSrcQuality, AssetImageType } from '../models/asset.model';

/**
 * @author tknight-dev
 */

let dirtEngineDefaultImageManifest: AssetImage[] = [
	{
		id: 'AUDIO_TAG_EFFECT',
		gHeight: 1,
		gWidth: 1,
		meta: {
			author: 'tknight-dev',
			authorWebsite: 'https://tknight.dev',
			license: undefined,
			publicDomain: false,
			title: undefined,
		},
		srcs: [
			{
				collection: AssetCollection.VIDEO,
				quality: AssetImageSrcQuality.LOW,
				src: 'images/grid-objects/system/audio_tag_effect_16_16.webp',
			},
			{
				collection: AssetCollection.VIDEO,
				quality: AssetImageSrcQuality.MEDIUM,
				src: 'images/grid-objects/system/audio_tag_effect_32_32.webp',
			},
			{
				collection: AssetCollection.SHARED,
				quality: AssetImageSrcQuality.HIGH,
				src: 'images/grid-objects/system/audio_tag_effect_64_64.webp',
			},
		],
		type: AssetImageType.SYSTEM,
	},
	{
		id: 'AUDIO_TAG_MUSIC',
		gHeight: 1,
		gWidth: 1,
		meta: {
			author: 'tknight-dev',
			authorWebsite: 'https://tknight.dev',
			license: undefined,
			publicDomain: false,
			title: undefined,
		},
		srcs: [
			{
				collection: AssetCollection.VIDEO,
				quality: AssetImageSrcQuality.LOW,
				src: 'images/grid-objects/system/audio_tag_music_16_16.webp',
			},
			{
				collection: AssetCollection.VIDEO,
				quality: AssetImageSrcQuality.MEDIUM,
				src: 'images/grid-objects/system/audio_tag_music_32_32.webp',
			},
			{
				collection: AssetCollection.SHARED,
				quality: AssetImageSrcQuality.HIGH,
				src: 'images/grid-objects/system/audio_tag_music_64_64.webp',
			},
		],
		type: AssetImageType.SYSTEM,
	},
	{
		gHeight: 1,
		gWidth: 1,
		id: 'NULL',
		meta: {
			author: 'tknight-dev',
			authorWebsite: 'https://tknight.dev',
			license: undefined,
			publicDomain: false,
			title: undefined,
		},
		srcs: [
			{
				collection: AssetCollection.SHARED,
				quality: AssetImageSrcQuality.HIGH,
				src: 'images/grid-objects/null_16_16.webp',
			},
		],
		type: AssetImageType.NULL,
	},
	{
		gHeight: 1,
		gWidth: 1,
		id: 'NULL2',
		meta: {
			author: 'tknight-dev',
			authorWebsite: 'https://tknight.dev',
			license: undefined,
			publicDomain: false,
			title: undefined,
		},
		srcs: [
			{
				collection: AssetCollection.SHARED,
				quality: AssetImageSrcQuality.HIGH,
				src: 'images/grid-objects/null2_16_16.webp',
			},
		],
		type: AssetImageType.NULL,
	},
];

export { dirtEngineDefaultImageManifest };
