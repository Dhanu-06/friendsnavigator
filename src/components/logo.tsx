import { Navigation } from 'lucide-react';

export function Logo() {
  return (
    <a href="/dashboard" className="flex items-center gap-2" aria-label="FriendsNavigator homepage">
      <div className="bg-primary text-primary-foreground p-2 rounded-lg">
        <Navigation className="h-5 w-5" />
      </div>
      <span className="font-headline text-xl font-bold tracking-tighter text-foreground">
        FriendsNavigator
      </span>
    </a>
  );
}
