'use client';

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useUser, useFirestore, addDocumentNonBlocking } from '@/firebase';
import { collection } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import type { Trip } from '@/lib/types';
import { Loader } from 'lucide-react';
import { useRouter } from 'next/navigation';

type CreateTripDialogProps = {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
};

export function CreateTripDialog({ isOpen, onOpenChange }: CreateTripDialogProps) {
  const [name, setName] = useState('');
  const [destination, setDestination] = useState('');
  const [description, setDescription] = useState('');
  const [isCreating, setCreating] = useState(false);

  const { user } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();
  const router = useRouter();

  const handleCreateTrip = async () => {
    if (!user || !firestore || !name || !destination) {
      toast({
        title: 'Missing Information',
        description: 'Please fill out the trip name and destination.',
        variant: 'destructive',
      });
      return;
    }

    setCreating(true);
    
    const tripsCol = collection(firestore, 'trips');
    const newTrip: Omit<Trip, 'id'> = {
      name,
      destination,
      description: description || '',
      ownerId: user.uid,
      participantIds: [user.uid],
    };

    // The addDocumentNonBlocking helper will catch permission errors
    // and emit them to the global error listener.
    const docRef = await addDocumentNonBlocking(tripsCol, newTrip);
      
    // This part only runs if the document creation was initiated successfully.
    // The actual write happens in the background.
    if (docRef) {
      toast({
        title: 'Trip Created!',
        description: `Your trip "${name}" has been created.`,
      });

      onOpenChange(false);
      setName('');
      setDestination('');
      setDescription('');
      
      // Navigate to the new trip page
      router.push(`/trips/${docRef.id}`);
    }
    
    // We only set creating to false after we attempt the navigation.
    // If there was an error, the global error overlay would show.
    setCreating(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Create a New Trip</DialogTitle>
          <DialogDescription>
            Plan your next adventure. Fill in the details below to get started.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="name" className="text-right">
              Trip Name
            </Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="col-span-3"
              placeholder="e.g., Weekend Getaway"
            />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="destination" className="text-right">
              Destination
            </Label>
            <Input
              id="destination"
              value={destination}
              onChange={(e) => setDestination(e.target.value)}
              className="col-span-3"
              placeholder="e.g., San Francisco"
            />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="description" className="text-right">
              Description
            </Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="col-span-3"
              placeholder="Optional: What's the plan?"
            />
          </div>
        </div>
        <DialogFooter>
          <Button onClick={handleCreateTrip} disabled={isCreating}>
            {isCreating && <Loader className="mr-2 h-4 w-4 animate-spin" />}
            {isCreating ? 'Creating...' : 'Create Trip'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
