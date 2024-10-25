/**
 * @author tknight-dev
 */

export interface DoubleLinkedListNode<T> {
	data: T;
	next: DoubleLinkedListNode<T> | null;
	previous: DoubleLinkedListNode<T> | null;
}

export class DoubleLinkedList<T> {
	private end: DoubleLinkedListNode<T> | null = null;
	private length: number = 0;
	private start: DoubleLinkedListNode<T> | null = null;

	public getEnd(): DoubleLinkedListNode<T> | null {
		return this.end;
	}

	public getLength(): number {
		return this.length;
	}

	public getStart(): DoubleLinkedListNode<T> | null {
		return this.start;
	}

	public popEnd(): void {
		let t = this;

		if (t.end) {
			if (t.length === 1) {
				t.end = null;
				t.start = null;
			} else {
				t.end = t.end.previous;
			}

			t.length--;
		}
	}

	public popStart(): void {
		let t = this;

		if (t.start) {
			if (t.length === 1) {
				t.end = null;
				t.start = null;
			} else {
				t.start = t.start.next;
			}

			t.length--;
		}
	}

	public pushEnd(data: T): void {
		let t = this,
			node: DoubleLinkedListNode<T> = {
				data: data,
				next: null,
				previous: t.length ? t.end : null,
			};

		if (t.end) {
			t.end.next = node;
			t.end = node;
		} else {
			t.end = node;
			t.start = node;
		}

		t.length++;
	}

	public pushStart(data: T): void {
		let t = this,
			node: DoubleLinkedListNode<T> = {
				data: data,
				next: t.length ? t.start : null,
				previous: null,
			};

		if (t.start) {
			t.start.previous = node;
			t.start = node;
		} else {
			t.end = node;
			t.start = node;
		}

		t.length++;
	}
}
