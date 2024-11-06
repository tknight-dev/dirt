import { AssetCollection, AssetImage, AssetImageSrcResolution, AssetImageType } from '../models/asset.model';

/**
 * @author tknight-dev
 */

let dirtEngineDefaultImageManifest: AssetImage[] = [
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
				resolution: AssetImageSrcResolution.LOW,
				src: 'images/grid-objects/dirt_16_16.webp',
			},
			{
				collection: AssetCollection.VIDEO,
				resolution: AssetImageSrcResolution.MEDIUM,
				src: 'images/grid-objects/dirt_32_32.webp',
			},
			{
				collection: AssetCollection.SHARED,
				resolution: AssetImageSrcResolution.HIGH,
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
				resolution: AssetImageSrcResolution.HIGH,
				src: 'images/logo/dirt-engine.webp',
			},
		],
		type: AssetImageType.LOGO,
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
				resolution: AssetImageSrcResolution.HIGH,
				src: 'images/logo/tknight-dev.svg',
			},
		],
		type: AssetImageType.LOGO,
	},
];

export { dirtEngineDefaultImageManifest };
