/**
 * @author tknight-dev
 */

export interface DoubleLinkedListNode<T> {
	data: T;
	next: DoubleLinkedListNode<T> | undefined;
	previous: DoubleLinkedListNode<T> | undefined;
}

export class DoubleLinkedList<T> {
	private end: DoubleLinkedListNode<T> | undefined = undefined;
	private length: number = 0;
	private start: DoubleLinkedListNode<T> | undefined = undefined;

	/**
	 * Remove all nodes
	 */
	public clear(): void {
		let t = this;

		t.end = undefined;
		t.length = 0;
		t.start = undefined;
	}

	public getEnd(): DoubleLinkedListNode<T> | undefined {
		return this.end;
	}

	public getLength(): number {
		return this.length;
	}

	public getStart(): DoubleLinkedListNode<T> | undefined {
		return this.start;
	}

	public popEnd(): T | undefined {
		let t = this,
			end: DoubleLinkedListNode<T> | undefined = t.end;

		if (end) {
			if (t.length === 1) {
				t.end = undefined;
				t.start = undefined;
			} else {
				t.end = end.previous;
			}

			t.length--;
			return end.data;
		}

		return undefined;
	}

	public popStart(): T | undefined {
		let t = this,
			start: DoubleLinkedListNode<T> | undefined = t.start;

		if (start) {
			if (t.length === 1) {
				t.end = undefined;
				t.start = undefined;
			} else {
				t.start = start.next;
			}

			t.length--;
			return start.data;
		}

		return undefined;
	}

	public pushEnd(data: T): void {
		let t = this,
			node: DoubleLinkedListNode<T> = {
				data: data,
				next: undefined,
				previous: t.length ? t.end : undefined,
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
				next: t.length ? t.start : undefined,
				previous: undefined,
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

	public toArray(): T[] {
		let array: T[] = [],
			node: DoubleLinkedListNode<T> | undefined = this.start;

		while (node) {
			array.push(node.data);
			node = node.next;
		}

		return array;
	}
}
