
'use server';
/**
 * @fileOverview An agentic AI flow that can use tools to interact with the OS.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';
import { APPS } from '@/lib/apps';
import { generateImage } from './generate-image';
import { designByPromptUiGeneration } from './design-by-prompt-ui-generation';
import { generateAppWorkflow } from './generate-app-workflow';

// Define the schema for the tools' inputs and outputs
const OpenAppInputSchema = z.object({
  appId: z.string().describe(`The unique ID of the app to open. Must be one of: ${APPS.map(app => `"${app.id}"`).join(', ')}`),
  props: z.record(z.any()).optional().describe("Optional props to pass to the application component, e.g. { searchQuery: 'find my components' }"),
});

const WriteFileInputSchema = z.object({
    filePath: z.string().describe('The destination path for the file to be written (e.g., "src/components/new-component.tsx"). The path must start with a valid directory like "src/components" or "src/app".'),
    content: z.string().describe('The full code or text content to write into the file.'),
});

const openAppTool = ai.defineTool(
{
    name: 'openApp',
    description: 'Opens a specific application window, optionally with props.',
    inputSchema: OpenAppInputSchema,
    outputSchema: z.void(),
},
// This function is a placeholder. The actual implementation is on the client.
async () => {}
);

const arrangeWindowsTool = ai.defineTool(
{
    name: 'arrangeWindows',
    description: 'Arranges the Code Editor and Browser windows side-by-side for an optimal workflow.',
    inputSchema: z.object({}),
    outputSchema: z.void(),
},
// This function is a placeholder. The actual implementation is on the client.
async () => {}
);

const searchFilesTool = ai.defineTool(
    {
        name: 'searchFiles',
        description: 'Searches for files based on a semantic/natural language query. You must determine if a path is a file or a folder.',
        inputSchema: z.object({ query: z.string() }),
        outputSchema: z.object({ results: z.array(z.object({ path: z.string(), type: z.enum(['file', 'folder']) })) }),
    },
    async () => ({ results: [] }) // Placeholder, client implements
);

const openFileTool = ai.defineTool(
    {
        name: 'openFile',
        description: 'Opens a specific file in the Code Editor.',
        inputSchema: z.object({ filePath: z.string() }),
        outputSchema: z.void(),
    },
    async () => {} // Placeholder, client implements
);

const generateImageTool = ai.defineTool(
    {
        name: 'generateImage',
        description: 'Generates an image from a text prompt. Use this if the user asks for an image or wants to create a visual.',
        inputSchema: z.object({ prompt: z.string() }),
        outputSchema: z.object({ imageUrl: z.string() }),
    },
    async ({ prompt }) => generateImage({ prompt })
);

const setWallpaperTool = ai.defineTool(
    {
        name: 'setWallpaper',
        description: 'Sets the desktop wallpaper to the specified image URL.',
        inputSchema: z.object({ imageUrl: z.string() }),
        outputSchema: z.void(),
    },
    async () => {} // Placeholder, client implements
);

const designComponentTool = ai.defineTool(
    {
      name: 'designComponent',
      description: 'Generates React component code from a text description.',
      inputSchema: z.object({ prompt: z.string() }),
      outputSchema: z.object({ code: z.string() }),
    },
    async ({ prompt }) => {
        const result = await designByPromptUiGeneration({ prompt });
        const cleanedCode = result.uiElementCode.replace(/```.*\n/g, '').replace(/```/g, '').trim();
        return { code: cleanedCode };
    }
);

const writeFileTool = ai.defineTool(
    {
      name: 'writeFile',
      description: 'Writes content to a specified file path in the user\'s workspace. This is useful for saving generated code into a new file.',
      inputSchema: WriteFileInputSchema,
      outputSchema: z.void(),
    },
    async () => {} // Placeholder, client implements
);

const ALL_TOOLS = [
  openAppTool,
  arrangeWindowsTool,
  searchFilesTool,
  openFileTool,
  generateImageTool,
  setWallpaperTool,
  designComponentTool,
  writeFileTool,
];

// This is the main function that will be called from the UI.
// It acts as a wrapper around the Genkit flow.
export async function agenticToolUser(
  input: string,
  context: {
    openApps: string[],
    allFiles: string[],
  }
) {
    // 1. First, always generate a workflow plan based on the user's request.
    const workflow = await generateAppWorkflow(input);

    // 2. If the workflow has steps, execute them.
    if (workflow.steps.length > 0) {
        const toolCalls = workflow.steps.map(step => {
            return {
                toolName: step.toolId,
                input: step.inputs,
                output: undefined,
            };
        });
        
        const response = await ai.generate({
            prompt: input,
            history: [
                {
                    role: 'model',
                    content: toolCalls.map(tc => ({ toolRequest: { name: tc.toolName, input: tc.input } })),
                }
            ]
        });

        return response;
    }

    // 3. If the workflow is empty, fall back to a simple conversational response.
    const conversationalPrompt = ai.definePrompt({
        name: 'conversationalAgent',
        system: `You are an AI assistant for AetherOS. Your goal is to help the user. If you can't perform an action, provide a helpful text response.`,
    });
    
    return conversationalPrompt(input);
}
