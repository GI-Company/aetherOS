
'use client';

import {Button} from '@/components/ui/button';
import {Label}from '@/components/ui/label';
import {Textarea}from '@/components/ui/textarea';
import {Tabs, TabsContent, TabsList, TabsTrigger} from '@/components/ui/tabs';
import {generateAdaptivePalette} from '@/ai/flows/adaptive-color-palettes';
import {generateAccentColor} from '@/ai/flows/generate-accent-color';
import {useState, useEffect} from 'react';
import {useToast} from '@/hooks/use-toast';
import {
  Wand2,
  Loader2,
  Palette,
  Sparkles,
  User,
  PartyPopper,
  CreditCard,
  ShieldCheck,
  Timer,
} from 'lucide-react';
import {Separator} from '@/components/ui/separator';
import {useTheme} from '@/hooks/use-theme';
import {useFirebase, useDoc, useMemoFirebase} from '@/firebase';
import AuthForm from '@/firebase/auth/auth-form';
import {App, APPS} from '@/lib/apps';
import {Input} from '@/components/ui/input';
import {
  getAuth,
  RecaptchaVerifier,
  signInWithPhoneNumber,
  ConfirmationResult,
} from 'firebase/auth';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { doc } from 'firebase/firestore';
import { setDocumentNonBlocking } from '@/firebase';


interface SettingsAppProps {
  onOpenApp?: (app: App, props?: Record<string, any>) => void;
  defaultTab?: string;
}

