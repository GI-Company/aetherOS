
'use client';

import { useState, useEffect, useCallback } from "react";
import { Input } from "@/components/ui/input";
import { Globe, RefreshCw, ArrowLeft, ArrowRight, Home, Loader2 } from "lucide-react";
import BrowserWelcomePage from "@/components/aether-os/browser-welcome-page";
import { useAether } from '@/lib/aether_sdk_client';

const DEFAULT_URL = "aether://welcome";

interface PageCache {
  [url: string]: {
    isLoading: boolean;
    content: string | null;
    error: string | null;
  }
}

export default function BrowserApp() {
  const [history, setHistory] = useState<string[]>([DEFAULT_URL]);
  const [currentUrlIndex, setCurrentUrlIndex] = useState(0);
  const [inputValue, setInputValue] = useState(DEFAULT_URL);
  const [pageCache, setPageCache] = useState<PageCache>({});
  const aether = useAether();

  const currentUrl = history[currentUrlIndex];
  const currentPageState = pageCache[currentUrl];

  const canGoBack = currentUrlIndex > 0;
  const canGoForward = currentUrlIndex < history.length - 1;
  
  const fetchPageContent = useCallback((url: string) => {
    if (!aether) return;
    setPageCache(prev => ({ ...prev, [url]: { isLoading: true, content: null, error: null } }));
    
    aether.publish('ai:generate:page', { topic: url });
        
    const handlePageContent = (payload: any, envelope: any) => {
        setPageCache(prev => ({ ...prev, [url]: { isLoading: false, content: payload, error: null } }));
        // Unsubscribe handled in cleanup
    };

    const handleError = (payload: any, envelope: any) => {
        setPageCache(prev => ({ ...prev, [url]: { isLoading: false, content: null, error: payload.error || 'An unknown error occurred.' } }));
        // Unsubscribe handled in cleanup
    };

    const sub = aether.subscribe('ai:generate:page:resp', handlePageContent);
    const errSub = aether.subscribe('ai:generate:page:error', handleError);

    return () => {
        sub();
        errSub();
    }
  }, [aether]);

  useEffect(() => {
    if (currentUrl !== DEFAULT_URL && !pageCache[currentUrl]) {
      const cleanup = fetchPageContent(currentUrl);
      return cleanup;
    }
  }, [currentUrl, pageCache, fetchPageContent]);

  const navigateTo = (url: string) => {
    const newHistory = history.slice(0, currentUrlIndex + 1);
    newHistory.push(url);
    setHistory(newHistory);
    setCurrentUrlIndex(newHistory.length - 1);
    setInputValue(url);
  };
  
  const refreshPage = () => {
    if (currentUrl === DEFAULT_URL) return;
    const newCache = { ...pageCache };
    delete newCache[currentUrl];
    setPageCache(newCache);
    fetchPageContent(currentUrl);
  }

  const goBack = () => {
    if (canGoBack) {
      const newIndex = currentUrlIndex - 1;
      setCurrentUrlIndex(newIndex);
      setInputValue(history[newIndex]);
    }
  };

  const goForward = () => {
    if (canGoForward) {
      const newIndex = currentUrlIndex + 1;
      setCurrentUrlIndex(newIndex);
      setInputValue(history[newIndex]);
    }
  };

  const goHome = () => {
    navigateTo(DEFAULT_URL);
  };

  const handleAddressBarSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    navigateTo(inputValue);
  };

  const renderContent = () => {
    if (currentUrl === DEFAULT_URL) {
      return <BrowserWelcomePage onSearch={navigateTo} />;
    }

    if (currentPageState?.isLoading) {
      return (
        <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
          <Loader2 className="h-8 w-8 animate-spin mb-4" />
          <p>Generating page content for...</p>
          <p className="font-mono text-sm mt-1">{currentUrl}</p>
        </div>
      );
    }

    if (currentPageState?.error) {
      return (
        <div className="text-center text-red-400 p-8">
            <Globe className="h-16 w-16 mx-auto mb-4" />
            <p className="font-semibold text-lg">Page Failed to Load</p>
            <p className="text-sm mt-2">{currentPageState.error}</p>
        </div>
      );
    }
    
    if (currentPageState?.content) {
      return (
         <div className="p-4 md:p-6 prose dark:prose-invert prose-headings:font-headline" dangerouslySetInnerHTML={{ __html: currentPageState.content }} />
      );
    }

    return null;
  };

  return (
    <div className="flex flex-col h-full bg-background">
      <div className="flex-shrink-0 p-2 border-b flex items-center gap-2 bg-card">
        <button className="p-1 rounded-full hover:bg-muted disabled:opacity-50" onClick={goBack} disabled={!canGoBack}>
          <ArrowLeft className="h-4 w-4" />
        </button>
        <button className="p-1 rounded-full hover:bg-muted disabled:opacity-50" onClick={goForward} disabled={!canGoForward}>
          <ArrowRight className="h-4 w-4" />
        </button>
        <button className="p-1 rounded-full hover:bg-muted disabled:opacity-50" onClick={refreshPage} disabled={currentPageState?.isLoading}>
          <RefreshCw className="h-4 w-4" />
        </button>
        <button className="p-1 rounded-full hover:bg-muted" onClick={goHome}>
          <Home className="h-4 w-4" />
        </button>
        <div className="relative flex-grow">
          <Globe className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <form onSubmit={handleAddressBarSubmit}>
            <Input
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              className="pl-9 bg-background/50"
            />
          </form>
        </div>
      </div>
      <div className="flex-grow bg-background overflow-y-auto">
        {renderContent()}
      </div>
    </div>
  );
}
