import { AssetCollection, AssetImage, AssetImageSrcQuality, AssetImageType } from '../dirt-engine/dirt.engine';

/**
 * @author tknight-dev
 */

let imageManifest: AssetImage[] = [
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
				src: 'images/grid-objects/solids/bedrock_16_16.webp',
			},
			{
				collection: AssetCollection.VIDEO,
				quality: AssetImageSrcQuality.MEDIUM,
				src: 'images/grid-objects/solids/bedrock_32_32.webp',
			},
			{
				collection: AssetCollection.SHARED,
				quality: AssetImageSrcQuality.HIGH,
				src: 'images/grid-objects/solids/bedrock_64_64.webp',
			},
		],
		type: AssetImageType.GRID_BLOCK_SOLID,
	},
	{
		id: 'CORAL1',
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
				src: 'images/grid-objects/liquids/coral1_16_16.webp',
			},
			{
				collection: AssetCollection.VIDEO,
				quality: AssetImageSrcQuality.MEDIUM,
				src: 'images/grid-objects/liquids/coral1_32_32.webp',
			},
			{
				collection: AssetCollection.SHARED,
				quality: AssetImageSrcQuality.HIGH,
				src: 'images/grid-objects/liquids/coral1_64_64.webp',
			},
		],
		type: AssetImageType.GRID_BLOCK_LIQUID,
	},
	{
		id: 'CORAL2',
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
				src: 'images/grid-objects/liquids/coral2_16_16.webp',
			},
			{
				collection: AssetCollection.VIDEO,
				quality: AssetImageSrcQuality.MEDIUM,
				src: 'images/grid-objects/liquids/coral2_32_32.webp',
			},
			{
				collection: AssetCollection.SHARED,
				quality: AssetImageSrcQuality.HIGH,
				src: 'images/grid-objects/liquids/coral2_64_64.webp',
			},
		],
		type: AssetImageType.GRID_BLOCK_LIQUID,
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
				src: 'images/grid-objects/solids/dirt_16_16.webp',
			},
			{
				collection: AssetCollection.VIDEO,
				quality: AssetImageSrcQuality.MEDIUM,
				src: 'images/grid-objects/solids/dirt_32_32.webp',
			},
			{
				collection: AssetCollection.SHARED,
				quality: AssetImageSrcQuality.HIGH,
				src: 'images/grid-objects/solids/dirt_64_64.webp',
			},
		],
		type: AssetImageType.GRID_BLOCK_SOLID,
	},
	{
		gHeight: 2,
		gWidth: 2,
		id: 'DOOR_FRONT1_CLOSED',
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
				src: 'images/grid-objects/doors/door_front1_closed_32_32.webp',
			},
			{
				collection: AssetCollection.VIDEO,
				quality: AssetImageSrcQuality.MEDIUM,
				src: 'images/grid-objects/doors/door_front1_closed_64_64.webp',
			},
			{
				collection: AssetCollection.SHARED,
				quality: AssetImageSrcQuality.HIGH,
				src: 'images/grid-objects/doors/door_front1_closed_128_128.webp',
			},
		],
		type: AssetImageType.GRID_BLOCK_ACTION,
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
				src: 'images/grid-objects/solids/dirt_grass_16_16.webp',
			},
			{
				collection: AssetCollection.VIDEO,
				quality: AssetImageSrcQuality.MEDIUM,
				src: 'images/grid-objects/solids/dirt_grass_32_32.webp',
			},
			{
				collection: AssetCollection.SHARED,
				quality: AssetImageSrcQuality.HIGH,
				src: 'images/grid-objects/solids/dirt_grass_64_64.webp',
			},
		],
		type: AssetImageType.GRID_BLOCK_SOLID,
	},
	{
		id: 'FOG',
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
				src: 'images/grid-objects/foliage/fog_16_16.webp',
			},
			{
				collection: AssetCollection.VIDEO,
				quality: AssetImageSrcQuality.MEDIUM,
				src: 'images/grid-objects/foliage/fog_32_32.webp',
			},
			{
				collection: AssetCollection.SHARED,
				quality: AssetImageSrcQuality.HIGH,
				src: 'images/grid-objects/foliage/fog_64_64.webp',
			},
		],
		type: AssetImageType.GRID_BLOCK_FOLIAGE,
	},
	{
		id: 'FOG_DROPOFF',
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
				src: 'images/grid-objects/foliage/fog_dropoff_16_16.webp',
			},
			{
				collection: AssetCollection.VIDEO,
				quality: AssetImageSrcQuality.MEDIUM,
				src: 'images/grid-objects/foliage/fog_dropoff_32_32.webp',
			},
			{
				collection: AssetCollection.SHARED,
				quality: AssetImageSrcQuality.HIGH,
				src: 'images/grid-objects/foliage/fog_dropoff_64_64.webp',
			},
		],
		type: AssetImageType.GRID_BLOCK_FOLIAGE,
	},
	{
		id: 'FOG_TALL',
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
				src: 'images/grid-objects/foliage/fog_tall_16_16.webp',
			},
			{
				collection: AssetCollection.VIDEO,
				quality: AssetImageSrcQuality.MEDIUM,
				src: 'images/grid-objects/foliage/fog_tall_32_32.webp',
			},
			{
				collection: AssetCollection.SHARED,
				quality: AssetImageSrcQuality.HIGH,
				src: 'images/grid-objects/foliage/fog_tall_64_64.webp',
			},
		],
		type: AssetImageType.GRID_BLOCK_FOLIAGE,
	},
	{
		id: 'FOG_TALL_DROPOFF',
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
				src: 'images/grid-objects/foliage/fog_tall_dropoff_16_16.webp',
			},
			{
				collection: AssetCollection.VIDEO,
				quality: AssetImageSrcQuality.MEDIUM,
				src: 'images/grid-objects/foliage/fog_tall_dropoff_32_32.webp',
			},
			{
				collection: AssetCollection.SHARED,
				quality: AssetImageSrcQuality.HIGH,
				src: 'images/grid-objects/foliage/fog_tall_dropoff_64_64.webp',
			},
		],
		type: AssetImageType.GRID_BLOCK_FOLIAGE,
	},
	{
		gHeight: 1,
		gWidth: 1,
		id: 'ICE',
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
				src: 'images/grid-objects/solids/ice_16_16.webp',
			},
			{
				collection: AssetCollection.VIDEO,
				quality: AssetImageSrcQuality.MEDIUM,
				src: 'images/grid-objects/solids/ice_32_32.webp',
			},
			{
				collection: AssetCollection.SHARED,
				quality: AssetImageSrcQuality.HIGH,
				src: 'images/grid-objects/solids/ice_64_64.webp',
			},
		],
		type: AssetImageType.GRID_BLOCK_SOLID,
	},
	{
		id: 'KELP1',
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
				src: 'images/grid-objects/liquids/kelp1_16_16.webp',
			},
			{
				collection: AssetCollection.VIDEO,
				quality: AssetImageSrcQuality.MEDIUM,
				src: 'images/grid-objects/liquids/kelp1_32_32.webp',
			},
			{
				collection: AssetCollection.SHARED,
				quality: AssetImageSrcQuality.HIGH,
				src: 'images/grid-objects/liquids/kelp1_64_64.webp',
			},
		],
		type: AssetImageType.GRID_BLOCK_LIQUID,
	},
	{
		id: 'KELP2',
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
				src: 'images/grid-objects/liquids/kelp2_16_16.webp',
			},
			{
				collection: AssetCollection.VIDEO,
				quality: AssetImageSrcQuality.MEDIUM,
				src: 'images/grid-objects/liquids/kelp2_32_32.webp',
			},
			{
				collection: AssetCollection.SHARED,
				quality: AssetImageSrcQuality.HIGH,
				src: 'images/grid-objects/liquids/kelp2_64_64.webp',
			},
		],
		type: AssetImageType.GRID_BLOCK_LIQUID,
	},
	{
		id: 'LADDER1',
		gHeight: 2,
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
				src: 'images/grid-objects/ladders/ladder1_16_32.webp',
			},
			{
				collection: AssetCollection.VIDEO,
				quality: AssetImageSrcQuality.MEDIUM,
				src: 'images/grid-objects/ladders/ladder1_32_64.webp',
			},
			{
				collection: AssetCollection.SHARED,
				quality: AssetImageSrcQuality.HIGH,
				src: 'images/grid-objects/ladders/ladder1_64_128.webp',
			},
		],
		type: AssetImageType.GRID_BLOCK_ACTION,
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
				src: 'images/grid-objects/lights/lantern1_16_16.webp',
			},
			{
				collection: AssetCollection.VIDEO,
				quality: AssetImageSrcQuality.MEDIUM,
				src: 'images/grid-objects/lights/lantern1_32_32.webp',
			},
			{
				collection: AssetCollection.SHARED,
				quality: AssetImageSrcQuality.HIGH,
				src: 'images/grid-objects/lights/lantern1_64_64.webp',
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
				src: 'images/grid-objects/lights/lantern2_16_16.webp',
			},
			{
				collection: AssetCollection.VIDEO,
				quality: AssetImageSrcQuality.MEDIUM,
				src: 'images/grid-objects/lights/lantern2_32_32.webp',
			},
			{
				collection: AssetCollection.SHARED,
				quality: AssetImageSrcQuality.HIGH,
				src: 'images/grid-objects/lights/lantern2_64_64.webp',
			},
		],
		type: AssetImageType.GRID_LIGHT,
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
				src: 'images/grid-objects/solids/rock_16_16.webp',
			},
			{
				collection: AssetCollection.VIDEO,
				quality: AssetImageSrcQuality.MEDIUM,
				src: 'images/grid-objects/solids/rock_32_32.webp',
			},
			{
				collection: AssetCollection.SHARED,
				quality: AssetImageSrcQuality.HIGH,
				src: 'images/grid-objects/solids/rock_64_64.webp',
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
				src: 'images/grid-objects/solids/rock_damaged_16_16.webp',
			},
			{
				collection: AssetCollection.VIDEO,
				quality: AssetImageSrcQuality.MEDIUM,
				src: 'images/grid-objects/solids/rock_damaged_32_32.webp',
			},
			{
				collection: AssetCollection.SHARED,
				quality: AssetImageSrcQuality.HIGH,
				src: 'images/grid-objects/solids/rock_damaged_64_64.webp',
			},
		],
		type: AssetImageType.GRID_BLOCK_SOLID,
	},
	{
		gHeight: 1,
		gWidth: 1,
		id: 'RUBBLE',
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
				src: 'images/grid-objects/solids/rubble_16_16.webp',
			},
			{
				collection: AssetCollection.VIDEO,
				quality: AssetImageSrcQuality.MEDIUM,
				src: 'images/grid-objects/solids/rubble_32_32.webp',
			},
			{
				collection: AssetCollection.SHARED,
				quality: AssetImageSrcQuality.HIGH,
				src: 'images/grid-objects/solids/rubble_64_64.webp',
			},
		],
		type: AssetImageType.GRID_BLOCK_SOLID,
	},
	{
		gHeight: 1,
		gWidth: 1,
		id: 'SAND',
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
				src: 'images/grid-objects/solids/sand_16_16.webp',
			},
			{
				collection: AssetCollection.VIDEO,
				quality: AssetImageSrcQuality.MEDIUM,
				src: 'images/grid-objects/solids/sand_32_32.webp',
			},
			{
				collection: AssetCollection.SHARED,
				quality: AssetImageSrcQuality.HIGH,
				src: 'images/grid-objects/solids/sand_64_64.webp',
			},
		],
		type: AssetImageType.GRID_BLOCK_SOLID,
	},
	{
		gHeight: 1,
		gWidth: 1,
		id: 'SNOW',
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
				src: 'images/grid-objects/solids/snow_16_16.webp',
			},
			{
				collection: AssetCollection.VIDEO,
				quality: AssetImageSrcQuality.MEDIUM,
				src: 'images/grid-objects/solids/snow_32_32.webp',
			},
			{
				collection: AssetCollection.SHARED,
				quality: AssetImageSrcQuality.HIGH,
				src: 'images/grid-objects/solids/snow_64_64.webp',
			},
		],
		type: AssetImageType.GRID_BLOCK_SOLID,
	},
	{
		gHeight: 1,
		gWidth: 1,
		id: 'STONE_DARK',
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
				src: 'images/grid-objects/solids/stone_dark_16_16.webp',
			},
			{
				collection: AssetCollection.VIDEO,
				quality: AssetImageSrcQuality.MEDIUM,
				src: 'images/grid-objects/solids/stone_dark_32_32.webp',
			},
			{
				collection: AssetCollection.SHARED,
				quality: AssetImageSrcQuality.HIGH,
				src: 'images/grid-objects/solids/stone_dark_64_64.webp',
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
				src: 'images/grid-objects/foliage/tree1_32_32.webp',
			},
			{
				collection: AssetCollection.VIDEO,
				quality: AssetImageSrcQuality.MEDIUM,
				src: 'images/grid-objects/foliage/tree1_64_64.webp',
			},
			{
				collection: AssetCollection.SHARED,
				quality: AssetImageSrcQuality.HIGH,
				src: 'images/grid-objects/foliage/tree1_128_128.webp',
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
				src: 'images/grid-objects/foliage/tree2_32_32.webp',
			},
			{
				collection: AssetCollection.VIDEO,
				quality: AssetImageSrcQuality.MEDIUM,
				src: 'images/grid-objects/foliage/tree2_64_64.webp',
			},
			{
				collection: AssetCollection.SHARED,
				quality: AssetImageSrcQuality.HIGH,
				src: 'images/grid-objects/foliage/tree2_128_128.webp',
			},
		],
		type: AssetImageType.GRID_BLOCK_FOLIAGE,
	},
	{
		id: 'WATER',
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
				src: 'images/grid-objects/liquids/water_16_16.webp',
			},
			{
				collection: AssetCollection.VIDEO,
				quality: AssetImageSrcQuality.MEDIUM,
				src: 'images/grid-objects/liquids/water_32_32.webp',
			},
			{
				collection: AssetCollection.SHARED,
				quality: AssetImageSrcQuality.HIGH,
				src: 'images/grid-objects/liquids/water_64_64.webp',
			},
		],
		type: AssetImageType.GRID_BLOCK_LIQUID,
	},
	{
		gHeight: 1,
		gWidth: 1,
		id: 'WOOD',
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
				src: 'images/grid-objects/solids/wood_16_16.webp',
			},
			{
				collection: AssetCollection.VIDEO,
				quality: AssetImageSrcQuality.MEDIUM,
				src: 'images/grid-objects/solids/wood_32_32.webp',
			},
			{
				collection: AssetCollection.SHARED,
				quality: AssetImageSrcQuality.HIGH,
				src: 'images/grid-objects/solids/wood_64_64.webp',
			},
		],
		type: AssetImageType.GRID_BLOCK_SOLID,
	},
	{
		gHeight: 1,
		gWidth: 1,
		id: 'WOOD_ROTATED',
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
				src: 'images/grid-objects/solids/wood_rotated_16_16.webp',
			},
			{
				collection: AssetCollection.VIDEO,
				quality: AssetImageSrcQuality.MEDIUM,
				src: 'images/grid-objects/solids/wood_rotated_32_32.webp',
			},
			{
				collection: AssetCollection.SHARED,
				quality: AssetImageSrcQuality.HIGH,
				src: 'images/grid-objects/solids/wood_rotated_64_64.webp',
			},
		],
		type: AssetImageType.GRID_BLOCK_SOLID,
	},
];

export { imageManifest };
