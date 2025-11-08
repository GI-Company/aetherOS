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

const GenerateAppWorkflowOutputSchema = z.object({
  workflowDefinition: z
    .string()
    .describe('The generated workflow definition in a suitable format (e.g., JSON, YAML).'),
});

export type GenerateAppWorkflowOutput = z.infer<typeof GenerateAppWorkflowOutputSchema>;

export async function generateAppWorkflow(input: GenerateAppWorkflowInput): Promise<GenerateAppWorkflowOutput> {
  return generateAppWorkflowFlow(input);
}

const generateAppWorkflowPrompt = ai.definePrompt({
  name: 'generateAppWorkflowPrompt',
  input: {schema: GenerateAppWorkflowInputSchema},
  output: {schema: GenerateAppWorkflowOutputSchema},
  prompt: `You are an AI workflow generator.  Given a natural language description of a complex process, generate a workflow definition that can be used to automate the process.

Description: {{{$input}}}

Workflow Definition:`,
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
