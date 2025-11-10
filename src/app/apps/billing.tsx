
'use client';

import { useFirebase, useMemoFirebase, useDoc } from '@/firebase';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { doc } from 'firebase/firestore';
import { TIERS } from '@/lib/tiers';
import { TierCard } from '@/firebase/auth/auth-form';
import { useState } from 'react';

export default function BillingApp() {
    const { user, firestore } = useFirebase();
    const [selectedTier, setSelectedTier] = useState<string>('');


    const subscriptionRef = useMemoFirebase(() => {
        if (!firestore || !user?.uid) return null;
        return doc(firestore, 'subscriptions', user.uid);
    }, [firestore, user?.uid]);

    const { data: subscription, isLoading } = useDoc(subscriptionRef);
    
    // In a real app, this would be updated by a backend webhook from a payment processor
    const currentTierId = (subscription as any)?.tier || (user?.isAnonymous ? 'free-trial' : 'free');

  return (
    <div className="p-4 md:p-8 h-full bg-background overflow-y-auto">
      <h2 className="text-3xl font-headline mb-2">Plans & Pricing</h2>
      <p className="text-muted-foreground mb-8">Choose the plan that's right for you.</p>

        {isLoading ? (
            <div className="flex items-center justify-center h-64">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
        ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {TIERS.map((tier) => (
                    <TierCard
                        key={tier.id}
                        tier={tier}
                        isSelected={currentTierId === tier.id || selectedTier === tier.id}
                        onSelect={() => setSelectedTier(tier.id)}
                        currentTierId={currentTierId}
                    />
                ))}
            </div>
        )}
    </div>
  );
}
