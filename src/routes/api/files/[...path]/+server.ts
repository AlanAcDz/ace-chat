import { existsSync } from 'fs';
import { readFile } from 'fs/promises';
import { error } from '@sveltejs/kit';
import { eq } from 'drizzle-orm';

import type { RequestHandler } from './$types';
import { requireLogin } from '$lib/server/auth';
import { db } from '$lib/server/db';
import * as schema from '$lib/server/db/schema';
import { getFullFilePath } from '$lib/server/storage';

export const GET: RequestHandler = async ({ params }) => {
	try {
		const sessionUser = requireLogin();
		const filePath = params.path;

		if (!filePath) {
			return error(400, 'Ruta de archivo requerida');
		}

		// Security check: ensure the file belongs to the user
		const userId = filePath.split('/')[0];
		if (userId !== sessionUser.id) {
			return error(403, 'Acceso denegado');
		}

		// Get the full file path
		const fullPath = getFullFilePath(filePath);

		// Check if file exists
		if (!existsSync(fullPath)) {
			return error(404, 'Archivo no encontrado');
		}

		// Verify the file exists in the database and belongs to the user
		const attachment = await db.query.attachment.findFirst({
			where: eq(schema.attachment.filePath, filePath),
			with: {
				user: {
					columns: {
						id: true,
					},
				},
			},
		});

		if (!attachment || attachment.user.id !== sessionUser.id) {
			return error(403, 'Acceso denegado');
		}

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
		return error(500, 'Error al servir el archivo');
	}
};
