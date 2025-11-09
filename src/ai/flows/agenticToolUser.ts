'use server';
/**
 * @fileOverview An agentic AI flow that can use tools to interact with the OS.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';

// Define the schema for the tools' inputs and outputs
const GetOpenAppsOutputSchema = z.object({
  apps: z.array(z.string()).describe('A list of the names of the currently open applications.'),
});

const OpenAppInputSchema = z.object({
  appId: z.string().describe('The unique ID of the app to open. e.g., "code-editor", "browser"'),
});

// This is the main function that will be called from the UI.
// It acts as a wrapper around the Genkit flow.
export async function agenticToolUser(
  input: string,
  tools: {
    getOpenApps: () => Promise<z.infer<typeof GetOpenAppsOutputSchema>>;
    openApp: (args: z.infer<typeof OpenAppInputSchema>) => Promise<void>;
  }
) {
  // Dynamically define the tools within the server action context
  const getOpenAppsTool = ai.defineTool(
    {
      name: 'getOpenApps',
      description: 'Get the list of currently open applications.',
      outputSchema: GetOpenAppsOutputSchema,
    },
    async () => tools.getOpenApps()
  );

  const openAppTool = ai.defineTool(
    {
      name: 'openApp',
      description: 'Opens a specific application window.',
      inputSchema: OpenAppInputSchema,
      outputSchema: z.void(),
    },
    async (input) => tools.openApp(input)
  );

  const prompt = ai.definePrompt({
    name: 'agenticToolUserPrompt',
    system: `You are an AI assistant for AetherOS. Your goal is to help the user by using the available tools.
- If the user asks to open an app, use the 'openApp' tool. You must infer the correct 'appId' from the user's prompt. For example, if the user says "open the code editor", the appId is "code-editor".
- If the user asks what apps are currently open, use the 'getOpenApps' tool.
- For any other query, do not use a tool and instead provide a helpful text response.`,
    tools: [getOpenAppsTool, openAppTool],
  });

  const llmResponse = await prompt(input);
  return llmResponse;
}
