import { Enum } from './enum.model';
import { IEnum } from './enum.interface';

/**
 * @author tknight-dev
 */

export class AudioModulation extends Enum implements IEnum<AudioModulation> {
	public static readonly NONE: AudioModulation = new AudioModulation('NONE', 0, 'None', 0, 0, '0,0,0');
	public static readonly REVERB_CAVE: AudioModulation = new AudioModulation('REVERB_CAVE', 2, 'Reverb Cave', 1.75, 1.5, '255,0,0');
	public static readonly REVERB_HALL: AudioModulation = new AudioModulation('REVERB_HALL', 2, 'Reverb Hall', 1, 2, '0,255,0');
	public static readonly REVERB_ROOM: AudioModulation = new AudioModulation('REVERB_ROOM', 2, 'Reverb Room', 0.5, 2.5, '0,0,255');

	public static readonly values: AudioModulation[] = [
		AudioModulation.NONE,
		AudioModulation.REVERB_CAVE,
		AudioModulation.REVERB_HALL,
		AudioModulation.REVERB_ROOM,
	];

	public static readonly valuesWithoutNone: AudioModulation[] = [
		AudioModulation.REVERB_CAVE,
		AudioModulation.REVERB_HALL,
		AudioModulation.REVERB_ROOM,
	];

	public static readonly valuesWithoutNoneMap: { [key: string]: AudioModulation } = {};

	constructor(
		id: string,
		public readonly decay: number,
		public readonly displayName: string,
		public readonly duration: number,
		public readonly gain: number,
		public readonly colorRGB: string,
	) {
		super(id);
	}

	static {
		AudioModulation.valuesWithoutNoneMap[AudioModulation.REVERB_CAVE.id] = AudioModulation.REVERB_CAVE;
		AudioModulation.valuesWithoutNoneMap[AudioModulation.REVERB_HALL.id] = AudioModulation.REVERB_HALL;
		AudioModulation.valuesWithoutNoneMap[AudioModulation.REVERB_ROOM.id] = AudioModulation.REVERB_ROOM;
	}

	public static find(id: string): AudioModulation | null {
		return Enum.findEnum<AudioModulation>(id, AudioModulation.values);
	}
}
