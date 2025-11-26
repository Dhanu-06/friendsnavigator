'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Map,
  Users,
  CreditCard,
  ArrowRight,
  Sparkles,
  Navigation,
} from 'lucide-react';

const FeatureCard = ({
  icon,
  title,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  children: React.ReactNode;
}) => (
  <Card className="bg-white/50 dark:bg-black/50 backdrop-blur-sm">
    <CardHeader className="flex flex-row items-center gap-4">
      <div className="bg-primary/10 text-primary p-3 rounded-lg">{icon}</div>
      <CardTitle className="text-xl">{title}</CardTitle>
    </CardHeader>
    <CardContent>
      <p className="text-muted-foreground">{children}</p>
    </CardContent>
  </Card>
);

export default function Home() {
  return (
    <div className="flex flex-col min-h-screen bg-background">
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-14 items-center">
          <Link href="/" className="mr-6 flex items-center space-x-2">
            <Navigation className="h-6 w-6 text-primary" />
            <span className="font-bold font-heading text-lg">
              FriendsNavigator X
            </span>
          </Link>
          <div className="flex flex-1 items-center justify-end space-x-2">
            <nav className="flex items-center space-x-2">
              <Button variant="ghost" asChild>
                <Link href="/auth/login">Login</Link>
              </Button>
              <Button asChild>
                <Link href="/auth/signup">
                  Sign Up <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </nav>
          </div>
        </div>
      </header>

      <main className="flex-1">
        <section className="relative py-20 md:py-32">
          <div
            aria-hidden="true"
            className="absolute inset-0 grid grid-cols-2 -space-x-52 opacity-40 dark:opacity-20"
          >
            <div className="blur-[106px] h-56 bg-gradient-to-br from-primary to-purple-400 dark:from-blue-700"></div>
            <div className="blur-[106px] h-32 bg-gradient-to-r from-cyan-400 to-sky-300 dark:to-indigo-600"></div>
          </div>
          <div className="relative container mx-auto px-6 text-center">
            <div className="max-w-3xl mx-auto">
              <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold font-heading">
                Travel together,
                <span className="text-primary"> stay in sync.</span>
              </h1>
              <p className="mt-6 text-lg text-muted-foreground">
                The ultimate platform for coordinating group trips. See your
                friends on a live map, share trip codes to join groups, and
                split expenses without the headache.
              </p>
              <div className="mt-8 flex justify-center gap-4">
                <Button size="lg" asChild>
                  <Link href="/auth/signup">
                    Get Started <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
                <Button size="lg" variant="secondary" asChild>
                  <Link href="/dashboard">View Demo</Link>
                </Button>
              </div>
            </div>
          </div>
        </section>

        <section className="container mx-auto px-6 py-16">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold font-heading">
              Everything you need for the perfect trip
            </h2>
            <p className="text-muted-foreground mt-2">
              Focus on the fun, not the logistics.
            </p>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            <FeatureCard icon={<Users className="h-6 w-6" />} title="Group Trips">
              Easily create a trip and share a unique code for your friends to
              join instantly. No more messy group chats for planning.
            </FeatureCard>
            <FeatureCard icon={<Map className="h-6 w-6" />} title="Live Map">
              See where everyone is in real-time. Know their travel mode,
              estimated arrival time, and get notified of delays.
            </FeatureCard>
            <FeatureCard
              icon={<CreditCard className="h-6 w-6" />}
              title="Smart Expenses"
            >
              Track who paid for what. Our smart calculator tells you who owes
              who, making sure everyone splits the cost fairly.
            </FeatureCard>
          </div>
        </section>
      </main>

      <footer className="border-t">
        <div className="container mx-auto px-6 py-6 text-center text-muted-foreground">
          <p>&copy; {new Date().getFullYear()} FriendsNavigator X. All Rights Reserved.</p>
        </div>
      </footer>
    </div>
  );
}
