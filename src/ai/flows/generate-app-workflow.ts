
'use server';

/**
 * @fileOverview A flow for generating application workflows from natural language descriptions.
 *
 * - generateAppWorkflow - A function that takes a natural language description of a process and generates a workflow.
 */

import {ai} from '@/ai/genkit';
import { GenerateAppWorkflowInputSchema, GenerateAppWorkflowOutputSchema, type GenerateAppWorkflowOutput } from './schemas/workflow-schemas';
import { TOOLS } from '@/lib/tools';


const toolDescriptions = Object.values(TOOLS).map(tool => `- toolId: '${tool.toolId}', description: '${tool.description}'`).join('\n');


const generateAppWorkflowPrompt = ai.definePrompt({
  name: 'generateAppWorkflowPrompt',
  input: {schema: GenerateAppWorkflowInputSchema},
  output: {schema: GenerateAppWorkflowOutputSchema},
  prompt: `You are an AI workflow generator for AetherOS. Your job is to decompose a user's request into a structured series of steps using the available tools.
  
Your knowledge of available tools is strictly limited to the following:
${toolDescriptions}

- If the request can be handled by a single tool, return a workflow with one step.
- If the request requires multiple tools, return a workflow with all the necessary steps in the correct order.
- **IMPORTANT**: If the user's request is purely conversational and does not require a tool (e.g., "hello", "who are you?", "thank you"), you MUST return a workflow with an empty "steps" array.
- You must infer the correct 'toolId' and the 'inputs' for each step based on the user's request.
- To chain the output of one tool to the input of another, use the '{{result.propertyName}}' syntax. For example, if a 'generateImage' step produces an 'imageUrl', the next step can use it as input by setting a property to '{{result.imageUrl}}'.

- If the user asks to "find" or "search" for a file (but not open it), you should use the 'openApp' tool with 'file-explorer' as the 'appId' and pass the search query as a prop. For example: { "appId": "file-explorer", "props": { "searchQuery": "user's search query" } }.
- If the user asks to "find AND open" a file, you MUST first use the 'searchFiles' tool to get the file path, and then use the 'openFile' tool with the 'filePath' set to '{{result.filePath}}'.
- If the user asks for a new wallpaper, you should first call 'generateImage' with their prompt, and then call 'setWallpaper' with an 'imageUrl' of '{{result.imageUrl}}'.
- If the user asks to design a component and save it, you should first call 'designComponent' with their prompt, and then call 'writeFile' with a 'content' of '{{result.code}}' and a 'filePath' they provided.

Description: {{{$input}}}

Return a JSON object that conforms to the specified output schema.
`,
});

export { GenerateAppWorkflowOutput };

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
