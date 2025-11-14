
'use client';

import { useState } from 'react';
import { Search } from 'lucide-react';
import { Input } from '@/components/ui/input';

interface BrowserWelcomePageProps {
  onSearch: (query: string) => void;
}

function AetherLogo() {
  return (
    <svg viewBox="0 0 100 100" className="h-16 w-16 fill-current text-foreground">
      <path d="M50 0 L100 50 L50 100 L0 50 Z M50 20 L80 50 L50 80 L20 50 Z" />
    </svg>
  );
}

export default function BrowserWelcomePage({ onSearch }: BrowserWelcomePageProps) {
  const [query, setQuery] = useState('');

  const handleSearchSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (query.trim()) {
      // In a real browser, this would be a search engine URL
      onSearch(`https://www.google.com/search?q=${encodeURIComponent(query)}`);
    }
  };
  
  return (
    <div className="flex flex-col items-center justify-center h-full gap-6">
      <AetherLogo />
      <h1 className="text-3xl font-headline text-foreground">AetherOS Browser</h1>
      <form onSubmit={handleSearchSubmit} className="w-full max-w-lg relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search the web (simulated)..."
          className="pl-10 h-12 text-base rounded-full bg-card border-border"
        />
      </form>
    </div>
  );
}
