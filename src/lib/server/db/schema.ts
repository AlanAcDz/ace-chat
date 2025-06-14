import { relations, sql } from 'drizzle-orm';
import {
	boolean,
	integer,
	pgEnum,
	pgTable,
	text,
	timestamp,
	uniqueIndex,
} from 'drizzle-orm/pg-core';

import { createId } from '../utils';

// Enums
export const messageRoleEnum = pgEnum('message_role', ['system', 'user', 'assistant']);
export const apiKeyScopeEnum = pgEnum('api_key_scope', ['personal', 'shared']);

// User and Session tables for Lucia Auth
export const user = pgTable('user', {
	id: text('id').primaryKey(), // Provided by Lucia
	username: text('username').notNull().unique(),
	passwordHash: text('password_hash').notNull(),
	name: text('name'),
	avatarUrl: text('avatar_url'),
	grants: text('grants')
		.array()
		.default(sql`'{}'::text[]`)
		.notNull(),
	language: text('language').default('en').notNull(),
	defaultSystemPrompt: text('default_system_prompt'),
	createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' }).defaultNow().notNull(),
	updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'date' }).defaultNow().notNull(),
});

export const session = pgTable('session', {
	id: text('id').primaryKey(),
	userId: text('user_id')
		.notNull()
		.references(() => user.id, { onDelete: 'cascade' }),
	expiresAt: timestamp('expires_at', { withTimezone: true, mode: 'date' }).notNull(),
});

// User Invites table for invitation-based user creation
export const userInvite = pgTable('user_invite', {
	id: text('id')
		.primaryKey()
		.$defaultFn(() => createId('inv')),
	invitedBy: text('invited_by')
		.notNull()
		.references(() => user.id, { onDelete: 'cascade' }),
	username: text('username').notNull().unique(),
	grants: text('grants')
		.array()
		.default(sql`'{}'::text[]`)
		.notNull(),
	createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' }).defaultNow().notNull(),
	expiresAt: timestamp('expires_at', { withTimezone: true, mode: 'date' }), // Optional expiration
});

// API Keys table for "Bring Your Own Key"
export const apiKey = pgTable('api_key', {
	id: text('id')
		.primaryKey()
		.$defaultFn(() => createId('key')),
	userId: text('user_id')
		.notNull()
		.references(() => user.id, { onDelete: 'cascade' }),
	provider: text('provider').notNull(), // e.g., 'openai', 'anthropic', 'google', 'lmstudio', 'ollama'
	encryptedKey: text('encrypted_key'), // Can be null for providers like LM Studio
	url: text('url'), // For providers like LM Studio that require a URL
	scope: apiKeyScopeEnum('scope').default('personal').notNull(),
	createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' }).defaultNow().notNull(),
});

// Chat, Message, Attachment tables
export const chat = pgTable(
	'chat',
	{
		id: text('id')
			.primaryKey()
			.$defaultFn(() => createId('chat')),
		userId: text('user_id')
			.notNull()
			.references(() => user.id, { onDelete: 'cascade' }),
		title: text('title').notNull(),
		isBranched: boolean('is_branched').default(false).notNull(),
		createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' }).defaultNow().notNull(),
		updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'date' }).defaultNow().notNull(),
		sharePath: text('share_path'),
	},
	(table) => [uniqueIndex('share_path_index').on(table.sharePath)]
);

/**
 * The message table stores individual messages within a chat.
 */
export const message = pgTable('message', {
	id: text('id')
		.primaryKey()
		.$defaultFn(() => createId('msg')),
	temporaryId: text('temporary_id'), // AI SDK temporary ID for lookup
	chatId: text('chat_id')
		.notNull()
		.references(() => chat.id, { onDelete: 'cascade' }),
	role: messageRoleEnum('role').notNull(),
	content: text('content').notNull(),
	model: text('model'),
	isStreaming: boolean('is_streaming').default(false),
	hasWebSearch: boolean('has_web_search').default(false),
	hasAttachments: boolean('has_attachments').default(false),
	createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' }).defaultNow().notNull(),
});

export const attachment = pgTable('attachment', {
	id: text('id')
		.primaryKey()
		.$defaultFn(() => createId('att')),
	messageId: text('message_id')
		.notNull()
		.references(() => message.id, { onDelete: 'cascade' }),
	userId: text('user_id')
		.notNull()
		.references(() => user.id, { onDelete: 'cascade' }),
	fileName: text('file_name').notNull(),
	fileType: text('file_type').notNull(),
	fileSize: integer('file_size').notNull(),
	filePath: text('file_path').notNull(), // path on the storage
	createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' }).defaultNow().notNull(),
});

// RELATIONS
export const userRelations = relations(user, ({ many }) => ({
	sessions: many(session),
	chats: many(chat),
	apiKeys: many(apiKey),
	sentInvites: many(userInvite, { relationName: 'invitedBy' }),
}));

export const sessionRelations = relations(session, ({ one }) => ({
	user: one(user, {
		fields: [session.userId],
		references: [user.id],
	}),
}));

export const userInviteRelations = relations(userInvite, ({ one }) => ({
	invitedBy: one(user, {
		fields: [userInvite.invitedBy],
		references: [user.id],
		relationName: 'invitedBy',
	}),
}));

export const apiKeyRelations = relations(apiKey, ({ one }) => ({
	user: one(user, {
		fields: [apiKey.userId],
		references: [user.id],
	}),
}));

export const chatRelations = relations(chat, ({ one, many }) => ({
	user: one(user, {
		fields: [chat.userId],
		references: [user.id],
	}),
	messages: many(message),
}));

export const attachmentRelations = relations(attachment, ({ one }) => ({
	message: one(message, {
		fields: [attachment.messageId],
		references: [message.id],
	}),
	user: one(user, {
		fields: [attachment.userId],
		references: [user.id],
	}),
}));

export const messageRelations = relations(message, ({ one, many }) => ({
	chat: one(chat, {
		fields: [message.chatId],
		references: [chat.id],
	}),
	attachments: many(attachment),
}));

// Types
export type User = typeof user.$inferSelect;
export type NewUser = typeof user.$inferInsert;
export type Session = typeof session.$inferSelect;
export type NewSession = typeof session.$inferInsert;
export type UserInvite = typeof userInvite.$inferSelect;
export type NewUserInvite = typeof userInvite.$inferInsert;
export type ApiKey = typeof apiKey.$inferSelect;
export type NewApiKey = typeof apiKey.$inferInsert;
export type Chat = typeof chat.$inferSelect;
export type NewChat = typeof chat.$inferInsert;
export type Message = typeof message.$inferSelect;
export type NewMessage = typeof message.$inferInsert;
export type Attachment = typeof attachment.$inferSelect;
export type NewAttachment = typeof attachment.$inferInsert;
