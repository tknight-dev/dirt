import { AssetCache, AssetEngine } from './asset.engine';
import { AssetAudio, AssetAudioType, AssetCollection } from '../models/asset.model';
import { AudioModulation } from '../models/audio-modulation.model';
import { DoubleLinkedList } from '../models/double-linked-list.model';
import { UtilEngine } from './util.engine';

/**
 * Default buffer count is 15
 *
 * Make sure to debounce your volume setters
 *
 * @author tknight-dev
 */

interface AudioCache {
	audio: HTMLAudioElement;
	id: string; // asset id
	type: AssetAudioType;
}

interface BufferStack {
	audio: HTMLAudioElement;
	id: number; // Instance number
	nodeConvolver: ConvolverNode;
	nodeGain: GainNode;
	nodePannerStereo: StereoPannerNode;
	source: MediaElementAudioSourceNode;
	type: AssetAudioType; // Changes as per audio source
}

interface Fader {
	durationInMs: number;
	fader: (bufferId: number, fader: Fader) => Promise<void>;
	volumeTarget: number;
	updated: boolean;
}

/**
 * @param gain is between 0 and 10 (precision 3)
 * @param pan is -1 left, 0 center, 1 right (precision 3)
 * @param positionInS is the timestamp to start from (precision 3)
 * @param volumePercentage is between 0 and 1 (precision 3)
 */
export interface AudioOptions {
	gain?: number;
	loop?: boolean;
	modulation?: AudioModulation;
	pan?: number;
	positionInS?: number;
	volumePercentage?: number;
}

export class AudioEngine {
	private static assetCollection: AssetCollection;
	private static cache: { [key: string]: AudioCache } = {}; // key is audioAssetId
	private static context: AudioContext = new AudioContext();
	private static buffers: { [key: number]: BufferStack } = {}; // key is instance number
	private static buffersAvailable: DoubleLinkedList<BufferStack> = new DoubleLinkedList<BufferStack>();
	private static buffersConvolver: { [key: string]: AudioBuffer } = {}; // key is AudioModulation.id
	private static faders: { [key: number]: Fader } = {}; // key is bufferId
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
		let buffers: { [key: number]: BufferStack } = AudioEngine.buffers;

