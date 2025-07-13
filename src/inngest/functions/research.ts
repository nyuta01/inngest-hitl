import { inngest } from "../client";
import { z } from "zod";
import { generateObject, generateText } from "ai";
import { randomUUID } from "node:crypto";
import { openai } from "@ai-sdk/openai";
import { channel, topic } from "@inngest/realtime";
import { zodToJsonSchema } from "zod-to-json-schema";

export const ResearchRequestSchema = z.object({
	theme: z.string().describe("research theme"),
});

const ResearchPlanSchema = z.object({
	methods: z.array(z.string()).describe("list of research methods"),
	expectedOutcomes: z.array(z.string()).describe("list of expected outcomes"),
	reasoning: z.string().describe("reasoning and context for the research plan"),
});

const ResearchPlanFeedbackSchema = z.object({
	uuid: z.string(),
	approved: z.boolean(),
	feedback: z.string().optional(),
});

const ResearchExecutionSchema = z.object({
	content: z.string().describe("content of the research"),
	reasoning: z.string().describe("reasoning and context for the research"),
});

const ResearchExecutionFeedbackSchema = z.object({
	uuid: z.string(),
	approved: z.boolean(),
	feedback: z.string().optional(),
});

const ResearchContextSchema = z.object({
	request: z.object({
		theme: z.string(),
	}),
	planStep: z
		.array(
			z.object({
				response: ResearchPlanSchema,
				feedback: ResearchPlanFeedbackSchema.optional(),
			}),
		)
		.default([]),
	executionStep: z
		.array(
			z.object({
				response: ResearchExecutionSchema,
				feedback: ResearchExecutionFeedbackSchema.optional(),
			}),
		)
		.default([]),
});

const LogSchema = z.object({
	id: z.string(),
	runId: z.string(),
	eventId: z.string().optional(),
	timestamp: z.string(),
	message: z.string(),
	details: z.record(z.unknown()).optional(),
});

const WaitForEventSchema = z.object({
	id: z.string(),
	runId: z.string(),
	timestamp: z.string(),
	event: z.string(),
	uuid: z.string(),
	question: z.string(),
	details: z.record(z.unknown()).optional(),
	schema: z.record(z.string(), z.unknown()),
});

type ResearchRequest = z.infer<typeof ResearchRequestSchema>;
type ResearchContext = z.infer<typeof ResearchContextSchema>;
type ResearchPlan = z.infer<typeof ResearchPlanSchema>;
type ResearchPlanFeedback = z.infer<typeof ResearchPlanFeedbackSchema>;
type ResearchExecution = z.infer<typeof ResearchExecutionSchema>;
type ResearchExecutionFeedback = z.infer<
	typeof ResearchExecutionFeedbackSchema
>;
// for inngest
type StepTools = {
	run: <T>(id: string, fn: () => Promise<T>) => Promise<T>;
	waitForEvent: <T>(
		id: string,
		options: { event: string; timeout: string; if: string },
	) => Promise<T>;
};
type Logger = (
	args: Omit<z.infer<typeof LogSchema>, "id" | "timestamp" | "runId">,
) => Promise<void>;
type WaitForEvent = (
	args: Omit<z.infer<typeof WaitForEventSchema>, "id" | "runId" | "timestamp">,
) => Promise<void>;

const GENERATE_RESEARCH_PLAN_PROMPT = (
	theme: string,
	prevPlan?: ResearchPlan,
	feedback?: string,
) => `
You are a research assistant.
You are given a research theme and a feedback.
You need to generate a research plan. 
The research plan should be a list of methods and expected outcomes that will help you answer the research theme.
And you should also provide a reasoning for the research plan.

<theme>
${theme}
</theme>

<prev-plan>
${prevPlan ? JSON.stringify(prevPlan) : "No previous plan provided"}
</prev-plan>

<feedback>
${feedback ? feedback : "No feedback provided"}
</feedback>
`;

const generateResearchPlan = async (
	theme: string,
	prevPlan?: ResearchPlan,
	feedback?: string,
): Promise<ResearchPlan> => {
	const { object } = await generateObject({
		model: openai("gpt-4.1"),
		schema: ResearchPlanSchema,
		prompt: GENERATE_RESEARCH_PLAN_PROMPT(theme, prevPlan, feedback),
	});

	return object;
};

