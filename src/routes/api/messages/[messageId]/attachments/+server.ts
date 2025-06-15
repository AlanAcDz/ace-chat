import type { RequestHandler } from '@sveltejs/kit';
import { json } from '@sveltejs/kit';

import { m } from '$lib/paraglide/messages.js';
import { requireLogin } from '$lib/server/auth';
import { getMessageAttachments } from '$lib/server/data/attachments';

export const GET: RequestHandler = async ({ params }) => {
	const user = requireLogin();
	const messageId = params.messageId;

	if (!messageId) {
		return json({ error: m.api_error_message_id_required() }, { status: 400 });
	}

	try {
		const attachments = await getMessageAttachments(messageId, user.id);
		return json({ attachments });
	} catch (error) {
		console.error('Error getting message attachments:', error);
		return json({ error: m.api_error_getting_attachments() }, { status: 500 });
	}
};
