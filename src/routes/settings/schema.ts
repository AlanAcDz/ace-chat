import { z } from 'zod';

export const profileSchema = z.object({
	username: z
		.string()
		.min(3, 'El nombre de usuario debe tener al menos 3 caracteres')
		.max(30, 'El nombre de usuario no puede tener más de 30 caracteres')
		.regex(
			/^[a-zA-Z0-9_]+$/,
			'El nombre de usuario solo puede contener letras, números y guiones bajos'
		),
	name: z.string().max(100, 'El nombre no puede tener más de 100 caracteres').optional(),
	defaultSystemPrompt: z
		.string()
		.max(2000, 'El prompt del sistema no puede tener más de 2000 caracteres')
		.optional(),
});
