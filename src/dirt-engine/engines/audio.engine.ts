import { AssetCache, AssetEngine } from './asset.engine';
import { AssetAudio, AssetAudioType, AssetCollection } from '../models/asset.model';
import { AudioModulation } from '../models/audio-modulation.model';
import { UtilEngine } from './util.engine';

/**
 * Make sure to debounce your volume setters
 *
 * @author tknight-dev
 */

interface AudioCache {
	audio: HTMLAudioElement;
	id: string;
	type: AssetAudioType;
}

interface AudioFade {
	durationInMs: number;
	fader: (fade: AudioFade, id: string, type: AssetAudioType) => Promise<void>;
	volumeTarget: number;
	updated: boolean;
}

export class AudioEngine {
	private static assetCollection: AssetCollection;
	private static cache: { [key: string]: AudioCache } = {}; // key is audioAssetId
	private static context: AudioContext = new AudioContext();
	private static effectBuffers: HTMLAudioElement[] = [];
	private static effectBuffersConvolver: ConvolverNode[] = [];
	private static effectBuffersConvolverBuffer: {
		[key: string]: AudioBuffer;
	} = {}; // key is AudioModulation.id
	private static effectBuffersGain: GainNode[] = [];
	private static effectBuffersPanner: StereoPannerNode[] = [];
	private static effectBuffersSource: MediaElementAudioSourceNode[] = [];
	private static effectBuffersIndex: number = 0;
	private static faders: { [key: string]: AudioFade } = {}; // key is audioAssetId
	private static initialized: boolean;
	private static loaded: boolean = false;
	private static muted: boolean = false;
	private static permitted: boolean;
	private static permittedCallback: (permitted: boolean) => void;
	private static testSample: HTMLAudioElement;
	private static volume: number = 1;
	private static volumeEffect: number = 0.8;
	private static volumeEffectEff: number = 0.8;
	private static volumeMusic: number = 1;
	private static volumeMusicEff: number = 1;

	private static applyMute(muted: boolean): void {
		let buffers: HTMLAudioElement[] = AudioEngine.effectBuffers,
			cache: { [key: string]: AudioCache } = AudioEngine.cache,
			cacheInstance: AudioCache;

		for (let i in buffers) {
			buffers[i].muted = muted;
		}

		for (let audioId in cache) {
			cache[audioId].audio.muted = muted;
		}
	}

	private static applyVolumeMusicRelative(volumePercentage: number): void {
		let cache: { [key: string]: AudioCache } = AudioEngine.cache,
			cacheInstance: AudioCache;

		for (let audioId in cache) {
			cacheInstance = cache[audioId];
			cacheInstance.audio.volume = cacheInstance.audio.volume * volumePercentage;
		}
	}

	/**
	 * Fade any volume to any other volume for any duration greater than 100ms
	 *
	 * @param durationInMs min 0 (precision 0)
	 * @param volumePercentage between 0 and 1 (precision 3)
	 */
	public static fade(audioAssetId: string, durationInMs: number, volumePercentage: number): void {
		let audioCache: AudioCache = AudioEngine.cache[audioAssetId],
			volumeTarget: number,
			volumeTargetMax: number = AudioEngine.volumeMusicEff;

		if (!audioCache || audioCache.type !== AssetAudioType.MUSIC) {
			console.error('AudioEngine > fade: invalid audioAssetId');
			return;
		}

		// Calc the target volume
		volumePercentage = Math.max(0, Math.min(1, volumePercentage));
		volumeTarget = Math.round(UtilEngine.scale(volumePercentage, 1, 0, volumeTargetMax, 0) * 1000) / 1000;

		// The difference between the current and target value is too small to fade
		if (Math.abs(audioCache.audio.volume - volumeTarget) < 0.01) {
			audioCache.audio.volume = volumeTarget;
			return;
		}

		if (AudioEngine.faders[audioAssetId]) {
			AudioEngine.faders[audioAssetId].durationInMs = Math.max(100, Math.round(durationInMs));
			AudioEngine.faders[audioAssetId].volumeTarget = volumeTarget;
			AudioEngine.faders[audioAssetId].updated = true;
		} else {
			AudioEngine.faders[audioAssetId] = {
				durationInMs: Math.max(100, Math.round(durationInMs)),
				fader: AudioEngine.fader,
				volumeTarget: volumeTarget,
				updated: true,
			};
			AudioEngine.faders[audioAssetId].fader(
				AudioEngine.faders[audioAssetId],
				audioAssetId,
				AudioEngine.cache[audioAssetId].type,
			); //async
		}
	}

