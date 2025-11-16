
'use client';

import { useEffect, useState } from 'react';
import { Skeleton } from '../ui/skeleton';
import { AlertTriangle, Code2 } from 'lucide-react';
import { useAppAether } from '@/lib/use-app-aether';

interface CodePreviewProps {
  filePath: string;
}

// A simple in-memory cache for summaries
const summaryCache = new Map<string, string>();

const CodePreview = ({ filePath }: CodePreviewProps) => {
  const { publish, subscribe } = useAppAether();
  const [summary, setSummary] = useState<string | null>(summaryCache.get(filePath) || null);
  const [isLoading, setIsLoading] = useState(!summary);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (summary || !filePath) return;

    let isMounted = true;
    let summarySub: (() => void) | undefined;
    let errorSub: (() => void) | undefined;
    
    const cleanup = () => {
        if(summarySub) summarySub();
        if(errorSub) errorSub();
    };

    const handleSummaryResponse = (payload: any, envelope: any) => {
        if (payload.filePath === filePath && isMounted) {
            if (payload.summary) {
                setSummary(payload.summary);
                summaryCache.set(filePath, payload.summary);
            } else {
                 setError("Invalid summary format received.");
            }
            setIsLoading(false);
            cleanup();
        }
    };

    const handleErrorResponse = (payload: any, envelope: any) => {
        if (isMounted) {
            setError(payload.error || 'Summarization failed');
            setIsLoading(false);
            cleanup();
        }
    };
    
    summarySub = subscribe('vfs:summarize:code:result', handleSummaryResponse);
    errorSub = subscribe('vfs:summarize:code:error', handleErrorResponse);

    setIsLoading(true);
    publish('vfs:summarize:code', { filePath });

    return () => {
      isMounted = false;
      cleanup();
    };
  }, [filePath, summary, publish, subscribe]);

  if (isLoading) {
    return <Skeleton className="w-full h-full p-2 space-y-1">
        <Skeleton className="h-2 w-11/12" />
        <Skeleton className="h-2 w-10/12" />
        <Skeleton className="h-2 w-9/12" />
      </Skeleton>
  }

  if (error) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-destructive/10">
        <AlertTriangle className="h-4 w-4 text-destructive" />
      </div>
    );
  }

  if (summary) {
    return (
      <div className="text-[10px] leading-tight font-body overflow-hidden p-1.5 bg-background rounded-sm h-full w-full">
        <p>{summary}</p>
      </div>
    );
  }

  return (
    <div className="w-full h-full flex items-center justify-center bg-muted">
        <Code2 className="h-4 w-4 text-muted-foreground" />
    </div>
  );
};

export default CodePreview;
