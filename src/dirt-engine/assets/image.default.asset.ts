import { AssetCollection, AssetImage, AssetImageSrcQuality, AssetImageType } from '../models/asset.model';

/**
 * @author tknight-dev
 */

let dirtEngineDefaultImageManifest: AssetImage[] = [
	{
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
		type: AssetImageType.GRID_BLOCK,
	},
	{
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
		type: AssetImageType.GRID_BLOCK,
	},
	{
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
		type: AssetImageType.GRID_BLOCK,
	},
	{
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
		type: AssetImageType.GRID_BLOCK,
	},
	{
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
		type: AssetImageType.GRID_BLOCK,
	},
	{
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
		type: AssetImageType.GRID_BLOCK,
	},
	{
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
		type: AssetImageType.GRID_BLOCK,
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
		type: AssetImageType.GRID_BLOCK,
	},
];

export { dirtEngineDefaultImageManifest };