	/**
	 * Supports live duration and fade changes
	 */
	private static async fader(fade: AudioFade, id: string, type: AssetAudioType): Promise<void> {
		let audioCacheElement: HTMLAudioElement = AudioEngine.cache[id].audio,
			intervalInMs: number = 50,
			step: number = 0.1,
			timestamp: number = 0,
			volume: number,
			volumeTarget: number = 0;

		while (true) {
			// Interval delay
			await UtilEngine.delayInMs(intervalInMs);

			// Rediscover targets
			if (fade.updated) {
				fade.updated = false;
				volumeTarget = fade.volumeTarget;
				step = (volumeTarget - audioCacheElement.volume) / (fade.durationInMs / intervalInMs);
				timestamp = Date.now();
			}
			volume = audioCacheElement.volume + step;

			// Check target
			if (step > 0) {
				if (volume >= volumeTarget) {
					audioCacheElement.volume = volumeTarget;
					break;
				}
			} else {
				if (volume <= volumeTarget) {
					audioCacheElement.volume = volumeTarget;
					break;
				}
			}
			audioCacheElement.volume = volume;
		}

		// Remove fader from ram
		delete AudioEngine.faders[id];
	}

	/**
	 * Shared assets are always loaded
	 */
	public static async initialize(assetCollection: AssetCollection): Promise<void> {
		if (AudioEngine.initialized) {
			return;
		} else if (assetCollection === AssetCollection.SHARED) {
			console.error('AudioEngine > initialize: cannot use the SHARED collection');
			return;
		}
		AudioEngine.initialized = true;
		AudioEngine.assetCollection = assetCollection;

		AudioEngine.setEffectBufferCount(3); // 3 is default

		// Periodically check for audio permissions
		AudioEngine.testSample = new Audio();
		AudioEngine.testSample.setAttribute('preload', 'auto');
		AudioEngine.testSample.setAttribute(
			'src',
			'data:audio/mp3;base64,//MUxAAB4AWIoAgAATgAH4CA8PD1TEFN//MUxAMAAAGUAAAAAEUzLjEwMFVVVVVV',
		);
		AudioEngine.testSample.volume = 0.01;
		await AudioEngine.permittedCheckLoop();
	}

	/**
	 * Checks to see if permitted to play audio by the browser/user
	 */
	public static async permittedCheckLoop(): Promise<void> {
		let permitted: boolean = true;

		try {
			await AudioEngine.testSample.play();
		} catch (error: any) {
			permitted = false;
		}

		if (AudioEngine.permitted !== permitted) {
			AudioEngine.permitted = permitted;

			if (AudioEngine.permittedCallback) {
				AudioEngine.permittedCallback(permitted);
			}
		}

		setTimeout(() => {
			AudioEngine.permittedCheckLoop();
		}, 1000);
	}

	/**
	 * @return is duration in ms
	 */
	public static async load(assetAudio: AssetAudio[]): Promise<number> {
		if (!AudioEngine.initialized) {
			console.error('AudioEngine > load: not initialized');
			return -1;
		} else if (AudioEngine.loaded) {
			console.error('AudioEngine > load: already loaded');
			return -1;
		}
		let assetAudioInstance: AssetAudio,
			loaderWrappers: any[] = [],
			timestampInMs: number = Date.now();
		AudioEngine.loaded = true;

		for (let i in assetAudio) {
			assetAudioInstance = assetAudio[i];

			if (
				assetAudioInstance.collection === AudioEngine.assetCollection ||
				assetAudioInstance.collection === AssetCollection.SHARED
			) {
				loaderWrappers.push(AudioEngine.loader(assetAudioInstance));
			}
		}

		// Load all files in parallel
		await Promise.all(loaderWrappers);
		// AudioEngine.applyVolume(AudioEngine.volumeEffect, AssetAudioType.EFFECT);
		// AudioEngine.applyVolume(AudioEngine.volumeMusic, AssetAudioType.MUSIC);

		return Date.now() - timestampInMs;
	}

