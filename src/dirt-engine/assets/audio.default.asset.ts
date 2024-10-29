import { AssetAudio, AssetAudioType, AssetCollection } from '../models/asset.model';

/**
 * @author tknight-dev
 */

let dirtEngineDefaultAudioManifest: AssetAudio[] = [
	{
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
	{
		id: 'TITLE_SCREEN_MUSIC',
		collection: AssetCollection.UI,
		meta: {
			author: 'Snapper4298',
			authorWebsite: 'freesound.org/people/Snapper4298',
			license: 'Creative Commons 0',
			publicDomain: true,
			title: '115bpm_Let The Bass Kick Loop_808',
		},
		src: 'audio/music/115bpm_Let The Bass Kick Loop_808.mp3',
		type: AssetAudioType.MUSIC,
		volumeOffset: 0,
	},
];

export { dirtEngineDefaultAudioManifest };
