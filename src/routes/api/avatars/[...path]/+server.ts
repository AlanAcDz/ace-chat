import { existsSync } from 'fs';
import { readFile } from 'fs/promises';
import { error } from '@sveltejs/kit';

import type { RequestHandler } from './$types';
import { m } from '$lib/paraglide/messages.js';
import { getFullFilePath } from '$lib/server/storage';

export const GET: RequestHandler = async ({ params }) => {
	try {
		const filePath = params.path;

		if (!filePath) {
			return error(400, m.api_error_avatar_path_required());
		}

		// Security check: ensure the file path starts with 'avatars/'
		if (!filePath.startsWith('avatars/')) {
			return error(403, m.api_error_access_denied());
		}

		// Get the full file path
		const fullPath = getFullFilePath(filePath);

		// Check if file exists
		if (!existsSync(fullPath)) {
			return error(404, m.api_error_avatar_not_found());
		}

		// Read the file
		const fileBuffer = await readFile(fullPath);

		// Determine content type based on file extension
		const fileExtension = filePath.split('.').pop()?.toLowerCase();
		let contentType = 'image/jpeg'; // default

		switch (fileExtension) {
			case 'png':
				contentType = 'image/png';
				break;
			case 'gif':
				contentType = 'image/gif';
				break;
			case 'webp':
				contentType = 'image/webp';
				break;
			case 'svg':
				contentType = 'image/svg+xml';
				break;
			default:
				contentType = 'image/jpeg';
		}

		// Return the file with appropriate headers
		return new Response(fileBuffer, {
			headers: {
				'Content-Type': contentType,
				'Cache-Control': 'public, max-age=86400', // Cache for 24 hours
			},
		});
	} catch (e) {
		console.error('Error serving avatar:', e);
		return error(500, m.api_error_serving_avatar());
	}
};
