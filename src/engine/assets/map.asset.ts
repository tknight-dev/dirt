import { AssetCollection } from '../models/asset.model';
import { Enum } from '../models/enum.model';
import { IEnum } from '../models/enum.interface';

/**
 * @author tknight-dev
 */

export class MapAsset extends Enum implements IEnum<MapAsset> {
	public static readonly LEVEL01: MapAsset = new MapAsset('LEVEL01', AssetCollection.VIDEO, 'maps/level01.map');

	public static readonly values: MapAsset[] = [MapAsset.LEVEL01];

	constructor(
		id: string,
		public readonly assetCollection: AssetCollection,
		public readonly src: string,
	) {
		super(id);
	}

	public static find(id: string): MapAsset | null {
		return Enum.findEnum<MapAsset>(id, MapAsset.values);
	}
}
