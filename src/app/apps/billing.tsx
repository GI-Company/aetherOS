
'use client';

import { useFirebase, useMemoFirebase, useDoc } from '@/firebase';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { CheckCircle2, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { doc } from 'firebase/firestore';
import { TIERS } from '@/lib/tiers';

export default function BillingApp() {
    const { user, firestore } = useFirebase();

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
                <Card key={tier.id} className={cn("flex flex-col", currentTierId === tier.id && "border-accent ring-2 ring-accent")}>
                    <CardHeader>
                    <CardTitle>{tier.name}</CardTitle>
                    <CardDescription className="flex items-baseline gap-1">
                        <span className="text-3xl font-bold">{tier.price}</span>
                        <span>{tier.priceDescription}</span>
                    </CardDescription>
                    </CardHeader>
                    <CardContent className="flex-grow">
                    <ul className="space-y-2 text-sm">
                        {tier.features.map((feature) => (
                        <li key={feature} className="flex items-center gap-2">
                            <CheckCircle2 className="h-4 w-4 text-green-500" />
                            <span>{feature}</span>
                        </li>
                        ))}
                    </ul>
                    </CardContent>
                    <CardFooter>
                    <Button 
                        className="w-full"
                        disabled={currentTierId === tier.id || isLoading}
                        variant={currentTierId === tier.id ? 'outline' : 'default'}
                    >
                        {currentTierId === tier.id ? 'Your Current Plan' : tier.cta}
                    </Button>
                    </CardFooter>
                </Card>
                ))}
            </div>
        )}
    </div>
  );
}

    