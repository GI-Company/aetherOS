'use server';

/**
 * @fileOverview A flow for generating application workflows from natural language descriptions.
 *
 * - generateAppWorkflow - A function that takes a natural language description of a process and generates a workflow.
 * - GenerateAppWorkflowInput - The input type for the generateAppWorkflow function, a natural language description.
 * - GenerateAppWorkflowOutput - The return type for the generateAppWorkflow function, a workflow definition.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const GenerateAppWorkflowInputSchema = z
  .string()
  .describe('A natural language description of the desired application workflow.');

export type GenerateAppWorkflowInput = z.infer<typeof GenerateAppWorkflowInputSchema>;


const StepSchema = z.object({
  stepName: z.string(),
  toolId: z.string().describe('The ID of the tool to execute for this step.'),
  inputs: z.record(z.any()).optional().describe('An object containing the inputs for the tool.'),
});

const GenerateAppWorkflowOutputSchema = z.object({
   name: z.string().describe('A descriptive name for the workflow.'),
   steps: z.array(StepSchema),
});

export type GenerateAppWorkflowOutput = z.infer<typeof GenerateAppWorkflowOutputSchema>;

export async function generateAppWorkflow(input: GenerateAppWorkflowInput): Promise<GenerateAppWorkflowOutput> {
  return generateAppWorkflowFlow(input);
}

const generateAppWorkflowPrompt = ai.definePrompt({
  name: 'generateAppWorkflowPrompt',
  input: {schema: GenerateAppWorkflowInputSchema},
  output: {schema: GenerateAppWorkflowOutputSchema},
  prompt: `You are an AI workflow generator. Given a natural language description of a complex process, generate a workflow definition that can be used to automate the process.
  
  The workflow should be a series of steps, where each step invokes a specific tool.
  You must infer the correct 'toolId' and the 'inputs' for each step based on the description.

Description: {{{$input}}}

Return a JSON object that conforms to the specified output schema.
`,
});

const generateAppWorkflowFlow = ai.defineFlow(
  {
    name: 'generateAppWorkflowFlow',
    inputSchema: GenerateAppWorkflowInputSchema,
    outputSchema: GenerateAppWorkflowOutputSchema,
  },
  async input => {
    const {output} = await generateAppWorkflowPrompt(input);
    return output!;
  }
);
