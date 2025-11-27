'use client';

import { useEffect, useState } from 'react';
import { collection, query, orderBy, limit, onSnapshot } from 'firebase/firestore';
import { useFirestore } from '@/firebase/provider';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';

type RideClickLog = {
  id: string;
  provider: string;
  ua: string;
  timestamp: number;
  pickup?: { lat: number; lng: number; name?: string };
  drop?: { lat: number; lng: number; name?: string };
  attemptedAppUrl?: string;
  attemptedWebUrl?: string;
};

export default function TelemetryPage() {
  const firestore = useFirestore();
  const [logs, setLogs] = useState<RideClickLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!firestore) {
      setError('Firestore is not available. Ensure you are connected.');
      setLoading(false);
      return;
    }

    const logsCollection = collection(firestore, 'ride-clicks');
    const q = query(logsCollection, orderBy('timestamp', 'desc'), limit(50));

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const fetchedLogs: RideClickLog[] = [];
        snapshot.forEach((doc) => {
          fetchedLogs.push({ id: doc.id, ...doc.data() } as RideClickLog);
        });
        setLogs(fetchedLogs);
        setLoading(false);
      },
      (err) => {
        console.error('Error fetching telemetry logs:', err);
        setError('Failed to fetch logs. Check Firestore rules and connection.');
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [firestore]);

  const getPlatform = (ua: string) => {
    if (/android/i.test(ua)) return <Badge variant="secondary">Android</Badge>;
    if (/iphone|ipad|ipod/i.test(ua)) return <Badge variant="secondary">iOS</Badge>;
    if (/windows/i.test(ua)) return <Badge variant="outline">Windows</Badge>;
    if (/macintosh/i.test(ua)) return <Badge variant="outline">macOS</Badge>;
    return <Badge variant="outline">Other</Badge>;
  };

  return (
    <div className="container mx-auto py-8">
      <Card>
        <CardHeader>
          <CardTitle>Ride Click Telemetry</CardTitle>
          <CardDescription>
            Showing the last 50 ride-hailing button clicks recorded. Updates in real-time.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading && <p>Loading logs...</p>}
          {error && <p className="text-destructive">{error}</p>}
          {!loading && logs.length === 0 && (
            <p className="text-muted-foreground">No ride-click logs found yet. Click a ride button in the app to see data here.</p>
          )}
          {!loading && logs.length > 0 && (
            <ScrollArea className="h-[70vh] w-full">
              <Table>
                <TableHeader className='sticky top-0 bg-background'>
                  <TableRow>
                    <TableHead>Provider</TableHead>
                    <TableHead>Timestamp</TableHead>
                    <TableHead>Platform</TableHead>
                    <TableHead>User Agent</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {logs.map((log) => (
                    <TableRow key={log.id}>
                      <TableCell className="font-medium capitalize">{log.provider}</TableCell>
                      <TableCell>{new Date(log.timestamp).toLocaleString()}</TableCell>
                      <TableCell>{getPlatform(log.ua)}</TableCell>
                      <TableCell className="text-xs text-muted-foreground max-w-xs truncate">
                        {log.ua}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </ScrollArea>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
