/**
 * Core type definitions for A2A
 */

import type { z } from "zod";
import type {
	Task2,
	Message1,
	TaskStatusUpdateEvent,
	TaskArtifactUpdateEvent,
	TaskStatus,
	Artifact1,
} from "@a2a-js/sdk";

import type { StorageAdapter } from "./storage/adapter";

export interface Executor<TInput = unknown, TOutput = unknown> {
	extension: string;
	input?: z.ZodSchema<TInput>;
	output?: z.ZodSchema<TOutput>;
	execute: (input: TInput, context: ExecutorContext) => Promise<TOutput>;
}

// Context types
export interface ExecutorContext {
	taskId?: string;
	contextId?: string;
	// Core operations
	getTask: (taskId: string) => Promise<Task2 | null>;
	updateStatus: (
		taskId: string,
		contextId: string,
		status: TaskStatus,
	) => Promise<void>;
	updateMessage: (
		taskId: string,
		contextId: string,
		message: Message1,
	) => Promise<void>;
	updateArtifact: (
		taskId: string,
		contextId: string,
		artifact: Artifact1,
	) => Promise<void>;
	cancelTask: (
		taskId: string,
		contextId: string,
		message?: Message1,
	) => Promise<void>;
}

// A2A instance types
export interface A2AConfig {
	storage?: StorageAdapter;
	events?: {
		send: (event: A2AEvent) => Promise<void>;
	};
}

export interface A2AInstance extends ExecutorContext {
	register: <TInput = unknown, TOutput = unknown>(
		executor: Executor<TInput, TOutput>,
	) => A2AInstance;
	execute: (
		message: Message1,
		options?: { taskId?: string, contextId?: string },
	) => Promise<unknown>;
}

// Discriminated union for events
// https://github.com/a2aproject/A2A/blob/v0.2.5/types/src/types.ts#L810
export type A2AEvent = TaskStatusUpdateEvent | TaskArtifactUpdateEvent;