		for (let i in buffers) {
			buffers[i].audio.muted = muted;
		}
	}

	private static applyVolumeRelative(volumePercentage: number, type?: AssetAudioType): void {
		let buffers: { [key: number]: BufferStack } = AudioEngine.buffers,
			bufferStack: BufferStack;

		for (let bufferId in buffers) {
			bufferStack = buffers[bufferId];

			if (type && type !== bufferStack.type) {
				continue;
			}

			bufferStack.audio.volume = bufferStack.audio.volume * volumePercentage;
		}
	}

	private static applyVolumeScale(): void {
		AudioEngine.volumeEffectEff = Math.round(UtilEngine.scale(AudioEngine.volumeEffect, 1, 0, AudioEngine.volume, 0) * 1000) / 1000;
		AudioEngine.volumeMusicEff = Math.round(UtilEngine.scale(AudioEngine.volumeMusic, 1, 0, AudioEngine.volume, 0) * 1000) / 1000;
	}

	/**
	 * Fade any volume to any other volume for any duration greater than 100ms
	 *
	 * @param durationInMs min 0 (precision 0)
	 * @param volumePercentage between 0 and 1 (precision 3)
	 */
	public static controlFade(bufferId: number, durationInMs: number, volumePercentage: number): void {
		let bufferStack: BufferStack = AudioEngine.buffers[bufferId],
			volumeTarget: number,
			volumeTargetMax: number;

		if (!bufferStack) {
			console.error('AudioEngine > fade: invalid bufferId');
			return;
		}
		if (bufferStack.audio.ended) {
			return;
		}
		volumeTargetMax = bufferStack.type === AssetAudioType.EFFECT ? AudioEngine.volumeEffectEff : AudioEngine.volumeMusicEff;

		// Calc the target volume
		volumePercentage = Math.max(0, Math.min(1, volumePercentage));
		volumeTarget = Math.round(UtilEngine.scale(volumePercentage, 1, 0, volumeTargetMax, 0) * 1000) / 1000;

		// The difference between the current and target value is too small to fade
		if (durationInMs === 0 || Math.abs(bufferStack.audio.volume - volumeTarget) < 0.01) {
			bufferStack.audio.volume = volumeTarget;
			return;
		}

		if (AudioEngine.faders[bufferId]) {
			AudioEngine.faders[bufferId].durationInMs = Math.max(100, Math.round(durationInMs));
			AudioEngine.faders[bufferId].volumeTarget = volumeTarget;
			AudioEngine.faders[bufferId].updated = true;
		} else {
			AudioEngine.faders[bufferId] = {
				durationInMs: Math.max(100, Math.round(durationInMs)),
				fader: AudioEngine.controlFader,
				volumeTarget: volumeTarget,
				updated: true,
			};
			AudioEngine.faders[bufferId].fader(bufferId, AudioEngine.faders[bufferId]); //async
		}
	}

	/**
	 * Supports live duration and fade changes
	 */
	private static async controlFader(bufferId: number, fader: Fader): Promise<void> {
		let audio: HTMLAudioElement = AudioEngine.buffers[bufferId].audio,
			interval: ReturnType<typeof setInterval>,
			intervalInMs: number = 40,
			step: number = 0.1,
			volume: number,
			volumeTarget: number = 0;

		interval = setInterval(() => {
			// Rediscover targets
			if (fader.updated) {
				fader.updated = false;
				volumeTarget = fader.volumeTarget;
				step = (volumeTarget - Math.round(audio.volume * 1000) / 1000) / (fader.durationInMs / intervalInMs);
			}
			volume = Math.round(audio.volume * 1000) / 1000 + step;

			// Check target
			if (step > 0) {
				if (volume >= volumeTarget) {
					audio.volume = volumeTarget;
					clearInterval(interval);
					delete AudioEngine.faders[bufferId];
				}
			} else {
				if (volume <= volumeTarget) {
					audio.volume = volumeTarget;
					clearInterval(interval);
					delete AudioEngine.faders[bufferId];
				}
			}
			audio.volume = Math.max(0, Math.min(1, volume));
		}, intervalInMs);
	}

	/**
	 * @param pan is -1 left, 0 center, 1 right (precision 3)
	 */
	public static async controlPan(bufferId: number, pan: number): Promise<void> {
		if (!AudioEngine.initialized) {
			console.error('AudioEngine > controlPan: not initialized');
			return;
		} else if (!AudioEngine.permitted) {
			console.error('AudioEngine > controlPan: not permitted');
			return;
		}
		let bufferStack: BufferStack = AudioEngine.buffers[bufferId];

		if (bufferStack) {
			if (!bufferStack.audio.ended) {
				bufferStack.nodePannerStereo.pan.setValueAtTime(Math.max(-1, Math.min(1, Math.round(pan * 1000) / 1000)), 0);
			} else {
				console.error('AudioEngine > controlPan: bufferId', bufferId, 'audio is ended');
			}
		} else {
			console.error('AudioEngine > controlPan: bufferId', bufferId, 'invalid');
		}
	}

	public static async controlPause(bufferId: number): Promise<void> {
		if (!AudioEngine.initialized) {
			console.error('AudioEngine > controlPause: not initialized');
			return;
		} else if (!AudioEngine.permitted) {
			console.error('AudioEngine > controlPause: not permitted');
			return;
		}
		let bufferStack: BufferStack = AudioEngine.buffers[bufferId];

		if (bufferStack) {
			if (!bufferStack.audio.ended) {
				bufferStack.audio.pause();
			} else {
				console.error('AudioEngine > controlPause: bufferId', bufferId, 'audio is ended');
			}
		} else {
			console.error('AudioEngine > controlPause: bufferId', bufferId, 'invalid');
		}
	}

	/**
	 * @return number if audio is looping, null if not looping, undefined on error
	 */
	public static async controlPlay(assetAudioId: string, options?: AudioOptions): Promise<number | undefined> {
		if (!AudioEngine.initialized) {
			console.error('AudioEngine > controlPlay: not initialized');
			return;
		} else if (!AudioEngine.permitted) {
			console.error('AudioEngine > controlPlay: not permitted');
			return;
		}
		let audio: HTMLAudioElement,
			audioCache: AudioCache = AudioEngine.cache[assetAudioId],
			bufferStack: BufferStack | undefined,
			volume: number;

		// Cache
		if (!audioCache) {
			console.error('AudioEngine > controlPlay: assetAudioId invalid');
			return undefined;
		}

		// BufferStack
		bufferStack = AudioEngine.buffersAvailable.popStart();
		if (!bufferStack) {
			console.error('AudioEngine > controlPlay: no buffer available');
			return undefined;
		}

		// Options
		if (!options) {
			options = {};
		}
		if (options.gain !== undefined) {
			options.gain = Math.max(0, Math.min(10, Math.round(options.gain * 1000) / 1000));
		} else {
			options.gain = 0;
		}
		if (!options.modulation) {
			options.modulation = AudioModulation.NONE;
		}
		if (options.pan !== undefined) {
			options.pan = Math.max(-1, Math.min(1, Math.round(options.pan * 1000) / 1000));
		} else {
			options.pan = 0;
		}
		if (options.positionInS !== undefined) {
			options.positionInS = Math.max(0, Math.min(audioCache.audio.duration, Math.round(options.positionInS * 1000) / 1000));
		} else {
			options.positionInS = 0;
		}
		if (options.volumePercentage !== undefined) {
			options.volumePercentage = Math.max(0, Math.min(1, Math.round(options.volumePercentage * 1000) / 1000));
		} else {
			options.volumePercentage = 1;
		}

		// Load buffer source
		audio = bufferStack.audio;
		audio.pause(); // Shouldn't be necessary, but hey
		audio.src = audioCache.audio.src;

		// Config
		volume = audioCache.type === AssetAudioType.EFFECT ? AudioEngine.volumeEffectEff : AudioEngine.volumeMusicEff;

		audio.currentTime = options.positionInS;
		audio.loop = !!options.loop;
		audio.muted = AudioEngine.muted;
		audio.volume = Math.round(UtilEngine.scale(options.volumePercentage, 1, 0, volume, 0) * 1000) / 1000;
		bufferStack.type = audioCache.type;

		// Effects
		bufferStack.nodeConvolver.buffer = AudioEngine.buffersConvolver[options.modulation.id];
		bufferStack.nodeGain.gain.value = options.gain + options.modulation.gain;
		bufferStack.nodePannerStereo.pan.setValueAtTime(options.pan, 0);

		// Play
		await audio.play();
		return bufferStack.id;
	}

	public static async controlStop(bufferId: number): Promise<void> {
		if (!AudioEngine.initialized) {
			console.error('AudioEngine > controlStop: not initialized');
			return;
		} else if (!AudioEngine.permitted) {
			console.error('AudioEngine > controlStop: not permitted');
			return;
		}
		let bufferStack: BufferStack = AudioEngine.buffers[bufferId];

		if (bufferStack) {
			if (!bufferStack.audio.ended) {
				bufferStack.audio.loop = false;
				bufferStack.audio.currentTime = bufferStack.audio.duration;
			}
		} else {
			console.error('AudioEngine > controlStop: bufferId', bufferId, 'invalid');
		}
	}

	public static async controlUnpause(bufferId: number): Promise<void> {
		if (!AudioEngine.initialized) {
			console.error('AudioEngine > controlUnpause: not initialized');
			return;
		} else if (!AudioEngine.permitted) {
			console.error('AudioEngine > controlUnpause: not permitted');
			return;
		}
		let bufferStack: BufferStack = AudioEngine.buffers[bufferId];

		if (bufferStack) {
			if (!bufferStack.audio.ended) {
				bufferStack.audio.play();
			} else {
				console.error('AudioEngine > controlUnpause: bufferId', bufferId, 'audio is ended');
			}
		} else {
			console.error('AudioEngine > controlUnpause: bufferId', bufferId, 'invalid');
		}
	}

	/**
	 * @param volumePercentage is between 0 and 1 (precision 3)
	 */
	public static controlVolume(bufferId: number, volumePercentage: number): void {
		if (!AudioEngine.initialized) {
			console.error('AudioEngine > setAssetVolume: not initialized');
			return;
		}
		let bufferStack: BufferStack = AudioEngine.buffers[bufferId];

		if (!bufferStack) {
			console.error('AudioEngine > setAssetVolume: bufferId', bufferId, 'invalid');
			return;
		}

		let volumeTargetMax: number = bufferStack.type === AssetAudioType.EFFECT ? AudioEngine.volumeEffectEff : AudioEngine.volumeMusicEff;

		volumePercentage = Math.max(0, Math.min(1, volumePercentage));

		bufferStack.audio.volume = Math.round(UtilEngine.scale(volumePercentage, 1, 0, volumeTargetMax, 0) * 1000) / 1000;
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

		AudioEngine.setBufferCount(15);

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
	private static async permittedCheckLoop(): Promise<void> {
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

			if (assetAudioInstance.collection === AudioEngine.assetCollection || assetAudioInstance.collection === AssetCollection.SHARED) {
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
			audio.preload = 'auto'; // Cache the audio

			assetCache = AssetEngine.getAssetAndRemoveFromCache(assetAudio.src);
			if (assetCache) {
				audio.setAttribute('src', assetCache.data);
			} else {
				console.error("AudioEngine > loader: assetAudio '" + assetAudio.id + "' failed to load", assetAudio.src);
				resolve();
			}
		});
	}

	/**
	 * The bufferCount corresponds to how many parallel effects can be played at once.
	 *
	 * Buffers cannot be removed once added
	 */
	public static setBufferCount(count: number): void {
		let bufferCount: number = AudioEngine.getBufferCount();
		if (count < bufferCount) {
			console.error('AudioEngine > setEffectBufferCount: cannot remove buffers');
			return;
		} else if (count === bufferCount) {
			return;
		}
		let add: number = count - bufferCount,
			audio: HTMLAudioElement,
			convolver: ConvolverNode,
			gain: GainNode,
			modulation: AudioModulation,
			panner: StereoPannerNode,
			source: MediaElementAudioSourceNode,
			adder = (bufferStack: BufferStack, id: number) => {
				bufferStack.id = id;
				AudioEngine.buffers[id] = bufferStack;
				AudioEngine.buffersAvailable.pushEnd(AudioEngine.buffers[id]);

				// Make available on complete
				AudioEngine.buffers[id].audio.onended = () => {
					AudioEngine.buffersAvailable.pushEnd(AudioEngine.buffers[id]);
				};
			};

		// Convolver Buffers by Effect AudioModulation
		for (let i in AudioModulation.values) {
			modulation = AudioModulation.values[i];

			if (modulation.id === AudioModulation.NONE.id) {
				AudioEngine.buffersConvolver[modulation.id] = AudioEngine.context.createBuffer(1, 1, AudioEngine.context.sampleRate);
				AudioEngine.buffersConvolver[modulation.id].getChannelData(0)[0] = 0;
			} else {
				AudioEngine.buffersConvolver[modulation.id] = AudioEngine.setBufferCountConvolverBuffer(
					modulation.duration,
					modulation.decay,
				);
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

			// Audio
			audio.preload = 'auto'; // Cache the audio

			// Attach stack (audio -> buffer[source -> panner -> output && (convolver -> gain -> output)])
			convolver.connect(gain);
			gain.connect(AudioEngine.context.destination);
			panner.connect(convolver);
			panner.connect(AudioEngine.context.destination);
			source.connect(panner);

			// Cache it
			adder(
				{
					audio: audio,
					id: 0,
					nodeConvolver: convolver,
					nodeGain: gain,
					nodePannerStereo: panner,
					source: source,
					type: AssetAudioType.EFFECT,
				},
				bufferCount + i,
			);
		}
	}

	private static setBufferCountConvolverBuffer(seconds: number, decay: number): AudioBuffer {
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

	public static getBufferCount(): number {
		return Object.keys(AudioEngine.buffers).length;
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
		let volumeRelative: number = Math.round((volume / AudioEngine.volume) * 1000) / 1000;
		AudioEngine.volume = volume;

		// Update audio cache
		AudioEngine.applyVolumeScale();
		AudioEngine.applyVolumeRelative(volumeRelative);
	}

	public static getVolume(): number {
		if (!AudioEngine.initialized) {
			console.error('AudioEngine > getVolume: not initialized');
			return 0;
		}
		return AudioEngine.volume;
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
		let volumeRelative: number = Math.round((volume / AudioEngine.volume) * 1000) / 1000;
		AudioEngine.volumeEffect = volume;

		// Update audio cache
		AudioEngine.applyVolumeScale();
		AudioEngine.applyVolumeRelative(volumeRelative, AssetAudioType.EFFECT);
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
		let volumeRelative: number = Math.round((volume / AudioEngine.volume) * 1000) / 1000;
		AudioEngine.volumeMusic = volume;

		// Update audio cache
		AudioEngine.applyVolumeScale();
		AudioEngine.applyVolumeRelative(volumeRelative, AssetAudioType.MUSIC);
	}

	public static getVolumeMusic(): number {
		if (!AudioEngine.initialized) {
			console.error('AudioEngine > getVolumeMusic: not initialized');
			return 0;
		}
		return AudioEngine.volumeMusic;
	}
}
