import { AssetCollection } from '../models/asset.model';
import { Enum } from '../models/enum.model';
import { IEnum } from '../models/enum.interface';

/**
 * @author tknight-dev
 */

export enum AudioType {
	EFFECT,
	MUSIC,
}

export class AudioAsset extends Enum implements IEnum<AudioAsset> {
	public static readonly BANG1: AudioAsset = new AudioAsset('BANG1', AssetCollection.UI, 'a', 'aW', false, 'audio/effect/bang.mp3', AudioType.EFFECT, 0);
	public static readonly BONK1: AudioAsset = new AudioAsset('BONK1', AssetCollection.UI, 'a', 'aW', false, 'audio/effect/bonk.mp3', AudioType.EFFECT, 0);
	public static readonly MUS1: AudioAsset = new AudioAsset('MUS1', AssetCollection.UI, 'a', 'aW', false, 'audio/music/music.mp3', AudioType.MUSIC, 0);

	public static readonly values: AudioAsset[] = [AudioAsset.BANG1, AudioAsset.BONK1, AudioAsset.MUS1];

	constructor(
		id: string,
		public readonly collection: AssetCollection,
		public readonly author: string,
		public readonly authorWebsite: string | null,
		public readonly publicDomain: boolean,
		public readonly src: string,
		public readonly type: AudioType,
		public readonly volumeOffset: number, // volume range is 0-1, so offset by . something
	) {
		super(id);
	}

	public static find(id: string): AudioAsset | null {
		return Enum.findEnum<AudioAsset>(id, AudioAsset.values);
	}
}
