import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { BrainCircuit } from 'lucide-react';

interface QuizConfigDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onGenerate: (count: number) => void;
  isGenerating: boolean;
}

const QuizConfigDialog = ({ open, onOpenChange, onGenerate, isGenerating }: QuizConfigDialogProps) => {
  const [count, setCount] = useState(5);

  const handleGenerate = () => {
    onGenerate(count);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[400px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-gray-900">
            <BrainCircuit className="h-5 w-5 text-emerald-600" />
            Generate Quiz
          </DialogTitle>
        </DialogHeader>
        
        <div className="py-6 space-y-6">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
                <Label className="text-base font-medium text-gray-700">Number of Questions</Label>
                <span className="text-lg font-bold text-emerald-600 bg-emerald-50 px-3 py-1 rounded-md border border-emerald-100">
                    {count}
                </span>
            </div>
            <p className="text-xs text-gray-500">
                Select how many questions Alina should generate from your sources.
            </p>
          </div>
          
          <Slider
            value={[count]}
            onValueChange={(vals) => setCount(vals[0])}
            max={10}
            min={1}
            step={1}
            className="w-full py-4"
          />
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isGenerating}>
            Cancel
          </Button>
          <Button onClick={handleGenerate} disabled={isGenerating} className="bg-emerald-600 hover:bg-emerald-700 text-white">
            {isGenerating ? 'Starting...' : 'Start Generation'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default QuizConfigDialog;