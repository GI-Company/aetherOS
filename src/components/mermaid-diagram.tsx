"use client";

import { useEffect, useRef, useState } from 'react';
import type { MermaidConfig } from 'mermaid';

// This component dynamically imports mermaid to avoid SSR issues.
const MermaidDiagram = ({ chart }: { chart: string }) => {
  const ref = useRef<HTMLDivElement>(null);
  const [mermaid, setMermaid] = useState<any>(null);

  useEffect(() => {
    import('mermaid').then(m => setMermaid(m.default));
  }, []);

  useEffect(() => {
    if (!mermaid || !ref.current) return;

    // The document is not defined in the SSR environment
    const isDarkMode = document.documentElement.classList.contains('dark');
    
    mermaid.initialize({
      startOnLoad: false,
      theme: isDarkMode ? 'dark' : 'default',
      securityLevel: 'loose',
      fontFamily: 'inherit',
      // We need to override the theme variables to match ShadCN's
      themeVariables: {
        background: isDarkMode ? '#1E212B' : '#FFFFFF',
        primaryColor: isDarkMode ? '#1E212B' : '#F9FAFB', // Node background
        primaryTextColor: isDarkMode ? '#F9FAFB' : '#1E212B',
        lineColor: isDarkMode ? '#BE95FF' : '#7C3AED',
        primaryBorderColor: isDarkMode ? '#BE95FF' : '#7C3AED',
      },
    } as MermaidConfig);
    
    const renderDiagram = async () => {
        if (!ref.current) return;
        try {
            const { svg } = await mermaid.render(`mermaid-graph-${Date.now()}`, chart);
            ref.current.innerHTML = svg;
        } catch (error) {
            console.error("Mermaid rendering error:", error);
            if(ref.current) ref.current.innerHTML = "Error rendering diagram.";
        }
    }
    
    renderDiagram();

  }, [mermaid, chart]);

  return <div ref={ref} className="w-full h-full" />;
};

export default MermaidDiagram;
