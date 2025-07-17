/**
 * Drizzle ORM storage adapter for A2A
 * 
 * Type-safe implementation using generics inspired by drizzle-seed
 * Supports both PostgreSQL and SQLite databases
 */

import { eq, asc, max } from "drizzle-orm";
import type { 
  PgDatabase, 
  PgTable 
} from "drizzle-orm/pg-core";
import type { 
  BaseSQLiteDatabase, 
  SQLiteTable 
} from "drizzle-orm/sqlite-core";
import type { StorageAdapter } from "../../adapter";
import type { Task2, Message1, Artifact1, TaskStatus } from '@a2a-js/sdk'
import {
  DbTaskRowSchema,
  DbMessageRowSchema,
  DbArtifactRowSchema,
} from "./schema";
import crypto from "node:crypto";


// Type for supported databases
type SupportedDatabase = 
  | PgDatabase<any, any>
  | BaseSQLiteDatabase<any, any>;

// Type for supported tables
type SupportedTable = PgTable | SQLiteTable;

// Schema type with required tables
interface A2ASchema {
  tasks: SupportedTable;
  messages: SupportedTable;
  artifacts: SupportedTable;
  taskMessages: SupportedTable;
}

export class DrizzleStorageAdapter<
  TDatabase extends SupportedDatabase,
  TSchema extends A2ASchema
