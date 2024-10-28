import { Enum } from './enum.model';

/**
 * @author tknight-dev
 */

export interface IEnum<T extends Enum> {
	toJSON(): string;
	equals(value: T): boolean;
}
