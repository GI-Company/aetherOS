
'use server';

/**
 * @fileOverview A flow for generating application workflows from natural language descriptions.
 *
 * - generateAppWorkflow - A function that takes a natural language description of a process and generates a workflow.
 */

import {ai} from '@/ai/genkit';
import { APPS } from '@/lib/apps';
import { GenerateAppWorkflowInputSchema, GenerateAppWorkflowOutputSchema, type GenerateAppWorkflowInput, type GenerateAppWorkflowOutput } from './schemas/workflow-schemas';


const generateAppWorkflowPrompt = ai.definePrompt({
  name: 'generateAppWorkflowPrompt',
  input: {schema: GenerateAppWorkflowInputSchema},
  output: {schema: GenerateAppWorkflowOutputSchema},
  prompt: `You are an AI workflow generator. Given a natural language description of a complex process, generate a workflow definition that can be used to automate the process.
  
  The workflow should be a series of steps, where each step invokes a specific tool.
  You must infer the correct 'toolId' and the 'inputs' for each step based on the description.

  Your knowledge of available applications is limited to the following app IDs: ${APPS.map(app => `\'\'\'${app.id}\'\'\'`).join(', ')}.

Description: {{{$input}}}

Return a JSON object that conforms to the specified output schema.
`,
});

export const generateAppWorkflow = ai.defineFlow(
  {
    name: 'generateAppWorkflow',
    inputSchema: GenerateAppWorkflowInputSchema,
    outputSchema: GenerateAppWorkflowOutputSchema,
  },
  async (input: GenerateAppWorkflowInput): Promise<GenerateAppWorkflowOutput> => {
    const {output} = await generateAppWorkflowPrompt(input);
    return output!;
  }
);
