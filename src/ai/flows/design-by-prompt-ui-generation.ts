'use server';
/**
 * @fileOverview A UI element generation AI agent.
 *
 * - designByPromptUiGeneration - A function that generates UI elements from a prompt.
 * - DesignByPromptUiGenerationInput - The input type for the designByPromptUiGeneration function.
 * - DesignByPromptUiGenerationOutput - The return type for the designByPromptUiGeneration function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'zod';

const DesignByPromptUiGenerationInputSchema = z.object({
  prompt: z.string().describe('A prompt describing the UI element to generate.'),
});
export type DesignByPromptUiGenerationInput = z.infer<typeof DesignByPromptUiGenerationInputSchema>;

const DesignByPromptUiGenerationOutputSchema = z.object({
  uiElementCode: z.string().describe('The generated code for the UI element.'),
});
export type DesignByPromptUiGenerationOutput = z.infer<typeof DesignByPromptUiGenerationOutputSchema>;

export async function designByPromptUiGeneration(input: DesignByPromptUiGenerationInput): Promise<DesignByPromptUiGenerationOutput> {
  return designByPromptUiGenerationFlow(input);
}

const prompt = ai.definePrompt({
  name: 'designByPromptUiGenerationPrompt',
  input: {schema: DesignByPromptUiGenerationInputSchema},
  output: {schema: DesignByPromptUiGenerationOutputSchema},
  prompt: `You are a UI element code generator. Generate code for the UI element described in the prompt. Enclose the code in a code block.

Prompt: {{{prompt}}}`,
});

const designByPromptUiGenerationFlow = ai.defineFlow(
  {
    name: 'designByPromptUiGenerationFlow',
    inputSchema: DesignByPromptUiGenerationInputSchema,
    outputSchema: DesignByPromptUiGenerationOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
