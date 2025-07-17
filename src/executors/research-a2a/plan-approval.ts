/**
 * Plan Approval Executor for A2A-Inngest Integration
 * Handles research plan approval and transitions to next state
 */

import { defineExecutor } from "@/lib/a2a";
import { inngest } from "@/inngest/client";
import { z } from "zod";

// Input schema
const PlanApprovalInputSchema = z.object({
	requestId: z.string(),
	decision: z.enum(["approve", "reject"]),
	feedback: z.string().optional(),
});

// Output schema
const PlanApprovalOutputSchema = z.discriminatedUnion("status", [
	z.object({
		status: z.literal("completed"),
		message: z.string(),
	}),
]);

export const planApprovalExecutorV2 = defineExecutor({
	extension: "https://inngest-hitl.com/research/v2/plan-approval",
	input: PlanApprovalInputSchema,
	output: PlanApprovalOutputSchema,

	execute: async (input, context) => {
		// Send approval decision to Inngest
		await inngest.send({
			name: "research.a2a.v2.plan-feedback",
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
			message: "Research plan was rejected",
		};
	},
});
