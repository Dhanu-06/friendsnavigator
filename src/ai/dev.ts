import { config } from 'dotenv';
config();

import { suggestMeetingPoint } from '@/ai/flows/ai-meeting-point-suggestion';

export default {
  flows: [suggestMeetingPoint],
};
