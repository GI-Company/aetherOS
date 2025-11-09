'use server';
/**
 * @fileOverview An agentic AI flow that can use tools to interact with the OS.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';
import { APPS } from '@/lib/apps';

// Define the schema for the tools' inputs and outputs
const GetOpenAppsInputSchema = z.object({
  openAppNames: z.array(z.string()).describe('The names of the currently open applications.'),
});

const OpenAppInputSchema = z.object({
  appId: z.string().describe(`The unique ID of the app to open. Must be one of: ${APPS.map(app => `"${app.id}"`).join(', ')}`),
});

const ArrangeWindowsInputSchema = z.object({});


const getOpenAppsTool = ai.defineTool(
    {
      name: 'getOpenApps',
      description: 'Get the list of currently open applications.',
      inputSchema: GetOpenAppsInputSchema,
      outputSchema: z.object({ apps: z.array(z.string()) }),
    },
    async ({ openAppNames }) => {
      return { apps: openAppNames };
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

const agenticToolUserPrompt = ai.definePrompt({
    name: 'agenticToolUserPrompt',
    system: `You are an AI assistant for AetherOS. Your goal is to help the user by using the available tools.
- Your knowledge of available applications is limited to the following app IDs: ${APPS.map(app => `"${app.id}"`).join(', ')}.
- If the user asks to open an app, use the 'openApp' tool. You must infer the correct 'appId' from the user's prompt and the available app IDs. For example, if the user says "open the code editor", the appId is "code-editor".
- If the user asks what apps are currently open, use the 'getOpenApps' tool to get the list and then formulate a text response based on its output.
- If the user asks to arrange, tile, or organize their windows, use the 'arrangeWindows' tool.
- For any other query, do not use a tool and instead provide a helpful text response.`,
    tools: [getOpenAppsTool, openAppTool, arrangeWindowsTool],
});


// This is the main function that will be called from the UI.
// It acts as a wrapper around the Genkit flow.
export async function agenticToolUser(
  input: string,
  openApps: string[]
) {
    const llmResponse = await agenticToolUserPrompt(input, {
        tools: [
            ai.defineTool({
                name: 'getOpenApps',
                description: 'Get the list of currently open applications.',
                inputSchema: z.object({}), // Input is empty as client provides context.
                outputSchema: z.object({ apps: z.array(z.string()) }),
              },
              async () => ({ apps: openApps })
            ),
            openAppTool,
            arrangeWindowsTool
        ]
    });
    
    return llmResponse;
}
