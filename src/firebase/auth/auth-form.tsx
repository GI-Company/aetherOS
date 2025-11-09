
'use client';

import { getAuth, signInWithPopup, GoogleAuthProvider, signInAnonymously, linkWithPopup, User as FirebaseUser } from 'firebase/auth';
import { getFirestore, doc, getDoc, serverTimestamp } from 'firebase/firestore';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import Image from 'next/image';
import { PlaceHolderImages } from '@/lib/placeholder-images';
import { Separator } from '@/components/ui/separator';
import { User } from 'lucide-react';
import { setDocumentNonBlocking } from '@/firebase/non-blocking-updates';
import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { TIERS, Tier } from '@/lib/tiers';
import { cn } from '@/lib/utils';

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

const TierSelectionDialog = ({ open, onOpenChange, onSelectTier, selectedTier, setSelectedTier }: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelectTier: () => void;
  selectedTier: string;
  setSelectedTier: (tierId: string) => void;
}) => (
  <Dialog open={open} onOpenChange={onOpenChange}>
    <DialogContent>
      <DialogHeader>
        <DialogTitle>Choose Your Plan</DialogTitle>
        <DialogDescription>Select a plan to get started. You can change this later in the billing settings.</DialogDescription>
      </DialogHeader>
      <RadioGroup value={selectedTier} onValueChange={setSelectedTier} className="grid gap-4 py-4">
        {TIERS.filter(t => t.id !== 'free-trial').map(tier => (
          <Label htmlFor={tier.id} key={tier.id} className={cn(
            "flex flex-col items-start gap-2 rounded-lg border p-4 cursor-pointer transition-all",
            "hover:bg-accent/50",
            selectedTier === tier.id && "bg-accent/80 border-accent ring-2 ring-accent"
          )}>
            <div className="flex items-center w-full">
              <RadioGroupItem value={tier.id} id={tier.id} />
              <div className="ml-4 w-full">
                <div className="flex justify-between items-center">
                  <span className="font-semibold text-foreground">{tier.name}</span>
                  <span className="font-bold text-lg text-foreground">{tier.price}</span>
                </div>
                <span className="text-sm text-muted-foreground">{tier.priceDescription}</span>
              </div>
            </div>
            <ul className="mt-2 space-y-1 text-xs text-muted-foreground pl-6">
              {tier.features.slice(0,2).map(feature => (
                <li key={feature}>- {feature}</li>
              ))}
            </ul>
          </Label>
        ))}
      </RadioGroup>
      <DialogFooter>
        <Button onClick={onSelectTier} disabled={!selectedTier}>Continue with Google</Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
);


export default function AuthForm({ allowAnonymous = true, onLinkSuccess, onUpgradeSuccess }: AuthFormProps) {
  const auth = getAuth();
  const firestore = getFirestore();
  const { toast } = useToast();
  const wallpaper = PlaceHolderImages.find((img) => img.id === "aether-os-wallpaper");
  
  const [isTierSelectionOpen, setIsTierSelectionOpen] = useState(false);
  const [selectedTier, setSelectedTier] = useState<string>('free');

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
    provisionDefaultSubscription(user, tierId);
    toast({
      title: 'Authentication Successful',
      description: 'Welcome to AetherOS.',
    });
  }
  
  const startGoogleSignIn = async () => {
    setIsTierSelectionOpen(false); // Close the dialog
    const provider = new GoogleAuthProvider();
    try {
      if (auth.currentUser?.isAnonymous) {
        await linkWithPopup(auth.currentUser, provider);
        // The onAuthStateChanged listener will handle the user update.
        // We can call the success callbacks here.
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

  const handleGoogleSignIn = async () => {
    if (auth.currentUser?.isAnonymous) {
      // For linking, we don't need to ask for a tier again.
      // We can just proceed with the linking.
      await startGoogleSignIn();
    } else {
      // For new sign-ups, show the tier selection
      setIsTierSelectionOpen(true);
    }
  };
  
  const handleAnonymousSignIn = async () => {
    try {
      const { user } = await signInAnonymously(auth);
      // Create the trial document immediately after anonymous sign-in
      const trialRef = doc(firestore, 'trialUsers', user.uid);
      await setDocumentNonBlocking(trialRef, { trialStartedAt: serverTimestamp() });
      
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


  return (
    <>
      <TierSelectionDialog
        open={isTierSelectionOpen}
        onOpenChange={setIsTierSelectionOpen}
        onSelectTier={startGoogleSignIn}
        selectedTier={selectedTier}
        setSelectedTier={setSelectedTier}
      />
      <div className="h-screen w-screen flex items-center justify-center font-body bg-background">
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
        <Card className="w-full max-w-sm z-10 bg-card/80 backdrop-blur-xl border-white/20">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl font-headline">AetherOS</CardTitle>
            {allowAnonymous && <CardDescription>The next generation of operating systems.</CardDescription>}
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <Button className="w-full" onClick={handleGoogleSignIn}>
              <GoogleIcon />
              {auth.currentUser?.isAnonymous ? 'Upgrade with Google' : 'Sign in with Google'}
            </Button>

            {allowAnonymous && (
              <>
                <div className="relative">
                  <Separator />
                  <span className="absolute left-1/2 -translate-x-1/2 -top-2.5 bg-card px-2 text-xs text-muted-foreground">OR</span>
                </div>
                <Button variant="secondary" className="w-full" onClick={handleAnonymousSignIn}>
                  <User className="mr-2 h-4 w-4" />
                  Continue as Guest
                </Button>
              </>
            )}

          </CardContent>
        </Card>
      </div>
    </>
  );
}
