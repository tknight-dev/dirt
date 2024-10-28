import { Enum } from './enum.model';
import { IEnum } from './enum.interface';

/**
 * @author tknight-dev
 */

export class AudioModulation extends Enum implements IEnum<AudioModulation> {
	public static readonly NONE: AudioModulation = new AudioModulation('NONE', 0, 0, 0);
	public static readonly REVERB_CAVE: AudioModulation = new AudioModulation('REVERB_CAVE', 2, 1.75, 1.5);
	public static readonly REVERB_HALL: AudioModulation = new AudioModulation('REVERB_HALL', 2, 1, 2);
	public static readonly REVERB_ROOM: AudioModulation = new AudioModulation('REVERB_ROOM', 2, 0.5, 2.5);

	public static readonly values: AudioModulation[] = [
		AudioModulation.NONE,
		AudioModulation.REVERB_CAVE,
		AudioModulation.REVERB_HALL,
		AudioModulation.REVERB_ROOM,
	];

	constructor(
		id: string,
		public readonly decay: number,
		public readonly duration: number,
		public readonly gain: number,
	) {
		super(id);
	}

	public static find(id: string): AudioModulation | null {
		return Enum.findEnum<AudioModulation>(id, AudioModulation.values);
	}
}
