
'use client';

import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";
import React from "react";

function AetherLogo() {
    return (
      <svg viewBox="0 0 100 100" className="h-20 w-20 fill-current text-foreground/80">
        <path d="M50 0 L100 50 L50 100 L0 50 Z M50 20 L80 50 L50 80 L20 50 Z" />
      </svg>
    );
}

interface BrowserWelcomePageProps {
    onSearch: (query: string) => void;
}

export default function BrowserWelcomePage({ onSearch }: BrowserWelcomePageProps) {
    const [query, setQuery] = React.useState("");

    const handleSearch = (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        if (query.trim()) {
            onSearch(query.trim());
        }
    }

    return (
        <div className="flex flex-col items-center justify-center h-full p-8 text-center bg-background">
            <AetherLogo />
            <h2 className="text-4xl font-headline mt-4 mb-8">Generative Browser</h2>
            
            <form onSubmit={handleSearch} className="w-full max-w-md relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                <Input 
                    type="search"
                    placeholder="Enter a topic to generate a page..."
                    className="pl-10 h-12 text-lg"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                />
            </form>
            <p className="text-xs text-muted-foreground mt-4">
                This browser synthesizes web content on the fly using AI.
            </p>
        </div>
    );
}
