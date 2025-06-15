import { z } from 'zod';

export const registerSchema = z
	.object({
		username: z
			.string()
			.min(3, 'validation_username_min_length')
			.max(31, 'validation_username_max_length_31')
			.regex(/^[a-z0-9_-]+$/, 'validation_username_regex_auth'),
		password: z
			.string()
			.min(6, 'validation_password_min_length')
			.max(255, 'validation_password_max_length'),
		confirmPassword: z.string(),
	})
	.refine((data) => data.password === data.confirmPassword, {
		message: 'validation_passwords_no_match',
		path: ['confirmPassword'],
	});
