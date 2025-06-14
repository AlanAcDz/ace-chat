import type { RequestHandler } from '@sveltejs/kit';
import { json } from '@sveltejs/kit';

import { requireLogin } from '$lib/server/auth';
import { getMessageAttachments } from '$lib/server/data/attachments';

export const GET: RequestHandler = async ({ params }) => {
	const user = requireLogin();
	const messageId = params.messageId;

	if (!messageId) {
		return json({ error: 'ID de mensaje requerido' }, { status: 400 });
	}

	try {
		const attachments = await getMessageAttachments(messageId, user.id);
		return json({ attachments });
	} catch (error) {
		console.error('Error getting message attachments:', error);
		return json({ error: 'Error al obtener archivos adjuntos' }, { status: 500 });
	}
};
