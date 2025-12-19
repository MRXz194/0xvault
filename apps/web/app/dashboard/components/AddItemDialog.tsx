'use client';

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Plus } from 'lucide-react';

type AddItemDialogProps = {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  newItemType: string;
  setNewItemType: (v: string) => void;
  newItemName: string;
  setNewItemName: (v: string) => void;
  newItemSecret: string;
  setNewItemSecret: (v: string) => void;
  newItemNote: string;
  setNewItemNote: (v: string) => void;
  onSubmit: () => void;
};

export default function AddItemDialog(props: AddItemDialogProps) {
  const {
    open,
    onOpenChange,
    newItemType,
    setNewItemType,
    newItemName,
    setNewItemName,
    newItemSecret,
    setNewItemSecret,
    newItemNote,
    setNewItemNote,
    onSubmit,
  } = props;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        <Button><Plus className="mr-2 h-4 w-4" /> Add Item</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add New Secret</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>Type</Label>
            <Select value={newItemType} onValueChange={setNewItemType}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="crypto">Crypto Wallet</SelectItem>
                <SelectItem value="login">Login / Password</SelectItem>
                <SelectItem value="note">Secure Note</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Name</Label>
            <Input placeholder="e.g. MetaMask Main" value={newItemName} onChange={e => setNewItemName(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Secret Content (Will be Encrypted)</Label>
            <Textarea 
              placeholder="Private Key, Seed Phrase, or Password..." 
              className="font-mono text-xs"
              value={newItemSecret} 
              onChange={e => setNewItemSecret(e.target.value)} 
            />
          </div>
          <div className="space-y-2">
            <Label>Public Note (Optional)</Label>
            <Input placeholder="Network, Username, etc." value={newItemNote} onChange={e => setNewItemNote(e.target.value)} />
          </div>
          <Button className="w-full" onClick={onSubmit}>Encrypt & Save</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
