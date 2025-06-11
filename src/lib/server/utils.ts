import { redirect } from '@sveltejs/kit';
import { customAlphabet } from 'nanoid';

import { getRequestEvent } from '$app/server';

const nanoid = customAlphabet('0123456789abcdefghijklmnopqrstuvwxyz', 21);

export function createId(prefix: string): string {
	return `${prefix}_${nanoid()}`;
}

export function requireLogin() {
	const { locals } = getRequestEvent();

	if (!locals.user) {
		redirect(302, '/login');
	}

	return locals.user;
}

export function requirePublic() {
	const { locals } = getRequestEvent();

	if (locals.user) {
		redirect(302, '/');
	}
}
