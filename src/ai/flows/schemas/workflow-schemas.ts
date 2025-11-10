
import { z } from 'zod';

/**
 * @fileOverview Schemas and types for the application workflow generation flow.
 */

export const GenerateAppWorkflowInputSchema = z
  .string()
  .describe('A natural language description of the desired application workflow.');

export type GenerateAppWorkflowInput = z.infer<typeof GenerateAppWorkflowInputSchema>;


const StepSchema = z.object({
  stepName: z.string(),
  toolId: z.string().describe('The ID of the tool to execute for this step.'),
  inputs: z.record(z.any()).optional().describe('An object containing the inputs for the tool.'),
});

export const GenerateAppWorkflowOutputSchema = z.object({
   name: z.string().describe('A descriptive name for the workflow.'),
   steps: z.array(StepSchema),
});

export type GenerateAppWorkflowOutput = z.infer<typeof GenerateAppWorkflowOutputSchema>;
