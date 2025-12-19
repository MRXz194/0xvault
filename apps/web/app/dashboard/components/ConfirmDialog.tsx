'use client';

import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: 'delete' | 'purge';
  onConfirm: () => void;
};

export default function ConfirmDialog({ open, onOpenChange, mode, onConfirm }: Props) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{mode === 'delete' ? 'Move to Trash' : 'Delete permanently'}</DialogTitle>
        </DialogHeader>
        <div className="text-sm text-muted-foreground">
          {mode === 'delete'
            ? 'This item will be moved to Trash and can be restored later.'
            : 'This action cannot be undone. The item will be permanently deleted.'}
        </div>
        <div className="flex justify-end gap-2 pt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button variant={mode === 'delete' ? 'default' : 'destructive'} onClick={onConfirm}>Confirm</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
