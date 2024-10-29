import { AssetAudio, AssetAudioType, AssetCollection } from '../dirt-engine/dirt.engine';

/**
 * @author tknight-dev
 */

let audioManifest: AssetAudio[] = [
	{
		id: 'BONK',
		collection: AssetCollection.UI,
		meta: undefined,
		src: 'audio/effect/bonk.mp3',
		type: AssetAudioType.EFFECT,
		volumeOffset: 0,
	},
	{
		id: 'BANG',
		collection: AssetCollection.UI,
		meta: undefined,
		src: 'audio/effect/bang.mp3',
		type: AssetAudioType.EFFECT,
		volumeOffset: 0,
	},
	{
		id: 'MUSIC',
		collection: AssetCollection.UI,
		meta: undefined,
		src: 'audio/music/music.mp3',
		type: AssetAudioType.MUSIC,
		volumeOffset: 0,
	},
];

export { audioManifest };
