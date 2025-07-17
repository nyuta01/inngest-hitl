/**
 * Execution Approval Executor for A2A-Inngest Integration
 * Handles research execution approval and completes the workflow
 */

import { defineExecutor } from "@/lib/a2a";
import { inngest } from "@/inngest/client";
import { z } from "zod";

// Input schema
const ExecutionApprovalInputSchema = z.object({
	requestId: z.string(),
	decision: z.enum(["approve", "reject"]),
	feedback: z.string().optional(),
});

// Output schema
const ExecutionApprovalOutputSchema = z.object({
	status: z.literal("completed"),
	message: z.string(),
	approved: z.boolean(),
});

export const executionApprovalExecutorV2 = defineExecutor({
	extension: "https://inngest-hitl.com/research/v2/execution-approval",
	input: ExecutionApprovalInputSchema,
	output: ExecutionApprovalOutputSchema,

	execute: async (input, context) => {
		// Send approval decision to Inngest
		await inngest.send({
			name: "research.a2a.v2.execution-feedback",
			data: {
				taskId: context.taskId,
				contextId: context.contextId,
				decision: input.decision,
				feedback: input.feedback,
				requestId: input.requestId,
			},
		});

		return {
			status: "completed" as const,
			message: "Research execution was rejected",
			approved: false,
		};
	},
});
