'use client';

import { useState, useMemo } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Participant } from './ParticipantsList';

export type Expense = {
  id: string;
  paidBy: string;
  amount: number;
  label: string;
};

type ExpenseCalculatorProps = {
  participants: Participant[];
  expenses: Expense[];
  onAddExpense: (newExpense: Omit<Expense, 'id'>) => void;
};

export function ExpenseCalculator({
  participants,
  expenses,
  onAddExpense,
}: ExpenseCalculatorProps) {
  const [paidBy, setPaidBy] = useState(participants[0]?.name || '');
  const [amount, setAmount] = useState('');
  const [label, setLabel] = useState('');

  const handleAdd = () => {
    if (!paidBy || !amount || !label) return;
    onAddExpense({
      paidBy,
      amount: parseFloat(amount),
      label,
    });
    setAmount('');
    setLabel('');
  };

  const splitSummary = useMemo(() => {
    const totalExpense = expenses.reduce((sum, e) => sum + e.amount, 0);
    const sharePerPerson = totalExpense / participants.length;

    const paidByEach = participants.reduce((acc, p) => {
      acc[p.name] = 0;
      return acc;
    }, {} as Record<string, number>);

    expenses.forEach(e => {
        if(paidByEach[e.paidBy] !== undefined) {
            paidByEach[e.paidBy] += e.amount;
        }
    });

    return participants.map(p => {
        const paid = paidByEach[p.name];
        const balance = paid - sharePerPerson;
        return {
            name: p.name,
            paid,
            shouldPay: sharePerPerson,
            balance,
        };
    });

  }, [expenses, participants]);

  return (
    <div className="space-y-6 p-1">
      <div>
        <h4 className="font-semibold mb-2">Add New Expense</h4>
        <div className="grid grid-cols-1 gap-2">
            <Select value={paidBy} onValueChange={setPaidBy}>
              <SelectTrigger>
                <SelectValue placeholder="Paid by..." />
              </SelectTrigger>
              <SelectContent>
                {participants.map((p) => (
                  <SelectItem key={p.id} value={p.name}>
                    {p.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className='flex gap-2'>
                <Input
                    type="number"
                    placeholder="Amount"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                />
                <Input
                    placeholder="For what?"
                    value={label}
                    onChange={(e) => setLabel(e.target.value)}
                />
            </div>
          <Button onClick={handleAdd}>Add Expense</Button>
        </div>
      </div>
      
      <Separator />

      <div>
        <h4 className="font-semibold mb-2">Expense List</h4>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Paid By</TableHead>
              <TableHead>For</TableHead>
              <TableHead className="text-right">Amount</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {expenses.map((e) => (
              <TableRow key={e.id}>
                <TableCell>{e.paidBy}</TableCell>
                <TableCell>{e.label}</TableCell>
                <TableCell className="text-right">₹{e.amount.toFixed(2)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <Separator />

       <div>
        <h4 className="font-semibold mb-2">Split Summary</h4>
        <Table>
            <TableHeader>
                <TableRow>
                    <TableHead>Person</TableHead>
                    <TableHead className="text-right">Balance</TableHead>
                </TableRow>
            </TableHeader>
             <TableBody>
                {splitSummary.map(s => (
                    <TableRow key={s.name}>
                        <TableCell className="font-medium">{s.name}</TableCell>
                        <TableCell className={`text-right font-semibold ${s.balance > 0 ? 'text-green-600' : s.balance < 0 ? 'text-red-600' : 'text-muted-foreground'}`}>
                           {s.balance > 0 ? `+₹${s.balance.toFixed(2)}` : `₹${s.balance.toFixed(2)}`}
                        </TableCell>
                    </TableRow>
                ))}
            </TableBody>
        </Table>
      </div>
    </div>
  );
}
