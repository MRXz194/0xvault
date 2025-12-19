'use client';

import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';

type EditItemDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editName: string;
  setEditName: (v: string) => void;
  editNote: string;
  setEditNote: (v: string) => void;
  editSecret: string;
  setEditSecret: (v: string) => void;
  onSave: () => void;
};

export default function EditItemDialog(props: EditItemDialogProps) {
  const {
    open,
    onOpenChange,
    editName,
    setEditName,
    editNote,
    setEditNote,
    editSecret,
    setEditSecret,
    onSave,
  } = props;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit Item</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label>Name</Label>
            <Input value={editName} onChange={(e) => setEditName(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Public Note</Label>
            <Input value={editNote} onChange={(e) => setEditNote(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Secret (leave blank to keep unchanged)</Label>
            <Textarea
              value={editSecret}
              onChange={(e) => setEditSecret(e.target.value)}
              className="font-mono text-xs"
              placeholder="Enter new secret to re-encrypt"
            />
          </div>
        </div>
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={onSave}>Save</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