export default function SettingsApp({onOpenApp, defaultTab}: SettingsAppProps) {
  const [themePrompt, setThemePrompt] = useState('');
  const [accentPrompt, setAccentPrompt] = useState('');
  const [isLoading, setIsLoading] = useState<'theme' | 'accent' | 'otp' | null>(
    null
  );
  const {toast} = useToast();
  const {applyTheme, setScheme} = useTheme();
  const {user, firestore} = useFirebase();
  const auth = getAuth();

  const [phoneNumber, setPhoneNumber] = useState('');
  const [otp, setOtp] = useState('');
  const [confirmationResult, setConfirmationResult] =
    useState<ConfirmationResult | null>(null);
  const [recaptchaVerifier, setRecaptchaVerifier] =
    useState<RecaptchaVerifier | null>(null);

  const userPreferencesRef = useMemoFirebase(() => {
    if (!firestore || !user?.uid || user.isAnonymous) return null;
    return doc(firestore, 'userPreferences', user.uid);
  }, [firestore, user?.uid, user?.isAnonymous]);

  const { data: userPreferences, isLoading: isPreferencesLoading } = useDoc(userPreferencesRef);
  
  const autoSignOutMinutes = (userPreferences as any)?.security?.autoSignOutMinutes ?? 0;

  useEffect(() => {
    if (user && !user.isAnonymous && !recaptchaVerifier) {
      const verifier = new RecaptchaVerifier(auth, 'recaptcha-container', {
        size: 'invisible',
        callback: (response: any) => {},
      });
      setRecaptchaVerifier(verifier);
    }
  }, [user, auth, recaptchaVerifier]);

  const handleGenerateTheme = async () => {
    if (!themePrompt) {
      toast({
        title: 'Error',
        description: 'Please enter a content description.',
        variant: 'destructive',
      });
      return;
    }
    setIsLoading('theme');
    try {
      const result = await generateAdaptivePalette({
        contentDescription: themePrompt,
      });
      applyTheme({palette: result.palette});
      toast({
        title: 'Base Theme Applied!',
        description: 'The new adaptive base theme has been set.',
      });
    } catch (e) {
      console.error(e);
      toast({
        title: 'Error',
        description: 'Failed to generate theme.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(null);
    }
  };

  const handleGenerateAccent = async () => {
    if (!accentPrompt) {
      toast({
        title: 'Error',
        description: 'Please enter an accent description.',
        variant: 'destructive',
      });
      return;
    }
    setIsLoading('accent');
    try {
      const result = await generateAccentColor({description: accentPrompt});
      const {accentColor} = result;

      const rgb = parseInt(accentColor.substring(1), 16);
      const r = (rgb >> 16) & 0xff;
      const g = (rgb >> 8) & 0xff;
      const b = (rgb >> 0) & 0xff;
      const luma = 0.2126 * r + 0.7152 * g + 0.0722 * b;
      const accentForegroundColor = luma < 128 ? '#FFFFFF' : '#0B0D1A';

      applyTheme({accent: {accentColor, accentForegroundColor}});

      toast({
        title: 'Accent Color Applied!',
        description: 'The new adaptive accent color has been set.',
      });
    } catch (e) {
      console.error(e);
      toast({
        title: 'Error',
        description: 'Failed to generate accent color.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(null);
    }
  };

  const onAccountLinked = () => {
    toast({
      title: 'Account Upgraded!',
      description:
        'Your settings and themes are now saved to your permanent account.',
      icon: <PartyPopper className="h-5 w-5 text-green-500" />,
    });
  };

  const openBillingApp = () => {
    const billingApp = APPS.find(app => app.id === 'billing');
    if (billingApp && onOpenApp) {
      onOpenApp(billingApp);
    }
  };

  const handleSendVerification = async () => {
    if (!recaptchaVerifier || !phoneNumber) {
      toast({
        title: 'Error',
        description:
          'Please enter a valid phone number. The reCAPTCHA verifier must also be ready.',
        variant: 'destructive',
      });
      return;
    }
    setIsLoading('otp');
    try {
      const result = await signInWithPhoneNumber(
        auth,
        phoneNumber,
        recaptchaVerifier
      );
      setConfirmationResult(result);
      toast({
        title: 'Verification Code Sent',
        description: 'Please check your phone for an SMS message.',
      });
    } catch (error: any) {
      console.error('Error sending OTP:', error);
      toast({
        title: 'Failed to Send Code',
        description: error.message,
        variant: 'destructive',
      });
      recaptchaVerifier.render().then(widgetId => {
        // @ts-ignore
        window.grecaptcha.reset(widgetId);
      });
    } finally {
      setIsLoading(null);
    }
  };

  const handleVerifyCode = async () => {
    if (!confirmationResult || !otp) {
      toast({
        title: 'Error',
        description: 'Please enter the verification code.',
        variant: 'destructive',
      });
      return;
    }
    setIsLoading('otp');
    try {
      await confirmationResult.confirm(otp);
      toast({
        title: 'Phone Number Linked!',
        description: 'Your phone number has been successfully linked for 2FA.',
      });
      setConfirmationResult(null);
      setOtp('');
      setPhoneNumber('');
    } catch (error: any) {
      console.error('Error verifying OTP:', error);
      toast({
        title: 'Verification Failed',
        description: 'The code you entered is invalid. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(null);
    }
  };

  const handleAutoSignOutChange = (enabled: boolean) => {
    if (!userPreferencesRef) return;
    const minutes = enabled ? 15 : 0; // Default to 15 mins if enabled, 0 if disabled
    setDocumentNonBlocking(userPreferencesRef, { security: { autoSignOutMinutes: minutes } }, { merge: true });
    toast({
        title: `Auto Sign-Out ${enabled ? 'Enabled' : 'Disabled'}`,
        description: enabled ? 'You will be signed out after 15 minutes of inactivity.' : 'You will not be signed out automatically.',
    });
  }

  const handleTimeoutDurationChange = (value: string) => {
      if (!userPreferencesRef) return;
      const minutes = parseInt(value, 10);
      setDocumentNonBlocking(userPreferencesRef, { security: { autoSignOutMinutes: minutes } }, { merge: true });
       toast({
        title: 'Auto Sign-Out Duration Updated',
        description: `You will be signed out after ${minutes} minutes of inactivity.`,
    });
  }


  const renderAccountContent = () => {
    if (user?.isAnonymous) {
      return (
        <div className="text-center mt-8">
          <User className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium">You are in Trial Mode</h3>
          <p className="text-sm text-muted-foreground mb-4">
            Upgrade to a permanent account to save your settings.
          </p>
          <AuthForm allowAnonymous={false} onLinkSuccess={onAccountLinked} />
        </div>
      );
    }
    return (
      <div className="space-y-8">
        <div>
          <h3 className="text-lg font-medium">Account Details</h3>
          <p className="text-sm text-muted-foreground">
            Manage your account information.
          </p>
          {/* Placeholder for account details */}
        </div>
        <Separator />
        <div>
          <h3 className="text-lg font-medium flex items-center gap-2">
            <ShieldCheck className="text-accent" /> Two-Factor Authentication
          </h3>
          <p className="text-sm text-muted-foreground mt-2 mb-4">
            Add an extra layer of security to your account by enabling 2FA with
            your phone number.
          </p>
          {!confirmationResult ? (
            <div className="flex flex-col sm:flex-row items-start sm:items-end gap-4">
              <div className="space-y-2 flex-grow w-full sm:w-auto">
                <Label htmlFor="phone-number">Phone Number</Label>
                <Input
                  id="phone-number"
                  placeholder="+1 (555) 123-4567"
                  value={phoneNumber}
                  onChange={e => setPhoneNumber(e.target.value)}
                  disabled={!!isLoading}
                />
              </div>
              <Button onClick={handleSendVerification} disabled={isLoading === 'otp'}>
                {isLoading === 'otp' ? (
                  <Loader2 className="animate-spin" />
                ) : null}
                Send Verification Code
              </Button>
            </div>
          ) : (
            <div className="flex flex-col sm:flex-row items-start sm:items-end gap-4">
              <div className="space-y-2 flex-grow w-full sm:w-auto">
                <Label htmlFor="otp-code">Verification Code</Label>
                <Input
                  id="otp-code"
                  placeholder="123456"
                  value={otp}
                  onChange={e => setOtp(e.target.value)}
                  disabled={!!isLoading}
                />
              </div>
              <Button onClick={handleVerifyCode} disabled={isLoading === 'otp'}>
                {isLoading === 'otp' ? (
                  <Loader2 className="animate-spin" />
                ) : null}
                Verify & Link Phone
              </Button>
              <Button
                variant="ghost"
                onClick={() => setConfirmationResult(null)}
                disabled={!!isLoading}
              >
                Cancel
              </Button>
            </div>
          )}
          <div id="recaptcha-container" className="mt-4"></div>
        </div>
      </div>
    );
  };
  
  const renderSecurityContent = () => {
    if (user?.isAnonymous || isPreferencesLoading) {
        return (
             <div className="text-center mt-8">
                <Timer className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium">Sign-Out Timer Unavailable</h3>
                <p className="text-sm text-muted-foreground">This feature is only available for registered users.</p>
            </div>
        )
    }
    return (
        <div className="space-y-8">
            <div>
              <h3 className="text-lg font-medium">Automatic Sign-Out</h3>
              <p className="text-sm text-muted-foreground">
                For your security, you can be automatically signed out after a period of inactivity.
              </p>
              <div className="mt-6 flex flex-col sm:flex-row gap-8">
                  <div className="flex items-center space-x-2">
                    <Switch
                        id="auto-sign-out"
                        checked={autoSignOutMinutes > 0}
                        onCheckedChange={handleAutoSignOutChange}
                    />
                    <Label htmlFor="auto-sign-out">Enable Auto Sign-Out</Label>
                </div>

                <div className="flex items-center gap-4">
                    <Label htmlFor="timeout-duration">Duration</Label>
                    <Select
                        value={String(autoSignOutMinutes)}
                        onValueChange={handleTimeoutDurationChange}
                        disabled={autoSignOutMinutes === 0}
                    >
                        <SelectTrigger id="timeout-duration" className="w-[180px]">
                            <SelectValue placeholder="Select duration" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="15">15 Minutes</SelectItem>
                            <SelectItem value="30">30 Minutes</SelectItem>
                            <SelectItem value="60">60 Minutes</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
              </div>
            </div>
        </div>
    )
  }

  return (
    <div className="p-4 h-full flex flex-col">
      <h2 className="text-2xl font-headline mb-4">Settings</h2>
      <Tabs defaultValue={defaultTab || "appearance"} className="w-full flex-grow flex flex-col">
        <TabsList>
          <TabsTrigger value="appearance">Appearance</TabsTrigger>
          <TabsTrigger value="account">Account</TabsTrigger>
          <TabsTrigger value="billing">Billing</TabsTrigger>
          <TabsTrigger value="security">Security</TabsTrigger>
          <TabsTrigger value="system">System</TabsTrigger>
        </TabsList>
        
        <TabsContent value="appearance" className="mt-4 flex-grow overflow-y-auto pr-4 -mr-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-4">
              <h3 className="text-lg font-medium">Color Scheme</h3>
              <p className="text-sm text-muted-foreground">
                Select your preferred light or dark mode.
              </p>
              <div className="flex gap-4">
                <Button variant="outline" onClick={() => setScheme('light')}>
                  Light
                </Button>
                <Button variant="outline" onClick={() => setScheme('dark')}>
                  Dark
                </Button>
              </div>
            </div>
            <div className="space-y-4">
               <h3 className="text-lg font-medium">AI Theme Generation</h3>
                <p className="text-sm text-muted-foreground">
                    Describe a theme and let the AI generate it. This is disabled in trial mode.
                </p>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="theme-prompt">Base Theme (Background/Text)</Label>
                  <Textarea
                    id="theme-prompt"
                    placeholder="e.g., 'A dark, modern theme with high contrast for coding', 'A light, airy theme for writing'..."
                    value={themePrompt}
                    onChange={e => setThemePrompt(e.target.value)}
                    disabled={!!isLoading || user?.isAnonymous}
                  />
                  <Button
                    onClick={handleGenerateTheme}
                    disabled={!!isLoading || user?.isAnonymous}
                    className="w-full sm:w-auto"
                  >
                    {isLoading === 'theme' ? (
                      <Loader2 className="animate-spin" />
                    ) : (
                      <Palette />
                    )}
                    Generate Base Theme
                  </Button>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="accent-prompt">Accent Color</Label>
                  <Textarea
                    id="accent-prompt"
                    placeholder="e.g., 'A vibrant electric blue', 'A calming, soft lavender'..."
                    value={accentPrompt}
                    onChange={e => setAccentPrompt(e.target.value)}
                    disabled={!!isLoading || user?.isAnonymous}
                  />
                  <Button
                    onClick={handleGenerateAccent}
                    disabled={!!isLoading || user?.isAnonymous}
                    className="w-full sm:w-auto"
                  >
                    {isLoading === 'accent' ? (
                      <Loader2 className="animate-spin" />
                    ) : (
                      <Sparkles />
                    )}
                    Generate Accent
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </TabsContent>
        <TabsContent value="account" className="mt-4 flex-grow overflow-y-auto pr-4 -mr-4">
          {renderAccountContent()}
        </TabsContent>
        <TabsContent value="billing" className="mt-4 flex-grow overflow-y-auto pr-4 -mr-4">
          <div className="text-center mt-8">
            <CreditCard className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium">Manage Your Subscription</h3>
            <p className="text-sm text-muted-foreground mb-4">
              View plans, check your current tier, and manage billing details.
            </p>
            <Button onClick={() => onOpenApp && onOpenApp(APPS.find(app => app.id === 'billing')!)}>Open Billing App</Button>
          </div>
        </TabsContent>
        <TabsContent value="security" className="mt-4 flex-grow overflow-y-auto pr-4 -mr-4">
            {renderSecurityContent()}
        </TabsContent>
        <TabsContent value="system" className="mt-4 flex-grow overflow-y-auto pr-4 -mr-4">
          <p className="text-muted-foreground">
            System settings will be here.
          </p>
        </TabsContent>
      </Tabs>
    </div>
  );
}

    