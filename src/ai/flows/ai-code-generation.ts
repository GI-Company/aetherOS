'use server';

/**
 * @fileOverview A flow for generating code based on design patterns, architectural style guides, and visual mockups.
 *
 * - aiCodeGeneration - A function that takes a description of the desired code and generates code.
 * - AiCodeGenerationInput - The input type for the aiCodeGeneration function, a description of the desired code.
 * - AiCodeGenerationOutput - The return type for the aiCodeGeneration function, the generated code.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const AiCodeGenerationInputSchema = z.object({
  description: z.string().describe('A description of the desired code, including design patterns, architectural style guides, and visual mockups.'),
});

export type AiCodeGenerationInput = z.infer<typeof AiCodeGenerationInputSchema>;

const AiCodeGenerationOutputSchema = z.object({
  code: z.string().describe('The generated code.'),
});

export type AiCodeGenerationOutput = z.infer<typeof AiCodeGenerationOutputSchema>;

export async function aiCodeGeneration(input: AiCodeGenerationInput): Promise<AiCodeGenerationOutput> {
  return aiCodeGenerationFlow(input);
}

const aiCodeGenerationPrompt = ai.definePrompt({
  name: 'aiCodeGenerationPrompt',
  input: {schema: AiCodeGenerationInputSchema},
  output: {schema: AiCodeGenerationOutputSchema},
  prompt: `You are an AI code generator. Given a description of the desired code, generate the code.

Description: {{{description}}}

Code: `,
});

const aiCodeGenerationFlow = ai.defineFlow(
  {
    name: 'aiCodeGenerationFlow',
    inputSchema: AiCodeGenerationInputSchema,
    outputSchema: AiCodeGenerationOutputSchema,
  },
  async input => {
    const {output} = await aiCodeGenerationPrompt(input);
    return output!;
  }
);
