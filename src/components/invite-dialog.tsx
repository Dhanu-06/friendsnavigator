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
import { useFirestore } from '@/firebase';
import { collection, query, where, getDocs, doc, updateDoc, arrayUnion } from 'firebase/firestore';
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
  const firestore = useFirestore();
  const { toast } = useToast();

  const handleInvite = async () => {
    if (!email || !firestore) {
      toast({ title: 'Please enter an email address.', variant: 'destructive' });
      return;
    }
    setInviting(true);
    try {
      // 1. Find user by email
      const usersRef = collection(firestore, 'users');
      const q = query(usersRef, where('email', '==', email));
      const querySnapshot = await getDocs(q);

      if (querySnapshot.empty) {
        toast({ title: 'User not found', description: 'No user exists with that email address.', variant: 'destructive' });
        return;
      }

      const userDoc = querySnapshot.docs[0];
      const userId = userDoc.id;

      // 2. Add user to trip's participantIds
      const tripRef = doc(firestore, 'trips', tripId);
      await updateDoc(tripRef, {
        participantIds: arrayUnion(userId)
      });
      
      toast({ title: 'Invitation Sent!', description: `${email} has been added to the trip.` });
      onOpenChange(false);
      setEmail('');

    } catch (error: any) {
      console.error('Error inviting user:', error);
      toast({ title: 'Invitation Failed', description: error.message || 'An unknown error occurred.', variant: 'destructive' });
    } finally {
      setInviting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Invite a Friend</DialogTitle>
          <DialogDescription>
            Enter the email address of the person you want to invite to this trip.
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
