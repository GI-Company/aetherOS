
'use client';

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Globe, RefreshCw, ArrowLeft, ArrowRight, Home } from "lucide-react";
import BrowserWelcomePage from "@/components/aether-os/browser-welcome-page";

const DEFAULT_URL = "aether://welcome";

export default function BrowserApp() {
  const [history, setHistory] = useState<string[]>([DEFAULT_URL]);
  const [currentUrlIndex, setCurrentUrlIndex] = useState(0);
  const [inputValue, setInputValue] = useState(DEFAULT_URL);

  const currentUrl = history[currentUrlIndex];

  const canGoBack = currentUrlIndex > 0;
  const canGoForward = currentUrlIndex < history.length - 1;

  const navigateTo = (url: string) => {
    const newHistory = history.slice(0, currentUrlIndex + 1);
    newHistory.push(url);
    setHistory(newHistory);
    setCurrentUrlIndex(newHistory.length - 1);
    setInputValue(url);
  };

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
    return (
      <div className="text-center text-muted-foreground p-8">
        <Globe className="h-16 w-16 mx-auto mb-4" />
        <p className="font-semibold text-lg text-foreground">Web Browsing is Simulated</p>
        <p className="text-sm mt-2">
          For security and demonstration purposes, live web browsing is disabled. 
          You are trying to access:
        </p>
        <p className="text-sm font-mono bg-muted p-2 rounded-md mt-2 break-all">{currentUrl}</p>
      </div>
    );
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
        <button className="p-1 rounded-full hover:bg-muted disabled:opacity-50">
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
      <div className="flex-grow bg-background flex items-center justify-center">
        {renderContent()}
      </div>
    </div>
  );
}
