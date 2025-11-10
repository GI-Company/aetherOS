'use client';

import { getStorage, ref, getDownloadURL } from 'firebase/storage';
import { useEffect, useState } from 'react';
import { Skeleton } from '../ui/skeleton';
import { AlertTriangle, Code2 } from 'lucide-react';

interface CodePreviewProps {
  filePath: string;
}

// Fetch and display a small preview of a code file
const CodePreview = ({ filePath }: CodePreviewProps) => {
  const [content, setContent] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchContent = async () => {
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
        const text = await response.text();
        // Get the first 15 lines for the preview
        const previewContent = text.split('\n').slice(0, 15).join('\n');
        setContent(previewContent);
      } catch (e: any) {
        setError(e.message);
      } finally {
        setIsLoading(false);
      }
    };
    fetchContent();
  }, [filePath]);

  if (isLoading) {
    return <Skeleton className="w-full h-full" />;
  }

  if (error) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-destructive/10">
        <AlertTriangle className="h-4 w-4 text-destructive" />
      </div>
    );
  }

  if (content) {
    return (
      <pre className="text-[5px] leading-tight font-code overflow-hidden p-1 bg-background rounded-sm">
        <code>{content}</code>
      </pre>
    );
  }

  return (
    <div className="w-full h-full flex items-center justify-center bg-muted">
        <Code2 className="h-4 w-4 text-muted-foreground" />
    </div>
  );
};

export default CodePreview;
