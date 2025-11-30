
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { ArrowLeft, ArrowRight, Clipboard, PartyPopper } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { CityModeSelector } from '@/components/create/CityModeSelector';
import { OutstationModeSelector } from '@/components/create/OutstationModeSelector';
import { TripTypeToggle, TripType } from '@/components/create/TripTypeToggle';
import { cn } from '@/lib/utils';
import { saveTrip } from '@/lib/storeAdapter';
import { useUser } from '@/firebase/auth/use-user';
import { openRideProvider } from '@/components/trip/rideLinks';

type TripData = {
  name: string;
  destination: string;
  tripType: TripType;
  mode: string;
};

export default function CreateTripPage() {
  const [step, setStep] = useState(1);
  const [tripData, setTripData] = useState<Partial<TripData>>({
    tripType: 'within-city',
  });
  const [createdTripId, setCreatedTripId] = useState<string | null>(null);
  const router = useRouter();
  const { toast } = useToast();
  const { user } = useUser();

  const updateTripData = (data: Partial<TripData>) => {
    setTripData((prev) => ({ ...prev, ...data }));
  };

  const nextStep = () => setStep((s) => s + 1);
  const prevStep = () => setStep((s) => s - 1);

  const handleCreateTrip = async () => {
    if (!user) {
        toast({ title: 'Error', description: 'You must be logged in to create a trip.', variant: 'destructive' });
        router.push('/auth/login');
        return;
    }

    // A real app would get lat/lng from a geocoding service
    const destination = {
        name: tripData.destination || 'Unknown',
        lat: 13.3702, // Mock Nandi Hills Lat
        lng: 77.6835, // Mock Nandi HIlls Lng
    };

    // Generate tripId on the client to avoid hydration mismatch
    const tripId = `${tripData.name?.substring(0,5).toUpperCase()}-${Math.random().toString(36).slice(2, 6)}`;
    
    const newTrip = {
        id: tripId,
        name: tripData.name!,
        destination: destination,
        tripType: tripData.tripType!,
        participants: [{id: user.uid, name: user.displayName || user.email, avatarUrl: user.photoURL || `https://i.pravatar.cc/150?u=${user.uid}`}],
        messages: [],
        expenses: [],
        createdAt: Date.now(),
    };

    const result = await saveTrip(tripId, newTrip);
    setCreatedTripId(tripId);

    if (result.source === 'local-fallback') {
        toast({
            title: 'Trip Created (Offline)',
            description: 'Your trip was saved locally. It will sync when you are back online.',
        });
    } else {
        toast({
            title: 'Trip Created!',
            description: 'Your trip room is ready.',
        });
    }
    
    // Proceed to the final step to show the trip code
    nextStep();
  };
  
  const goToTripRoom = () => {
      if (createdTripId) {
          router.push(`/trips/${createdTripId}`);
      }
  }

  const copyTripCode = () => {
    if (!createdTripId) return;
    if (typeof window !== 'undefined') {
        navigator.clipboard.writeText(createdTripId);
        toast({
            title: "Copied!",
            description: "Trip code copied to clipboard."
        });
    }
  }

  const progress = ((step - 1) / 3) * 100;

  const getCurrentCoords = async (): Promise<{lat: number, lng: number} | null> => {
    return new Promise((resolve) => {
      if (typeof window === 'undefined' || !navigator.geolocation) return resolve(null);
      navigator.geolocation.getCurrentPosition(
        (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
        () => resolve(null),
        { enableHighAccuracy: true, timeout: 5000 }
      );
    });
  };

  const quickOpenMode = async (mode: string) => {
    const pickup = await getCurrentCoords();
    if (mode === 'rapido') {
      openRideProvider('rapido', pickup || undefined, undefined);
      return;
    }
    if (mode === 'ola') {
      openRideProvider('ola', pickup || undefined, undefined);
      return;
    }
    if (mode === 'uber') {
      openRideProvider('uber', pickup || undefined, undefined);
      return;
    }
    if (mode === 'metro') {
      const url = 'https://www.google.com/maps/search/?api=1&query=metro%20near%20me';
      if (typeof window !== 'undefined') window.open(url, '_blank');
      return;
    }
    if (mode === 'bmtc') {
      const url = 'https://www.google.com/maps/search/?api=1&query=bus%20stop%20near%20me';
      if (typeof window !== 'undefined') window.open(url, '_blank');
      return;
    }
  };
  
  return (
    <div className="flex flex-col min-h-screen items-center justify-center bg-gray-50 dark:bg-gray-900 p-4">
        <div className="w-full max-w-2xl">
            <div className="mb-8 text-center">
                <h1 className="text-3xl font-bold font-heading">Create a New Trip</h1>
                <p className="text-muted-foreground">Let's plan your next adventure in just a few steps.</p>
            </div>
            
            <Card className="relative overflow-x-hidden">
                <CardHeader>
                    <Progress value={progress} className="w-full" />
                </CardHeader>

                <div className="relative">
                    {/* Step 1: Basic Details */}
                    <div className={cn("step-card p-6", step === 1 ? 'active' : 'inactive')}>
                        <CardContent className="space-y-6">
                            <CardTitle>Step 1: Trip Details</CardTitle>
                            <div className="space-y-4">
                                <div className="space-y-2">
                                    <Label htmlFor="trip-name">Trip Name</Label>
                                    <Input id="trip-name" placeholder="e.g., Weekend Getaway to Nandi" value={tripData.name || ''} onChange={(e) => updateTripData({ name: e.target.value })}/>
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="destination">Destination</Label>
                                    <Input id="destination" placeholder="e.g., Nandi Hills" value={tripData.destination || ''} onChange={(e) => updateTripData({ destination: e.target.value })}/>
                                </div>
                            </div>
                        </CardContent>
                         <CardFooter className="flex justify-end">
                            <Button onClick={nextStep} disabled={!tripData.name || !tripData.destination}>Next <ArrowRight className="ml-2 h-4 w-4"/></Button>
                        </CardFooter>
                    </div>

                    {/* Step 2: Trip Type */}
                    <div className={cn("step-card p-6", step === 2 ? 'active' : 'inactive')}>
                        <CardContent className="space-y-6">
                            <CardTitle>Step 2: Type of Trip</CardTitle>
                            <TripTypeToggle value={tripData.tripType!} onValueChange={(val) => updateTripData({ tripType: val })} />
                        </CardContent>
                        <CardFooter className="flex justify-between">
                             <Button variant="outline" onClick={prevStep}><ArrowLeft className="mr-2 h-4 w-4"/> Back</Button>
                            <Button onClick={nextStep}>Next <ArrowRight className="ml-2 h-4 w-4"/></Button>
                        </CardFooter>
                    </div>

                    {/* Step 3: Mode Selection */}
                    <div className={cn("step-card p-6", step === 3 ? 'active' : 'inactive')}>
                         <CardContent className="space-y-6">
                             <CardTitle>Step 3: How are you travelling?</CardTitle>
                            {tripData.tripType === 'within-city' ? (
                                <>
                                  <CityModeSelector value={tripData.mode} onValueChange={(val) => updateTripData({ mode: val })} />
                                  <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 gap-2">
                                    <Button variant="outline" onClick={() => quickOpenMode('metro')}>Open Metro</Button>
                                    <Button variant="outline" onClick={() => quickOpenMode('rapido')}>Book Rapido</Button>
                                    <Button variant="outline" onClick={() => quickOpenMode('ola')}>Book Ola</Button>
                                    <Button variant="outline" onClick={() => quickOpenMode('uber')}>Book Uber</Button>
                                    <Button variant="outline" onClick={() => quickOpenMode('bmtc')}>Find BMTC</Button>
                                  </div>
                                </>
                            ) : (
                                <OutstationModeSelector value={tripData.mode} onValueChange={(val) => updateTripData({ mode: val })} />
                            )}
                        </CardContent>
                        <CardFooter className="flex justify-between">
                            <Button variant="outline" onClick={prevStep}><ArrowLeft className="mr-2 h-4 w-4"/> Back</Button>
                            <Button onClick={handleCreateTrip} disabled={!tripData.mode}>Create Trip & Get Code <ArrowRight className="ml-2 h-4 w-4"/></Button>
                        </CardFooter>
                    </div>

                    {/* Step 4: Review & Share */}
                    <div className={cn("step-card p-6", step === 4 ? 'active' : 'inactive')}>
                        <CardContent className="space-y-6 text-center">
                            <div className="flex justify-center">
                                <PartyPopper className="h-16 w-16 text-green-500" />
                            </div>
                            <CardTitle>You're all set!</CardTitle>
                            <CardDescription>Your trip is ready. Share the code with your friends to get started.</CardDescription>
                            
                            <Card className="text-left p-4 bg-muted/50">
                                <h4 className="font-semibold mb-2">Trip Summary</h4>
                                <ul className="text-sm space-y-1 text-muted-foreground">
                                    <li><strong>Name:</strong> {tripData.name}</li>
                                    <li><strong>Destination:</strong> {tripData.destination}</li>
                                    <li className="capitalize"><strong>Type:</strong> {tripData.tripType?.replace('-', ' ')}</li>
                                    <li className="capitalize"><strong>Your Mode:</strong> {tripData.mode}</li>
                                </ul>
                            </Card>

                            <div className="p-4 border-2 border-dashed rounded-lg">
                                <p className="text-sm text-muted-foreground">Your Trip Code</p>
                                <p className="text-2xl font-bold font-mono tracking-widest">{createdTripId}</p>
                            </div>
                        </CardContent>
                        <CardFooter className="flex flex-col sm:flex-row gap-4">
                            <Button variant="secondary" className="w-full" onClick={copyTripCode}><Clipboard className="mr-2 h-4 w-4"/> Copy Trip Code</Button>
                            <Button className="w-full" onClick={goToTripRoom}>Go To Trip Room <ArrowRight className="ml-2 h-4 w-4"/></Button>
                        </CardFooter>
                    </div>
                </div>
            </Card>
        </div>
    </div>
  );
}

    