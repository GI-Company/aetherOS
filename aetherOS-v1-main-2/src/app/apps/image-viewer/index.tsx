
'use client';

import { useEffect, useState } from 'react';
import { getStorage, ref, getDownloadURL } from 'firebase/storage';
import Image from 'next/image';
import { Loader2, AlertTriangle } from 'lucide-react';
import { useFirebase } from '@/firebase';

interface ImageViewerAppProps {
  filePath?: string;
}

export default function ImageViewerApp({ filePath }: ImageViewerAppProps) {
  const { user } = useFirebase();
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchImage = async () => {
      if (!filePath || !user) {
        setError('No file path provided or user not available.');
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      setError(null);
      setImageUrl(null);

      try {
        const storage = getStorage();
        const imageRef = ref(storage, filePath);
        const url = await getDownloadURL(imageRef);
        setImageUrl(url);
      } catch (err: any) {
        console.error('Error fetching image from storage:', err);
        setError(`Could not load image: ${err.message}`);
      } finally {
        setIsLoading(false);
      }
    };

    fetchImage();
  }, [filePath, user]);

  const fileName = filePath?.split('/').pop();

  return (
    <div className="w-full h-full bg-background/80 flex items-center justify-center p-4">
      {isLoading && (
        <div className="flex flex-col items-center gap-2 text-muted-foreground">
          <Loader2 className="h-8 w-8 animate-spin" />
          <span>Loading {fileName}...</span>
        </div>
      )}
      {error && (
        <div className="flex flex-col items-center gap-2 text-destructive">
          <AlertTriangle className="h-8 w-8" />
          <span className="font-semibold">Error</span>
          <p className="text-center text-sm">{error}</p>
        </div>
      )}
      {imageUrl && (
        <div className="relative w-full h-full">
          <Image
            src={imageUrl}
            alt={filePath || 'Image'}
            fill
            className="object-contain"
          />
        </div>
      )}
    </div>
  );
}
