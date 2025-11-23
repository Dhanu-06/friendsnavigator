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
            The app is missing a valid Google Maps API key. To view maps, please follow these steps.
          </p>
          <div className="mt-6 rounded-md bg-muted p-4 text-left font-code text-sm space-y-4">
            <div>
              <p className="font-semibold">1. Create a file named <code className="text-primary">.env.local</code> in the root of your project.</p>
            </div>
            <div>
              <p className="font-semibold">2. Add your API key to the file:</p>
              <code className="mt-2 block bg-background/50 p-2 rounded">
                NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=YOUR_API_KEY
              </code>
            </div>
            <div>
              <p className="font-semibold">3. In the Google Cloud Console, ensure your key has:</p>
               <ul className="list-disc list-inside mt-2 pl-2 text-xs font-sans">
                  <li>The <span className="font-bold">Maps JavaScript API</span> enabled.</li>
                  <li>A valid billing account attached to the project.</li>
                  <li>No application or API restrictions that would block this app.</li>
               </ul>
            </div>
          </div>
           <p className="mt-4 text-xs text-muted-foreground">
            After creating the file and adding your key, please restart your development server for the changes to take effect.
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
