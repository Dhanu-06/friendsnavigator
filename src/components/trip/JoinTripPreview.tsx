
'use client';

import React, { useState } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Loader2, Users, Calendar, MapPin, CheckCircle } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import type { Trip } from '@/lib/tripStore';

type JoinTripPreviewProps = {
  fetchTripByCode: (code: string) => Promise<Trip | null>;
  joinTrip: (
    tripId: string,
    user: { id: string; name: string; avatarUrl?: string }
  ) => Promise<void>;
  onJoinSuccess: (tripId: string) => void;
  currentUser: { uid: string; name: string; email: string; };
};

export default function JoinTripPreview({
  fetchTripByCode,
  joinTrip,
  onJoinSuccess,
  currentUser,
}: JoinTripPreviewProps) {
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [trip, setTrip] = useState<Trip | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [joining, setJoining] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  async function handleLookup(e?: React.FormEvent) {
    if (e) e.preventDefault();
    setError(null);
    setTrip(null);
    setSuccessMsg(null);

    const trimmed = code.trim();
    if (!trimmed) {
      setError('Please enter a trip code.');
      return;
    }

    setLoading(true);
    try {
      const found = await fetchTripByCode(trimmed);
      if (!found) {
        setError('No trip found for that code. Please check the code and try again.');
        setTrip(null);
      } else {
        setTrip(found);
      }
    } catch (err: any) {
      console.error('lookup error', err);
      setError('Failed to look up trip. Please try again later.');
    } finally {
      setLoading(false);
    }
  }

  async function handleJoin() {
    if (!trip || !trip.id) return;
    setJoining(true);
    setError(null);
    try {
      const userToJoin = {
        id: currentUser.uid,
        name: currentUser.name,
        avatarUrl: `https://i.pravatar.cc/150?u=${currentUser.uid}`,
      };
      await joinTrip(trip.id, userToJoin);
      setSuccessMsg('Joined trip successfully! Redirecting...');
      setTimeout(() => onJoinSuccess(trip.id!), 1000);
    } catch (err: any) {
      console.error('join error', err);
      setError(err?.message || 'Failed to join the trip.');
    } finally {
      setJoining(false);
    }
  }

  const resetState = () => {
    setTrip(null);
    setCode('');
    setError(null);
    setSuccessMsg(null);
  }

  if (trip) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{trip.name}</CardTitle>
          <CardDescription>
            You are about to join this trip. Please review the details below.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
           <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <MapPin className="h-4 w-4" />
              <span>{trip.destination?.name}</span>
            </div>
           <div className="flex items-center gap-4 text-sm text-muted-foreground">
             <Calendar className="h-4 w-4" />
              <span>Created on {new Date(trip.createdAt!).toLocaleDateString()}</span>
            </div>

          <div className="space-y-2">
            <h4 className="font-semibold flex items-center gap-2">
              <Users className="h-5 w-5 text-primary" />
              Participants ({trip.participants?.length ?? 0})
            </h4>
            <div className="flex flex-wrap gap-4">
              {(trip.participants || []).map((p) => (
                <div key={p.id} className="flex items-center gap-2">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={p.avatarUrl} alt={p.name} />
                    <AvatarFallback>{p.name?.[0]?.toUpperCase()}</AvatarFallback>
                  </Avatar>
                  <span className="text-sm font-medium">{p.name}</span>
                </div>
              ))}
            </div>
          </div>
           {successMsg && (
            <Alert variant="default" className='border-green-500 text-green-700'>
                <CheckCircle className="h-4 w-4 !text-green-700" />
                <AlertTitle>Success!</AlertTitle>
                <AlertDescription>{successMsg}</AlertDescription>
            </Alert>
           )}
        </CardContent>
        <CardFooter className="flex justify-end gap-2">
          <Button variant="outline" onClick={resetState} disabled={joining}>
            Cancel
          </Button>
          <Button onClick={handleJoin} disabled={joining}>
            {joining && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Confirm & Join
          </Button>
        </CardFooter>
      </Card>
    );
  }

  return (
      <Card>
        <form onSubmit={handleLookup}>
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <Users className="text-primary" /> Join an Existing Trip
                </CardTitle>
                <CardDescription>
                    Enter a trip code to look up and join your friends.
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                <Input 
                    name="tripCode" 
                    placeholder="e.g., FRIEND-1234" 
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                />
                 {error && (
                    <Alert variant="destructive">
                        <AlertTitle>Error</AlertTitle>
                        <AlertDescription>{error}</AlertDescription>
                    </Alert>
                )}
            </CardContent>
            <CardFooter>
                <Button type="submit" disabled={loading}>
                    {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Lookup Trip
                </Button>
            </CardFooter>
        </form>
    </Card>
  );
}
