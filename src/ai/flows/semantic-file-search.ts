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
  availableFiles: z.array(z.string()).describe('The list of available file paths to search through.'),
});
export type SemanticFileSearchInput = z.infer<
  typeof SemanticFileSearchInputSchema
>;

const SemanticFileSearchOutputSchema = z.object({
  results: z
    .array(z.string())
    .describe('A list of file paths from the available files that semantically match the query.'),
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
  prompt: `You are an AI file system assistant. Your job is to help users find files by searching through a list of available file paths based on a natural language query.

  Return ONLY the file paths from the provided list that are the most relevant matches for the user's query. If no files are relevant, return an empty array.

  Query: {{{query}}}
  
  Available Files:
  {{#each availableFiles}}
  - {{{this}}}
  {{/each}}
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
