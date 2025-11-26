'use client';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Copy } from 'lucide-react';

type TripCodeBadgeProps = {
    code: string;
    onCopy: () => void;
};

export function TripCodeBadge({ code, onCopy }: TripCodeBadgeProps) {
  return (
    <div className="flex items-center gap-2 rounded-full border bg-muted p-1 pr-2">
      <Badge variant="secondary" className="font-mono tracking-widest">{code}</Badge>
      <button onClick={onCopy} className="text-muted-foreground hover:text-foreground">
        <Copy className="h-4 w-4" />
      </button>
    </div>
  );
}
