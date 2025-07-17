/**
 * Server-Sent Events handler for A2A
 */

import type { NextRequest } from "next/server";
import type { A2AInstance } from "../../types";
import { A2A_EVENT_TYPES } from "../../constants";
import type {
	TaskStatusUpdateEvent,
	TaskArtifactUpdateEvent,
	Task2,
	Message1,
} from "@a2a-js/sdk";
import * as crypto from "node:crypto";

// Store active SSE connections
const connections = new Map<string, Set<ReadableStreamDefaultController>>();

/**
 * Create SSE handler for real-time updates
 */
export function createSSEHandler(
	a2a: A2AInstance, // eslint-disable-line @typescript-eslint/no-unused-vars
	customPath?: string, // eslint-disable-line @typescript-eslint/no-unused-vars
): (request: NextRequest) => Promise<Response> {
	return async (request: NextRequest) => {
		// Extract taskId from query params
		const taskId = request.nextUrl.searchParams.get("taskId");
		if (!taskId) {
			return new Response("Missing taskId parameter", { status: 400 });
		}
    const contextId = request.nextUrl.searchParams.get("contextId") || crypto.randomUUID();
      
		// Create SSE stream
		const stream = new ReadableStream({
			start(controller) {
				// Add connection to active connections
				if (!connections.has(taskId)) {
					connections.set(taskId, new Set());
				}
				const taskConnections = connections.get(taskId);
				if (taskConnections) {
					taskConnections.add(controller);
				}

        a2a.updateStatus(taskId, contextId, {
          state: "working",
          timestamp: new Date().toISOString(),
          message: {
            role: "agent",
            messageId: crypto.randomUUID(),
            kind: "message",  
            parts: [
              {
                kind: "text",
                text: "SSE connection established",
              },
            ],  
            metadata: {}
          }
        })

				// Clean up on close
				request.signal.addEventListener("abort", () => {
          console.info("[A2A SSE] SSE connection aborted", {
            taskId,
            contextId,
          })
					const taskConnections = connections.get(taskId);
					if (taskConnections) {
						taskConnections.delete(controller);
						if (taskConnections.size === 0) {
							connections.delete(taskId);
						}
					}
				});
			},
		});

		return new Response(stream, {
			headers: {
				"Content-Type": "text/event-stream",
				"Cache-Control": "no-cache",
				Connection: "keep-alive",
			},
		});
	};
}

/**
 * Send SSE event to all connected clients for a task
 */
export function sendSSEEvent(
	event: TaskStatusUpdateEvent | TaskArtifactUpdateEvent,
): void {
  console.info("[A2A SSE] sendSSEEvent", {
    event,
    connections,
  })
	const taskConnections = connections.get(event.taskId);
	if (!taskConnections || taskConnections.size === 0) {
		return;
	}
  console.info("[A2A SSE] sendSSEEvent", {
    taskConnections,
  })

	const message = encodeMessage(event);
	// Send to all connected clients
	for (const controller of taskConnections) {
		try {
			controller.enqueue(message);
		} catch {
			// Controller might be closed, remove it
			taskConnections.delete(controller);
		}
	}

	// Clean up if no connections left
	if (taskConnections.size === 0) {
		connections.delete(event.taskId);
	}

	// Close connections on task complete
	if (event.kind === A2A_EVENT_TYPES.ARTIFACT_UPDATE) {
		for (const controller of taskConnections) {
			try {
				controller.close();
			} catch {
				// Ignore errors
			}
		}
		connections.delete(event.taskId);
	}
}

/**
 * Get number of active connections for a task
 */
export function getActiveConnections(taskId: string): number {
	return connections.get(taskId)?.size ?? 0;
}

/**
 * Close all connections for a task
 */
export function closeTaskConnections(taskId: string): void {
	const taskConnections = connections.get(taskId);
	if (!taskConnections) return;

	for (const controller of taskConnections) {
		try {
			controller.close();
		} catch {
			// Ignore errors
		}
	}
	connections.delete(taskId);
}

function encodeMessage(
	event: TaskStatusUpdateEvent | TaskArtifactUpdateEvent | Task2 | Message1,
): Uint8Array {
	const data = JSON.stringify(event);
	const message = `event: ${event.kind}\ndata: ${data}\n\n`;
	return new TextEncoder().encode(message);
}
