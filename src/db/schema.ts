import { sqliteTable, text, integer, primaryKey } from "drizzle-orm/sqlite-core";
import { sql } from "drizzle-orm";

export const postsTable = sqliteTable("posts", {
  id: text().notNull().primaryKey(),
  title: text().notNull(),
  content: text().notNull(),
  createdAt: text().default(sql`(CURRENT_TIMESTAMP)`),
});


export const tasks = sqliteTable('a2a_tasks', {
  id: text('id').primaryKey(),
  kind: text('kind').notNull().default('task'),
  status: text('status').notNull(),
  statusState: text('status_state').notNull(),
  statusMessage: text('status_message'),
  statusReason: text('status_reason'),
  contextId: text('context_id'),
  extensions: text('extensions'), // JSON string array
  metadata: text('metadata').notNull(), // JSON string
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`)
})

/**
 * Messages table
 */
export const messages = sqliteTable('a2a_messages', {
  id: text('id').primaryKey(),
  taskId: text('a2a_task_id').notNull().references(() => tasks.id, { onDelete: 'cascade' }),
  kind: text('kind').notNull().default('message'),
  messageId: text('a2a_message_id').notNull(),
  role: text('role').notNull(),
  parts: text('parts').notNull(), // JSON string array
  contextId: text('context_id'),
  extensions: text('extensions'), // JSON string array
  metadata: text('metadata').notNull(), // JSON string
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`)
})

/**
 * Artifacts table
 */
export const artifacts = sqliteTable('a2a_artifacts', {
  id: text('id').primaryKey(),
  taskId: text('a2a_task_id').notNull().references(() => tasks.id, { onDelete: 'cascade' }),
  artifactId: text('a2a_artifact_id').notNull(),
  name: text('name'),
  description: text('description'),
  parts: text('parts').notNull(), // JSON string array
  extensions: text('extensions'), // JSON string array
  metadata: text('metadata').notNull(), // JSON string
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`)
})

/**
 * Task-Message relationship table (for message ordering)
 */
export const taskMessages = sqliteTable('a2a_task_messages', {
  taskId: text('a2a_task_id').notNull().references(() => tasks.id, { onDelete: 'cascade' }),
  messageId: text('a2a_message_id').notNull().references(() => messages.id, { onDelete: 'cascade' }),
  sequence: integer('sequence').notNull(),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`),
}, (table) => ({
  pk: primaryKey({ columns: [table.taskId, table.messageId] })
}))