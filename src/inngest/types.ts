import { EventSchemas } from "inngest";
import { schemas } from "@/inngest/functions";

// Export the event schemas type for use throughout the application
export type InngestEvents = typeof schemas;

// Create EventSchemas instance from our schemas
export const eventSchemas = new EventSchemas().fromZod(schemas);