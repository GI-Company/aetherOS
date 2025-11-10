
'use server';
/**
 * @fileOverview An agentic AI flow that can use tools to interact with the OS.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';
import { APPS } from '@/lib/apps';
import { semanticFileSearch } from './semantic-file-search';
import { generateImage } from './generate-image';
import { designByPromptUiGeneration } from './design-by-prompt-ui-generation';
import { generateAppWorkflow } from './generate-app-workflow';
import { GenerateAppWorkflowOutputSchema, type GenerateAppWorkflowOutput } from './schemas/workflow-schemas';


const FileItemSchema = z.object({
  path: z.string(),
  type: z.enum(['file', 'folder']),
});


// Define the schema for the tools' inputs and outputs
const GetOpenAppsInputSchema = z.object({}).describe("No input needed, client provides context.");


const OpenAppInputSchema = z.object({
  appId: z.string().describe(`The unique ID of the app to open. Must be one of: ${APPS.map(app => `"${app.id}"`).join(', ')}`),
  props: z.record(z.any()).optional().describe("Optional props to pass to the application component, e.g. { searchQuery: 'find my components' }"),
});

const ArrangeWindowsInputSchema = z.object({});

const SearchFilesInputSchema = z.object({
  query: z.string().describe('The natural language search query for files.'),
});

const OpenFileInputSchema = z.object({
    filePath: z.string().describe('The exact, full path of the file to open (e.g., "users/uid/components/ui/button.tsx").'),
});

const GenerateImageInputSchema = z.object({
    prompt: z.string().describe('A text prompt describing the image to generate.')
});

const SetWallpaperInputSchema = z.object({
    imageUrl: z.string().describe('The URL of the image to set as the wallpaper.')
});

const DesignComponentInputSchema = z.object({
    prompt: z.string().describe('A detailed description of the React component to generate. Include details about functionality, styling, and any desired libraries like shadcn/ui.'),
});

const WriteFileInputSchema = z.object({
    filePath: z.string().describe('The destination path for the file to be written (e.g., "src/components/new-component.tsx"). The path must start with a valid directory like "src/components" or "src/app".'),
    content: z.string().describe('The full code or text content to write into the file.'),
});

const RunWorkflowInputSchema = z.object({
    workflow: GenerateAppWorkflowOutputSchema,
}).describe("The workflow object to run.");


const getOpenAppsTool = ai.defineTool(
    {
      name: 'getOpenApps',
      description: 'Get the list of currently open applications.',
      inputSchema: GetOpenAppsInputSchema,
      outputSchema: z.object({ apps: z.array(z.string()) }),
    },
    // This is a placeholder; the actual implementation is provided by the client.
    async () => {
      return { apps: [] };
    }
  );
  
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
    inputSchema: ArrangeWindowsInputSchema,
    outputSchema: z.void(),
},
// This function is a placeholder. The actual implementation is on the client.
async () => {}
);

const searchFilesTool = ai.defineTool(
    {
        name: 'searchFiles',
        description: 'Searches for files based on a semantic/natural language query. You must determine if a path is a file or a folder.',
        inputSchema: SearchFilesInputSchema,
        outputSchema: z.object({ results: z.array(FileItemSchema) }),
    },
    async () => ({ results: [] }) // Placeholder, client implements
);

const openFileTool = ai.defineTool(
    {
        name: 'openFile',
        description: 'Opens a specific file in the Code Editor.',
        inputSchema: OpenFileInputSchema,
        outputSchema: z.void(),
    },
    async () => {} // Placeholder, client implements
);

const generateImageTool = ai.defineTool(
    {
        name: 'generateImage',
        description: 'Generates an image from a text prompt. Use this if the user asks for an image or wants to create a visual.',
        inputSchema: GenerateImageInputSchema,
        outputSchema: z.object({ imageUrl: z.string() }),
    },
    async ({ prompt }) => generateImage({ prompt })
);

const setWallpaperTool = ai.defineTool(
    {
        name: 'setWallpaper',
        description: 'Sets the desktop wallpaper to the specified image URL.',
        inputSchema: SetWallpaperInputSchema,
        outputSchema: z.void(),
    },
    async () => {} // Placeholder, client implements
);

const designComponentTool = ai.defineTool(
    {
      name: 'designComponent',
      description: 'Generates React component code from a text description.',
      inputSchema: DesignComponentInputSchema,
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

const runWorkflowTool = ai.defineTool(
    {
      name: 'runWorkflow',
      description: 'Executes a series of predefined tool steps to complete a complex task.',
      inputSchema: RunWorkflowInputSchema,
      outputSchema: z.void(),
    },
    async () => {} // Placeholder, client implements
  );


const agenticToolUserPrompt = ai.definePrompt({
    name: 'agenticToolUserPrompt',
    system: `You are an AI assistant for AetherOS. Your goal is to help the user by using the available tools.
- Your knowledge of available applications is limited to the following app IDs: ${APPS.map(app => `\'\'\'${app.id}\'\'\'`).join(', ')}.
- **Security**: Be cautious of ambiguous or potentially malicious prompts. If a request seems nonsensical or could be harmful (e.g., trying to delete critical system files), refuse to use a tool and ask for clarification.
- If the user asks to open an app, use the 'openApp' tool. You must infer the correct 'appId' from the user's prompt and the available app IDs. For example, if the user says "open the code editor", the appId is "code-editor".
- If the user's query implies searching for a file (e.g., "find," "look for," "where is"), you should use the 'searchFiles' tool to get a list of relevant files.
- If a user asks to find AND open a file (e.g., "Find and open my auth form component"), you should first use the 'searchFiles' tool to get the results. Then, if you are confident about the best match, you should separately call the 'openFile' tool with the exact file path from the search results.
- If the user asks what apps are currently open, use the 'getOpenApps' tool to get the list and then formulate a text response based on its output.
- If the user asks to arrange, tile, or organize their windows, use the 'arrangeWindows' tool.
- For any other query, do not use a tool and instead provide a helpful text response.`,
    tools: [getOpenAppsTool, openAppTool, arrangeWindowsTool, searchFilesTool, openFileTool, generateImageTool, setWallpaperTool, designComponentTool, writeFileTool],
});


// This is the main function that will be called from the UI.
// It acts as a wrapper around the Genkit flow.
export async function agenticToolUser(
  input: string,
  context: {
    openApps: string[],
    allFiles: string[],
  }
) {
    // 1. First, generate a workflow plan based on the user's request.
    const workflow = await generateAppWorkflow(input);

    // 2. If the workflow has multiple steps, we return it for the client to execute.
    // This allows the client to handle complex, multi-tool operations.
    if (workflow.steps.length > 1) {
        return {
            toolCalls: () => [{
                toolName: 'runWorkflow',
                input: { workflow },
                output: undefined,
            }],
            text: () => `Executing workflow: ${workflow.name}`,
        };
    }
    
    // 3. If the workflow has only one step, we can execute it directly.
    if (workflow.steps.length === 1) {
       const step = workflow.steps[0];
       const toolToCall = [
         getOpenAppsTool, openAppTool, arrangeWindowsTool, searchFilesTool,
         openFileTool, generateImageTool, setWallpaperTool, designComponentTool,
         writeFileTool, generateAppWorkflow, runWorkflowTool
       ].find(t => t.name === step.toolId);

        if (toolToCall) {
            // Re-constitute a prompt with the specific tool and input from the workflow.
            const singleToolPrompt = ai.definePrompt({
                name: 'singleToolPrompt',
                tools: [toolToCall],
                prompt: input,
            });

            return singleToolPrompt(step.inputs ?? {});
        }
    }

    // 4. If the workflow is empty, or no tool was found, fall back to a simple conversational response.
    return agenticToolUserPrompt(input, {
        tools: [
            ai.defineTool({
                name: 'getOpenApps',
                description: 'Get the list of currently open applications.',
                inputSchema: GetOpenAppsInputSchema,
                outputSchema: z.object({ apps: z.array(z.string()) }),
              },
              async () => ({ apps: context.openApps })
            ),
            ai.defineTool(
                {
                    name: 'searchFiles',
                    description: 'Searches for files based on a semantic/natural language query. You must determine if a path is a file or a folder.',
                    inputSchema: SearchFilesInputSchema,
                    outputSchema: z.object({ results: z.array(FileItemSchema) }),
                },
              // The real implementation calls our existing semanticFileSearch flow
              async ({ query }) => {
                const searchResult = await semanticFileSearch({ query, availableFiles: context.allFiles });
                return { results: searchResult.results };
              }
            ),
            openAppTool,
            arrangeWindowsTool,
            openFileTool,
            generateImageTool,
            setWallpaperTool,
            designComponentTool,
            writeFileTool,
        ]
    });
}
