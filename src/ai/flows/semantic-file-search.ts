'use server';
/**
 * @fileOverview A semantic file search AI agent.
 *
 * - semanticFileSearch: Finds files based on a natural language query.
 * - SemanticFileSearchInput: Input for the search function.
 * - SemanticFileSearchOutput: Output for the search function.
 */
import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const SearchResultSchema = z.object({
  path: z.string().describe('The full path to the file or folder.'),
  type: z.enum(['file', 'folder']).describe('Whether the result is a file or a folder.'),
});

export const SemanticFileSearchInputSchema = z.object({
  query: z.string().describe("The user's natural language search query."),
  availableFiles: z.array(z.string()).describe('A list of all available file and folder paths.'),
});

export const SemanticFileSearchOutputSchema = z.object({
  results: z
    .array(SearchResultSchema)
    .describe('An array of file or folder paths that best match the query.'),
});

export type SemanticFileSearchInput = z.infer<typeof SemanticFileSearchInputSchema>;
export type SemanticFileSearchOutput = z.infer<typeof SemanticFileSearchOutputSchema>;

export async function semanticFileSearch(input: SemanticFileSearchInput): Promise<SemanticFileSearchOutput> {
  return semanticFileSearchFlow(input);
}

const searchPrompt = ai.definePrompt({
    name: 'semanticFileSearchPrompt',
    input: { schema: SemanticFileSearchInputSchema },
    output: { schema: SemanticFileSearchOutputSchema },
    prompt: `You are a semantic file search engine. Given a user's query and a list of available file paths, identify the most relevant files.

- Analyze the user's query for intent, keywords, file types, and potential date references (like "yesterday" or "last week").
- Match this against the provided file paths.
- If no files seem relevant, return an empty 'results' array.
- Do not include files in the result that are not in the provided 'availableFiles' list.
- Prioritize accuracy. It is better to return fewer, more relevant results than many irrelevant ones.

User Query: {{{query}}}
Available Files:
{{{json availableFiles}}}
`,
});

const semanticFileSearchFlow = ai.defineFlow(
    {
        name: 'semanticFileSearchFlow',
        inputSchema: SemanticFileSearchInputSchema,
        outputSchema: SemanticFileSearchOutputSchema,
    },
    async (input) => {
        const { output } = await searchPrompt(input);
        return output!;
    }
);

    