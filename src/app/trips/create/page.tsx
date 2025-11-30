'use client';

import { useRouter } from 'next/navigation';
import { useUser } from '@/firebase/auth/use-user';
import TripCreateForm from '@/components/TripCreateForm.client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

export default function CreateTripPage() {
  const { user, loading } = useUser();
  const router = useRouter();

  const handleTripCreated = (tripId: string) => {
    // The success UI is handled within the form, but we could navigate here
    // For now, the form's "Open Trip" button handles navigation.
    console.log(`Trip with ID ${tripId} was created. Redirecting...`);
    router.push(`/trips/${tripId}`);
  };
  
  return (
    <div className="flex flex-col min-h-screen items-center justify-center bg-gray-50 dark:bg-gray-900 p-4">
      <Card className="w-full max-w-3xl">
        <CardHeader>
            <CardTitle className="text-2xl font-bold font-heading">Plan a New Trip</CardTitle>
            <CardDescription>Set an origin and destination to get started.</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-4">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-12 w-32" />
            </div>
          ) : user ? (
            <TripCreateForm ownerId={user.uid} onCreated={handleTripCreated} />
          ) : (
            <p className="text-destructive">Please <a href="/auth/login" className="underline">log in</a> to create a trip.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
