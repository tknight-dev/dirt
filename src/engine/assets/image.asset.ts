import { Enum } from '../models/enum.model';
import { IEnum } from '../models/enum.interface';

/**
 * @author tknight-dev
 */

export enum ImageType {
	LOGO,
}

export class ImageAsset extends Enum implements IEnum<ImageAsset> {
	public static readonly DIRT: ImageAsset = new ImageAsset('DIRT', 'tknight-dev', null, false, 'image/logo/dirt.webp', ImageType.LOGO);

	public static readonly values: ImageAsset[] = [ImageAsset.DIRT];

	constructor(
		id: string,
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
