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
import { useToast } from '@/hooks/use-toast';
import { Loader } from 'lucide-react';

type InviteDialogProps = {
  tripId: string;
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
};

export function InviteDialog({ tripId, isOpen, onOpenChange }: InviteDialogProps) {
  const [email, setEmail] = useState('');
  const [isInviting, setInviting] = useState(false);
  const { toast } = useToast();

  const handleInvite = async () => {
    if (!email) {
      toast({ title: 'Please enter an email address.', variant: 'destructive' });
      return;
    }
    setInviting(true);

    // SIMULATE inviting a user
    setTimeout(() => {
      setInviting(false);
      onOpenChange(false);
      setEmail('');
       toast({ title: 'Invitation Sent! (DEMO)', description: `${email} has been added to the trip.` });
    }, 1000);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Invite a Friend</DialogTitle>
          <DialogDescription>
            Enter the email address of the person you want to invite to this trip. They will be added as a participant.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="email" className="text-right">
              Email
            </Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="col-span-3"
              placeholder="friend@example.com"
            />
          </div>
        </div>
        <DialogFooter>
          <Button onClick={handleInvite} disabled={isInviting}>
            {isInviting && <Loader className="mr-2 h-4 w-4 animate-spin" />}
            {isInviting ? 'Inviting...' : 'Send Invite'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
