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
import { useUser } from '@/firebase';
import { useToast } from '@/hooks/use-toast';
import { Loader, Building, Mountain } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { cn } from '@/lib/utils';

type CreateTripDialogProps = {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
};

export function CreateTripDialog({ isOpen, onOpenChange }: CreateTripDialogProps) {
  const [name, setName] = useState('');
  const [destination, setDestination] = useState('');
  const [description, setDescription] = useState('');
  const [tripType, setTripType] = useState<'within-city' | 'out-of-city' | undefined>();
  const [isCreating, setCreating] = useState(false);

  const { user } = useUser();
  const { toast } = useToast();
  const router = useRouter();

  const resetForm = () => {
    setName('');
    setDestination('');
    setDescription('');
    setTripType(undefined);
  }

  const handleCreateTrip = async () => {
    if (!user || !name || !destination) {
      toast({
        title: 'Missing Information',
        description: 'Please fill out the trip name and destination.',
        variant: 'destructive',
      });
      return;
    }
    if (!tripType) {
        toast({
          title: 'Missing Information',
          description: 'Please select a trip type.',
          variant: 'destructive',
        });
        return;
    }

    setCreating(true);
    
    // SIMULATE trip creation
    setTimeout(() => {
        const newTripId = `demo-${Date.now()}`;
        
        toast({
          title: 'Trip Created! (DEMO)',
          description: `Your trip "${name}" has been created.`,
        });

        setCreating(false);
        onOpenChange(false);
        resetForm();
        
        // Redirect to a known dummy trip page for the demo
        router.push(`/trips/FIzR2fiP2UtwPQ2GNXVb`);
    }, 1000);
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => {
        if (!open) resetForm();
        onOpenChange(open);
    }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Create a New Trip</DialogTitle>
          <DialogDescription>
            Plan your next adventure. Fill in the details below to get started.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-6 py-4">
            <div>
                <Label className="mb-3 block">Trip Type</Label>
                <RadioGroup
                    value={tripType}
                    onValueChange={(value: 'within-city' | 'out-of-city') => setTripType(value)}
                    className="grid grid-cols-2 gap-4"
                >
                    <Label
                        htmlFor="within-city"
                        className={cn(
                        "flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground cursor-pointer",
                        tripType === 'within-city' && "border-primary"
                        )}
                    >
                        <RadioGroupItem value="within-city" id="within-city" className="sr-only" />
                        <Building className="mb-3 h-6 w-6" />
                        Within City
                        <span className="text-xs text-muted-foreground mt-1 text-center">Quick city trips, meetups, and local events.</span>
                    </Label>
                    <Label
                        htmlFor="out-of-city"
                        className={cn(
                        "flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground cursor-pointer",
                        tripType === 'out-of-city' && "border-primary"
                        )}
                    >
                        <RadioGroupItem value="out-of-city" id="out-of-city" className="sr-only" />
                        <Mountain className="mb-3 h-6 w-6" />
                        Out of City
                         <span className="text-xs text-muted-foreground mt-1 text-center">Road trips, weekend getaways, and long-distance travel.</span>
                    </Label>
                </RadioGroup>
            </div>
            
            <div className="grid gap-2">
                <Label htmlFor="name">Trip Name</Label>
                <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g., Weekend Getaway"
                />
            </div>
            <div className="grid gap-2">
                <Label htmlFor="destination">Destination</Label>
                <Input
                id="destination"
                value={destination}
                onChange={(e) => setDestination(e.target.value)}
                placeholder="e.g., Orion Mall"
                />
            </div>
            <div className="grid gap-2">
                <Label htmlFor="description">Description (Optional)</Label>
                <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="What's the plan?"
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