	private static async loader(assetAudio: AssetAudio): Promise<void> {
		let assetCache: AssetCache | undefined,
			audio: HTMLAudioElement = new Audio(),
			audioEvent: string = 'canplaythrough',
			audioListener: () => void = () => {
				// Loaded, remove listener
				audio.removeEventListener(audioEvent, audioListener, false);

				// Cache it
				AudioEngine.cache[assetAudio.id] = {
					audio: audio,
					id: assetAudio.id,
					type: assetAudio.type,
				};

				// Audio loaded, resolve promise
				audioResolve();
			},
			audioResolve: any;

		return new Promise((resolve: any) => {
			audioResolve = resolve;

			// Attach loading event listener
			audio.addEventListener(audioEvent, audioListener, false);

			if (assetAudio.type === AssetAudioType.MUSIC) {
				audio.setAttribute('loop', 'true');
			}
			audio.setAttribute('preload', 'auto');

			assetCache = AssetEngine.getAssetAndRemoveFromCache(assetAudio.src);
			if (assetCache) {
				audio.setAttribute('src', assetCache.data);
			} else {
				console.error(
					"AudioEngine > loader: assetAudio '" + assetAudio.id + "' failed to load",
					assetAudio.src,
				);
				resolve();
			}
		});
	}

	public static async pause(assetAudioId: string): Promise<void> {
		if (!AudioEngine.initialized) {
			console.error('AudioEngine > pause: not initialized');
			return;
		} else if (!AudioEngine.permitted) {
			console.error('AudioEngine > pause: not permitted');
			return;
		} else if (!AudioEngine.cache[assetAudioId]) {
			console.error('AudioEngine > pause: assetAudioId invalid');
			return;
		} else if (AudioEngine.cache[assetAudioId].type !== AssetAudioType.MUSIC) {
			console.error('AudioEngine > pause: only applies to music');
			return;
		}
		AudioEngine.cache[assetAudioId].audio.pause();
	}

	public static async unpause(assetAudioId: string): Promise<void> {
		if (!AudioEngine.initialized) {
			console.error('AudioEngine > unpause: not initialized');
			return;
		} else if (!AudioEngine.permitted) {
			console.error('AudioEngine > unpause: not permitted');
			return;
		} else if (!AudioEngine.cache[assetAudioId]) {
			console.error('AudioEngine > unpause: assetAudioId invalid');
			return;
		} else if (AudioEngine.cache[assetAudioId].type !== AssetAudioType.MUSIC) {
			console.error('AudioEngine > unpause: only applies to music');
			return;
		}
		await AudioEngine.cache[assetAudioId].audio.play();
	}

	/**
	 * @param timeInS is between 0 and the duration of the music
	 * @param volumePercentage is between 0 and 1 (precision 3)
	 */
	public static async play(assetAudioId: string, timeInS: number, volumePercentage: number): Promise<void> {
		if (!AudioEngine.initialized) {
			console.error('AudioEngine > play: not initialized');
			return;
		} else if (!AudioEngine.permitted) {
			console.error('AudioEngine > play: not permitted');
			return;
		} else if (!AudioEngine.cache[assetAudioId]) {
			console.error('AudioEngine > play: assetAudioId invalid');
			return;
		} else if (AudioEngine.cache[assetAudioId].type !== AssetAudioType.MUSIC) {
			console.error('AudioEngine > play: only applies to music');
			return;
		}
		let audio: HTMLAudioElement = AudioEngine.cache[assetAudioId].audio;

		volumePercentage = Math.max(0, Math.min(1, volumePercentage));

		audio.currentTime = Math.max(0, Math.min(audio.duration, Math.round(timeInS)));
		audio.volume =
			Math.round(UtilEngine.scale(volumePercentage, 1, 0, AudioEngine.volumeMusicEff, 0) * 1000) / 1000;
		await audio.play();
	}

	private static claimBufferIndex(): number {
		let index: number = AudioEngine.effectBuffersIndex;
		AudioEngine.effectBuffersIndex = (AudioEngine.effectBuffersIndex + 1) % AudioEngine.effectBuffers.length;
		return index;
	}

