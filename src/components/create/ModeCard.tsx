'use client';

import { cn } from '@/lib/utils';
import type { LucideIcon } from 'lucide-react';

type ModeCardProps = {
  icon: LucideIcon;
  label: string;
  description: string;
  isSelected: boolean;
  onSelect: () => void;
};

export function ModeCard({ icon: Icon, label, description, isSelected, onSelect }: ModeCardProps) {
  return (
    <button
      onClick={onSelect}
      className={cn(
        'p-4 rounded-lg border-2 text-left transition-all flex flex-col items-center justify-center text-center gap-2',
        isSelected
          ? 'border-primary bg-primary/10 shadow-md'
          : 'border-border hover:border-primary/50 hover:bg-accent/50'
      )}
    >
      <Icon className="h-8 w-8 text-primary mb-2" />
      <p className="font-semibold">{label}</p>
      <p className="text-xs text-muted-foreground">{description}</p>
    </button>
  );
}
