
'use client';

import {Button} from '@/components/ui/button';
import {Label}from '@/components/ui/label';
import {Textarea}from '@/components/ui/textarea';
import {Tabs, TabsContent, TabsList, TabsTrigger} from '@/components/ui/tabs';
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
} from 'firebase/auth';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { doc } from 'firebase/firestore';
import { setDocumentNonBlocking } from '@/firebase';
import { useAether } from '@/lib/aether_sdk_client';


interface SettingsAppProps {
  onOpenApp?: (app: App, props?: Record<string, any>) => void;
  defaultTab?: string;
}

export default function SettingsApp({onOpenApp, defaultTab}: SettingsAppProps) {
  const [themePrompt, setThemePrompt] = useState('');
  const [accentPrompt, setAccentPrompt] = useState('');
  const [isLoading, setIsLoading] = useState<'theme' | 'accent' | null>(
    null
  );
  const {toast} = useToast();
  const {applyTheme, setScheme} = useTheme();
  const {user, firestore} = useFirebase();
  const aether = useAether();
  const auth = getAuth();

  const userPreferencesRef = useMemoFirebase(() => {
    if (!firestore || !user?.uid || user.isAnonymous) return null;
    return doc(firestore, 'userPreferences', user.uid);
  }, [firestore, user?.uid, user?.isAnonymous]);

  const { data: userPreferences, isLoading: isPreferencesLoading } = useDoc(userPreferencesRef);
  
  const autoSignOutMinutes = (userPreferences as any)?.security?.autoSignOutMinutes ?? 0;

  const handleGenerateTheme = async () => {
    if (!themePrompt) {
      toast({
        title: 'Error',
        description: 'Please enter a content description.',
        variant: 'destructive',
      });
      return;
    }
     if (!aether) {
      toast({ title: "Aether client not available", variant: "destructive" });
      return;
    }
    setIsLoading('theme');

    aether.publish('ai:generate:palette', { contentDescription: themePrompt });

    const handleResponse = (env: any) => {
      try {
        const result = JSON.parse(env.payload);
        applyTheme({palette: result});
        toast({
          title: 'Base Theme Applied!',
          description: 'The new adaptive base theme has been set.',
        });
      } catch (e) {
        console.error("Failed to parse theme response:", e);
        toast({
          title: 'Error',
          description: 'Failed to apply generated theme. Invalid format.',
          variant: 'destructive',
        });
      } finally {
        setIsLoading(null);
        aether.subscribe('ai:generate:palette:resp', handleResponse)();
      }
    };
    
    const handleError = (env: any) => {
        toast({ title: 'Error', description: 'Failed to generate theme.', variant: 'destructive' });
        setIsLoading(null);
        aether.subscribe('ai:generate:palette:error', handleError)();
    }
    
    aether.subscribe('ai:generate:palette:resp', handleResponse);
    aether.subscribe('ai:generate:palette:error', handleError);
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
    if (!aether) {
      toast({ title: "Aether client not available", variant: "destructive" });
      return;
    }
    setIsLoading('accent');

    aether.publish('ai:generate:accent', { description: accentPrompt });

    const handleResponse = (env: any) => {
        try {
            const result = JSON.parse(env.payload);
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
            console.error("Failed to parse accent response:", e);
            toast({
                title: 'Error',
                description: 'Failed to apply generated accent color. Invalid format.',
                variant: 'destructive',
            });
        } finally {
            setIsLoading(null);
            aether.subscribe('ai:generate:accent:resp', handleResponse)();
        }
    };

    const handleError = (env: any) => {
        toast({ title: 'Error', description: 'Failed to generate accent color.', variant: 'destructive' });
        setIsLoading(null);
        aether.subscribe('ai:generate:accent:error', handleError)();
    }

    aether.subscribe('ai:generate:accent:resp', handleResponse);
    aether.subscribe('ai:generate:accent:error', handleError);
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
                    Describe a theme and let the AI generate it.
                </p>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="theme-prompt">Base Theme (Background/Text)</Label>
                  <Textarea
                    id="theme-prompt"
                    placeholder="e.g., 'A dark, modern theme with high contrast for coding', 'A light, airy theme for writing'..."
                    value={themePrompt}
                    onChange={e => setThemePrompt(e.target.value)}
                    disabled={!!isLoading}
                  />
                  <Button
                    onClick={handleGenerateTheme}
                    disabled={!!isLoading}
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
                    disabled={!!isLoading}
                  />
                  <Button
                    onClick={handleGenerateAccent}
                    disabled={!!isLoading}
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
