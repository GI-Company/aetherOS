'use server';

/**
 * @fileOverview A flow for generating simulated web page content from a topic or URL.
 *
 * - generateWebPageContent - A function that takes a topic and generates HTML content.
 * - GenerateWebPageContentInput - The input type for the generateWebPageContent function.
 * - GenerateWebPageContentOutput - The return type for the generateWebPageContent function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';

const GenerateWebPageContentInputSchema = z.object({
  topic: z.string().describe('The topic or URL to generate a web page about.'),
});
export type GenerateWebPageContentInput = z.infer<typeof GenerateWebPageContentInputSchema>;

const GenerateWebPageContentOutputSchema = z.object({
  htmlContent: z.string().describe('The generated HTML body content for the web page.'),
});
export type GenerateWebPageContentOutput = z.infer<typeof GenerateWebPageContentOutputSchema>;

export async function generateWebPageContent(input: GenerateWebPageContentInput): Promise<GenerateWebPageContentOutput> {
  return generateWebPageContentFlow(input);
}

const generateWebPageContentPrompt = ai.definePrompt({
  name: 'generateWebPageContentPrompt',
  input: { schema: GenerateWebPageContentInputSchema },
  output: { schema: GenerateWebPageContentOutputSchema },
  prompt: `You are an AI that functions as a web page content synthesizer for a simulated browser.
Your task is to generate the HTML body content for a given topic or URL.
The user is not browsing the real internet; you are creating the content they see.

- The HTML should be well-structured and semantic.
- Use Tailwind CSS classes for styling (e.g., 'text-2xl', 'font-bold', 'p-4', 'bg-card', 'rounded-lg').
- Do NOT include <html>, <head>, or <body> tags. Return only the content that would go inside the <body> tag.
- Keep the content concise and focused on the topic. A few paragraphs and maybe a list is sufficient.
- Do NOT use any <script> tags or inline JavaScript.

Topic: {{{topic}}}
`,
});


const generateWebPageContentFlow = ai.defineFlow(
  {
    name: 'generateWebPageContentFlow',
    inputSchema: GenerateWebPageContentInputSchema,
    outputSchema: GenerateWebPageContentOutputSchema,
  },
  async ({ topic }) => {
    const { output } = await generateWebPageContentPrompt({ topic });
    return output!;
  }
);
