'use client';

import React, { useState } from 'react';
import type { Participant, MeetingPoint } from '@/lib/types';
import { suggestMeetingPoint } from '@/ai/flows/ai-meeting-point-suggestion';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Loader, Sparkles } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Skeleton } from './ui/skeleton';
import { transportIcons } from '@/lib/transport';

type ParticipantsPanelProps = {
  users: Participant[];
  tripType: 'within-city' | 'out-of-city';
  onTripTypeChange: (type: 'within-city' | 'out-of-city') => void;
  onSuggestion: (suggestion: MeetingPoint) => void;
  isLoading: boolean;
};


export function ParticipantsPanel({
  users,
  tripType,
  onTripTypeChange,
  onSuggestion,
  isLoading: isPanelLoading,
}: ParticipantsPanelProps) {
  const [isAISuggesting, setIsAISuggesting] = useState(false);
  const [suggestion, setSuggestion] = useState<MeetingPoint | null>(null);
  const { toast } = useToast();

  const handleSuggestMeetingPoint = async () => {
    setIsAISuggesting(true);
    try {
      const locations = users.map(user => ({
        latitude: user.location.lat,
        longitude: user.location.lng,
      }));
      const nearbyPlaces = "Cafes, parks, and metro stations"; // Example context

      const result = await suggestMeetingPoint({ locations, nearbyPlaces });

      const newSuggestion: MeetingPoint = {
        name: result.meetingPoint,
        reason: result.reason,
      };
      setSuggestion(newSuggestion);
      onSuggestion(newSuggestion); // Pass to parent
    } catch (error) {
      console.error('AI suggestion failed:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to get an AI suggestion. Please try again.',
      });
    } finally {
      setIsAISuggesting(false);
    }
  };

  const getStatusBadge = (status: Participant['status']) => {
    switch (status) {
      case 'moving':
        return <Badge variant="secondary" className="bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300">Moving</Badge>;
      case 'delayed':
        return <Badge variant="destructive" className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-300">Delayed</Badge>;
      case 'arrived':
        return <Badge variant="outline">Arrived</Badge>;
    }
  };

  const renderSkeleton = () => (
    <div className="space-y-4">
      {[...Array(4)].map((_, i) => (
         <div key={i} className="flex items-center gap-4">
            <Skeleton className="h-10 w-10 rounded-full" />
            <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-3 w-32" />
            </div>
            <Skeleton className="h-6 w-16 rounded-full" />
        </div>
      ))}
    </div>
  );
  
  const getTransportIcon = (transport: string) => {
    const Icon = transportIcons[transport];
    return Icon ? <Icon className="h-4 w-4" /> : null;
  }

  return (
    <div className="p-4 space-y-6">
      <Card>
        <CardHeader className="p-4">
          <CardTitle className="text-lg">Trip Settings</CardTitle>
        </CardHeader>
        <CardContent className="p-4 pt-0">
          <div className="flex items-center justify-between">
            <Label htmlFor="trip-type" className="font-medium">
              Trip Type
            </Label>
            <div className="flex items-center gap-2">
              <span className={tripType === 'within-city' ? 'text-primary font-semibold' : 'text-muted-foreground'}>Within City</span>
              <Switch
                id="trip-type"
                checked={tripType === 'out-of-city'}
                onCheckedChange={(checked) => onTripTypeChange(checked ? 'out-of-city' : 'within-city')}
              />
              <span className={tripType === 'out-of-city' ? 'text-primary font-semibold' : 'text-muted-foreground'}>Out of City</span>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="space-y-4">
        <h3 className="font-semibold text-lg">Participants ({users.length})</h3>
        {isPanelLoading ? renderSkeleton() : (
            <div className="space-y-4">
            {users.map((user) => (
                <div key={user.id} className="flex items-center gap-4">
                <Avatar>
                    <AvatarImage src={user.avatarUrl} alt={user.name} data-ai-hint={user.avatarHint} />
                    <AvatarFallback>{user.name.charAt(0)}</AvatarFallback>
                </Avatar>
                <div className="flex-1">
                    <p className="font-medium">{user.name}</p>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    {getTransportIcon(user.transport)}
                    <span>ETA: {user.eta} min</span>
                    </div>
                </div>
                {getStatusBadge(user.status)}
                </div>
            ))}
            </div>
        )}
      </div>
      
      <Separator />

      <Button onClick={handleSuggestMeetingPoint} disabled={isAISuggesting || isPanelLoading} className="w-full bg-primary hover:bg-primary/90">
        {isAISuggesting ? (
          <Loader className="mr-2 h-4 w-4 animate-spin" />
        ) : (
          <Sparkles className="mr-2 h-4 w-4" />
        )}
        AI Suggest Meeting Point
      </Button>

      {suggestion && (
        <AlertDialog open={!!suggestion} onOpenChange={(open) => !open && setSuggestion(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-primary" />
                AI Meeting Suggestion
              </AlertDialogTitle>
              <AlertDialogDescription>
                Based on everyone's location, here's a suggested meeting point.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <div className="my-4 rounded-lg border bg-muted/50 p-4">
              <h4 className="font-semibold text-lg text-primary">{suggestion.name}</h4>
              <p className="mt-2 text-sm text-foreground">{suggestion.reason}</p>
            </div>
            <AlertDialogFooter>
              <AlertDialogCancel>Close</AlertDialogCancel>
              <AlertDialogAction>Show on Map</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </div>
  );
}
