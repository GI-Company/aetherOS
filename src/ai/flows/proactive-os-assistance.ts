'use server';

/**
 * @fileOverview This file defines a Genkit flow for providing proactive OS assistance based on user activity and context.
 *
 * - proactiveOsAssistance - A function that triggers the proactive assistance flow.
 * - ProactiveOsAssistanceInput - The input type for the proactiveOsAssistance function.
 * - ProactiveOsAssistanceOutput - The return type for the proactiveOsAssistance function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const ProactiveOsAssistanceInputSchema = z.object({
  userActivity: z.string().describe('A description of the user\'s current activity.'),
  context: z.string().describe('Additional context about the user\'s environment and tasks.'),
});
export type ProactiveOsAssistanceInput = z.infer<typeof ProactiveOsAssistanceInputSchema>;

const ProactiveOsAssistanceOutputSchema = z.object({
  suggestion: z.string().describe('A proactive suggestion for the user.'),
  reason: z.string().describe('The reasoning behind the suggestion.'),
});
export type ProactiveOsAssistanceOutput = z.infer<typeof ProactiveOsAssistanceOutputSchema>;

export async function proactiveOsAssistance(input: ProactiveOsAssistanceInput): Promise<ProactiveOsAssistanceOutput> {
  return proactiveOsAssistanceFlow(input);
}

const proactiveOsAssistancePrompt = ai.definePrompt({
  name: 'proactiveOsAssistancePrompt',
  input: {schema: ProactiveOsAssistanceInputSchema},
  output: {schema: ProactiveOsAssistanceOutputSchema},
  prompt: `You are the core intelligence of the AetherOS, responsible for proactively assisting the user to improve their efficiency and productivity.\n
  Based on the user's current activity and context, provide a single, actionable suggestion, and briefly explain your reasoning.\n
  Activity: {{{userActivity}}}\n  Context: {{{context}}}\n
  Suggestion:`,
});

const proactiveOsAssistanceFlow = ai.defineFlow(
  {
    name: 'proactiveOsAssistanceFlow',
    inputSchema: ProactiveOsAssistanceInputSchema,
    outputSchema: ProactiveOsAssistanceOutputSchema,
  },
  async input => {
    const {output} = await proactiveOsAssistancePrompt(input);
    return output!;
  }
); 