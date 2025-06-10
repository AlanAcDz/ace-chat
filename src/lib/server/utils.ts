import { customAlphabet } from 'nanoid';

const nanoid = customAlphabet('0123456789abcdefghijklmnopqrstuvwxyz', 21);

export function createId(prefix: string): string {
	return `${prefix}_${nanoid()}`;
} 