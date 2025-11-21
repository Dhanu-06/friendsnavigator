'use client';

import { Dashboard } from '@/components/dashboard';
import { GOOGLE_MAPS_API_KEY } from '@/lib/config';
import { APIProvider } from '@vis.gl/react-google-maps';

export default function DashboardPage() {
  if (!GOOGLE_MAPS_API_KEY) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-background">
        <div className="rounded-lg border bg-card p-6 text-center text-card-foreground shadow-sm">
          <h2 className="text-2xl font-bold">Welcome to Tripmate</h2>
          <p className="mt-2 text-muted-foreground">
            To get started, please provide your Google Maps API key.
          </p>
          <div className="mt-4 rounded-md bg-muted p-4 text-left font-code text-sm">
            <p className="font-semibold">Create a file named `.env.local` in the root of your project and add the following line:</p>
            <code className="mt-2 block text-primary">
              NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=YOUR_API_KEY
            </code>
          </div>
          <p className="mt-4 text-xs text-muted-foreground">
            After adding the key, please restart your development server.
          </p>
        </div>
      </div>
    );
  }

  return (
    <APIProvider apiKey={GOOGLE_MAPS_API_KEY}>
      <Dashboard />
    </APIProvider>
  );
}
