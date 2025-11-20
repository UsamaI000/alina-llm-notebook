import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface RenameQuizDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (newTitle: string) => void;
  currentTitle: string;
}

const RenameQuizDialog = ({ open, onOpenChange, onConfirm, currentTitle }: RenameQuizDialogProps) => {
  const [title, setTitle] = useState(currentTitle);

  useEffect(() => {
    setTitle(currentTitle);
  }, [currentTitle, open]);

  const handleConfirm = () => {
    if (title.trim()) {
      onConfirm(title);
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[400px]">
        <DialogHeader>
          <DialogTitle>Rename Quiz</DialogTitle>
        </DialogHeader>
        <div className="py-4">
          <Label htmlFor="name" className="text-right mb-2 block">Name</Label>
          <Input id="name" value={title} onChange={(e) => setTitle(e.target.value)} className="col-span-3" />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleConfirm} className="bg-emerald-600 hover:bg-emerald-700 text-white">Save changes</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default RenameQuizDialog;