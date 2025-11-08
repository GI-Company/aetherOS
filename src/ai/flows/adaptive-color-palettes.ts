'use server';
/**
 * @fileOverview Dynamically adjusts the UI color palette based on the dominant content or active application.
 *
 * - generateAdaptivePalette - A function that generates an adaptive color palette.
 * - AdaptivePaletteInput - The input type for the generateAdaptivePalette function.
 * - AdaptivePaletteOutput - The return type for the generateAdaptivePalette function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const AdaptivePaletteInputSchema = z.object({
  contentDescription: z
    .string()
    .describe(
      'A description of the dominant content or active application.  Be as descriptive as possible, including describing prominent colors.'
    ),
});
export type AdaptivePaletteInput = z.infer<typeof AdaptivePaletteInputSchema>;

const AdaptivePaletteOutputSchema = z.object({
  palette: z
    .object({
      primaryColor: z.string().describe('The primary color of the palette in hex format.'),
      secondaryColor: z.string().describe('The secondary color of the palette in hex format.'),
      backgroundColor: z.string().describe('The background color of the palette in hex format.'),
      textColor: z.string().describe('The text color of the palette in hex format.'),
      accentColor: z.string().describe('The accent color of the palette in hex format.'),
    })
    .describe('The generated color palette.'),
});
export type AdaptivePaletteOutput = z.infer<typeof AdaptivePaletteOutputSchema>;

export async function generateAdaptivePalette(
  input: AdaptivePaletteInput
): Promise<AdaptivePaletteOutput> {
  return adaptivePaletteFlow(input);
}

const adaptivePalettePrompt = ai.definePrompt({
  name: 'adaptivePalettePrompt',
  input: {schema: AdaptivePaletteInputSchema},
  output: {schema: AdaptivePaletteOutputSchema},
  prompt: `You are a UI/UX design expert and color palette specialist. You will generate a color palette based on the description of the dominant content or active application provided.

Description: {{{contentDescription}}}

Ensure the colors are visually appealing and harmonious and that the text color is readable against the background color. Provide colors as hex codes.

Return a JSON object with the following structure:
{
  "palette": {
    "primaryColor": "#RRGGBB",
    "secondaryColor": "#RRGGBB",
    "backgroundColor": "#RRGGBB",
    "textColor": "#RRGGBB",
    "accentColor": "#RRGGBB"
  }
}`,
});

const adaptivePaletteFlow = ai.defineFlow(
  {
    name: 'adaptivePaletteFlow',
    inputSchema: AdaptivePaletteInputSchema,
    outputSchema: AdaptivePaletteOutputSchema,
  },
  async input => {
    const {output} = await adaptivePalettePrompt(input);
    return output!;
  }
);
