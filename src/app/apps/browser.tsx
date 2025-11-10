
'use client';

import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Globe, RefreshCw, ArrowLeft, ArrowRight, Home, Loader2 } from "lucide-react";
import BrowserWelcomePage from "@/components/aether-os/browser-welcome-page";
import { generateWebPageContent } from "@/ai/flows/generate-web-page-content";
import { useToast } from "@/hooks/use-toast";

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
  const { toast } = useToast();

  const currentUrl = history[currentUrlIndex];
  const currentPageState = pageCache[currentUrl];

  const canGoBack = currentUrlIndex > 0;
  const canGoForward = currentUrlIndex < history.length - 1;
  
  useEffect(() => {
    if (currentUrl !== DEFAULT_URL && !pageCache[currentUrl]) {
      const fetchPageContent = async () => {
        setPageCache(prev => ({ ...prev, [currentUrl]: { isLoading: true, content: null, error: null } }));
        try {
          const result = await generateWebPageContent({ topic: currentUrl });
          setPageCache(prev => ({ ...prev, [currentUrl]: { isLoading: false, content: result.htmlContent, error: null } }));
        } catch (err: any) {
          console.error("Failed to generate page content:", err);
          toast({
            title: "Content Generation Failed",
            description: "The AI failed to generate content for this page.",
            variant: "destructive"
          });
          setPageCache(prev => ({ ...prev, [currentUrl]: { isLoading: false, content: null, error: err.message || 'An unknown error occurred.' } }));
        }
      };
      fetchPageContent();
    }
  }, [currentUrl, pageCache, toast]);

  const navigateTo = (url: string) => {
    const newHistory = history.slice(0, currentUrlIndex + 1);
    newHistory.push(url);
    setHistory(newHistory);
    setCurrentUrlIndex(newHistory.length - 1);
    setInputValue(url);
  };
  
  const refreshPage = () => {
    // Invalidate cache for the current URL to force a refetch
    setPageCache(prev => {
      const newCache = { ...prev };
      delete newCache[currentUrl];
      return newCache;
    });
    // This will trigger the useEffect to fetch the page content again.
    // To make it instant, we can force a re-render or a slight state change.
    setHistory([...history]); 
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
        <div className="text-center text-destructive p-8">
            <Globe className="h-16 w-16 mx-auto mb-4" />
            <p className="font-semibold text-lg">Page Failed to Load</p>
            <p className="text-sm mt-2">The AI content generator encountered an error.</p>
        </div>
      );
    }
    
    if (currentPageState?.content) {
      return (
         <div className="p-4 md:p-6 prose dark:prose-invert max-w-full" dangerouslySetInnerHTML={{ __html: currentPageState.content }} />
      );
    }

    return null; // Should be handled by loading state
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
        <button className="p-1 rounded-full hover:bg-muted disabled:opacity-50" onClick={refreshPage}>
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
              className="pl-9 bg-background"
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
