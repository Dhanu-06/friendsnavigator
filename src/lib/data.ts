import type { User, Message } from '@/lib/types';

export const MOCK_USERS: User[] = [
  {
    id: 'user1',
    name: 'Sarah',
    avatarUrl: 'https://picsum.photos/seed/sarah/40/40',
    avatarHint: 'woman portrait',
    location: { lat: 13.02, lng: 77.59 },
    status: 'moving',
    eta: 12,
    transport: 'car',
  },
  {
    id: 'user2',
    name: 'Mike',
    avatarUrl: 'https://picsum.photos/seed/mike/40/40',
    avatarHint: 'man portrait',
    location: { lat: 12.93, lng: 77.63 },
    status: 'delayed',
    eta: 25,
    transport: 'bus',
  },
  {
    id: 'user3',
    name: 'Chloe',
    avatarUrl: 'https://picsum.photos/seed/chloe/40/40',
    avatarHint: 'woman face',
    location: { lat: 12.97, lng: 77.55 },
    status: 'moving',
    eta: 8,
    transport: 'bike',
  },
  {
    id: 'user4',
    name: 'You',
    avatarUrl: 'https://picsum.photos/seed/you/40/40',
    avatarHint: 'person selfie',
    location: { lat: 12.98, lng: 77.64 },
    status: 'moving',
    eta: 18,
    transport: 'car',
  },
];

export const MOCK_MESSAGES: Message[] = [
  {
    id: 'msg1',
    userId: 'user1',
    text: 'I might be a few minutes late, hitting some traffic near MG Road.',
    timestamp: '10:32 AM',
  },
  {
    id: 'msg2',
    userId: 'user2',
    text: "No worries! I'm on the bus, should be there soon.",
    timestamp: '10:33 AM',
  },
  {
    id: 'msg3',
    userId: 'user4',
    text: 'I just parked. Grabbing a coffee at the entrance.',
    timestamp: '10:35 AM',
  },
];

export const MOCK_DESTINATION = {
    name: "Orion Mall",
    location: { lat: 13.0118, lng: 77.5555 }
}
