'use client';

import { Building, Mountain } from 'lucide-react';
import { cn } from '@/lib/utils';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';

export type TripType = 'within-city' | 'out-of-city';

type TripTypeToggleProps = {
  value: TripType;
  onValueChange: (value: TripType) => void;
};

export function TripTypeToggle({ value, onValueChange }: TripTypeToggleProps) {
  return (
    <RadioGroup
      value={value}
      onValueChange={onValueChange}
      className="grid grid-cols-2 gap-4"
    >
      <div>
        <RadioGroupItem value="within-city" id="within-city" className="peer sr-only" />
        <Label
          htmlFor="within-city"
          className={cn(
            "flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary",
            "cursor-pointer"
          )}
        >
          <Building className="mb-3 h-6 w-6" />
          Within City
           <span className="text-xs text-muted-foreground mt-1 text-center">For local meetups, events, and cafe hopping.</span>
        </Label>
      </div>
      <div>
        <RadioGroupItem value="out-of-city" id="out-of-city" className="peer sr-only" />
        <Label
          htmlFor="out-of-city"
           className={cn(
            "flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary",
            "cursor-pointer"
          )}
        >
          <Mountain className="mb-3 h-6 w-6" />
          Out of City
          <span className="text-xs text-muted-foreground mt-1 text-center">For road trips, weekend getaways, and vacations.</span>
        </Label>
      </div>
    </RadioGroup>
  );
}
