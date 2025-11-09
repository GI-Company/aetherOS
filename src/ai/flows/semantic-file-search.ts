'use server';

/**
 * @fileOverview Implements semantic file search using natural language queries.
 * 
 * - semanticFileSearch - A function that searches for files based on a natural language query.
 * - SemanticFileSearchInput - The input type for the semanticFileSearch function.
 * - SemanticFileSearchOutput - The return type for the semanticFileSearch function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const SemanticFileSearchInputSchema = z.object({
  query: z.string().describe('The natural language query to search for files.'),
});
export type SemanticFileSearchInput = z.infer<
  typeof SemanticFileSearchInputSchema
>;

const SemanticFileSearchOutputSchema = z.object({
  results: z
    .array(z.string())
    .describe('A list of file paths that match the query.'),
});
export type SemanticFileSearchOutput = z.infer<
  typeof SemanticFileSearchOutputSchema
>;

export async function semanticFileSearch(
  input: SemanticFileSearchInput
): Promise<SemanticFileSearchOutput> {
  return semanticFileSearchFlow(input);
}

const prompt = ai.definePrompt({
  name: 'semanticFileSearchPrompt',
  input: {schema: SemanticFileSearchInputSchema},
  output: {schema: SemanticFileSearchOutputSchema},
  prompt: `You are an AI file system assistant. Your job is to help users find files based on a natural language query.

  Based on the user's query, return a list of file paths that are most relevant.

  Query: {{{query}}}
  `,
});

const semanticFileSearchFlow = ai.defineFlow(
  {
    name: 'semanticFileSearchFlow',
    inputSchema: SemanticFileSearchInputSchema,
    outputSchema: SemanticFileSearchOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
