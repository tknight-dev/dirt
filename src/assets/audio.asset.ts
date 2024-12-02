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
		id: 'CLICK_SRATCHY',
		collection: AssetCollection.UI,
		meta: {
			author: 'stijn',
			authorWebsite: 'https://freesound.org/people/stijn',
			license: 'Creative Commons 0',
			publicDomain: true,
			title: 'Click8a.wav',
		},
		src: 'audio/effect/click_scratchy.mp3',
		type: AssetAudioType.EFFECT,
		volumeOffset: 0,
	},
	{
		id: 'CONTAINER_BREAK',
		collection: AssetCollection.UI,
		meta: {
			author: 'Fjordly',
			authorWebsite: 'https://freesound.org/people/Fjordly',
			license: 'Attribution 4.0',
			publicDomain: true,
			title: 'Lantern clatter',
		},
		src: 'audio/effect/container_break.mp3',
		type: AssetAudioType.EFFECT,
		volumeOffset: 0,
	},
	{
		id: 'GAS_WOOSH',
		collection: AssetCollection.UI,
		meta: {
			author: 'Za-Games',
			authorWebsite: 'https://freesound.org/people/Za-Games',
			license: 'Creative Commons 0',
			publicDomain: true,
			title: 'Fire Burst Flash',
		},
		src: 'audio/effect/gas_woosh.mp3',
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
	{
		id: 'WATERFALL',
		collection: AssetCollection.UI,
		meta: {
			author: 'Ambient-X',
			authorWebsite: 'https://freesound.org/people/Ambient-X',
			license: 'Attribution 4.0',
			publicDomain: true,
			title: 'Ash Cave 2 minutes before 705am sunrise distant waterfall to my left with birds to my right 4-7-23.wav',
		},
		src: 'audio/effect/waterfall.mp3',
		type: AssetAudioType.EFFECT,
		volumeOffset: 0,
	},
];

export { audioManifest };
