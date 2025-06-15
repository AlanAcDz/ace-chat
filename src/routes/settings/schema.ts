import { z } from 'zod';

export const profileSchema = z.object({
	username: z
		.string()
		.min(3, 'validation_username_min_length')
		.max(30, 'validation_username_max_length_30')
		.regex(/^[a-zA-Z0-9_]+$/, 'validation_username_regex_general'),
	name: z.string().max(100, 'validation_name_max_length').optional(),
	defaultSystemPrompt: z.string().max(2000, 'validation_system_prompt_max_length').optional(),
});
