import { research, ResearchRequestSchema } from "./research";

export const functions = [research];
export const schemas = {
	"research.submit": {
    data: ResearchRequestSchema,
  },
};