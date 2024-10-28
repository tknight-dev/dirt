import { AssetCollection, AssetImage, AssetImageSrcResolution, AssetImageType } from '../models/asset.model';

/**
 * @author tknight-dev
 */

let dirtEngineImageManifest: { [key: string]: AssetImage } = {
	DIRT: {
		id: 'DIRT',
		collection: AssetCollection.SHARED,
		meta: {
			author: 'tknight-dev',
			authorWebsite: 'https://tknight.dev',
			license: undefined,
			publicDomain: false,
			title: undefined,
		},
		srcs: [
			{
				resolution: AssetImageSrcResolution._64_64,
				src: 'images/grid-objects/dirt.webp',
			},
		],
		type: AssetImageType.GRID_BLOCK,
	},
	DIRT_ENGINE: {
		id: 'DIRT_ENGINE',
		collection: AssetCollection.UI,
		meta: {
			author: 'tknight-dev',
			authorWebsite: 'https://tknight.dev',
			license: undefined,
			publicDomain: false,
			title: undefined,
		},
		srcs: [
			{
				resolution: AssetImageSrcResolution.ONLY,
				src: 'images/logo/dirt-engine.webp',
			},
		],
		type: AssetImageType.LOGO,
	},
	TKNIGHT_DEV: {
		id: 'TKNIGHT_DEV',
		collection: AssetCollection.UI,
		meta: {
			author: 'tknight-dev',
			authorWebsite: 'https://tknight.dev',
			license: undefined,
			publicDomain: false,
			title: undefined,
		},
		srcs: [
			{
				resolution: AssetImageSrcResolution.ONLY,
				src: 'images/logo/tknight-dev.svg',
			},
		],
		type: AssetImageType.LOGO,
	},
};

export { dirtEngineImageManifest };
