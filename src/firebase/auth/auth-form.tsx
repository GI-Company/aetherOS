
'use client';

import { getAuth, signInWithPopup, GoogleAuthProvider, signInAnonymously, linkWithPopup, User as FirebaseUser } from 'firebase/auth';
import { getFirestore, doc, getDoc, serverTimestamp, setDoc, collection, query, getDocs, addDoc } from 'firebase/firestore';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import Image from 'next/image';
import { PlaceHolderImages } from '@/lib/placeholder-images';
import { Separator } from '@/components/ui/separator';
import { User } from 'lucide-react';
import { addDocumentNonBlocking, setDocumentNonBlocking } from '@/firebase';
import React from 'react';
import { TIERS } from '@/lib/tiers';

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

export default function AuthForm({ allowAnonymous = true, onLinkSuccess, onUpgradeSuccess }: AuthFormProps) {
  const auth = getAuth();
  const firestore = getFirestore();
  const { toast } = useToast();
  const wallpaper = PlaceHolderImages.find((img) => img.id === "aether-os-wallpaper");
  
  const handleAuthSuccess = async (user: FirebaseUser, isNewUser: boolean) => {
    if (isNewUser) {
        // For new users, just create the customer record for Stripe.
        // The user will be directed to the billing page to select a plan, including the free one.
        const customerRef = doc(firestore, 'customers', user.uid);
        await setDoc(customerRef, { email: user.email, name: user.displayName });
    }
    
    toast({
      title: 'Authentication Successful',
      description: 'Welcome to AetherOS. Please select a plan to continue.',
    });
  }
  
  const handleGoogleSignIn = async () => {
    const provider = new GoogleAuthProvider();
    try {
      if (auth.currentUser?.isAnonymous) {
        const credential = await linkWithPopup(auth.currentUser, provider);
        if (onLinkSuccess) onLinkSuccess();
        await handleAuthSuccess(credential.user, true); // Treat linked account as a new user
        if (onUpgradeSuccess) onUpgradeSuccess();
      } else {
        const result = await signInWithPopup(auth, provider);
        
        // A new user is one who doesn't have a subscription record yet.
        const subscriptionsQuery = query(collection(firestore, `users/${result.user.uid}/subscriptions`));
        const subscriptionsSnap = await getDocs(subscriptionsQuery);
        const isNewUser = subscriptionsSnap.empty;

        await handleAuthSuccess(result.user, isNewUser);
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
        <Card className="w-full max-w-lg z-10 bg-card/80 backdrop-blur-xl border-white/20">
          <CardHeader className="text-center">
            <CardTitle className="text-3xl font-headline">{isUpgrading ? 'Upgrade Your Account' : 'Welcome to AetherOS'}</CardTitle>
             {isUpgrading ? (
              <CardDescription>Link a Google account to save your work and unlock all features.</CardDescription>
            ) : (
               allowAnonymous && <CardDescription>Sign up with Google or continue as a guest.</CardDescription>
            )}
          </CardHeader>
          <CardContent className="flex flex-col gap-6">
            <div className="flex flex-col sm:flex-row items-center gap-4">
              <Button className="w-full" onClick={handleGoogleSignIn}>
                <GoogleIcon />
                {isUpgrading ? 'Link Google Account' : 'Continue with Google'}
              </Button>

              {allowAnonymous && !isUpgrading && (
                <>
                  <div className="relative flex items-center justify-center w-full sm:w-auto">
                    <Separator className="w-full sm:w-px sm:h-6" orientation="horizontal" />
                    <span className="absolute bg-card px-2 text-xs text-muted-foreground">OR</span>
                  </div>
                  <Button variant="secondary" className="w-full" onClick={handleAnonymousSignIn}>
                    <User className="mr-2 h-4 w-4" />
                    Start 15-Min Trial
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
