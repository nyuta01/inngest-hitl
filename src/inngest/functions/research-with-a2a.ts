/**
 * Research Workflow with A2A V2 Integration
 * Uses ExecutorContext client to communicate with A2A
 */

import { inngest } from "@/inngest/client";
import { createA2AHttpClient } from "@/lib/a2a/client";
import { openai } from "@ai-sdk/openai";
import { generateObject } from "ai";
import { z } from "zod";

// Research plan schema
const ResearchPlanSchema = z.object({
	theme: z.string(),
	approach: z.string(),
	keyQuestions: z.array(z.string()),
	expectedOutcomes: z.string(),
	methodology: z.string(),
});

// Research execution schema
const ResearchExecutionSchema = z.object({
	summary: z.string(),
	keyPoints: z.array(z.string()),
	findings: z.array(
		z.object({
			title: z.string(),
			description: z.string(),
			confidence: z.enum(["high", "medium", "low"]),
		}),
	),
	limitations: z.array(z.string()),
	nextSteps: z.array(z.string()),
});

export const researchWithA2AV2 = inngest.createFunction(
	{ id: "research-with-a2a-v2" },
	{ event: "research.a2a.v2.start" },
	async ({ event, step }) => {
		const {
			taskId,
			contextId,
			theme,
			depth = "basic",
			language = "ja",
			a2aConfig,
		} = event.data;

		// Create A2A HTTP client
		const a2a = createA2AHttpClient(a2aConfig);

		// Phase 1: Generate research plan
		const plan = await step.run("generate-plan", async () => {
			await a2a.updateMessage(taskId, contextId, {
					kind: "message",
					messageId: crypto.randomUUID(),
					role: "agent",
					parts: [
						{
							kind: "text",
							text: "リサーチプランの生成を開始します",
						},
						{
							kind: "data",
							data: {
								theme,
								depth,
								language,
							},
						},
					],
					contextId,
					extensions: [],
					metadata: {},
			});
			const result = await generateObject({
				model: openai("gpt-4o-mini"),
				schema: ResearchPlanSchema,
				prompt: `Create a research plan for the theme: "${theme}"
        
Depth level: ${depth}
Language: ${language}

Please provide:
1. A clear approach to researching this theme
2. Key questions to investigate
3. Expected outcomes
4. Methodology to be used

${language === "ja" ? "Please respond in Japanese." : "Please respond in English."}`,
			});

			// Save plan as artifact
			await a2a.updateMessage(taskId, contextId, {
				kind: "message",
				messageId: crypto.randomUUID(),
				role: "agent",
				parts: [
					{
						kind: "text",
						text: "リサーチプランを生成しました",
					},
					{
						kind: "data",
						data: result.object,
					},
				],
				contextId,
			});

			return result.object;
		});

		// Request plan approval
		await step.run("request-plan-approval", async () => {
			await a2a.updateStatus(taskId, contextId, {
				state: "input-required",
				message: {
					kind: "message",
					messageId: crypto.randomUUID(),
					role: "agent",
					parts: [
						{
							kind: "text",
							text: "作成されたリサーチプランを確認してください",
						},
						{
							kind: "data",
							data: {
								plan,
							},
						},
					],
					contextId,
					extensions: [],
					metadata: {},
				},
			});
		});

		// Phase 2: Wait for plan approval
		const planApproval = await step.waitForEvent("wait-for-plan-approval", {
			event: "research.a2a.v2.plan-feedback",
			timeout: "30m",
			if: `async.data.taskId == "${taskId}"`,
		});

		if (!planApproval || planApproval.data.decision !== "approve") {
			return { status: "rejected", phase: "plan" };
		}

		// Phase 3: Execute research
		const execution = await step.run("execute-research", async () => {
			await a2a.updateStatus(taskId, contextId, {
				state: "working",
				message: {
					kind: "message",
					messageId: crypto.randomUUID(),
					role: "agent",
					parts: [
						{
							kind: "text",
							text: "リサーチを実行中...",
						},
					],
					contextId,
					extensions: [],
					metadata: {},
				},
			});

			const result = await generateObject({
				model: openai("gpt-4o-mini"),
				schema: ResearchExecutionSchema,
				prompt: `Execute research based on the following approved plan:

Theme: ${plan.theme}
Approach: ${plan.approach}
Key Questions: ${plan.keyQuestions.join(", ")}
Expected Outcomes: ${plan.expectedOutcomes}
Methodology: ${plan.methodology}

Depth level: ${depth}
Language: ${language}

Please provide:
1. A comprehensive summary of the research
2. Key points discovered
3. Detailed findings with confidence levels
4. Limitations of this research
5. Suggested next steps

${language === "ja" ? "Please respond in Japanese." : "Please respond in English."}`,
			});

			// Save execution results as artifact
			await a2a.updateMessage(taskId, contextId, {
				kind: "message",
				messageId: crypto.randomUUID(),
				role: "agent",
				parts: [
					{
						kind: "text",
						text: "リサーチの実行結果",
					},
					{
						kind: "data",
						data: result.object,
					},
				],
				contextId,
			});

			return result.object;
		});

		// Request execution approval
		await step.run("request-execution-approval", async () => {
			await a2a.updateStatus(taskId, contextId, {
				state: "input-required",
				message: {
					kind: "message",
					messageId: crypto.randomUUID(),
					role: "agent",
					parts: [
						{
							kind: "text",
							text: "リサーチの実行結果を確認してください",
						},
						{
							kind: "data",
							data: {
								execution,
							},
						},
					],
					contextId,
					extensions: [],
					metadata: {},
				},
			});
		});

		// Phase 4: Wait for execution approval
		const executionApproval = await step.waitForEvent(
			"wait-for-execution-approval",
			{
				event: "research.a2a.v2.execution-feedback",
				timeout: "30m",
				if: `async.data.taskId == "${taskId}"`,
			},
		);

		if (!executionApproval || executionApproval.data.decision !== "approve") {
			return { status: "rejected", phase: "execution" };
		}

		// Complete successfully
		await step.run("complete-research", async () => {
			await a2a.updateArtifact(taskId, contextId, {
				artifactId: crypto.randomUUID(),
				name: "research-execution",
				parts: [
					{
						kind: "text",
						text: "リサーチが正常に完了しました",
					},
					{
						kind: "data",
						data: {
							execution,
						},
					},
				],
				extensions: [],
				metadata: {},
			});
		});

		return {
			status: "completed",
			theme: plan.theme,
			plan,
			execution,
			confidence: execution.findings.length > 0 ? "high" : "medium",
		};
	},
);
