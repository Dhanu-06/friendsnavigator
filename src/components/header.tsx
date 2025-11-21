'use client';

import { Plus, Share2, LogIn, LogOut } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Logo } from '@/components/logo';
import { useAuth, useUser } from '@/firebase';
import { signOut } from 'firebase/auth';
import { useRouter } from 'next/navigation';

export function Header() {
  const auth = useAuth();
  const { user } = useUser();
  const router = useRouter();

  const handleSignOut = async () => {
    if (auth) {
      await signOut(auth);
      router.push('/login');
    }
  };

  return (
    <header className="flex h-16 items-center border-b bg-card px-4 md:px-6 z-10 shrink-0">
      <div className="flex items-center gap-4">
        <Logo />
      </div>
      <div className="ml-auto flex items-center gap-4">
        {user && (
          <>
            <Button variant="outline" size="sm">
              <Share2 className="mr-2 h-4 w-4" />
              Join Group
            </Button>
            <Button size="sm">
              <Plus className="mr-2 h-4 w-4" />
              New Trip
            </Button>
          </>
        )}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="relative h-10 w-10 rounded-full">
              <Avatar className="h-10 w-10">
                <AvatarImage src={user?.photoURL || "https://picsum.photos/seed/you/40/40"} alt={user?.displayName || "User"} data-ai-hint="person selfie"/>
                <AvatarFallback>{user?.displayName?.charAt(0) || 'U'}</AvatarFallback>
              </Avatar>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-56" align="end" forceMount>
            {user ? (
              <>
                <DropdownMenuLabel className="font-normal">
                  <div className="flex flex-col space-y-1">
                    <p className="text-sm font-medium leading-none">{user.displayName || 'Anonymous User'}</p>
                    <p className="text-xs leading-none text-muted-foreground">
                      {user.email || 'No email'}
                    </p>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem>
                  Profile
                </DropdownMenuItem>
                <DropdownMenuItem>
                  Settings
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleSignOut}>
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>Log out</span>
                </DropdownMenuItem>
              </>
            ) : (
                <DropdownMenuItem onClick={() => router.push('/login')}>
                    <LogIn className="mr-2 h-4 w-4" />
                    <span>Log in</span>
                </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
