'use client';

import { useRouter } from 'next/navigation';
import { useUser } from '@/firebase';
import { Header } from '@/components/header';
import { Dashboard } from '@/components/dashboard';
import { GOOGLE_MAPS_API_KEY } from '@/lib/config';
import { APIProvider } from '@vis.gl/react-google-maps';

export default function DashboardPage() {
  const { user, isUserLoading } = useUser();
  const router = useRouter();

  if (isUserLoading) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-background">
        <p>Loading...</p>
      </div>
    );
  }

  if (!user) {
    router.push('/login');
    return null;
  }
  
  if (!GOOGLE_MAPS_API_KEY) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-background p-4">
        <div className="rounded-lg border bg-card p-6 text-center text-card-foreground shadow-sm max-w-2xl">
          <h2 className="text-2xl font-bold">Google Maps API Key Error</h2>
          <p className="mt-2 text-muted-foreground">
            The Google Maps API key is missing or invalid. Please follow these steps to resolve the issue.
          </p>
          <div className="mt-6 rounded-md bg-muted p-4 text-left font-code text-sm space-y-4">
            <div>
              <p className="font-semibold">1. Create a file named <code className="text-primary">.env.local</code></p>
              <p className="text-xs text-muted-foreground">This file should be in the root directory of your project.</p>
            </div>
            <div>
              <p className="font-semibold">2. Add your API key to the file:</p>
              <code className="mt-2 block bg-background/50 p-2 rounded">
                NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=YOUR_API_KEY_HERE
              </code>
               <p className="text-xs text-muted-foreground mt-1">Make sure the variable starts with `NEXT_PUBLIC_`.</p>
            </div>
             <div>
              <p className="font-semibold">3. Check your Google Cloud Console:</p>
               <ul className="list-disc list-inside mt-2 pl-2 text-xs font-sans">
                  <li>Ensure the <span className="font-bold">Maps JavaScript API</span> is enabled for your project.</li>
                  <li>Ensure your project is linked to a valid <span className="font-bold">billing account</span>.</li>
                  <li>Under <span className="font-bold">Application restrictions</span>, if you are using HTTP referrers, make sure to add your development URL (e.g., `http://localhost:3000/*`).</li>
               </ul>
            </div>
          </div>
           <p className="mt-4 text-xs text-muted-foreground">
            After editing the `.env.local` file, you **must restart** your development server for the changes to take effect.
          </p>
        </div>
      </div>
    );
  }

  return (
     <APIProvider apiKey={GOOGLE_MAPS_API_KEY}>
      <div className="flex flex-col h-screen bg-background text-foreground overflow-hidden">
        <Header />
        <main className="flex-1 overflow-y-auto p-4 md:p-8">
          <Dashboard />
        </main>
      </div>
    </APIProvider>
  );
}
