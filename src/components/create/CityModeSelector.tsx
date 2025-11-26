'use client';

import { Car, Bike, TramFront, Bus } from 'lucide-react';
import { ModeCard } from './ModeCard';

const cityModes = [
  { id: 'metro', label: 'Metro', icon: TramFront, description: 'Fastest for long distances.' },
  { id: 'rapido', label: 'Rapido', icon: Bike, description: 'Quick through traffic.' },
  { id: 'ola', label: 'Ola', icon: Car, description: 'Comfortable cab ride.' },
  { id: 'uber', label: 'Uber', icon: Car, description: 'Reliable cab service.' },
  { id: 'bmtc', label: 'BMTC', icon: Bus, description: 'Most budget-friendly.' },
];

type CityModeSelectorProps = {
  value?: string;
  onValueChange: (value: string) => void;
};

export function CityModeSelector({ value, onValueChange }: CityModeSelectorProps) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
      {cityModes.map((mode) => (
        <ModeCard
          key={mode.id}
          icon={mode.icon}
          label={mode.label}
          description={mode.description}
          isSelected={value === mode.id}
          onSelect={() => onValueChange(mode.id)}
        />
      ))}
    </div>
  );
}
