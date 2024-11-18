import { AssetCollection, AssetImage, AssetImageSrcQuality, AssetImageType } from '../models/asset.model';

/**
 * @author tknight-dev
 */

let dirtEngineDefaultImageManifest: AssetImage[] = [
	{
		gHeight: 1,
		gWidth: 1,
		id: 'BEDROCK',
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
				src: 'images/grid-objects/bedrock_16_16.webp',
			},
			{
				collection: AssetCollection.VIDEO,
				quality: AssetImageSrcQuality.MEDIUM,
				src: 'images/grid-objects/bedrock_32_32.webp',
			},
			{
				collection: AssetCollection.SHARED,
				quality: AssetImageSrcQuality.HIGH,
				src: 'images/grid-objects/bedrock_64_64.webp',
			},
		],
		type: AssetImageType.GRID_BLOCK_SOLID,
	},
	{
		gHeight: 1,
		gWidth: 1,
		id: 'DIRT',
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
				src: 'images/grid-objects/dirt_16_16.webp',
			},
			{
				collection: AssetCollection.VIDEO,
				quality: AssetImageSrcQuality.MEDIUM,
				src: 'images/grid-objects/dirt_32_32.webp',
			},
			{
				collection: AssetCollection.SHARED,
				quality: AssetImageSrcQuality.HIGH,
				src: 'images/grid-objects/dirt_64_64.webp',
			},
		],
		type: AssetImageType.GRID_BLOCK_SOLID,
	},
	{
		gHeight: 1,
		gWidth: 1,
		id: 'DIRT_ENGINE',
		meta: {
			author: 'tknight-dev',
			authorWebsite: 'https://tknight.dev',
			license: undefined,
			publicDomain: false,
			title: undefined,
		},
		srcs: [
			{
				collection: AssetCollection.UI,
				quality: AssetImageSrcQuality.HIGH,
				src: 'images/logo/dirt-engine.webp',
			},
		],
		type: AssetImageType.LOGO,
	},
	{
		gHeight: 1,
		gWidth: 1,
		id: 'DIRT_GRASS',
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
				src: 'images/grid-objects/dirt_grass_16_16.webp',
			},
			{
				collection: AssetCollection.VIDEO,
				quality: AssetImageSrcQuality.MEDIUM,
				src: 'images/grid-objects/dirt_grass_32_32.webp',
			},
			{
				collection: AssetCollection.SHARED,
				quality: AssetImageSrcQuality.HIGH,
				src: 'images/grid-objects/dirt_grass_64_64.webp',
			},
		],
		type: AssetImageType.GRID_BLOCK_SOLID,
	},
	{
		id: 'LANTERN1',
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
				src: 'images/grid-objects/lantern1_16_16.webp',
			},
			{
				collection: AssetCollection.VIDEO,
				quality: AssetImageSrcQuality.MEDIUM,
				src: 'images/grid-objects/lantern1_32_32.webp',
			},
			{
				collection: AssetCollection.SHARED,
				quality: AssetImageSrcQuality.HIGH,
				src: 'images/grid-objects/lantern1_64_64.webp',
			},
		],
		type: AssetImageType.GRID_LIGHT,
	},
	{
		id: 'LANTERN2',
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
				src: 'images/grid-objects/lantern2_16_16.webp',
			},
			{
				collection: AssetCollection.VIDEO,
				quality: AssetImageSrcQuality.MEDIUM,
				src: 'images/grid-objects/lantern2_32_32.webp',
			},
			{
				collection: AssetCollection.SHARED,
				quality: AssetImageSrcQuality.HIGH,
				src: 'images/grid-objects/lantern2_64_64.webp',
			},
		],
		type: AssetImageType.GRID_LIGHT,
	},
	{
		gHeight: 1,
		gWidth: 1,
		id: 'NULL1',
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
	{
		gHeight: 1,
		gWidth: 1,
		id: 'ROCK',
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
				src: 'images/grid-objects/rock_16_16.webp',
			},
			{
				collection: AssetCollection.VIDEO,
				quality: AssetImageSrcQuality.MEDIUM,
				src: 'images/grid-objects/rock_32_32.webp',
			},
			{
				collection: AssetCollection.SHARED,
				quality: AssetImageSrcQuality.HIGH,
				src: 'images/grid-objects/rock_64_64.webp',
			},
		],
		type: AssetImageType.GRID_BLOCK_SOLID,
	},
	{
		gHeight: 1,
		gWidth: 1,
		id: 'ROCK_DAMAGED',
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
				src: 'images/grid-objects/rock_damaged_16_16.webp',
			},
			{
				collection: AssetCollection.VIDEO,
				quality: AssetImageSrcQuality.MEDIUM,
				src: 'images/grid-objects/rock_damaged_32_32.webp',
			},
			{
				collection: AssetCollection.SHARED,
				quality: AssetImageSrcQuality.HIGH,
				src: 'images/grid-objects/rock_damaged_64_64.webp',
			},
		],
		type: AssetImageType.GRID_BLOCK_SOLID,
	},
	{
		gHeight: 1,
		gWidth: 1,
		id: 'TKNIGHT_DEV',
		meta: {
			author: 'tknight-dev',
			authorWebsite: 'https://tknight.dev',
			license: undefined,
			publicDomain: false,
			title: undefined,
		},
		srcs: [
			{
				collection: AssetCollection.UI,
				quality: AssetImageSrcQuality.HIGH,
				src: 'images/logo/tknight-dev.svg',
			},
		],
		type: AssetImageType.LOGO,
	},
	{
		id: 'TREE1',
		gHeight: 2,
		gWidth: 2,
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
				src: 'images/grid-objects/tree1_32_32.webp',
			},
			{
				collection: AssetCollection.VIDEO,
				quality: AssetImageSrcQuality.MEDIUM,
				src: 'images/grid-objects/tree1_64_64.webp',
			},
			{
				collection: AssetCollection.SHARED,
				quality: AssetImageSrcQuality.HIGH,
				src: 'images/grid-objects/tree1_128_128.webp',
			},
		],
		type: AssetImageType.GRID_BLOCK_FOLIAGE,
	},
	{
		id: 'TREE2',
		gHeight: 2,
		gWidth: 2,
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
				src: 'images/grid-objects/tree2_32_32.webp',
			},
			{
				collection: AssetCollection.VIDEO,
				quality: AssetImageSrcQuality.MEDIUM,
				src: 'images/grid-objects/tree2_64_64.webp',
			},
			{
				collection: AssetCollection.SHARED,
				quality: AssetImageSrcQuality.HIGH,
				src: 'images/grid-objects/tree2_128_128.webp',
			},
		],
		type: AssetImageType.GRID_BLOCK_FOLIAGE,
	},
];

export { dirtEngineDefaultImageManifest };
