import { AssetAudio, AssetAudioType, AssetCollection } from '../models/asset.model';

/**
 * @author tknight-dev
 */

let dirtEngineAudioManifest: { [key: string]: AssetAudio } = {
	BANG: {
		id: 'BANG',
		collection: AssetCollection.UI,
		meta: undefined,
		src: 'audio/effect/bang.mp3',
		type: AssetAudioType.EFFECT,
		volumeOffset: 0,
	},
	BONK: {
		id: 'BONK',
		collection: AssetCollection.UI,
		meta: undefined,
		src: 'audio/effect/bonk.mp3',
		type: AssetAudioType.EFFECT,
		volumeOffset: 0,
	},
	MUSIC: {
		id: 'MUSIC',
		collection: AssetCollection.UI,
		meta: undefined,
		src: 'audio/music/music.mp3',
		type: AssetAudioType.MUSIC,
		volumeOffset: 0,
	},
	TITLE_SCREEN_EFFECT: {
		id: 'TITLE_SCREEN_EFFECT',
		collection: AssetCollection.UI,
		meta: {
			author: 'Incarnadine',
			authorWebsite: 'https://freesound.org/people/Incarnadine',
			license: 'Sampling+',
			publicDomain: true,
			title: 'main screen turn on',
		},
		src: 'audio/effect/tv-channel-click.mp3',
		type: AssetAudioType.EFFECT,
		volumeOffset: 0,
	},
	TITLE_SCREEN_MUSIC: {
		id: 'TITLE_SCREEN_MUSIC',
		collection: AssetCollection.UI,
		meta: {
			author: 'Snapper4298',
			authorWebsite: 'freesound.org/people/Snapper4298',
			license: 'Creative Commons 0',
			publicDomain: true,
			title: '115bpm_Let The Bass Kick Loop_808',
		},
		src: 'audio/effect/title-music.mp3',
		type: AssetAudioType.MUSIC,
		volumeOffset: 0,
	},
};

export { dirtEngineAudioManifest };
