import { fail } from '@sveltejs/kit';

import type { Actions, PageServerLoad } from './$types';
import { m } from '$lib/paraglide/messages.js';
import { requireLogin } from '$lib/server/auth';
import {
	deleteAttachment,
	deleteMultipleAttachments,
	getUserAttachments,
} from '$lib/server/data/attachments';

export const load: PageServerLoad = async ({ depends }) => {
	const sessionUser = requireLogin();

	depends('app:attachments');

	// Get the attachments using the data layer
	const attachments = getUserAttachments(sessionUser.id);

	return {
		attachments,
	};
};

export const actions: Actions = {
	deleteAttachment: async ({ request }) => {
		const sessionUser = requireLogin();
		const formData = await request.formData();
		const attachmentId = formData.get('id') as string;

		if (!attachmentId) {
			return fail(400, { error: m.server_error_file_id_required() });
		}

		try {
			await deleteAttachment(attachmentId, sessionUser.id);
			return { success: true };
		} catch (e) {
			console.error('Error deleting attachment:', e);
			const message = e instanceof Error ? e.message : m.server_error_deleting_file();
			return fail(500, { error: message });
		}
	},

	deleteMultiple: async ({ request }) => {
		const sessionUser = requireLogin();
		const formData = await request.formData();
		const attachmentIds = formData.getAll('ids') as string[];

		if (!attachmentIds || attachmentIds.length === 0) {
			return fail(400, { error: m.server_error_select_files_to_delete() });
		}

		try {
			const deletedCount = await deleteMultipleAttachments(attachmentIds, sessionUser.id);
			return { success: true, deletedCount };
		} catch (e) {
			console.error('Error deleting multiple attachments:', e);
			const message = e instanceof Error ? e.message : m.server_error_deleting_files();
			return fail(500, { error: message });
		}
	},
};
