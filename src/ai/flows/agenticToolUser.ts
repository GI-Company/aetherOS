
'use server';
/**
 * @fileOverview An agentic AI flow that can use tools to interact with the OS.
 */

import { ai } from '@/ai/genkit';
import { generateAppWorkflow, type GenerateAppWorkflowOutput } from './generate-app-workflow';

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
