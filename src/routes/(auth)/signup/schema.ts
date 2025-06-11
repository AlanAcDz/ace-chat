import { z } from 'zod';

export const registerSchema = z
	.object({
		username: z
			.string()
			.min(3, 'El nombre de usuario debe tener al menos 3 caracteres')
			.max(31, 'El nombre de usuario no puede tener más de 31 caracteres')
			.regex(
				/^[a-z0-9_-]+$/,
				'El nombre de usuario solo puede contener letras minúsculas, números, guiones y guiones bajos'
			),
		password: z
			.string()
			.min(6, 'La contraseña debe tener al menos 6 caracteres')
			.max(255, 'La contraseña no puede tener más de 255 caracteres'),
		confirmPassword: z.string(),
	})
	.refine((data) => data.password === data.confirmPassword, {
		message: 'Las contraseñas no coinciden',
		path: ['confirmPassword'],
	});
