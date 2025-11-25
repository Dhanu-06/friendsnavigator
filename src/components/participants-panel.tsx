'use client';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import type { Participant, TravelMode } from '@/lib/types';
import { ScrollArea } from './ui/scroll-area';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from './ui/accordion';
import { User } from 'firebase/auth';
import { ModeSelector } from './mode-selector';
import { cn } from '@/lib/utils';
import { Car, Bike, TramFront, Bus, PersonStanding, CheckCircle2 } from 'lucide-react';

type ParticipantsPanelProps = {
  participants: Participant[];
  isLoading: boolean;
  currentUser: User | null;
  tripId: string;
  destination: { lat: number, lng: number } | undefined;
  tripType: 'within-city' | 'out-of-city' | undefined;
  onParticipantUpdate: (updatedData: Partial<Participant>) => void;
};

const MODE_ICONS: Record<TravelMode, React.ElementType> = {
    ola: Car,
    uber: Car,
    rapido: Bike,
    metro: TramFront,
    bmtc: Bus,
    walk: PersonStanding,
}

export function ParticipantsPanel({ participants, isLoading, currentUser, tripId, destination, tripType, onParticipantUpdate }: ParticipantsPanelProps) {
  
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

  const myParticipant = participants.find(p => p.id === currentUser?.uid);
  const otherParticipants = participants.filter(p => p.id !== currentUser?.uid);

  const renderParticipant = (p: Participant) => {
    const ModeIcon = p.selectedMode ? MODE_ICONS[p.selectedMode] : null;
    const eta = p.suggestion?.options.find(opt => opt.mode === p.selectedMode)?.etaMinutes;

    return (
        <div key={p.id} className="flex items-center gap-4">
            <Avatar>
                <AvatarImage src={p.avatarUrl || ''} alt={p.name || ''} />
                <AvatarFallback>{p.name?.charAt(0)}</AvatarFallback>
            </Avatar>
            <div className="flex-1">
                <p className="font-medium">{p.name} {p.id === currentUser?.uid && '(You)'}</p>
                {p.selectedMode && ModeIcon && eta !== undefined ? (
                    <p className="text-sm text-muted-foreground flex items-center gap-2">
                        <ModeIcon className="h-4 w-4" /> {eta} mins
                    </p>
                ) : (
                     <p className="text-sm text-muted-foreground">No mode selected</p>
                )}
            </div>
            {p.selectedMode && <CheckCircle2 className="h-5 w-5 text-green-500" />}
        </div>
    );
  }

  if (isLoading) {
    return (
        <div className="flex flex-col flex-1 min-h-0">
            <h3 className="font-semibold text-lg mb-4">Participants ({participants.length})</h3>
            {renderSkeleton()}
        </div>
    );
  }


  return (
    <div className="flex flex-col flex-1 min-h-0">
      {tripType === 'within-city' && myParticipant && (
         <Accordion type="single" collapsible defaultValue="item-1" className="w-full mb-4">
            <AccordionItem value="item-1">
                <AccordionTrigger className={cn("font-semibold text-lg", myParticipant.selectedMode && 'text-green-600')}>
                    {myParticipant.selectedMode ? `You've Selected Your Mode!` : 'Choose Your Travel Mode'}
                </AccordionTrigger>
                <AccordionContent>
                    <ModeSelector 
                        participant={myParticipant}
                        destination={destination}
                        tripId={tripId}
                        onParticipantUpdate={onParticipantUpdate}
                    />
                </AccordionContent>
            </AccordionItem>
        </Accordion>
      )}

      <h3 className="font-semibold text-lg mb-4">Participants ({participants.length})</h3>
      <ScrollArea className="flex-1 pr-4 -mr-4">
        <div className="space-y-4">
            {myParticipant && renderParticipant(myParticipant)}
            {otherParticipants.map(renderParticipant)}
        </div>
      </ScrollArea>
    </div>
  );
}
