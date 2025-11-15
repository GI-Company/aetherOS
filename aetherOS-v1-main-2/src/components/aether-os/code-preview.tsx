
'use client';

import { useEffect, useState, useMemo } from 'react';
import { Skeleton } from '../ui/skeleton';
import { AlertTriangle, Code2 } from 'lucide-react';
import { useAether } from '@/lib/aether_sdk_client';

interface CodePreviewProps {
  filePath: string;
}

// A simple in-memory cache for summaries
const summaryCache = new Map<string, string>();

const CodePreview = ({ filePath }: CodePreviewProps) => {
  const aether = useAether();
  const [summary, setSummary] = useState<string | null>(summaryCache.get(filePath) || null);
  const [isLoading, setIsLoading] = useState(!summary);
  const [error, setError] = useState<string | null>(null);

  // Memoize the request ID to ensure we only process the response for the current component instance
  const requestId = useMemo(() => `summary-${filePath}-${Date.now()}`, [filePath]);

  useEffect(() => {
    if (summary || !aether || !filePath) return;

    let isMounted = true;
    
    const handleSummaryResponse = (payload: any) => {
        if (payload.filePath === filePath && isMounted) {
            if (payload.summary) {
                setSummary(payload.summary);
                summaryCache.set(filePath, payload.summary);
            } else {
                setError("Invalid summary format received.");
            }
            setIsLoading(false);
            unsubscribe();
        }
    };

    const handleErrorResponse = (payload: any) => {
        if (isMounted) {
            setError(payload.error || 'Summarization failed');
            setIsLoading(false);
            unsubscribe();
        }
    };
    
    const summarySub = aether.subscribe('ai:summarize:code:resp', handleSummaryResponse);
    const errorSub = aether.subscribe('ai:summarize:code:error', handleErrorResponse);

    const unsubscribe = () => {
        summarySub();
        errorSub();
    };

    setIsLoading(true);
    aether.publish('ai:summarize:code', { filePath });

    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, [filePath, aether, summary, requestId]);

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

    