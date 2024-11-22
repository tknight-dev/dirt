import { AssetCollection, AssetMap } from '../models/asset.model';

/**
 * @author tknight-dev
 */

let dirtEngineDefaultMapManifest: AssetMap[] = [
	{
		id: 'LEVEL01',
		collection: AssetCollection.VIDEO,
		meta: {
			author: 'tknight-dev',
			authorWebsite: 'https://tknight.dev',
			license: undefined,
			publicDomain: false,
			title: undefined,
		},
		order: 0,
		src: 'maps/level01.map',
	},
];

export { dirtEngineDefaultMapManifest };