const generateResearchPlanStep = async (
	step: StepTools,
	logger: Logger,
	waitForEvent: WaitForEvent,
	context: ResearchContext,
	request: ResearchRequest,
): Promise<ResearchPlan> => {
	let _prevPlan: ResearchPlan | undefined;
	let _feedback: string | undefined;
	let _iteration = 0;

	await logger({ message: `Generating research plan for ${request.theme}` });

	while (true) {
		await logger({
			message: `Iteration ${_iteration} for research plan generation`,
			details: {
				prevPlan: _prevPlan,
				feedback: _feedback,
			},
		});
		const plan = await step.run(
			`create-research-plan-${_iteration}`,
			async () => generateResearchPlan(request.theme, _prevPlan, _feedback),
		);
		await logger({
			message: "Research plan generated",
			details: {
				plan,
			},
		});

		const confirmationUuid = await step.run(
			`generate-confirmation-uuid-${_iteration}`,
			async () => randomUUID(),
		);
		await logger({
			message: "Confirmation UUID generated",
			details: {
				confirmationUuid,
			},
		});

		await logger({
			message: "Waiting for plan feedback",
			details: {
				confirmationUuid,
			},
		});
		await waitForEvent({
			event: "research.plan.feedback",
			uuid: confirmationUuid,
			question: "Is the research plan approved?",
			details: {
				plan,
			},
			schema: zodToJsonSchema(ResearchPlanFeedbackSchema),
		});
		const { data: feedbackData } = await step.waitForEvent<{
			data: ResearchPlanFeedback;
		}>(`wait-for-plan-feedback-${_iteration}`, {
			event: "research.plan.feedback",
			timeout: "30m",
			if: `async.data.uuid == "${confirmationUuid}"`,
		});

		await logger({
			message: "Received plan feedback",
			details: {
				feedbackData,
			},
		});

		if (!feedbackData) {
			await logger({
				message: "Plan approval timed out",
				details: {
					confirmationUuid,
				},
			});
			context.planStep.push({
				response: plan,
				feedback: undefined,
			});
			throw new Error("Plan approval timed out");
		}

		if (feedbackData.approved) {
			await logger({
				message: "Plan approved",
				details: {
					feedbackData,
				},
			});
			context.planStep.push({
				response: plan,
				feedback: feedbackData,
			});
			return plan;
		}

		await logger({
			message: "Plan rejected",
			details: {
				feedbackData,
			},
		});
		context.planStep.push({
			response: plan,
			feedback: feedbackData,
		});
		_feedback = feedbackData.feedback;
		_prevPlan = plan;
		_iteration++;
	}
};

const GENERATE_RESEARCH_EXECUTION_PROMPT = (
	theme: string,
	plan: ResearchPlan,
	prevExecution?: ResearchExecution,
	feedback?: string,
) => `
You are a research assistant.
You are given a research plan and a feedback.
Your role is to create a research result based on the given plan.
And you should also provide a reasoning for the research execution.
If there is feedback, please improve the research result based on the feedback.

<theme>
${theme}
</theme>

<plan>
${JSON.stringify(plan)}
</plan>

<prev-execution>
${prevExecution ? JSON.stringify(prevExecution) : "No previous execution provided"}
</prev-execution>

<feedback>
${feedback ? feedback : "No feedback provided"}
</feedback>
`;

const generateResearchExecution = async (
	theme: string,
	plan: ResearchPlan,
	prevExecution?: ResearchExecution,
	feedback?: string,
): Promise<ResearchExecution> => {
	const { text } = await generateText({
		model: openai("gpt-4o-search-preview"),
		prompt: GENERATE_RESEARCH_EXECUTION_PROMPT(
			theme,
			plan,
			prevExecution,
			feedback,
		),
	});
	const { object } = await generateObject({
		model: openai("gpt-4.1"),
		schema: ResearchExecutionSchema,
		prompt: `
		Your role is to convert the given research results into the appropriate output format.
		Please convert the following text into the appropriate output format.
		Please include all information without any omissions.
		<output-format>
		{
			"content": "string" // Content of the research results
			"reasoning": "string" // Reasoning for the research results
		}
		</output-format>

		<text>
		${text}
		</text>
		`,
	});
	return object;
};