	/**
	 * Spawns audio clones to allow for multiple instances of the same effect
	 *
	 * @param modulationGain is between 0 and 10 (precision 3)
	 * @param pan is -1 left, 0 center, 1 right (precision 3)
	 * @param volumePercentage is between 0 and 1 (precision 3)
	 */
	public static async trigger(
		assetAudioId: string,
		modulation: AudioModulation,
		pan: number,
		volumePercentage: number,
	): Promise<void> {
		if (!AudioEngine.initialized) {
			console.error('AudioEngine > trigger: not initialized');
			return;
		} else if (!AudioEngine.permitted) {
			console.error('AudioEngine > trigger: not permitted');
			return;
		} else if (!AudioEngine.cache[assetAudioId]) {
			console.error('AudioEngine > trigger: assetAudioId invalid');
			return;
		} else if (AudioEngine.cache[assetAudioId].type !== AssetAudioType.EFFECT) {
			console.error('AudioEngine > trigger: only applies to effects');
			return;
		}
		let index: number = AudioEngine.claimBufferIndex(),
			buffer: HTMLAudioElement = AudioEngine.effectBuffers[index];

		volumePercentage = Math.max(0, Math.min(1, volumePercentage));

		// Load buffer source
		buffer.pause();
		buffer.src = AudioEngine.cache[assetAudioId].audio.src;
		buffer.currentTime = 0;
		buffer.muted = AudioEngine.muted;
		buffer.volume =
			Math.round(UtilEngine.scale(volumePercentage, 1, 0, AudioEngine.volumeEffectEff, 0) * 1000) / 1000;

		// AudioModulation buffer
		AudioEngine.effectBuffersConvolver[index].buffer = AudioEngine.effectBuffersConvolverBuffer[modulation.id];
		AudioEngine.effectBuffersGain[index].gain.value = modulation.gain;

		// Pan it
		AudioEngine.effectBuffersPanner[index].pan.setValueAtTime(
			Math.max(-1, Math.min(1, Math.round(pan * 1000) / 1000)),
			0,
		);

		// Play
		await buffer.play();
	}

	private static volumesScale(): void {
		// Effect
		AudioEngine.volumeEffectEff = UtilEngine.scale(AudioEngine.volumeEffect, 1, 0, AudioEngine.volume, 0);
		AudioEngine.volumeEffectEff = Math.round(AudioEngine.volumeEffectEff * 1000) / 1000;

		// Music
		AudioEngine.volumeMusicEff = UtilEngine.scale(AudioEngine.volumeMusic, 1, 0, AudioEngine.volume, 0);
		AudioEngine.volumeMusicEff = Math.round(AudioEngine.volumeMusicEff * 1000) / 1000;
	}

	/**
	 * The bufferCount corresponds to how many parallel effects can be played at once.
	 *
	 * Buffers cannot be removed once added.
	 *
	 * Default is 3
	 */
	public static setEffectBufferCount(count: number): void {
		if (count < AudioEngine.effectBuffers.length) {
			console.error('AudioEngine > setEffectBufferCount: cannot remove buffers');
			return;
		} else if (count === AudioEngine.effectBuffers.length) {
			return;
		}
		let add: number = count - AudioEngine.effectBuffers.length,
			audio: HTMLAudioElement,
			convolver: ConvolverNode,
			gain: GainNode,
			modulation: AudioModulation,
			panner: StereoPannerNode,
			source: MediaElementAudioSourceNode;

		// Convolver Buffers by Effect AudioModulation
		for (let i in AudioModulation.values) {
			modulation = AudioModulation.values[i];

			if (modulation.id === AudioModulation.NONE.id) {
				AudioEngine.effectBuffersConvolverBuffer[modulation.id] = AudioEngine.context.createBuffer(
					1,
					1,
					AudioEngine.context.sampleRate,
				);
				AudioEngine.effectBuffersConvolverBuffer[modulation.id].getChannelData(0)[0] = 0;
			} else {
				AudioEngine.effectBuffersConvolverBuffer[modulation.id] =
					AudioEngine.setEffectBufferCountConvolverBuffer(modulation.duration, modulation.decay);
			}
		}

		// Build audio buffers
		for (let i = 0; i < add; i++) {
			// Create buffer stack
			audio = <HTMLAudioElement>document.createElement('AUDIO');
			convolver = AudioEngine.context.createConvolver();
			gain = AudioEngine.context.createGain();
			panner = AudioEngine.context.createStereoPanner();
			source = AudioEngine.context.createMediaElementSource(audio);

			// Attach stack (audio -> buffer[source -> panner -> output && (convolver -> gain -> output)])
			convolver.connect(gain);
			gain.connect(AudioEngine.context.destination);
			panner.connect(convolver);
			panner.connect(AudioEngine.context.destination);
			source.connect(panner);

			// Cache em
			AudioEngine.effectBuffersConvolver.push(convolver);
			AudioEngine.effectBuffersGain.push(gain);
			AudioEngine.effectBuffersPanner.push(panner);
			AudioEngine.effectBuffersSource.push(source);

			// Cache it Last: counts are calc'd from this array
			AudioEngine.effectBuffers.push(audio);
		}
	}

