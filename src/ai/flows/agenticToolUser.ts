'use server';
/**
 * @fileOverview An agentic AI flow that can use tools to interact with the OS.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';
import { APPS } from '@/lib/apps';
import { semanticFileSearch } from './semantic-file-search';

// Define the schema for the tools' inputs and outputs
const GetOpenAppsInputSchema = z.object({}).describe("No input needed, client provides context.");


const OpenAppInputSchema = z.object({
  appId: z.string().describe(`The unique ID of the app to open. Must be one of: ${APPS.map(app => `"${app.id}"`).join(', ')}`),
});

const ArrangeWindowsInputSchema = z.object({});

const SearchFilesInputSchema = z.object({
  query: z.string().describe('The natural language search query for files.'),
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
        description: 'Searches for files based on a semantic/natural language query.',
        inputSchema: SearchFilesInputSchema,
        outputSchema: z.object({ results: z.array(z.string()) }),
    },
    async () => ({ results: [] }) // Placeholder, client implements
);


const agenticToolUserPrompt = ai.definePrompt({
    name: 'agenticToolUserPrompt',
    system: `You are an AI assistant for AetherOS. Your goal is to help the user by using the available tools.
- Your knowledge of available applications is limited to the following app IDs: ${APPS.map(app => `"${app.id}"`).join(', ')}.
- If the user asks to open an app, use the 'openApp' tool. You must infer the correct 'appId' from the user's prompt and the available app IDs. For example, if the user says "open the code editor", the appId is "code-editor".
- If the user's query implies searching for a file (e.g., "find," "look for," "where is"), use the 'searchFiles' tool.
- If the user asks what apps are currently open, use the 'getOpenApps' tool to get the list and then formulate a text response based on its output.
- If the user asks to arrange, tile, or organize their windows, use the 'arrangeWindows' tool.
- For any other query, do not use a tool and instead provide a helpful text response.`,
    tools: [getOpenAppsTool, openAppTool, arrangeWindowsTool, searchFilesTool],
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
            ai.defineTool({
                name: 'searchFiles',
                description: 'Searches for files based on a semantic/natural language query.',
                inputSchema: SearchFilesInputSchema,
                outputSchema: z.object({ results: z.array(z.string()) }),
              },
              // The real implementation calls our existing semanticFileSearch flow
              async ({ query }) => semanticFileSearch({ query, availableFiles: context.allFiles })
            ),
            openAppTool,
            arrangeWindowsTool
        ]
    });
    
    return llmResponse;
}
