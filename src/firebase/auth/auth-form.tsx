
'use client';

import { getAuth, signInWithPopup, GoogleAuthProvider, signInAnonymously, linkWithPopup, User as FirebaseUser } from 'firebase/auth';
import { getFirestore, doc, getDoc, serverTimestamp } from 'firebase/firestore';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import Image from 'next/image';
import { PlaceHolderImages } from '@/lib/placeholder-images';
import { Separator } from '@/components/ui/separator';
import { User, CheckCircle2 } from 'lucide-react';
import { setDocumentNonBlocking } from '@/firebase';
import React, { useState } from 'react';
import { TIERS, Tier } from '@/lib/tiers';
import { cn } from '@/lib/utils';
import { ScrollArea } from '@/components/ui/scroll-area';

function GoogleIcon() {
  return (
    <svg className="h-5 w-5 mr-2" viewBox="0 0 533.5 544.3" xmlns="http://www.w3.org/2000/svg">
      <path
        d="M533.5 278.4c0-18.5-1.5-37.1-4.7-55.3H272.1v104.8h147c-6.1 33.8-25.7 63.7-54.4 82.7v68h87.7c51.5-47.4 81.1-117.4 81.1-200.2z"
        fill="#4285f4"
      />
      <path
        d="M272.1 544.3c73.4 0 135.3-24.1 180.4-65.7l-87.7-68c-24.4 16.6-55.9 26-92.7 26-71 0-131.2-47.9-152.8-112.3H28.9v70.1c46.2 91.9 140.3 149.9 243.2 149.9z"
        fill="#34a853"
      />
      <path
        d="M119.3 324.3c-11.4-33.8-11.4-70.4 0-104.2V150H28.9c-38.6 76.9-38.6 167.5 0 244.4l90.4-70.1z"
        fill="#fbbc04"
      />
      <path
        d="M272.1 107.7c38.8-.6 76.3 14 104.4 40.8l77.7-77.7C405 24.6 340.6 0 272.1 0 169.2 0 75.1 58 28.9 150l90.4 70.1c21.5-64.5 81.8-112.4 152.8-112.4z"
        fill="#ea4335"
      />
    </svg>
  );
}

interface AuthFormProps {
  allowAnonymous?: boolean;
  onLinkSuccess?: () => void;
  onUpgradeSuccess?: () => void;
}

export const TierCard = ({ tier, isSelected, onSelect, currentTierId }: { tier: Tier, isSelected: boolean, onSelect: (id: Tier['id']) => void, currentTierId?: Tier['id'] }) => {
  const isCurrent = currentTierId === tier.id;
  const showSelect = !isCurrent;

  const handleClick = () => {
    if (showSelect) {
      onSelect(tier.id);
    }
  }

  return (
    <Card
      className={cn(
        "cursor-pointer transition-all flex flex-col",
        isSelected && !isCurrent ? "border-accent ring-2 ring-accent" : "hover:border-muted-foreground/50",
        isCurrent && "border-accent ring-2 ring-accent",
        tier.id === 'enterprise' && 'bg-card/50 border-dashed'
      )}
      onClick={handleClick}
    >
      <CardHeader>
        <CardTitle>{tier.name}</CardTitle>
        <CardDescription className="flex items-baseline gap-1">
          <span className="text-2xl font-bold text-foreground">{tier.price}</span>
          <span className="text-sm">{tier.priceDescription}</span>
        </CardDescription>
      </CardHeader>
      <CardContent className="flex-grow">
        <ul className="space-y-2 text-sm text-muted-foreground">
          {tier.features.slice(0, 3).map((feature) => (
            <li key={feature} className="flex items-start gap-2">
              <CheckCircle2 className="h-4 w-4 mt-0.5 text-green-500 flex-shrink-0" />
              <span>{feature}</span>
            </li>
          ))}
        </ul>
      </CardContent>
      <CardFooter className="flex-col items-stretch gap-2 !pt-4">
        {tier.id === 'enterprise' ? (
          <Button variant="outline" disabled>Contact Sales</Button>
        ) : isCurrent ? (
           <Button variant={'outline'} disabled className="w-full">
            Your Current Plan
          </Button>
        ) : (
          <Button variant={isSelected ? "default" : "secondary"} className="w-full">
            {isSelected ? "Selected Plan" : tier.cta}
          </Button>
        )}
      </CardFooter>
    </Card>
  );
};


