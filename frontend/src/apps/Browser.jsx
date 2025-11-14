'use client';

import { useState, useEffect, useCallback } from "react";
import { Input } from "../components/Input";
import { Globe, RefreshCw, ArrowLeft, ArrowRight, Home, Loader2 } from "lucide-react";
import BrowserWelcomePage from "../components/aether-os/browser-welcome-page";
import { useAether } from '../lib/aether_sdk';

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
  
  const fetchPageContent = useCallback(async (url: string) => {
    if (!aether) return;
    setPageCache(prev => ({ ...prev, [url]: { isLoading: true, content: null, error: null } }));
    
    aether.publish('ai:generate:page', { topic: url });
    
    const correlationId = Math.random().toString(36).substring(7);
    
    const handlePageContent = (env: any) => {
        setPageCache(prev => ({ ...prev, [url]: { isLoading: false, content: env.payload, error: null } }));
        aether.subscribe('ai:generate:page:resp', handlePageContent)(); // Unsubscribe
    };

    const handleError = (env: any) => {
        setPageCache(prev => ({ ...prev, [url]: { isLoading: false, content: null, error: env.payload.error || 'An unknown error occurred.' } }));
        aether.subscribe('ai:generate:page:error', handleError)(); // Unsubscribe
    };

    aether.subscribe('ai:generate:page:resp', handlePageContent);
    aether.subscribe('ai:generate:page:error', handleError);
  }, [aether]);

  useEffect(() => {
    if (currentUrl !== DEFAULT_URL && !pageCache[currentUrl]) {
      fetchPageContent(currentUrl);
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
        <div className="flex flex-col items-center justify-center h-full text-gray-400">
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
         <div className="p-4 md:p-6" dangerouslySetInnerHTML={{ __html: currentPageState.content }} />
      );
    }

    return null;
  };

  return (
    <div className="flex flex-col h-full bg-gray-900">
      <div className="flex-shrink-0 p-2 border-b border-gray-700 flex items-center gap-2 bg-gray-800">
        <button className="p-1 rounded-full hover:bg-gray-700 disabled:opacity-50" onClick={goBack} disabled={!canGoBack}>
          <ArrowLeft className="h-4 w-4" />
        </button>
        <button className="p-1 rounded-full hover:bg-gray-700 disabled:opacity-50" onClick={goForward} disabled={!canGoForward}>
          <ArrowRight className="h-4 w-4" />
        </button>
        <button className="p-1 rounded-full hover:bg-gray-700 disabled:opacity-50" onClick={refreshPage}>
          <RefreshCw className="h-4 w-4" />
        </button>
        <button className="p-1 rounded-full hover:bg-gray-700" onClick={goHome}>
          <Home className="h-4 w-4" />
        </button>
        <div className="relative flex-grow">
          <Globe className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-400" />
          <form onSubmit={handleAddressBarSubmit}>
            <Input
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              className="pl-9 bg-gray-900"
            />
          </form>
        </div>
      </div>
      <div className="flex-grow bg-gray-900 overflow-y-auto">
        {renderContent()}
      </div>
    </div>
  );
}
