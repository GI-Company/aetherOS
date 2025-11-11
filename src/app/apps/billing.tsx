
'use client';

import { useFirebase, useMemoFirebase, useCollection, addDocumentNonBlocking, errorEmitter, FirestorePermissionError, setDocumentNonBlocking } from '@/firebase';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Loader2, CreditCard, AlertTriangle } from 'lucide-react';
import { doc, collection, query, where, getDocs, onSnapshot, serverTimestamp } from 'firebase/firestore';
import { TIERS, Tier } from '@/lib/tiers';
import { TierCard } from '@/components/aether-os/tier-card';
import React, { useState } from 'react';
import { useToast } from '@/hooks/use-toast';
import { loadStripe } from '@stripe/stripe-js';

const stripePublishableKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || '';
const stripePromise = stripePublishableKey ? loadStripe(stripePublishableKey) : null;


interface Product {
    id: string;
    role: string;
    // other product fields
}

interface Price {
    id: string;
    // other price fields
}

export default function BillingApp() {
    const { user, firestore } = useFirebase();
    const [selectedTierId, setSelectedTierId] = useState<string | null>(null);
    const [isRedirecting, setIsRedirecting] = useState(false);
    const { toast } = useToast();

    // Fetch the user's current subscription
    const subscriptionsQuery = useMemoFirebase(() => {
        if (!firestore || !user?.uid) return null;
        return query(
            collection(firestore, `users/${user.uid}/subscriptions`),
            where('status', 'in', ['trialing', 'active'])
        );
    }, [firestore, user?.uid]);

    const { data: subscriptions, isLoading: isSubscriptionLoading } = useCollection(subscriptionsQuery);
    const subscription = subscriptions?.[0];
    const currentTierId = (subscription as any)?.role || (user?.isAnonymous ? 'free-trial' : undefined);

    // Fetch available products from Firestore (which are synced from Stripe by the extension)
    const productsQuery = useMemoFirebase(() => {
        if (!firestore) return null;
        return query(collection(firestore, 'products'), where('active', '==', true));
    }, [firestore]);

    const { data: products, isLoading: isProductsLoading } = useCollection<Product>(productsQuery);
    
    const handleFreeTierSelection = async () => {
        if (!user || !firestore || !products) return;

        setIsRedirecting(true);
        setSelectedTierId('free');
        toast({ title: 'Setting up Free Plan...', description: 'Please wait while we configure your account.' });
        
        const product = products.find(p => p.role === 'free');
        if (!product) {
            toast({ title: 'Error', description: 'Free plan is not available.', variant: 'destructive'});
            setIsRedirecting(false);
            return;
        }

        const subscriptionRef = doc(firestore, `users/${user.uid}/subscriptions`, `free-plan-${Date.now()}`);
        const subscriptionPayload = {
            role: 'free',
            status: 'active',
            created: serverTimestamp(),
            product: doc(firestore, 'products', product.id),
            // Add other necessary fields for a free subscription
        };

        try {
            await setDocumentNonBlocking(subscriptionRef, subscriptionPayload);
            toast({ title: 'Success!', description: 'You are now on the Free plan.' });
        } catch (clientError) {
             console.error("Failed to set free plan:", clientError);
             toast({ title: 'Client Error', description: 'Could not set up the free plan.', variant: 'destructive' });
        } finally {
            setIsRedirecting(false);
            setSelectedTierId(null);
        }
    };

    const redirectToCheckout = async (tier: Tier) => {
        if (!user || !firestore || !products || !stripePromise) return;
        
        if (tier.id === 'free') {
            await handleFreeTierSelection();
            return;
        }

        setIsRedirecting(true);
        setSelectedTierId(tier.id);
        toast({ title: 'Preparing Checkout...', description: 'Please wait while we connect to Stripe.' });

        const product = products.find(p => p.role === tier.id);
        if (!product) {
            toast({ title: 'Error', description: 'Selected plan is not available.', variant: 'destructive'});
            setIsRedirecting(false);
            return;
        }

        // Fetch the price for the selected product
        const pricesQuery = query(collection(firestore, `products/${product.id}/prices`));
        const priceSnap = await getDocs(pricesQuery);
        const priceDoc = priceSnap.docs[0];
        
        if (!priceDoc) {
             toast({ title: 'Error', description: 'Pricing for this plan is not available.', variant: 'destructive'});
             setIsRedirecting(false);
            return;
        }
        
        const priceId = priceDoc.id;

        // Create a checkout session document in Firestore
        const checkoutSessionRef = collection(firestore, `customers/${user.uid}/checkout_sessions`);
        const sessionPayload = {
            price: priceId,
            success_url: window.location.origin,
            cancel_url: window.location.href,
            mode: 'subscription', // This is the required parameter for subscription-based checkouts.
            // Automatically associate with the logged-in user in Stripe
            // by creating the checkout session under their customer document.
        };
        
        try {
            const docRef = await addDocumentNonBlocking(checkoutSessionRef, sessionPayload);
            if (!docRef) { // Error was already handled by the non-blocking function
                setIsRedirecting(false);
                return; 
            }
            
            // Listen for the checkout URL to be populated by the Stripe extension
            const unsubscribe = onSnapshot(docRef, (snap) => {
                const { error, url } = snap.data() || {};
                if (error) {
                    toast({ title: 'Checkout Error', description: error.message, variant: 'destructive' });
                    setIsRedirecting(false);
                    unsubscribe();
                }
                if (url) {
                    window.location.assign(url);
                    unsubscribe();
                }
            });
        } catch (clientError) {
             // This will catch client-side errors before the promise is even made.
             // Firestore permission errors are handled inside addDocumentNonBlocking.
             console.error("Failed to initiate checkout session creation:", clientError);
             toast({ title: 'Client Error', description: 'Could not start checkout process.', variant: 'destructive' });
             setIsRedirecting(false);
        }
    };
    
    if (!stripePromise) {
        return (
            <div className="p-4 md:p-8 h-full bg-background overflow-y-auto flex items-center justify-center">
                <Card className="max-w-md w-full text-center p-8 bg-card/80 border-destructive/50">
                    <AlertTriangle className="h-12 w-12 text-destructive mx-auto mb-4"/>
                    <h2 className="text-2xl font-headline mb-2">Billing Not Configured</h2>
                    <p className="text-muted-foreground">
                        This application requires a Stripe publishable key to function. Please add your key to the 
                        <code className="bg-muted px-1.5 py-1 rounded-sm text-sm mx-1 font-mono">.env</code> 
                        file as <code className="bg-muted px-1.5 py-1 rounded-sm text-sm mx-1 font-mono">NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY</code>.
                    </p>
                </Card>
            </div>
        )
    }
    
    const isLoading = isSubscriptionLoading || isProductsLoading;

  return (
    <div className="p-4 md:p-8 h-full bg-background overflow-y-auto">
      <div className="flex justify-between items-center mb-8">
        <div>
            <h2 className="text-3xl font-headline mb-2">Plans & Pricing</h2>
            <p className="text-muted-foreground">Choose the plan that's right for you.</p>
        </div>
        {isRedirecting && selectedTierId && (
            <Card className="p-4 bg-card/80 backdrop-blur-sm">
                <div className="flex items-center gap-4">
                    <div>
                        <p className="text-sm text-muted-foreground">Processing:</p>
                        <p className="text-lg font-semibold">{TIERS.find(t => t.id === selectedTierId)?.name}</p>
                    </div>
                     <Loader2 className="h-6 w-6 animate-spin" />
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
                        isSelected={selectedTierId === tier.id && isRedirecting}
                        onSelect={() => redirectToCheckout(tier)}
                        currentTierId={currentTierId}
                        isSelectable={!isRedirecting && !user?.isAnonymous}
                    />
                ))}
            </div>
        )}
         <div className="text-center text-xs text-muted-foreground mt-8">
            <p>Payments are processed securely by Stripe. The "Run Payments with Stripe" Firebase Extension is required for full functionality.</p>
        </div>
    </div>
  );
}
