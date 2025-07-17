import { research, ResearchRequestSchema } from "./research";
import { researchWithA2AV2 } from "./research-with-a2a";

export const functions = [research, researchWithA2AV2];
export const schemas = {
	"research.submit": {
    data: ResearchRequestSchema,
  },
};