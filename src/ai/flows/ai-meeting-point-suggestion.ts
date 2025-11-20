'use server';

/**
 * @fileOverview This file implements the AI meeting point suggestion flow.
 *
 * - suggestMeetingPoint - An AI function that suggests the best meeting point for a group of users, considering their locations and nearby places.
 * - SuggestMeetingPointInput - The input type for the suggestMeetingPoint function.
 * - SuggestMeetingPointOutput - The return type for the suggestMeetingPoint function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const SuggestMeetingPointInputSchema = z.object({
  locations: z
    .array(
      z.object({
        latitude: z.number().describe('Latitude of the user'),
        longitude: z.number().describe('Longitude of the user'),
      })
    )
    .describe('List of user locations (latitude and longitude).'),
  nearbyPlaces: z.string().describe('List of nearby places to consider.'),
});

export type SuggestMeetingPointInput = z.infer<typeof SuggestMeetingPointInputSchema>;

const SuggestMeetingPointOutputSchema = z.object({
  meetingPoint: z.string().describe('The suggested meeting point.'),
  reason: z.string().describe('The reason for suggesting this meeting point.'),
});

export type SuggestMeetingPointOutput = z.infer<typeof SuggestMeetingPointOutputSchema>;

export async function suggestMeetingPoint(input: SuggestMeetingPointInput): Promise<SuggestMeetingPointOutput> {
  return suggestMeetingPointFlow(input);
}

const prompt = ai.definePrompt({
  name: 'suggestMeetingPointPrompt',
  input: {schema: SuggestMeetingPointInputSchema},
  output: {schema: SuggestMeetingPointOutputSchema},
  prompt: `You are a meeting point suggestion expert.
Given the following user locations and nearby places, suggest the best meeting point and explain your reasoning.

User Locations:
{{#each locations}}
- Latitude: {{this.latitude}}, Longitude: {{this.longitude}}
{{/each}}

Nearby Places: {{{nearbyPlaces}}}

Suggest a meeting point and explain why it's the best option, considering the locations of the users and nearby places.`,
});

const suggestMeetingPointFlow = ai.defineFlow(
  {
    name: 'suggestMeetingPointFlow',
    inputSchema: SuggestMeetingPointInputSchema,
    outputSchema: SuggestMeetingPointOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
