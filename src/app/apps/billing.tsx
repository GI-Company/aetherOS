
'use client';

import { useFirebase, useMemoFirebase, useDoc, setDocumentNonBlocking } from '@/firebase';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Loader2 } from 'lucide-react';
import { doc } from 'firebase/firestore';
import { TIERS, Tier } from '@/lib/tiers';
import { TierCard } from '@/components/aether-os/tier-card';
import { useState } from 'react';
import { useToast } from '@/hooks/use-toast';

export default function BillingApp() {
    const { user, firestore } = useFirebase();
    const [selectedTierId, setSelectedTierId] = useState<string | null>(null);
    const [isUpgrading, setIsUpgrading] = useState(false);
    const { toast } = useToast();

    const subscriptionRef = useMemoFirebase(() => {
        if (!firestore || !user?.uid) return null;
        return doc(firestore, 'subscriptions', user.uid);
    }, [firestore, user?.uid]);

    const { data: subscription, isLoading } = useDoc(subscriptionRef);
    
    const currentTierId = (subscription as any)?.tier || (user?.isAnonymous ? 'free-trial' : 'free');
    const selectedTier = TIERS.find(t => t.id === selectedTierId);

    const handleSelectTier = (tierId: string) => {
        const selected = TIERS.find(t => t.id === tierId);
        if (!selected || selected.id === 'enterprise' || selected.id === currentTierId) {
            return;
        }
        setSelectedTierId(tierId);
    }
    
    const handleConfirmUpgrade = () => {
        if (!selectedTierId || !subscriptionRef) return;
        setIsUpgrading(true);
        
        setDocumentNonBlocking(subscriptionRef, { tier: selectedTierId }, { merge: true });

        // Simulate a delay for the non-blocking update to process
        setTimeout(() => {
            toast({
                title: "Upgrade Successful!",
                description: `You are now on the ${selectedTier?.name} plan.`
            });
            setSelectedTierId(null);
            setIsUpgrading(false);
        }, 1500);
    }


  return (
    <div className="p-4 md:p-8 h-full bg-background overflow-y-auto">
      <div className="flex justify-between items-center mb-8">
        <div>
            <h2 className="text-3xl font-headline mb-2">Plans & Pricing</h2>
            <p className="text-muted-foreground">Choose the plan that's right for you.</p>
        </div>
        {selectedTier && (
            <Card className="p-4 bg-card/80 backdrop-blur-sm">
                <div className="flex items-center gap-4">
                    <div>
                        <p className="text-sm text-muted-foreground">Upgrading to:</p>
                        <p className="text-lg font-semibold">{selectedTier.name}</p>
                    </div>
                    <Button onClick={handleConfirmUpgrade} disabled={isUpgrading}>
                        {isUpgrading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Confirm Upgrade
                    </Button>
                </div>
            </Card>
        )}
      </div>

        {isLoading ? (
            <div className="flex items-center justify-center h-64">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
        ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-6">
                {TIERS.map((tier) => (
                    <TierCard
                        key={tier.id}
                        tier={tier}
                        isSelected={selectedTierId === tier.id}
                        onSelect={() => handleSelectTier(tier.id)}
                        currentTierId={currentTierId}
                    />
                ))}
            </div>
        )}
    </div>
  );
}