const executeResearchPlanStep = async (
	step: StepTools,
	logger: Logger,
	waitForEvent: WaitForEvent,
	context: ResearchContext,
	theme: string,
	plan: ResearchPlan,
): Promise<ResearchExecution> => {
	let _prevExecution: ResearchExecution | undefined;
	let _feedback: string | undefined;
	let _iteration = 0;

	await logger({
		message: "Executing research plan",
		details: {
			plan,
		},
	});

	while (true) {
		await logger({
			message: `Generating research execution for iteration ${_iteration}`,
			details: {
				plan,
			},
		});
		const execution = await step.run(
			`execute-research-${_iteration}`,
			async () =>
				generateResearchExecution(theme, plan, _prevExecution, _feedback),
		);
		await logger({
			message: "Research execution generated",
			details: {
				execution,
			},
		});

		const confirmationUuid = await step.run(
			`generate-confirmation-uuid-${_iteration}`,
			async () => randomUUID(),
		);

		await logger({
			message: "Waiting for execution feedback",
			details: {
				confirmationUuid,
			},
		});
		await waitForEvent({
			event: "research.execution.feedback",
			uuid: confirmationUuid,
			question: "Is the research execution approved?",
			details: {
				execution,
			},
			schema: zodToJsonSchema(ResearchExecutionFeedbackSchema),
		});
		const { data: feedbackData } = await step.waitForEvent<{
			data: ResearchExecutionFeedback;
		}>(`wait-for-execution-feedback-${_iteration}`, {
			event: "research.execution.feedback",
			timeout: "30m",
			if: `async.data.uuid == "${confirmationUuid}"`,
		});

		await logger({
			message: "Received execution feedback",
			details: {
				feedbackData,
			},
		});

		if (!feedbackData) {
			await logger({
				message: "Execution approval timed out",
				details: {
					confirmationUuid,
				},
			});
			context.executionStep.push({
				response: execution,
				feedback: undefined,
			});
			throw new Error("Execution approval timed out");
		}

		if (feedbackData.approved) {
			await logger({
				message: "Execution approved",
				details: {
					feedbackData,
				},
			});
			context.executionStep.push({
				response: execution,
				feedback: feedbackData,
			});
			return execution;
		}

		await logger({
			message: "Execution rejected",
			details: {
				feedbackData,
			},
		});
		context.executionStep.push({
			response: execution,
			feedback: feedbackData,
		});
		_feedback = feedbackData.feedback;
		_prevExecution = execution;
		_iteration++;
	}
};

const researchChannel = channel("research")
	.addTopic(topic("log").schema(LogSchema))
	.addTopic(topic("waitForEvent").schema(WaitForEventSchema));

export const research = inngest.createFunction(
	{ id: "research" },
	{ event: "research.submit" },
	async ({ event, step, publish, runId }) => {
		const request = ResearchRequestSchema.parse(event.data);
		const context = ResearchContextSchema.parse({ request });

		const logger = async (
			args: Omit<z.infer<typeof LogSchema>, "id" | "timestamp" | "runId">,
		) => {
			await publish(
				researchChannel().log({
					id: randomUUID(),
					runId: runId,
					eventId: event.id,
					timestamp: new Date().toISOString(),
					...args,
				}),
			);
		};
		const waitForEvent = async (
			args: Omit<
				z.infer<typeof WaitForEventSchema>,
				"id" | "runId" | "timestamp"
			>,
		) => {
			await publish(
				researchChannel().waitForEvent({
					...args,
					id: randomUUID(),
					runId: runId,
					timestamp: new Date().toISOString(),
				}),
			);
		};

		await logger({ message: `Research started: ${request.theme}` });

		const plan = await generateResearchPlanStep(
			step as StepTools,
			logger,
			waitForEvent,
			context,
			request,
		);
		console.log("plan", plan);
		const execution = await executeResearchPlanStep(
			step as StepTools,
			logger,
			waitForEvent,
			context,
			request.theme,
			plan,
		);
		console.log("execution", execution);

		await logger({
			message: "Research completed",
			details: {
				execution,
				plan,
				context,
			},
		});

		return execution;
	},
);
