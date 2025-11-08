'use server';

/**
 * @fileOverview A flow for generating a visual workflow from a natural language description.
 *
 * - generateWorkflowFromDescription - A function that takes a natural language description of a process and generates a visual workflow.
 * - GenerateWorkflowFromDescriptionInput - The input type for the generateWorkflowFromDescription function, a natural language description.
 * - GenerateWorkflowFromDescriptionOutput - The return type for the generateWorkflowFromDescription function, a visual workflow definition.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const GenerateWorkflowFromDescriptionInputSchema = z
  .string()
  .describe('A natural language description of the desired workflow.');

export type GenerateWorkflowFromDescriptionInput = z.infer<typeof GenerateWorkflowFromDescriptionInputSchema>;

const GenerateWorkflowFromDescriptionOutputSchema = z.object({
  workflowDefinition: z
    .string()
    .describe('The generated workflow definition in a visual format (e.g., Mermaid, JSON).'),
});

export type GenerateWorkflowFromDescriptionOutput = z.infer<typeof GenerateWorkflowFromDescriptionOutputSchema>;

export async function generateWorkflowFromDescription(
  input: GenerateWorkflowFromDescriptionInput
): Promise<GenerateWorkflowFromDescriptionOutput> {
  return generateWorkflowFromDescriptionFlow(input);
}

const generateWorkflowFromDescriptionPrompt = ai.definePrompt({
  name: 'generateWorkflowFromDescriptionPrompt',
  input: {schema: GenerateWorkflowFromDescriptionInputSchema},
  output: {schema: GenerateWorkflowFromDescriptionOutputSchema},
  prompt: `You are an AI workflow generator. Given a natural language description of a process, generate a visual workflow definition that can be used to visualize the process.

  Please use the Mermaid syntax to define the workflow.

Description: {{{$input}}}

Workflow Definition:`,
});

const generateWorkflowFromDescriptionFlow = ai.defineFlow(
  {
    name: 'generateWorkflowFromDescriptionFlow',
    inputSchema: GenerateWorkflowFromDescriptionInputSchema,
    outputSchema: GenerateWorkflowFromDescriptionOutputSchema,
  },
  async input => {
    const {output} = await generateWorkflowFromDescriptionPrompt(input);
    return output!;
  }
);
