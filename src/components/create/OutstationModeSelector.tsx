'use client';

import { Car, Bus, Train, Plane, Users } from 'lucide-react';
import { ModeCard } from './ModeCard';

const outstationModes = [
  { id: 'own-vehicle', label: 'Own Vehicle', icon: Car, description: 'Freedom to explore.' },
  { id: 'redbus', label: 'RedBus', icon: Bus, description: 'Connects most cities.' },
  { id: 'train', label: 'Train', icon: Train, description: 'Scenic & cost-effective.' },
  { id: 'flight', label: 'Flight', icon: Plane, description: 'Fastest for long distance.' },
  { id: 'meet-up', label: 'Meet at Point', icon: Users, description: 'Go together from a spot.' },
];


type OutstationModeSelectorProps = {
  value?: string;
  onValueChange: (value: string) => void;
};

export function OutstationModeSelector({ value, onValueChange }: OutstationModeSelectorProps) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
      {outstationModes.map((mode) => (
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
