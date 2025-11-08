'use server';

/**
 * @fileOverview A UI component generation AI agent.
 *
 * - generateUiFromPrompt - A function that generates UI components from a prompt.
 * - GenerateUiFromPromptInput - The input type for the generateUiFromPrompt function.
 * - GenerateUiFromPromptOutput - The return type for the generateUiFromPrompt function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'zod';

const GenerateUiFromPromptInputSchema = z.object({
  prompt: z.string().describe('A prompt describing the UI component to generate.'),
});
export type GenerateUiFromPromptInput = z.infer<typeof GenerateUiFromPromptInputSchema>;

const GenerateUiFromPromptOutputSchema = z.object({
  uiComponentCode: z.string().describe('The generated code for the UI component.'),
});
export type GenerateUiFromPromptOutput = z.infer<typeof GenerateUiFromPromptOutputSchema>;

export async function generateUiFromPrompt(input: GenerateUiFromPromptInput): Promise<GenerateUiFromPromptOutput> {
  return generateUiFromPromptFlow(input);
}

const prompt = ai.definePrompt({
  name: 'generateUiFromPromptPrompt',
  input: {schema: GenerateUiFromPromptInputSchema},
  output: {schema: GenerateUiFromPromptOutputSchema},
  prompt: `You are a UI component code generator. Generate code for the UI component described in the prompt. Enclose the code in a code block.\n\nPrompt: {{{prompt}}}`,
});

const generateUiFromPromptFlow = ai.defineFlow(
  {
    name: 'generateUiFromPromptFlow',
    inputSchema: GenerateUiFromPromptInputSchema,
    outputSchema: GenerateUiFromPromptOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
