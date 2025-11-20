import { MapPin } from 'lucide-react';

export function Logo() {
  return (
    <a href="/" className="flex items-center gap-2" aria-label="Tripmate homepage">
      <div className="bg-primary text-primary-foreground p-2 rounded-lg">
        <MapPin className="h-5 w-5" />
      </div>
      <span className="font-headline text-2xl font-bold tracking-tighter text-foreground">
        Tripmate
      </span>
    </a>
  );
}
