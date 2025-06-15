import { existsSync } from 'fs';
import { readFile } from 'fs/promises';
import { error } from '@sveltejs/kit';
import { eq } from 'drizzle-orm';

import type { RequestHandler } from './$types';
import { m } from '$lib/paraglide/messages.js';
import { requireLogin } from '$lib/server/auth';
import { db } from '$lib/server/db';
import * as schema from '$lib/server/db/schema';
import { getFullFilePath } from '$lib/server/storage';

export const GET: RequestHandler = async ({ params }) => {
	try {
		const filePath = params.path;

		if (!filePath) {
			return error(400, m.api_error_file_path_required());
		}

		// Get the full file path
		const fullPath = getFullFilePath(filePath);

		// Check if file exists
		if (!existsSync(fullPath)) {
			return error(404, m.api_error_file_not_found());
		}

		// First, check if the attachment exists and get its associated chat info
		const attachment = await db.query.attachment.findFirst({
			where: eq(schema.attachment.filePath, filePath),
			with: {
				user: {
					columns: {
						id: true,
					},
				},
				message: {
					with: {
						chat: {
							columns: {
								id: true,
								sharePath: true,
								userId: true,
							},
						},
					},
				},
			},
		});

		if (!attachment) {
			return error(404, m.api_error_file_not_found());
		}

		// Check if the attachment belongs to a shared chat (public access)
		const isSharedChat = !!attachment.message.chat.sharePath;

		if (!isSharedChat) {
			// Not a shared chat, require authentication and ownership
			const sessionUser = requireLogin();

			// Security check: ensure the file belongs to the authenticated user
			const userId = filePath.split('/')[0];
			if (userId !== sessionUser.id || attachment.user.id !== sessionUser.id) {
				return error(403, m.api_error_access_denied());
			}
		}
		// If it's a shared chat, allow public access without authentication

		// Read the file
		const fileBuffer = await readFile(fullPath);

		// Determine content type
		const contentType = attachment.fileType || 'application/octet-stream';

		// Return the file with appropriate headers
		return new Response(fileBuffer, {
			headers: {
				'Content-Type': contentType,
				'Content-Disposition': `inline; filename="${attachment.fileName}"`,
				'Cache-Control': 'private, max-age=3600',
			},
		});
	} catch (e) {
		console.error('Error serving file:', e);
		return error(500, m.api_error_serving_file());
	}
};
