
'use client';

import { Workflow } from 'lucide-react';
import React from 'react';

export default function WorkflowStudioApp() {
  return (
    <div className="h-full bg-background flex flex-col items-center justify-center p-4">
      <Workflow className="h-16 w-16 text-muted-foreground mb-4" />
      <h3 className="text-xl font-headline">Workflow Studio</h3>
      <p className="text-sm text-muted-foreground text-center">
        This feature is coming soon.
      </p>
       <p className="text-xs text-muted-foreground text-center mt-2">
        You will be able to create, edit, and manage multi-step AI workflows here.
      </p>
    </div>
  );
}
