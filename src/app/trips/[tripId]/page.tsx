'use client';

import { useState } from 'react';
import { useParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Copy,
  MessageCircle,
  Phone,
  Video,
  Users,
  CreditCard,
  MapPin,
} from 'lucide-react';
import MapClient from '@/components/trip/MapClient';
import { ParticipantsList, type Participant } from '@/components/trip/ParticipantsList';
import { ChatBox, type Message } from '@/components/trip/ChatBox';
import { ExpenseCalculator, type Expense } from '@/components/trip/ExpenseCalculator';
import { TripCodeBadge } from '@/components/trip/TripCodeBadge';
import { useToast } from '@/components/ui/use-toast';

// --- MOCK DATA ---
const mockTrip = {
  name: 'Weekend to Nandi Hills',
  destination: 'Nandi Hills View Point',
  tripType: 'Out of City',
  code: 'NANDI-5678',
};

const mockParticipants: Participant[] = [
  { id: '1', name: 'Dhanushree', mode: 'Cab (Ola)', eta: '25 min', status: 'On the way', avatarUrl: 'https://i.pravatar.cc/150?u=dhanushree', location: { lat: 13.35, lng: 77.67 } },
  { id: '2', name: 'Riya', mode: 'Rapido', eta: '18 min', status: 'On the way', avatarUrl: 'https://i.pravatar.cc/150?u=riya', location: { lat: 13.36, lng: 77.69 } },
  { id: '3', name: 'Rahul', mode: 'BMTC', eta: '40 min', status: 'Delayed', avatarUrl: 'https://i.pravatar.cc/150?u=rahul', location: { lat: 13.34, lng: 77.66 } },
  { id: '4', name: 'Akash', mode: 'Own Vehicle', eta: '30 min', status: 'Reached', avatarUrl: 'https://i.pravatar.cc/150?u=akash', location: { lat: 13.3702, lng: 77.6835 } },
];

const mockMessages: Message[] = [
    { id: '1', userName: 'Riya', text: 'Just left, traffic is crazy!', timestamp: '10:30 AM', avatarUrl: 'https://i.pravatar.cc/150?u=riya' },
    { id: '2', userName: 'Dhanushree', text: 'Same here, my cab is taking a detour.', timestamp: '10:32 AM', avatarUrl: 'https://i.pravatar.cc/150?u=dhanushree' },
    { id: '3', userName: 'Akash', text: 'I am already here, the view is amazing! 🌄', timestamp: '10:35 AM', avatarUrl: 'https://i.pravatar.cc/150?u=akash' },
];

const mockExpenses: Expense[] = [
    { id: '1', paidBy: 'Akash', amount: 300, label: 'Entry Tickets' },
    { id: '2', paidBy: 'Dhanushree', amount: 550, label: 'Breakfast' },
]


export default function TripPage() {
  const params = useParams();
  const { toast } = useToast();
  const [messages, setMessages] = useState(mockMessages);
  const [expenses, setExpenses] = useState(mockExpenses);

  const friendLocations = mockParticipants.map(p => ({
    id: p.id,
    name: p.name,
    ...p.location
  }));

  const copyCode = () => {
    navigator.clipboard.writeText(mockTrip.code);
    toast({ title: 'Trip code copied!' });
  };
  
  return (
    <div className="flex flex-col h-screen bg-gray-50 dark:bg-black">
      {/* Header */}
      <header className="flex-shrink-0 border-b bg-background">
        <div className="container mx-auto px-4 py-3">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <div>
              <h1 className="text-2xl font-bold font-heading">{mockTrip.name}</h1>
              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                 <p className="flex items-center gap-1"><MapPin className="h-4 w-4" /> {mockTrip.destination}</p>
                 <TripCodeBadge code={mockTrip.code} onCopy={copyCode} />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm"><Phone className="h-4 w-4 mr-2" /> Voice Call</Button>
              <Button variant="outline" size="sm"><Video className="h-4 w-4 mr-2" /> Video Call</Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 overflow-hidden">
        <div className="container mx-auto h-full px-4 py-4">
          <div className="grid md:grid-cols-3 lg:grid-cols-4 gap-6 h-full">
            
            {/* Left/Main Column */}
            <div className="md:col-span-2 lg:col-span-3 h-full flex flex-col gap-6">
               <Card className="flex-grow-[2] flex flex-col">
                  <MapClient friends={friendLocations} center={{lat: 13.3702, lng: 77.6835}} />
               </Card>
               <Card className="flex-grow-[1]">
                 <ParticipantsList participants={mockParticipants} />
               </Card>
            </div>

            {/* Right Column */}
            <div className="md:col-span-1 lg:col-span-1 h-full">
              <Card className="h-full flex flex-col">
                 <Tabs defaultValue="chat" className="flex-1 flex flex-col">
                  <TabsList className="p-2 w-full grid grid-cols-3">
                    <TabsTrigger value="chat"><MessageCircle className="h-4 w-4 mr-2" />Chat</TabsTrigger>
                    <TabsTrigger value="call"><Phone className="h-4 w-4 mr-2" />Call</TabsTrigger>
                    <TabsTrigger value="expenses"><CreditCard className="h-4 w-4 mr-2" />Expenses</TabsTrigger>
                  </TabsList>
                  <TabsContent value="chat" className="flex-1 overflow-y-auto">
                    <ChatBox messages={messages} onSendMessage={(text) => setMessages(prev => [...prev, {id: String(Date.now()), userName: "You", text, timestamp: new Date().toLocaleTimeString(), avatarUrl: 'https://i.pravatar.cc/150?u=me'}])} />
                  </TabsContent>
                  <TabsContent value="call" className="p-6 text-center">
                    <h3 className="font-semibold mb-2">Calling Feature</h3>
                    <p className="text-sm text-muted-foreground mb-4">Group voice and video calls are coming soon!</p>
                    <div className="flex flex-col gap-2">
                        <Button disabled><Phone className="h-4 w-4 mr-2" /> Start Voice Call</Button>
                        <Button disabled><Video className="h-4 w-4 mr-2" /> Start Video Call</Button>
                    </div>
                  </TabsContent>
                  <TabsContent value="expenses" className="flex-1 overflow-y-auto p-4">
                    <ExpenseCalculator 
                        participants={mockParticipants} 
                        expenses={expenses}
                        onAddExpense={(expense) => setExpenses(prev => [...prev, {...expense, id: String(Date.now())}])}
                    />
                  </TabsContent>
                </Tabs>
              </Card>
            </div>

          </div>
        </div>
      </main>
    </div>
  );
}
