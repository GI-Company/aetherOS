'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertTriangle } from 'lucide-react';
import React from 'react';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  React.useEffect(() => {
    // In a production environment, you would send the error to a monitoring service
    // Example: Sentry.captureException(error);
    console.error("Global Error Caught:", error);
  }, [error]);

  return (
    <html>
      <body>
        <div className="h-screen w-screen flex items-center justify-center bg-background p-4">
            <Card className="w-full max-w-lg z-10 bg-card/80 backdrop-blur-xl border-destructive/50">
                 <CardHeader className="text-center">
                    <div className="flex justify-center mb-4">
                        <AlertTriangle className="h-12 w-12 text-destructive" />
                    </div>
                    <CardTitle className="text-2xl font-headline">An Unexpected Error Occurred</CardTitle>
                    <CardDescription>Something went wrong, but your session is still active. You can try to recover or refresh the page.</CardDescription>
                </CardHeader>
                <CardContent className='text-center'>
                     <Button onClick={() => reset()}>
                        Try to Recover
                    </Button>
                    <p className="text-xs text-muted-foreground mt-4">
                        If the problem persists, please try refreshing the page.
                    </p>
                    {error.message && (
                        <div className="mt-4 p-2 bg-background/50 rounded-md text-xs text-destructive text-left">
                            <p className="font-bold">Error Details:</p>
                            <pre className="whitespace-pre-wrap font-code">{error.message}</pre>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
      </body>
    </html>
  );
}
