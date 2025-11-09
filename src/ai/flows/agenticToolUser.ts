'use server';
/**
 * @fileOverview An agentic AI flow that can use tools to interact with the OS.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';
import { APPS } from '@/lib/apps';

// Define the schema for the tools' inputs and outputs
const GetOpenAppsOutputSchema = z.object({
  apps: z.array(z.string()).describe('A list of the names of the currently open applications.'),
});

const OpenAppInputSchema = z.object({
  appId: z.string().describe('The unique ID of the app to open. e.g., "code-editor", "browser"'),
});


const getOpenAppsTool = ai.defineTool(
    {
      name: 'getOpenApps',
      description: 'Get the list of currently open applications.',
      outputSchema: GetOpenAppsOutputSchema,
    },
    // This function is a placeholder. The actual implementation is on the client
    // which provides the context of open apps. This tool is for the LLM's benefit.
    async () => {
      // This is a mock implementation for the tool definition.
      // The actual open app list is provided by the client.
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

const agenticToolUserPrompt = ai.definePrompt({
    name: 'agenticToolUserPrompt',
    system: `You are an AI assistant for AetherOS. Your goal is to help the user by using the available tools.
- Your knowledge of available applications is limited to the following app IDs: ${APPS.map(app => `"${app.id}"`).join(', ')}.
- If the user asks to open an app, use the 'openApp' tool. You must infer the correct 'appId' from the user's prompt and the available app IDs. For example, if the user says "open the code editor", the appId is "code-editor".
- If the user asks what apps are currently open, use the 'getOpenApps' tool.
- For any other query, do not use a tool and instead provide a helpful text response.`,
    tools: [getOpenAppsTool, openAppTool],
});


// This is the main function that will be called from the UI.
// It acts as a wrapper around the Genkit flow.
export async function agenticToolUser(
  input: string,
  openApps: string[]
) {
    const getOpenAppsToolWithContext = ai.defineTool(
    {
        name: 'getOpenApps',
        description: 'Get the list of currently open applications.',
        outputSchema: GetOpenAppsOutputSchema,
    },
    async () => ({ apps: openApps })
    );

    const llmResponse = await agenticToolUserPrompt(input, {
        tools: [getOpenAppsToolWithContext, openAppTool]
    });
    
    return llmResponse;
}
