'use server';
/**
 * @fileOverview An agentic AI flow that can use tools to interact with the OS.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';
import { APPS } from '@/lib/apps';
import { semanticFileSearch } from './semantic-file-search';
import { generateImage } from './generate-image';


const FileItemSchema = z.object({
  path: z.string(),
  type: z.enum(['file', 'folder']),
});


// Define the schema for the tools' inputs and outputs
const GetOpenAppsInputSchema = z.object({}).describe("No input needed, client provides context.");


const OpenAppInputSchema = z.object({
  appId: z.string().describe(`The unique ID of the app to open. Must be one of: ${APPS.map(app => `"${app.id}"`).join(', ')}`),
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
    description: 'Opens a specific application window.',
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


const agenticToolUserPrompt = ai.definePrompt({
    name: 'agenticToolUserPrompt',
    system: `You are an AI assistant for AetherOS. Your goal is to help the user by using the available tools.
- Your knowledge of available applications is limited to the following app IDs: ${APPS.map(app => `"${app.id}"`).join(', ')}.
- If the user asks to open an app, use the 'openApp' tool. You must infer the correct 'appId' from the user's prompt and the available app IDs. For example, if the user says "open the code editor", the appId is "code-editor".
- If the user's query implies searching for a file (e.g., "find," "look for," "where is"), use the 'searchFiles' tool. For each result, you must determine if it is a 'file' or a 'folder' and set the type accordingly.
- If the user asks to open a specific file, use the 'openFile' tool. You must determine the exact file path from the context of available files.
- If a user asks to find AND open a file, you should first use 'searchFiles' to locate it, and then if you are confident in the result, call 'openFile' with the exact path.
- If the user asks for a new wallpaper or background, you should first call 'generateImage' with a creative prompt based on their request. Then, take the 'imageUrl' from the output of 'generateImage' and use it to call 'setWallpaper'.
- If the user asks what apps are currently open, use the 'getOpenApps' tool to get the list and then formulate a text response based on its output.
- If the user asks to arrange, tile, or organize their windows, use the 'arrangeWindows' tool.
- For any other query, do not use a tool and instead provide a helpful text response.`,
    tools: [getOpenAppsTool, openAppTool, arrangeWindowsTool, searchFilesTool, openFileTool, generateImageTool, setWallpaperTool],
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
    const llmResponse = await agenticToolUserPrompt(input, {
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
            setWallpaperTool
        ]
    });
    
    return llmResponse;
}
