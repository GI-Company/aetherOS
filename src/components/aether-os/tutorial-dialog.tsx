
'use client';

import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import type { Tutorial } from '@/lib/tutorials';

interface TutorialDialogProps {
  tutorial: Tutorial;
  onFinish: (dontShowAgain: boolean) => void;
  onSkip: () => void;
}

export default function TutorialDialog({ tutorial, onFinish, onSkip }: TutorialDialogProps) {
  const [step, setStep] = useState(0);
  const [dontShowAgain, setDontShowAgain] = useState(false);

  const currentStep = tutorial.steps[step];
  const isLastStep = step === tutorial.steps.length - 1;
  const StepIcon = currentStep.icon;

  const handleNext = () => {
    if (isLastStep) {
      onFinish(dontShowAgain);
    } else {
      setStep(prev => prev + 1);
    }
  };

  return (
    <Dialog open={true} onOpenChange={(open) => !open && onSkip()}>
      <DialogContent className="sm:max-w-[425px]" onInteractOutside={(e) => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle>{tutorial.title}</DialogTitle>
          <div className="flex flex-col gap-4 pt-4">
              <div className="flex items-center gap-3">
                 {StepIcon && <StepIcon className="h-8 w-8 text-accent flex-shrink-0" />}
                <div className='flex flex-col gap-1.5'>
                    <h3 className="font-semibold text-foreground">{currentStep.title}</h3>
                    <DialogDescription>{currentStep.description}</DialogDescription>
                </div>
              </div>
          </div>
        </DialogHeader>
        
        <DialogFooter className="sm:justify-between items-center mt-4">
          <div className="flex items-center space-x-2">
            <Checkbox
              id="dont-show-again"
              checked={dontShowAgain}
              onCheckedChange={(checked) => setDontShowAgain(checked as boolean)}
            />
            <Label htmlFor="dont-show-again" className="text-sm font-normal">
              Don't show this again
            </Label>
          </div>
          <div className="flex gap-2">
            <Button type="button" variant="ghost" onClick={onSkip}>
              Skip
            </Button>
            <Button type="button" onClick={handleNext}>
              {isLastStep ? 'Finish' : 'Next'}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
