
'use client';

import { getAuth, signInWithPopup, GoogleAuthProvider, signInAnonymously, linkWithPopup, User as FirebaseUser, OAuthProvider } from 'firebase/auth';
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

function AppleIcon() {
    return (
        <svg className="h-5 w-5 mr-2" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
            <path d="M19.329 14.653C19.329 14.653 21.536 12.518 21.517 9.48C21.517 9.48 20.043 6.305 17.29 6.241C17.29 6.241 15.228 6.131 13.818 7.72C13.818 7.72 12.83 8.848 12.378 10.1C11.926 11.352 11.233 15.332 13.626 17.633C13.626 17.633 14.735 18.66 16.291 18.641C17.847 18.622 18.339 17.755 20.303 17.633C20.303 17.633 22.189 17.518 23.418 15.58C23.418 15.58 21.517 19.988 18.253 21.96C18.253 21.96 15.027 24 12.378 24C9.729 24 6.503 21.96 6.503 21.96C3.201 20.007 1.376 15.58 1.376 15.58C0.128 13.623 1.953 13.508 1.953 13.508C3.889 13.393 4.42 14.26 6.365 14.382C8.31 14.504 9.143 13.637 10.93 13.508C12.717 13.38 13.333 14.26 14.93 14.382C16.527 14.504 17.02 13.637 18.43 13.508C19.84 13.38 19.329 14.653 19.329 14.653ZM15.011 4.316C15.011 4.316 16.12 -0.012 12.923 0C12.923 0 9.589 0.054 8.518 3.251C8.518 3.251 7.447 6.448 10.644 6.372C10.644 6.372 11.523 6.318 12.34 5.372C13.157 4.426 15.01 4.316 15.011 4.316Z"/>
        </svg>
    )
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
  
  const handleAuthSuccess = async (user: FirebaseUser) => {
    // For every new user, just create their customer record.
    // They will be directed to select a plan (including the free one) after this.
    const customerRef = doc(firestore, 'customers', user.uid);
    const customerSnap = await getDoc(customerRef);

    if (!customerSnap.exists()) {
        await setDoc(customerRef, { email: user.email, name: user.displayName });
        toast({
            title: 'Welcome to AetherOS!',
            description: 'Your account has been created. Please select a plan to continue.',
        });
    } else {
        toast({
            title: 'Welcome Back!',
            description: 'Successfully signed in to AetherOS.',
        });
    }
  }

  const handleOAuthSignIn = async (provider: GoogleAuthProvider | OAuthProvider) => {
    try {
      if (auth.currentUser?.isAnonymous) {
        const credential = await linkWithPopup(auth.currentUser, provider);
        if (onLinkSuccess) onLinkSuccess();
        await handleAuthSuccess(credential.user);
        if (onUpgradeSuccess) onUpgradeSuccess();
      } else {
        const result = await signInWithPopup(auth, provider);
        await handleAuthSuccess(result.user);
      }
    } catch (error: any) {
      console.error(error);
      toast({
        variant: 'destructive',
        title: 'Authentication Failed',
        description: error.message || 'An unexpected error occurred.',
      });
    }
  };

  const handleGoogleSignIn = () => {
    const provider = new GoogleAuthProvider();
    handleOAuthSignIn(provider);
  }

  const handleAppleSignIn = () => {
    const provider = new OAuthProvider('apple.com');
    handleOAuthSignIn(provider);
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
              <CardDescription>Link a Google or Apple account to save your work and unlock all features.</CardDescription>
            ) : (
               allowAnonymous && <CardDescription>Sign up or continue as a guest.</CardDescription>
            )}
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
             {allowAnonymous && !isUpgrading && (
                <Button variant="secondary" className="w-full" onClick={handleAnonymousSignIn}>
                    <User className="mr-2 h-4 w-4" />
                    Start 15-Min Trial
                </Button>
            )}

             <div className="relative flex items-center justify-center w-full">
                <Separator className="w-full" />
                <span className="absolute bg-card px-2 text-xs text-muted-foreground">OR</span>
            </div>

            <div className="flex flex-col sm:flex-row items-center gap-4">
              <Button className="w-full" onClick={handleGoogleSignIn}>
                <GoogleIcon />
                {isUpgrading ? 'Link Google Account' : 'Sign up with Google'}
              </Button>
              <Button className="w-full" onClick={handleAppleSignIn}>
                  <AppleIcon />
                  {isUpgrading ? 'Link Apple Account' : 'Sign up with Apple'}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
