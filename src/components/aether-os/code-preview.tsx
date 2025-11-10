
'use client';

import { getStorage, ref, getDownloadURL } from 'firebase/storage';
import { useEffect, useState } from 'react';
import { Skeleton } from '../ui/skeleton';
import { AlertTriangle, Code2 } from 'lucide-react';
import { summarizeCode } from '@/ai/flows/summarize-code';

interface CodePreviewProps {
  filePath: string;
}

// Fetch and display a small preview of a code file
const CodePreview = ({ filePath }: CodePreviewProps) => {
  const [summary, setSummary] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    const fetchContentAndSummarize = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const storage = getStorage();
        const fileRef = ref(storage, filePath);
        const url = await getDownloadURL(fileRef);
        const response = await fetch(url);
        if (!response.ok) {
          throw new Error('Failed to fetch file content');
        }
        const code = await response.text();
        
        if (isMounted) {
          const result = await summarizeCode({ code });
          if(isMounted) {
            setSummary(result.summary);
          }
        }
      } catch (e: any) {
         if (isMounted) {
            setError(e.message);
         }
      } finally {
        if (isMounted) {
            setIsLoading(false);
        }
      }
    };
    fetchContentAndSummarize();

    return () => {
      isMounted = false;
    };
  }, [filePath]);

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
