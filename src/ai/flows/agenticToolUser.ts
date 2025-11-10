
'use server';
/**
 * @fileOverview An agentic AI flow that can use tools to interact with the OS.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';
import { APPS } from '@/lib/apps';
import { generateImage } from './generate-image';
import { designByPromptUiGeneration } from './design-by-prompt-ui-generation';
import { generateAppWorkflow, type GenerateAppWorkflowOutput } from './generate-app-workflow';

// Define the schema for the tools' inputs and outputs
const OpenAppInputSchema = z.object({
  appId: z.string().describe(`The unique ID of the app to open. Must be one of: ${APPS.map(app => `"${app.id}"`).join(', ')}`),
  props: z.record(z.any()).optional().describe("Optional props to pass to the application component, e.g. { searchQuery: 'find my components' }"),
});

const WriteFileInputSchema = z.object({
    filePath: z.string().describe('The destination path for the file to be written (e.g., "src/components/new-component.tsx"). The path must start with a valid directory like "src/components" or "src/app".').refine(
      (path) => {
        const allowedPrefixes = ['src/components/', 'src/app/', 'users/'];
        return allowedPrefixes.some(prefix => path.startsWith(prefix));
      },
      {
        message: "File path is not in an allowed directory. Must start with 'src/components/', 'src/app/', or be a user file path.",
      }
    ),
    content: z.string().describe('The full code or text content to write into the file.'),
});

// This is the main function that will be called from the UI.
// It acts as a wrapper around the Genkit flow.
export async function agenticToolUser(
  input: string,
  context: {
    openApps: string[],
    allFiles: string[],
  }
): Promise<GenerateAppWorkflowOutput> {
    // 1. First, always generate a workflow plan based on the user's request.
    const workflow = await generateAppWorkflow(input);
    return workflow;
}
