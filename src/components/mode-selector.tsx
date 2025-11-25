'use client';

import React, { useState } from 'react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from './ui/button';
import { Card } from './ui/card';
import { Badge } from './ui/badge';
import { cn } from '@/lib/utils';
import { AlertCircle, Zap, Tags, Smile, Bus, TramFront, PersonStanding, Car, Bike } from 'lucide-react';
import type { TravelPreference, TravelMode, ModeOption, Participant } from '@/lib/types';
import { doc, serverTimestamp } from 'firebase/firestore';
import { useFirestore, updateDocumentNonBlocking } from '@/firebase';

type ModeSelectorProps = {
  participant: Participant;
  destination: { lat: number, lng: number } | undefined;
  tripId: string;
};

// --- Helper Functions (as described in the prompt) ---

function getDistanceKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Radius of the Earth in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

const MODE_CONFIG: Record<TravelMode, { speedKmph: number, costBase: number, costPerKm: number }> = {
  ola:   { speedKmph: 25, costBase: 40, costPerKm: 15 },
  uber:  { speedKmph: 25, costBase: 40, costPerKm: 14 },
  rapido:{ speedKmph: 30, costBase: 20, costPerKm: 10 },
  metro: { speedKmph: 35, costBase: 10, costPerKm: 5 },
  bmtc:  { speedKmph: 20, costBase: 5,  costPerKm: 3 },
  walk:  { speedKmph: 5,  costBase: 0,  costPerKm: 0 },
};

const MODE_DETAILS: Record<TravelMode, { label: string, icon: React.ElementType, explanation: string }> = {
    ola: { label: 'Ola', icon: Car, explanation: 'Fast cab via city roads.' },
    uber: { label: 'Uber', icon: Car, explanation: 'Fast cab via city roads.' },
    rapido: { label: 'Rapido', icon: Bike, explanation: 'Two-wheeler, usually fastest in traffic.' },
    metro: { label: 'Metro', icon: TramFront, explanation: 'Fixed route, reliable timing + some walking.' },
    bmtc: { label: 'Bus', icon: Bus, explanation: 'Cheapest but can be slower.' },
    walk: { label: 'Walk', icon: PersonStanding, explanation: 'Free and healthy, for short distances.' },
}


function computeOptions(distanceKm: number): ModeOption[] {
  return (Object.keys(MODE_CONFIG) as TravelMode[]).map((mode) => {
    const cfg = MODE_CONFIG[mode];
    // Add some variability
    const speedVariation = (Math.random() - 0.5) * 5; // +/- 2.5 kmph
    const costVariation = (Math.random() - 0.5) * 4; // +/- 2 per km
    
    const eta = Math.max(5, Math.round((distanceKm / (cfg.speedKmph + speedVariation)) * 60)); // in minutes
    const cost = Math.max(0, Math.round(cfg.costBase + distanceKm * (cfg.costPerKm + costVariation)));
    
    return { mode, etaMinutes: eta, costEstimate: cost, explanation: MODE_DETAILS[mode].explanation };
  });
}

function getRecommendedMode(options: ModeOption[], preference: TravelPreference): ModeOption {
  if (preference === "fastest") {
    return options.reduce((best, opt) => opt.etaMinutes < best.etaMinutes ? opt : best);
  }
  if (preference === "cheapest") {
    return options.reduce((best, opt) => opt.costEstimate < best.costEstimate ? opt : best);
  }
  // comfortable -> prioritize cab/metro if ETA not too high
  const comfyModes = options.filter(o => ["ola","uber","metro"].includes(o.mode));
  if (comfyModes.length) {
    const bestComfy = comfyModes.reduce((best, opt) => opt.etaMinutes < best.etaMinutes ? opt : best);
    // If the best comfy option is not excessively longer than the absolute fastest
    const fastest = getRecommendedMode(options, 'fastest');
    if(bestComfy.etaMinutes < fastest.etaMinutes * 1.5) {
        return bestComfy;
    }
  }
  // Fallback to fastest if comfort criteria don't produce a good result
  return getRecommendedMode(options, 'fastest');
}

export function ModeSelector({ participant, destination, tripId }: ModeSelectorProps) {
  const [preference, setPreference] = useState<TravelPreference>(participant.preference || 'fastest');
  const firestore = useFirestore();

  const handleCalculate = () => {
    if (!participant.currentLocation || !destination || !firestore) return;

    const distance = getDistanceKm(
      participant.currentLocation.lat,
      participant.currentLocation.lng,
      destination.lat,
      destination.lng
    );

    const options = computeOptions(distance);
    const recommended = getRecommendedMode(options, preference);

    const participantRef = doc(firestore, 'trips', tripId, 'participants', participant.id);
    updateDocumentNonBlocking(participantRef, {
        preference,
        suggestion: {
            recommendedMode: recommended.mode,
            options: options,
            lastCalculatedAt: serverTimestamp()
        }
    });
  };

  const handleSelectMode = (mode: TravelMode) => {
    if(!firestore) return;
    const participantRef = doc(firestore, 'trips', tripId, 'participants', participant.id);
    updateDocumentNonBlocking(participantRef, { selectedMode: mode });
  }

  const options = participant.suggestion?.options;
  const recommendedMode = participant.suggestion?.recommendedMode;
  const selectedMode = participant.selectedMode;

  if (!participant.currentLocation || !destination) {
    return (
        <div className="p-3 text-sm text-center bg-muted/50 rounded-lg text-muted-foreground">
            <AlertCircle className="inline-block mr-2 h-4 w-4" /> Waiting for user's location to suggest modes.
        </div>
    )
  }

  return (
    <div className="space-y-4 p-4 border rounded-lg bg-card shadow-sm">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
            <label className="text-sm font-medium block mb-2">My travel preference</label>
            <Select value={preference} onValueChange={(v: TravelPreference) => setPreference(v)}>
                <SelectTrigger className="w-full sm:w-[180px]">
                    <SelectValue placeholder="Select preference" />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="fastest"><Zap className="mr-2 h-4 w-4 inline-block"/>Fastest</SelectItem>
                    <SelectItem value="cheapest"><Tags className="mr-2 h-4 w-4 inline-block"/>Cheapest</SelectItem>
                    <SelectItem value="comfortable"><Smile className="mr-2 h-4 w-4 inline-block"/>Comfortable</SelectItem>
                </SelectContent>
            </Select>
        </div>
        <Button onClick={handleCalculate} className="w-full sm:w-auto">Find Best Option</Button>
      </div>

      {options && (
        <div className="space-y-2">
           <h4 className="text-sm font-semibold">Your Options:</h4>
           {options.map(opt => {
              const Icon = MODE_DETAILS[opt.mode].icon;
              return (
                <button
                    key={opt.mode}
                    onClick={() => handleSelectMode(opt.mode)}
                    className={cn(
                        "w-full text-left p-3 border rounded-lg transition-all flex flex-col gap-1 relative",
                        selectedMode === opt.mode ? "border-primary bg-primary/10 shadow-md" : "hover:bg-muted/50 hover:shadow-sm"
                    )}
                >
                    <div className="flex justify-between items-center">
                        <p className="font-semibold flex items-center gap-2"><Icon /> {MODE_DETAILS[opt.mode].label}</p>
                        <p className="font-semibold">{opt.etaMinutes} mins &bull; ₹{opt.costEstimate}</p>
                    </div>
                    <p className="text-xs text-muted-foreground pl-6">{opt.explanation}</p>
                    {opt.mode === recommendedMode && <Badge variant="secondary" className="absolute top-2 right-2">Recommended</Badge>}
                </button>
            )})}
        </div>
      )}
    </div>
  );
}
