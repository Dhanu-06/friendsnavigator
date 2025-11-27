'use client';
import React, { useEffect, useState } from 'react';
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
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

type RideRecord = { id: string; provider?: string | null; pickup?: any; drop?: any; attemptedAppUrl?: string; attemptedWebUrl?: string; ua?: string; timestamp: number; };

export default function RideClicksPageClient() {
  const [records, setRecords] = useState<RideRecord[]>([]);
  const [loading, setLoading] = useState(false);

  async function fetchLogs() {
    if (loading) return;
    setLoading(true);
    try {
      const res = await fetch('/api/ride-click');
      const json = await res.json();
      if (json && json.records) setRecords(json.records);
    } catch (e) {
        console.error("Failed to fetch logs", e);
    } finally {
        setLoading(false);
    }
  }

  useEffect(() => {
    fetchLogs();
    const id = setInterval(fetchLogs, 3000);
    return () => clearInterval(id);
  }, []);

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
          <div className="flex justify-between items-start">
            <div>
              <CardTitle>Ride Click Telemetry (In-Memory)</CardTitle>
              <CardDescription>
                Showing last {records.length} ride-hailing clicks. Updates every 3 seconds.
              </CardDescription>
            </div>
            <Button onClick={fetchLogs} disabled={loading} variant="outline">
              {loading ? 'Refreshing...' : 'Refresh Now'}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {records.length === 0 && !loading && (
            <p className="text-muted-foreground text-center py-8">No ride-click logs found yet. Click a ride button in the app to see data here.</p>
          )}
          {records.length > 0 && (
            <ScrollArea className="h-[75vh] w-full">
              <Table>
                <TableHeader className='sticky top-0 bg-background z-10'>
                  <TableRow>
                    <TableHead className="w-[120px]">Provider</TableHead>
                    <TableHead className="w-[180px]">Timestamp</TableHead>
                    <TableHead className="w-[100px]">Platform</TableHead>
                    <TableHead>Details</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {records.map((log) => (
                    <TableRow key={log.id}>
                      <TableCell className="font-medium capitalize">{log.provider}</TableCell>
                      <TableCell>{new Date(log.timestamp).toLocaleString()}</TableCell>
                      <TableCell>{getPlatform(log.ua || '')}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        <div className="flex flex-col gap-2">
                           <p><strong>Pickup:</strong> {log.pickup ? `${log.pickup.name} (${log.pickup.lat}, ${log.pickup.lng})` : 'N/A'}</p>
                           <p><strong>Drop:</strong> {log.drop ? `${log.drop.name} (${log.drop.lat}, ${log.drop.lng})` : 'N/A'}</p>
                           
                           <TooltipProvider>
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <p className="truncate"><strong>App URL:</strong> {log.attemptedAppUrl || 'N/A'}</p>
                                </TooltipTrigger>
                                <TooltipContent className="max-w-md">
                                    <p className="break-all">{log.attemptedAppUrl}</p>
                                </TooltipContent>
                            </Tooltip>
                           </TooltipProvider>

                           <TooltipProvider>
                            <Tooltip>
                                <TooltipTrigger asChild>
                                     <p className="truncate"><strong>Web URL:</strong> {log.attemptedWebUrl || 'N/A'}</p>
                                </TooltipTrigger>
                                <TooltipContent className="max-w-md">
                                    <p className="break-all">{log.attemptedWebUrl}</p>
                                </TooltipContent>
                            </Tooltip>
                           </TooltipProvider>
                           
                           <TooltipProvider>
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <p className="truncate"><strong>User Agent:</strong> {log.ua || 'N/A'}</p>
                                </TooltipTrigger>
                                <TooltipContent className="max-w-md">
                                    <p className="break-all">{log.ua}</p>
                                </TooltipContent>
                            </Tooltip>
                           </TooltipProvider>
                        </div>
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
