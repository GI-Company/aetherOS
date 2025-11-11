
'use client';

import React, { useMemo } from 'react';
import { Home, ChevronRight, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';

const Breadcrumbs = ({
  currentPath,
  basePath,
  onNavigate,
}: {
  currentPath: string;
  basePath: string;
  onNavigate: (path: string) => void;
}) => {
  const parts = useMemo(() => {
    if (currentPath === 'Search Results' || !currentPath.startsWith(basePath)) return [];
    const relativePath = currentPath.substring(basePath.length);
    return relativePath.split('/').filter(p => p);
  }, [currentPath, basePath]);

  if (currentPath === 'Search Results') {
    return (
        <div className="flex items-center gap-1.5 text-sm font-medium text-foreground flex-shrink-0 min-w-0">
            <Search className="h-4 w-4"/>
            <span>Search Results</span>
        </div>
    )
  }

  return (
    <div className="flex items-center gap-1.5 text-sm text-muted-foreground flex-shrink-0 min-w-0">
      <Button variant="ghost" size="icon" className="h-7 w-7 flex-shrink-0" onClick={() => onNavigate(basePath)}>
        <Home className="h-4 w-4"/>
      </Button>
      {parts.length > 0 && <ChevronRight className="h-4 w-4 flex-shrink-0" />}
      {parts.map((part, index) => {
        const path = `${basePath}/${parts.slice(0, index + 1).join('/')}`;
        const isLast = index === parts.length - 1;
        return (
          <React.Fragment key={path}>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onNavigate(path)}
              className="h-7 px-2 text-sm truncate"
              disabled={isLast}
            >
              {part}
            </Button>
            {!isLast && <ChevronRight className="h-4 w-4 flex-shrink-0" />}
          </React.Fragment>
        );
      })}
    </div>
  );
};

export default Breadcrumbs;
