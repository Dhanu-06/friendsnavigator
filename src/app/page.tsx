// src/app/page.tsx
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Navigation, Users, MapPin, IndianRupee } from "lucide-react";

export default function RootPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-gray-50 dark:from-gray-900 dark:to-gray-950">
      <header className="flex items-center justify-between px-6 py-4 max-w-6xl mx-auto">
        <Link href="/" className="flex items-center gap-2">
          <Navigation className="h-7 w-7 text-primary" />
          <span className="font-heading font-bold text-lg">FriendsNavigator</span>
        </Link>
        <div className="flex gap-2">
          <Link href="/auth/login"><Button variant="ghost">Login</Button></Link>
          <Link href="/auth/signup"><Button>Sign Up</Button></Link>
        </div>
      </header>

      <main className="px-6 pb-16">
        <section className="max-w-6xl mx-auto grid lg:grid-cols-2 gap-8 items-center">
          <div className="space-y-6">
            <h1 className="text-4xl md:text-5xl font-heading font-bold leading-tight">
              Plan trips with friends, share live location, and ride together
            </h1>
            <p className="text-muted-foreground">
              Create a trip room, invite friends, see everyone on the map, book rides, and split expenses—all in one place.
            </p>
            <div className="flex flex-wrap gap-3">
              <Link href="/trips/create"><Button size="lg">Create Trip</Button></Link>
              <Link href="/join"><Button size="lg" variant="outline">Join Trip</Button></Link>
              <Link href="/dashboard"><Button size="lg" variant="secondary">Dashboard</Button></Link>
            </div>
          </div>

          <Card className="shadow-sm">
            <CardHeader>
              <CardTitle className="font-heading">Everything for your group trip</CardTitle>
              <CardDescription>Simple tools that remove the coordination pain.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid sm:grid-cols-2 gap-4">
                <div className="p-4 rounded-lg border bg-muted/40 space-y-2">
                  <div className="flex items-center gap-2"><Users className="h-5 w-5 text-primary" /><span className="font-semibold">Invite Friends</span></div>
                  <p className="text-sm text-muted-foreground">Share a trip code and get everyone in one room.</p>
                </div>
                <div className="p-4 rounded-lg border bg-muted/40 space-y-2">
                  <div className="flex items-center gap-2"><MapPin className="h-5 w-5 text-primary" /><span className="font-semibold">Live Location</span></div>
                  <p className="text-sm text-muted-foreground">See participants on the map with ETA updates.</p>
                </div>
                <div className="p-4 rounded-lg border bg-muted/40 space-y-2">
                  <div className="flex items-center gap-2"><Navigation className="h-5 w-5 text-primary" /><span className="font-semibold">Book Rides</span></div>
                  <p className="text-sm text-muted-foreground">One-tap deep links for Uber, Ola, Rapido, and transit.</p>
                </div>
                <div className="p-4 rounded-lg border bg-muted/40 space-y-2">
                  <div className="flex items-center gap-2"><IndianRupee className="h-5 w-5 text-primary" /><span className="font-semibold">Split Expenses</span></div>
                  <p className="text-sm text-muted-foreground">Track who paid and settle up fairly.</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </section>
      </main>
    </div>
  );
}
