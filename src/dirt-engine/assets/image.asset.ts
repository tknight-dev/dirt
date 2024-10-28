import { AssetCollection } from '../models/asset.model';
import { Enum } from '../models/enum.model';
import { IEnum } from '../models/enum.interface';

/**
 * @author tknight-dev
 */

export enum ImageType {
	LOGO,
}

export class ImageAsset extends Enum implements IEnum<ImageAsset> {
	public static readonly DIRT_ENGINE: ImageAsset = new ImageAsset(
		'DIRT_ENGINE',
		AssetCollection.UI,
		'tknight-dev',
		null,
		false,
		'images/logo/dirt-engine.webp',
		ImageType.LOGO,
	);
	public static readonly TKNIGHT_DEV: ImageAsset = new ImageAsset(
		'TKNIGHT_DEV',
		AssetCollection.UI,
		'tknight-dev',
		null,
		false,
		'images/logo/tknight-dev.svg',
		ImageType.LOGO,
	);

	public static readonly values: ImageAsset[] = [ImageAsset.DIRT_ENGINE, ImageAsset.TKNIGHT_DEV];

	constructor(
		id: string,
		public readonly assetCollection: AssetCollection,
		public readonly author: string,
		public readonly authorWebsite: string | null,
		public readonly publicDomain: boolean,
		public readonly src: string,
		public readonly type: ImageType,
	) {
		super(id);
	}

	public static find(id: string): ImageAsset | null {
		return Enum.findEnum<ImageAsset>(id, ImageAsset.values);
	}
}
