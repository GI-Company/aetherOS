
'use client';

import { useState, useEffect } from 'react';
import { useFirestore, useDoc, useMemoFirebase } from '@/firebase';
import { getAuth, signOut } from 'firebase/auth';
import { doc } from 'firebase/firestore';
import { useToast } from './use-toast';
import type { User } from 'firebase/auth';

const TRIAL_DURATION_MS = 15 * 60 * 1000; // 15 minutes

export function useTrialTimer(user: User | null) {
  const firestore = useFirestore();
  const { toast } = useToast();
  const [timeRemaining, setTimeRemaining] = useState(TRIAL_DURATION_MS);
  
  const trialUserRef = useMemoFirebase(() => {
    if (!firestore || !user?.uid || !user.isAnonymous) return null;
    return doc(firestore, 'trialUsers', user.uid);
  }, [firestore, user?.uid, user?.isAnonymous]);

  const { data: trialData } = useDoc(trialUserRef);

  useEffect(() => {
    if (!user?.isAnonymous || !trialData) {
      setTimeRemaining(TRIAL_DURATION_MS);
      return;
    }
    
    const interval = setInterval(() => {
      const trialStartedAt = (trialData as any).trialStartedAt?.toDate();
      if (!trialStartedAt) return;

      const now = new Date();
      const elapsed = now.getTime() - trialStartedAt.getTime();
      const remaining = TRIAL_DURATION_MS - elapsed;

      if (remaining <= 0) {
        setTimeRemaining(0);
        clearInterval(interval);
        toast({
          title: 'Trial has ended',
          description: 'Please sign in with Google to save your progress and continue.',
          variant: 'destructive',
          duration: 10000,
        });
        signOut(getAuth());
      } else {
        setTimeRemaining(remaining);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [user, trialData, toast]);

  const minutes = Math.floor(timeRemaining / 60000);
  const seconds = Math.floor((timeRemaining % 60000) / 1000);

  return {
    timeRemaining,
    formattedTime: `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`,
  };
}