export default function AuthForm({ allowAnonymous = true, onLinkSuccess, onUpgradeSuccess }: AuthFormProps) {
  const auth = getAuth();
  const firestore = getFirestore();
  const { toast } = useToast();
  const wallpaper = PlaceHolderImages.find((img) => img.id === "aether-os-wallpaper");
  
  const [selectedTier, setSelectedTier] = useState<Tier['id']>('free');

  const provisionDefaultSubscription = async (user: FirebaseUser, tierId: string) => {
    const subscriptionRef = doc(firestore, 'subscriptions', user.uid);
    const subscriptionSnap = await getDoc(subscriptionRef);
    if (!subscriptionSnap.exists()) {
      setDocumentNonBlocking(subscriptionRef, {
        tier: tierId,
        status: 'active',
        startedAt: serverTimestamp(),
      });
    }
  };

  const handleAuthSuccess = (user: FirebaseUser, tierId: string) => {
    provisionDefaultSubscription(user, tierId as Tier['id']);
    toast({
      title: 'Authentication Successful',
      description: 'Welcome to AetherOS.',
    });
  }
  
  const handleGoogleSignIn = async () => {
    const provider = new GoogleAuthProvider();
    try {
      if (auth.currentUser?.isAnonymous) {
        await linkWithPopup(auth.currentUser, provider);
        // On upgrade, they keep their 'free-trial' status until it expires, or we could change it.
        // For now, we won't change the tier on upgrade, only on new sign-up.
        if (onLinkSuccess) onLinkSuccess();
        if (onUpgradeSuccess) onUpgradeSuccess();
      } else {
        const result = await signInWithPopup(auth, provider);
        handleAuthSuccess(result.user, selectedTier);
      }
    } catch (error: any) {
      console.error(error);
      toast({
        variant: 'destructive',
        title: 'Authentication Failed',
        description: error.message || 'An unexpected error occurred.',
      });
    }
  }
  
  const handleAnonymousSignIn = async () => {
    try {
      const { user } = await signInAnonymously(auth);
      const trialRef = doc(firestore, 'trialUsers', user.uid);
      setDocumentNonBlocking(trialRef, { trialStartedAt: serverTimestamp() });
       await provisionDefaultSubscription(user, 'free-trial');
      
      toast({
        title: 'Entering Trial Mode',
        description: 'You have 15 minutes to explore AetherOS.',
      });
    } catch (error: any) {
      console.error(error);
      toast({
        variant: 'destructive',
        title: 'Trial Mode Failed',
        description: error.message || 'An unexpected error occurred.',
      });
    }
  };

  const isUpgrading = !!auth.currentUser?.isAnonymous;

  return (
    <>
      <div className="h-screen w-screen flex items-center justify-center font-body bg-background p-4">
        {wallpaper && allowAnonymous && (
          <Image
            src={wallpaper.imageUrl}
            alt={wallpaper.description}
            data-ai-hint={wallpaper.imageHint}
            fill
            quality={100}
            className="object-cover z-0"
            priority
          />
        )}
        <Card className="w-full max-w-4xl z-10 bg-card/80 backdrop-blur-xl border-white/20">
          <CardHeader className="text-center">
            <CardTitle className="text-3xl font-headline">{isUpgrading ? 'Upgrade Your Account' : 'Welcome to AetherOS'}</CardTitle>
             {isUpgrading ? (
              <CardDescription>Create a permanent account to save your work and unlock all features.</CardDescription>
            ) : (
               allowAnonymous && <CardDescription>Choose your plan to get started, or continue as a guest.</CardDescription>
            )}
          </CardHeader>
          <CardContent className="flex flex-col gap-6">
            
            {!isUpgrading && allowAnonymous && (
                <div className="space-y-4">
                    <ScrollArea className="max-h-[420px] w-full">
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 p-1">
                           {TIERS.filter(t => t.id !== 'free-trial' && t.id !== 'enterprise').map(tier => (
                                <TierCard
                                    key={tier.id}
                                    tier={tier}
                                    isSelected={selectedTier === tier.id}
                                    onSelect={setSelectedTier}
                                />
                           ))}
                            <TierCard
                                tier={TIERS.find(t => t.id === 'enterprise')!}
                                isSelected={false}
                                onSelect={() => {}} // Contact sales is a different flow
                            />
                        </div>
                    </ScrollArea>
                </div>
            )}
            
            <div className="flex flex-col sm:flex-row gap-4">
                <Button className="w-full" onClick={handleGoogleSignIn}>
                <GoogleIcon />
                {isUpgrading ? 'Upgrade with Google' : 'Sign up with Google'}
                </Button>

                {allowAnonymous && !isUpgrading && (
                <>
                    <div className="relative flex items-center sm:hidden">
                        <Separator className="flex-grow" />
                        <span className="bg-card px-2 text-xs text-muted-foreground flex-shrink-0">OR</span>
                        <Separator className="flex-grow" />
                    </div>
                    <Button variant="secondary" className="w-full" onClick={handleAnonymousSignIn}>
                    <User className="mr-2 h-4 w-4" />
                    Continue as Guest
                    </Button>
                </>
                )}
            </div>

          </CardContent>
        </Card>
      </div>
    </>
  );
}