	private static setEffectBufferCountConvolverBuffer(seconds: number, decay: number): AudioBuffer {
		let rate = AudioEngine.context.sampleRate,
			length = rate * seconds,
			impulse = AudioEngine.context.createBuffer(2, length, rate),
			impulseLeft = impulse.getChannelData(0),
			impulseRight = impulse.getChannelData(1);

		for (let i = 0; i < length; i++) {
			impulseLeft[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / length, decay);
			impulseRight[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / length, decay);
		}

		return impulse;
	}

	public static getEffectBufferCount(): number {
		return AudioEngine.effectBuffers.length;
	}

	public static setMuted(muted: boolean): void {
		if (!AudioEngine.initialized) {
			console.error('AudioEngine > isMuted: not initialized');
			return;
		}
		AudioEngine.muted = muted;
		AudioEngine.applyMute(muted);
	}

	public static isMuted(): boolean {
		if (!AudioEngine.initialized) {
			console.error('AudioEngine > isMuted: not initialized');
			return false;
		}
		return AudioEngine.muted;
	}

	public static isPermitted(): boolean {
		return AudioEngine.permitted;
	}

	public static setPermittedCallback(permittedCallback: (permitted: boolean) => void): void {
		AudioEngine.permittedCallback = permittedCallback;
	}

	/**
	 *  @param volume is between 0 and 1, with a precision of 3, applied to the master volume
	 */
	public static setVolume(volume: number): void {
		if (!AudioEngine.initialized) {
			console.error('AudioEngine > setVolume: not initialized');
			return;
		}
		volume = Math.max(0, Math.min(1, volume));

		// Precision is 3
		volume = Math.round(volume * 1000) / 1000;
		let volumeRelative: number = volume / AudioEngine.volume;
		AudioEngine.volume = volume;

		// Update audio cache
		AudioEngine.volumesScale();
		AudioEngine.applyVolumeMusicRelative(volumeRelative);
	}

	public static getVolume(): number {
		if (!AudioEngine.initialized) {
			console.error('AudioEngine > getVolume: not initialized');
			return 0;
		}
		return AudioEngine.volume;
	}

	/**
	 * @param volumePercentage is between 0 and 1 (precision 3)
	 */
	public static setVolumeAsset(assetAudioId: string, volumePercentage: number): void {
		if (!AudioEngine.initialized) {
			console.error('AudioEngine > setAssetVolume: not initialized');
			return;
		} else if (!AudioEngine.cache[assetAudioId]) {
			console.error('AudioEngine > setAssetVolume: assetAudioId invalid');
			return;
		}
		let audioCache: AudioCache = AudioEngine.cache[assetAudioId],
			volumeTargetMax: number =
				audioCache.type === AssetAudioType.EFFECT ? AudioEngine.volumeEffectEff : AudioEngine.volumeMusicEff;

		volumePercentage = Math.max(0, Math.min(1, volumePercentage));

		audioCache.audio.volume =
			Math.round(UtilEngine.scale(volumePercentage, 1, 0, volumeTargetMax, 0) * 1000) / 1000;
	}

	/**
	 *  @param volume is between 0 and 1, with a precision of 3, applied to the master volume
	 */
	public static setVolumeEffect(volume: number): void {
		if (!AudioEngine.initialized) {
			console.error('AudioEngine > setVolumeEffect: not initialized');
			return;
		}
		volume = Math.max(0, Math.min(1, volume));

		// Precision is 3
		volume = Math.round(volume * 1000) / 1000;
		AudioEngine.volumeEffect = volume;

		// Update audio cache
		AudioEngine.volumesScale();
	}

	public static getVolumeEffect(): number {
		if (!AudioEngine.initialized) {
			console.error('AudioEngine > getVolumeEffect: not initialized');
			return 0;
		}
		return AudioEngine.volumeEffect;
	}

	/**
	 *  @param volume is between 0 and 1 with a precision of 3, applied to the master volume
	 */
	public static setVolumeMusic(volume: number): void {
		if (!AudioEngine.initialized) {
			console.error('AudioEngine > setVolumeMusic: not initialized');
			return;
		}
		volume = Math.max(0, Math.min(1, volume));

		// Precision is 3
		volume = Math.round(volume * 1000) / 1000;
		let volumeRelative: number = volume / AudioEngine.volume;
		AudioEngine.volumeMusic = volume;

		// Update audio cache
		AudioEngine.volumesScale();
		AudioEngine.applyVolumeMusicRelative(volumeRelative);
	}

	public static getVolumeMusic(): number {
		if (!AudioEngine.initialized) {
			console.error('AudioEngine > getVolumeMusic: not initialized');
			return 0;
		}
		return AudioEngine.volumeMusic;
	}
}
