/**
 * @author tknight-dev
 */

export abstract class Enum {
	constructor(public readonly id: string) {}

	toJSON() {
		return this.id;
	}

	public equals(value: Enum | null): boolean {
		if (value && value.id === this.id) {
			return true;
		} else {
			return false;
		}
	}

	protected static findEnum<T extends Enum>(id: string, values: T[]): T | null {
		for (const i in values) {
			if (values[i].id === id) {
				return values[i];
			}
		}
		return null;
	}
}