> implements StorageAdapter {
  constructor(
    private db: TDatabase,
    private schema: TSchema,
    private provider: "pg" | "sqlite"
  ) {}

  // Column access helper
  private col(table: keyof TSchema, column: string): any {
    return (this.schema[table] as any)[column];
  }

  // Convert A2A Task to database format
  private taskToDb(task: Task2): Record<string, unknown> {
    return {
      id: task.id,
      kind: task.kind,
      status: JSON.stringify(task.status),
      statusState: task.status.state,
      statusMessage: task.status.message ? JSON.stringify(task.status.message) : null,
      statusReason: null,
      contextId: task.contextId || null,
      extensions: null,
      metadata: JSON.stringify(task.metadata || {}),
      ...(this.provider === "sqlite" ? {} : { updatedAt: new Date() }),
    };
  }

  // Convert database row to A2A Task
  private dbToTask(row: unknown): Task2 {
    const parsed = DbTaskRowSchema.parse(row);
    return {
      id: parsed.id,
      kind: "task",
      contextId: parsed.contextId ?? "",
      status: {
        state: parsed.statusState as TaskStatus["state"],
        message: parsed.statusMessage ? JSON.parse(parsed.statusMessage) : undefined,
        timestamp: undefined,
      },
      metadata: parsed.metadata ? JSON.parse(parsed.metadata) : {},
    };
  }

  // Convert A2A Message to database format
  private messageToDb(message: Message1, taskId: string): Record<string, unknown> {
    return {
      id: crypto.randomUUID(),
      taskId,
      kind: message.kind,
      messageId: message.messageId,
      role: message.role,
      parts: JSON.stringify(message.parts),
      contextId: message.contextId || null,
      extensions: message.extensions ? JSON.stringify(message.extensions) : null,
      metadata: message.metadata ? JSON.stringify(message.metadata) : "",
      ...(this.provider === "sqlite" ? {} : { updatedAt: new Date() }),
    };
  }

  // Convert database row to A2A Message
  private dbToMessage(row: unknown): Message1 {
    const parsed = DbMessageRowSchema.parse(row);
    return {
      kind: parsed.kind as "message",
      messageId: parsed.messageId,
      role: parsed.role as "agent" | "user",
      parts: JSON.parse(parsed.parts),
      contextId: parsed.contextId || undefined,
      extensions: parsed.extensions ? JSON.parse(parsed.extensions) : undefined,
      metadata: parsed.metadata ? JSON.parse(parsed.metadata) : {},
    };
  }

  // Convert A2A Artifact to database format
  private artifactToDb(artifact: Artifact1 & { taskId: string }): Record<string, unknown> {
    return {
      id: crypto.randomUUID(),
      taskId: artifact.taskId,
      artifactId: artifact.artifactId,
      name: artifact.name || null,
      description: artifact.description || null,
      parts: JSON.stringify(artifact.parts),
      extensions: artifact.extensions ? JSON.stringify(artifact.extensions) : null,
      metadata: JSON.stringify(artifact.metadata),
      ...(this.provider === "sqlite" ? {} : { updatedAt: new Date() }),
    };
  }

  // Convert database row to A2A Artifact
  private dbToArtifact(row: unknown): Artifact1 {
    const parsed = DbArtifactRowSchema.parse(row);
    return {
      artifactId: parsed.artifactId,
      name: parsed.name || undefined,
      description: parsed.description || undefined,
      parts: JSON.parse(parsed.parts),
      extensions: parsed.extensions ? JSON.parse(parsed.extensions) : undefined,
      metadata: parsed.metadata ? JSON.parse(parsed.metadata) : {},
    };
  }
  
  // Task operations
  async saveTask(task: Task2): Promise<void> {
    const dbTask = this.taskToDb(task);
    
    await (this.db as any)
      .insert(this.schema.tasks)
      .values(dbTask)
      .onConflictDoUpdate({
        target: this.col("tasks", "id"),
        set: {
          status: dbTask.status,
          statusState: dbTask.statusState,
          statusMessage: dbTask.statusMessage,
          statusReason: dbTask.statusReason,
          contextId: dbTask.contextId,
          extensions: dbTask.extensions,
          metadata: dbTask.metadata,
          ...(this.provider === "sqlite" ? {} : { updatedAt: new Date() }),
        },
      });
  }

  async getTask(taskId: string): Promise<Task2 | null> {
    const result = await (this.db as any)
      .select()
      .from(this.schema.tasks)
      .where(eq(this.col("tasks", "id"), taskId))
      .limit(1);
    
    return result.length > 0 ? this.dbToTask(result[0]) : null;
  }

  async updateTaskStatus(taskId: string, status: TaskStatus): Promise<void> {
    await (this.db as any)
      .update(this.schema.tasks)
      .set({
        status: JSON.stringify(status),
        statusState: status.state,
        statusMessage: status.message ? JSON.stringify(status.message) : null,
        statusReason: null,
        ...(this.provider === "sqlite" ? {} : { updatedAt: new Date() }),
      })
      .where(eq(this.col("tasks", "id"), taskId));
  }

  // Message operations
  async saveMessage(taskId: string, message: Message1): Promise<void> {
    const dbMessage = this.messageToDb(message, taskId);
    const valid = DbMessageRowSchema.safeParse(dbMessage)
    if (!valid.success) {
      throw new Error(`Invalid message: ${valid.error.message}`)
    }

    // Save message
    await (this.db as any)
      .insert(this.schema.messages)
      .values(valid.data)
      .onConflictDoUpdate({
        target: this.col("messages", "id"),
        set: {
          role: dbMessage.role,
          parts: dbMessage.parts,
          contextId: dbMessage.contextId,
          extensions: dbMessage.extensions,
          metadata: dbMessage.metadata ? JSON.stringify(dbMessage.metadata) : "",
          ...(this.provider === "sqlite" ? {} : { updatedAt: new Date() }),
        },
      });

    // Get next sequence number
    const sequenceResult = await (this.db as any)
      .select({ maxSeq: max(this.col("taskMessages", "sequence")) })
      .from(this.schema.taskMessages)
      .where(eq(this.col("taskMessages", "taskId"), taskId))
      .limit(1);

    const nextSequence = ((sequenceResult[0] as { maxSeq?: number | null })?.maxSeq || 0) + 1;

    // Insert task-message relationship
    await (this.db as any)
      .insert(this.schema.taskMessages)
      .values({
        taskId,
        messageId: dbMessage.id,
        sequence: nextSequence,
      })
      .onConflictDoNothing();
  }

  async getMessages(taskId: string): Promise<Message1[]> {
    const result = await (this.db as any)
      .select({
        message: this.schema.messages,
        sequence: this.col("taskMessages", "sequence"),
      })
      .from(this.schema.messages)
      .innerJoin(
        this.schema.taskMessages,
        eq(
          this.col("messages", "id"),
          this.col("taskMessages", "messageId")
        )
      )
      .where(eq(this.col("taskMessages", "taskId"), taskId))
      .orderBy(asc(this.col("taskMessages", "sequence")));

    return result.map((row: { message: unknown }) => 
      this.dbToMessage(row.message)
    );
  }

  // Artifact operations
  async updateArtifact(artifact: Artifact1 & { taskId: string }): Promise<void> {
    const dbArtifact = this.artifactToDb(artifact);
    
    await (this.db as any)
      .insert(this.schema.artifacts)
      .values(dbArtifact)
      .onConflictDoUpdate({
        target: this.col("artifacts", "id"),
        set: {
          name: dbArtifact.name,
          description: dbArtifact.description,
          parts: dbArtifact.parts,
          extensions: dbArtifact.extensions,
          metadata: dbArtifact.metadata,
          ...(this.provider === "sqlite" ? {} : { updatedAt: new Date() }),
        },
      });
  }

  async getArtifact(artifactId: string): Promise<Artifact1 | null> {
    const result = await (this.db as any)
      .select()
      .from(this.schema.artifacts)
      .where(eq(this.col("artifacts", "artifactId"), artifactId))
      .limit(1);
    
    return result.length > 0 ? this.dbToArtifact(result[0]) : null;
  }

  async getTaskArtifacts(taskId: string): Promise<Artifact1[]> {
    const result = await (this.db as any)
      .select()
      .from(this.schema.artifacts)
      .where(eq(this.col("artifacts", "taskId"), taskId));
    
    return result.map((row: unknown) => this.dbToArtifact(row));
  }

  // Composite operations
  async getTaskWithHistory(taskId: string): Promise<{
    task: Task2;
    messages: Message1[];
    artifacts: Artifact1[];
  } | null> {
    const task = await this.getTask(taskId);
    if (!task) {
      return null;
    }

    const [messages, artifacts] = await Promise.all([
      this.getMessages(taskId),
      this.getTaskArtifacts(taskId),
    ]);

    return { task, messages, artifacts };
  }

  async close(): Promise<void> {
    // No-op: Database connection is managed externally
  }
}

/**
 * Create a type-safe Drizzle adapter
 */
export function drizzleAdapter<
  TDatabase extends SupportedDatabase,
  TSchema extends A2ASchema
>(
  db: TDatabase,
  schema: TSchema,
  provider: "pg" | "sqlite"
): StorageAdapter {
  return new DrizzleStorageAdapter(db, schema, provider);
}

// Usage example with type inference
export function createAdapter<
  TDatabase extends SupportedDatabase,
  TSchema extends A2ASchema
>(config: {
  db: TDatabase;
  schema: TSchema;
  provider: "pg" | "sqlite";
}): StorageAdapter {
  return drizzleAdapter(config.db, config.schema, config.provider);
}