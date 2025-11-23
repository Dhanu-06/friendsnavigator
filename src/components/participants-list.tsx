'use client';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import type { User } from '@/lib/types';
import { ScrollArea } from './ui/scroll-area';

type ParticipantsListProps = {
  participants: User[];
  isLoading: boolean;
};

export function ParticipantsList({ participants, isLoading }: ParticipantsListProps) {
  
  const renderSkeleton = () => (
    <div className="space-y-4">
      {[...Array(3)].map((_, i) => (
         <div key={i} className="flex items-center gap-4">
            <Skeleton className="h-10 w-10 rounded-full" />
            <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-3 w-32" />
            </div>
        </div>
      ))}
    </div>
  );

  return (
    <div className="flex flex-col flex-1 min-h-0">
      <h3 className="font-semibold text-lg mb-4">Participants ({participants.length})</h3>
      <ScrollArea className="flex-1 pr-4 -mr-4">
        {isLoading ? renderSkeleton() : (
            <div className="space-y-4">
            {participants.map((user) => (
                <div key={user.id} className="flex items-center gap-4">
                <Avatar>
                    <AvatarImage src={user.avatarUrl || ''} alt={user.name || ''} />
                    <AvatarFallback>{user.name?.charAt(0)}</AvatarFallback>
                </Avatar>
                <div className="flex-1">
                    <p className="font-medium">{user.name}</p>
                    <p className="text-sm text-muted-foreground">{user.email}</p>
                </div>
                </div>
            ))}
            </div>
        )}
      </ScrollArea>
    </div>
  );
}
