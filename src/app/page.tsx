'use client';

import { useRouter } from 'next/navigation';
import { useUser } from '@/firebase';
import { Button } from '@/components/ui/button';
import { Logo } from '@/components/logo';
import { ArrowRight, LogIn, PlusCircle } from 'lucide-react';
import Link from 'next/link';
import { useEffect } from 'react';

export default function Home() {
  const { user, isUserLoading } = useUser();
  const router = useRouter();

  useEffect(() => {
    // For demo purposes, if a user is logged in, send them to the dashboard.
    if (!isUserLoading && user) {
      router.push('/dashboard');
    }
  }, [user, isUserLoading, router]);


  return (
    <div className="flex flex-col min-h-screen bg-background text-foreground">
      <header className="flex items-center justify-between p-4 md:px-6">
        <Logo />
        <div className="flex items-center gap-4">
          <Button variant="ghost" asChild>
             <Link href="/login">Sign In</Link>
          </Button>
          <Button asChild>
             <Link href="/login">
                Sign Up <ArrowRight className="ml-2" />
             </Link>
          </Button>
        </div>
      </header>

      <main className="flex-1">
        <section className="relative flex items-center justify-center min-h-[calc(100vh-80px)] text-center px-4">
          <div 
            className="absolute inset-0 bg-gradient-to-br from-primary/20 via-background to-background -z-10"
            style={{
                clipPath: 'polygon(0 0, 100% 0, 100% 85%, 0 100%)'
            }}
          />
          <div className="max-w-4xl mx-auto">
            <div className="inline-block bg-accent/20 text-accent-foreground border border-accent/30 rounded-full px-4 py-1 text-sm mb-6 animate-fade-in-up">
              New: Share your live location with friends
            </div>
            <h1 className="text-4xl md:text-6xl font-bold tracking-tighter mb-4 animate-fade-in-up" style={{ animationDelay: '0.2s' }}>
              Never Lose Your Friends Again
            </h1>
            <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto mb-8 animate-fade-in-up" style={{ animationDelay: '0.4s' }}>
              FriendsNavigator is the ultimate app for coordinating with your crew in real-time. See everyone on a live map, share your ETA, and stay perfectly in sync on your next adventure.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 animate-fade-in-up" style={{ animationDelay: '0.6s' }}>
              <Button size="lg" asChild>
                 <Link href="/dashboard">
                    <PlusCircle className="mr-2"/> Create Your First Trip
                 </Link>
              </Button>
              <Button size="lg" variant="secondary" asChild>
                 <Link href="/login?tab=signin">
                    <LogIn className="mr-2"/> Join an Existing Trip
                 </Link>
              </Button>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
