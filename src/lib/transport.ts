import { Car, Bus, Train, Bike } from 'lucide-react';
import type { LucideProps } from 'lucide-react';
import type { ForwardRefExoticComponent, RefAttributes } from 'react';

export const transportIcons: Record<string, ForwardRefExoticComponent<Omit<LucideProps, "ref"> & RefAttributes<SVGSVGElement>>> = {
  car: Car,
  bus: Bus,
  train: Train,
  bike: Bike,
};
