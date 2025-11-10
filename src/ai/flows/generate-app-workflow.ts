
'use server';

/**
 * @fileOverview A flow for generating application workflows from natural language descriptions.
 *
 * - generateAppWorkflow - A function that takes a natural language description of a process and generates a workflow.
 */

import {ai} from '@/ai/genkit';
import { APPS } from '@/lib/apps';
import { GenerateAppWorkflowInputSchema, GenerateAppWorkflowOutputSchema, type GenerateAppWorkflowInput } from './schemas/workflow-schemas';


const generateAppWorkflowPrompt = ai.definePrompt({
  name: 'generateAppWorkflowPrompt',
  input: {schema: GenerateAppWorkflowInputSchema},
  output: {schema: GenerateAppWorkflowOutputSchema},
  prompt: `You are an AI workflow generator for AetherOS. Your job is to decompose a user's request into a structured series of steps.
  
- Your knowledge of available applications is limited to the following app IDs: ${APPS.map(app => `\'\'\'${app.id}\'\'\'`).join(', ')}.
- If the request can be handled by a single tool, return a workflow with one step.
- If the request requires multiple tools, return a workflow with all the necessary steps in the correct order.
- **IMPORTANT**: If the user's request is purely conversational and does not require a tool (e.g., "hello", "who are you?", "thank you"), you MUST return a workflow with an empty "steps" array.
- You must infer the correct 'toolId' and the 'inputs' for each step based on the user's request.
- If the user asks to "find" or "search" for a file, you should use the 'openApp' tool with 'file-explorer' as the 'appId' and pass the search query as a prop. For example: { "appId": "file-explorer", "props": { "searchQuery": "user's search query" } }
- If the user asks to "find AND open" a file, you must first use the 'searchFiles' tool, and then the 'openFile' tool with the best result.
- If the user asks for a new wallpaper, you should first call 'generateImage' with their prompt, and then call 'setWallpaper' with the resulting 'imageUrl'.
- If the user asks to design a component and save it, you should first call 'designComponent' with their prompt, and then call 'writeFile' with the resulting 'code' and a filePath they provided.

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
  async (input: GenerateAppWorkflowInput) => {
    const {output} = await generateAppWorkflowPrompt(input);
    return output!;
  }
);
