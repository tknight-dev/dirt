import { AssetCollection, AssetMap } from '../dirt-engine/dirt.engine';

/**
 * @author tknight-dev
 */

let mapManifest: AssetMap[] = [
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

export { mapManifest };
