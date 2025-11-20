export type User = {
  id: string;
  name: string;
  avatarUrl: string;
  avatarHint: string;
  location: {
    lat: number;
    lng: number;
  };
  status: 'moving' | 'delayed' | 'arrived';
  eta: number; // in minutes
  transport: 'car' | 'bus' | 'train' | 'bike';
};

export type Message = {
  id: string;
  userId: string;
  text: string;
  timestamp: string;
};

export type MeetingPoint = {
  name: string;
  reason: string;
  location?: {
    lat: number;
    lng: number;
  };
};
