'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { ArrowLeft, ArrowRight, Building, Mountain, Clipboard, PartyPopper } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { CityModeSelector } from '@/components/create/CityModeSelector';
import { OutstationModeSelector } from '@/components/create/OutstationModeSelector';
import { TripTypeToggle, TripType } from '@/components/create/TripTypeToggle';
import { cn } from '@/lib/utils';


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
  const router = useRouter();
  const { toast } = useToast();

  const updateTripData = (data: Partial<TripData>) => {
    setTripData((prev) => ({ ...prev, ...data }));
  };

  const nextStep = () => setStep((s) => s + 1);
  const prevStep = () => setStep((s) => s - 1);

  const handleCreateTrip = () => {
    console.log("Creating trip with data:", tripData);
    toast({
      title: 'Trip Created! (Demo)',
      description: 'Redirecting to your new trip room...',
    });
    setTimeout(() => {
        router.push('/trips/demo-trip');
    }, 1000);
  };

  const copyTripCode = () => {
    navigator.clipboard.writeText("FRIEND-1234");
    toast({
        title: "Copied!",
        description: "Trip code copied to clipboard."
    });
  }

  const progress = (step / 4) * 100;
  
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
                    <div className={cn("step-card", step === 1 ? 'active' : 'inactive')}>
                        <CardContent className="space-y-6 p-6">
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
                    <div className={cn("step-card", step === 2 ? 'active' : 'inactive')}>
                        <CardContent className="space-y-6 p-6">
                            <CardTitle>Step 2: Type of Trip</CardTitle>
                            <TripTypeToggle value={tripData.tripType!} onValueChange={(val) => updateTripData({ tripType: val })} />
                        </CardContent>
                        <CardFooter className="flex justify-between">
                             <Button variant="outline" onClick={prevStep}><ArrowLeft className="mr-2 h-4 w-4"/> Back</Button>
                            <Button onClick={nextStep}>Next <ArrowRight className="ml-2 h-4 w-4"/></Button>
                        </CardFooter>
                    </div>

                    {/* Step 3: Mode Selection */}
                    <div className={cn("step-card", step === 3 ? 'active' : 'inactive')}>
                         <CardContent className="space-y-6 p-6">
                             <CardTitle>Step 3: How are you travelling?</CardTitle>
                            {tripData.tripType === 'within-city' ? (
                                <CityModeSelector value={tripData.mode} onValueChange={(val) => updateTripData({ mode: val })} />
                            ) : (
                                <OutstationModeSelector value={tripData.mode} onValueChange={(val) => updateTripData({ mode: val })} />
                            )}
                        </CardContent>
                        <CardFooter className="flex justify-between">
                            <Button variant="outline" onClick={prevStep}><ArrowLeft className="mr-2 h-4 w-4"/> Back</Button>
                            <Button onClick={nextStep} disabled={!tripData.mode}>Next <ArrowRight className="ml-2 h-4 w-4"/></Button>
                        </CardFooter>
                    </div>

                    {/* Step 4: Review & Share */}
                    <div className={cn("step-card", step === 4 ? 'active' : 'inactive')}>
                        <CardContent className="space-y-6 p-6 text-center">
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
                                <p className="text-2xl font-bold font-mono tracking-widest">FRIEND-1234</p>
                            </div>
                        </CardContent>
                        <CardFooter className="flex flex-col sm:flex-row gap-4">
                            <Button variant="secondary" className="w-full" onClick={copyTripCode}><Clipboard className="mr-2 h-4 w-4"/> Copy Trip Code</Button>
                            <Button className="w-full" onClick={handleCreateTrip}>Go To Trip Room <ArrowRight className="ml-2 h-4 w-4"/></Button>
                        </CardFooter>
                    </div>
                </div>
            </Card>
        </div>
    </div>
  );
}
