import React from 'react';
import { Car, Bus, Train, Bike } from 'lucide-react';

export const transportIcons: Record<string, React.ReactNode> = {
  car: <Car className="h-4 w-4" />,
  bus: <Bus className="h-4 w-4" />,
  train: <Train className="h-4 w-4" />,
  bike: <Bike className="h-4 w-4" />,
};
