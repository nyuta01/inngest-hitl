/**
 * Core A2A implementation
 */

import type {
	Artifact1,
	Message,
	Message1,
	Task2,
	TaskStatus,
} from "@a2a-js/sdk";
import type {
	A2AConfig,
	A2AInstance,
	Executor,
	ExecutorContext,
	A2AEvent,
} from "./types";
import { A2A_EVENT_TYPES } from "./constants";
import * as crypto from "node:crypto";
import type { StorageAdapter } from "./storage/adapter";

/**
 * Create a new A2A instance
 */
export function createA2A(config?: A2AConfig): A2AInstance {
	const executors = new Map<string, Executor<unknown, unknown>>();
	const storage = config?.storage;
	const eventSender = config?.events?.send || defaultEventSender;
	const context = createExecutorContext(storage, eventSender);

	const instance: A2AInstance = {
		register<TInput = unknown, TOutput = unknown>(
			executor: Executor<TInput, TOutput>,
		): A2AInstance {
			executors.set(executor.extension, executor as Executor<unknown, unknown>);
			return instance;
		},

		async execute(message: Message, options?: { taskId?: string, contextId?: string }): Promise<unknown> {
			console.info("[A2A Core] execute", {
				message,
			});
			// Find executor by extension
			const executor = findExecutor(message.extensions || [], executors);
			if (!executor) {
				throw new Error(
					`No executor found for extensions: ${message.extensions?.join(", ")}`,
				);
			}

			// Use provided taskId or generate new one
			const taskId = options?.taskId || message.taskId;
			const contextId = options?.contextId || message.contextId;

			if (!taskId || !contextId) {
				throw new Error("taskId and contextId are required");
			}

			// Create task and save to storage
			const task: Task2 = {
				contextId,
				id: taskId,
				kind: "task",
				status: {
					state: "submitted",
					timestamp: new Date().toISOString(),
					message,
				},
				metadata: {},
			};
			await storage?.saveTask(task);
			await storage?.saveMessage(taskId, message);

			const input = extractInput(message, executor.input);
			const output = await executor.execute(input, {
				taskId,
				contextId,
				...context,
			});

			// Validate output if schema provided
			if (executor.output) {
				return executor.output.parse(output);
			}

			return output;
		},

		getTask: context.getTask,
		updateStatus: context.updateStatus,
		updateArtifact: context.updateArtifact,
		updateMessage: context.updateMessage,
		cancelTask: context.cancelTask,
	};

	return instance;
}

/**
 * Find executor by extension URIs
 */
function findExecutor(
	extensions: string[],
	executors: Map<string, Executor<unknown, unknown>>,
): Executor<unknown, unknown> | null {
	for (const extension of extensions) {
		const executor = executors.get(extension);
		if (executor) return executor;
	}
	return null;
}

/**
 * Extract and validate input from message
 */
function extractInput(
	message: Message,
	schema?: import("zod").ZodSchema<unknown>,
): unknown {
	// Extract data from message parts
	const textPart = message.parts?.find((p) => p.kind === "text");
	const dataPart = message.parts?.find((p) => p.kind === "data");

	const input = {
		...(textPart && "text" in textPart ? { text: textPart.text } : {}),
		...(dataPart && "data" in dataPart ? dataPart.data : {}),
	};

	// Validate if schema provided
	if (schema) {
		return schema.parse(input);
	}

	return input;
}

/**
 * Create executor context
 */
function createExecutorContext(
	storage: StorageAdapter | undefined,
	eventSender: (event: A2AEvent) => Promise<void>,
): ExecutorContext {
	return {
		async updateStatus(taskId: string, contextId: string, status: TaskStatus) {
			console.info("[A2A Core] updateStatus", {
				taskId,
				contextId,
				status,
			});
			await eventSender({
				kind: A2A_EVENT_TYPES.STATUS_UPDATE,
				contextId,
				final: false,
				taskId,
				status,
			});

			await storage?.updateTaskStatus(taskId, {
				state: status.state,
				message: status.message,
				timestamp: new Date().toISOString(),
			});
		},

		async updateArtifact(
			taskId: string,
			contextId: string,
			artifact: Artifact1,
		) {
			console.info("[A2A Core] updateArtifact", {
				taskId,
				contextId,
				artifact,
			});
			await eventSender({
				kind: A2A_EVENT_TYPES.ARTIFACT_UPDATE,
				taskId,
				contextId,
				artifact,
			});

			await storage?.updateArtifact({
				...artifact,
				taskId,
			});
		},

		async getTask(taskId: string) {
			console.info("[A2A Core] getTask", {
				taskId,
			});
			const task = await storage?.getTask(taskId);
			if (!task) {
				throw new Error(`Task not found: ${taskId}`);
			}

			return task;
		},

		async updateMessage(taskId: string, contextId: string, message: Message1) {
			console.info("[A2A Core] updateMessage", {
				taskId,
				contextId,
				message,
			});
			await eventSender({
				kind: "status-update",
				taskId,
				contextId,
				final: false,
				status: {
					state: "working",
					timestamp: new Date().toISOString(),
					message,
				},
			});

			await storage?.saveMessage(taskId, message);
		},

		async cancelTask(taskId: string, contextId: string, message?: Message1) {
			console.info("[A2A Core] cancelTask", {
				taskId,
				contextId,
				message,
			});
			await eventSender({
				kind: "status-update",
				taskId,
				contextId,
				final: false,
				status: {
					state: "canceled",
					timestamp: new Date().toISOString(),
					message,
				},
			});

			await storage?.updateTaskStatus(taskId, {
				state: "canceled",
				message,
				timestamp: new Date().toISOString(),
			});
		},
	};
}

/**
 * Default event sender (logs to console)
 */
async function defaultEventSender(event: A2AEvent): Promise<void> {
	console.log("[A2A Event]", event);
}
