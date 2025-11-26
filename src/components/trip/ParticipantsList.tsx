'use client';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { Clock } from 'lucide-react';

export type Participant = {
  id: string;
  name: string;
  avatarUrl: string;
  mode: string;
  eta: string;
  status: 'On the way' | 'Reached' | 'Delayed';
  location?: { lat: number; lng: number; };
  coords?: { lat: number, lon: number };
};

const statusColors = {
  'On the way': 'bg-blue-100 text-blue-800',
  'Reached': 'bg-green-100 text-green-800',
  'Delayed': 'bg-yellow-100 text-yellow-800',
};

export function ParticipantsList({ participants }: { participants: Participant[] }) {
  return (
    <>
      <CardHeader>
        <CardTitle>Participants Status</CardTitle>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-48">
          <div className="space-y-4">
            {participants.map((p) => (
              <div key={p.id} className="flex items-center gap-4">
                <Avatar className="h-10 w-10">
                  <AvatarImage src={p.avatarUrl} />
                  <AvatarFallback>{p.name.charAt(0)}</AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <p className="font-semibold">{p.name}</p>
                  <p className="text-sm text-muted-foreground capitalize">{p.mode}</p>
                </div>
                <div className="text-right">
                  <Badge className={cn("text-xs", p.status ? statusColors[p.status] : 'bg-gray-100 text-gray-800')}>
                    {p.status || '...'}
                  </Badge>
                  <p className="text-sm font-medium flex items-center justify-end gap-1 mt-1">
                    <Clock className="h-3 w-3" />
                    {p.eta}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
      </CardContent>
    </>
  );
}
