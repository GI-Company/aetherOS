
'use server';
/**
 * @fileOverview An agentic AI flow that can use tools to interact with the OS.
 */

import { generateAppWorkflow, type GenerateAppWorkflowOutput } from './generate-app-workflow';
import { TOOLS } from '@/lib/tools';
import { generateText } from './generate-text';
import { z } from 'zod';

const AgenticToolUserInputSchema = z.string();
export type AgenticToolUserInput = z.infer<typeof AgenticToolUserInputSchema>;

const AgenticToolUserOutputSchema = z.object({
    isWorkflow: z.boolean(),
    dispatchedEvents: z.array(z.any()).optional(),
    conversationalResponse: z.string().optional(),
});
export type AgenticToolUserOutput = z.infer<typeof AgenticToolUserOutputSchema>;


// This is the main function that will be called from the UI.
// It acts as a wrapper around the Genkit flow.
export async function agenticToolUser(
  input: AgenticToolUserInput
): Promise<AgenticToolUserOutput> {
    // 1. First, always generate a workflow plan based on the user's request.
    const workflow = await generateAppWorkflow(input);

    // 2. If there are steps, execute them.
    if (workflow.steps.length > 0) {
        let stepResult: any = {}; // To store and pipe results between steps
        const dispatchedEvents: any[] = [];

        for (const step of workflow.steps) {
            const tool = TOOLS[step.toolId];
            if (!tool) {
                throw new Error(`Tool with ID '${step.toolId}' not found.`);
            }

            // Create a placeholder context; tools now return events instead of calling functions.
            const toolContext = {}; 

            // Replace placeholders like '{{result.imageUrl}}' with actual results from the previous step.
            let toolInput = {...(step.inputs || {})};
            for (const key in toolInput) {
                if (typeof toolInput[key] === 'string' && toolInput[key].startsWith('{{') && toolInput[key].endsWith('}}')) {
                    const propName = toolInput[key].replace('{{result.', '').replace('}}', '');
                    if (stepResult[propName]) {
                        toolInput[key] = stepResult[propName];
                    }
                }
            }

            // Execute the tool and merge the result for the next step.
            const executionResult = await tool.execute(toolContext, toolInput);
            
            if (executionResult.dispatchedEvent) {
                dispatchedEvents.push(executionResult);
            }

            // Merge results for piping. If the tool returns an object with properties, they become available.
            if (typeof executionResult === 'object' && executionResult !== null) {
                stepResult = { ...stepResult, ...executionResult };
            }
        }
        
        return { isWorkflow: true, dispatchedEvents };

    } else {
        // 3. If no steps, it's a conversational response.
        const response = await generateText({ prompt: input });
        return { isWorkflow: false, conversationalResponse: response.text };
    }
}
