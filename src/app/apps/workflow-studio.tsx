"use client";

import { useState } from 'react';
import { generateWorkflowFromDescription } from '@/ai/flows/generate-workflow-from-description';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Workflow } from 'lucide-react';
import MermaidDiagram from '@/components/mermaid-diagram';
import { Card, CardContent } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';

export default function WorkflowStudioApp() {
  const [description, setDescription] = useState('');
  const [workflow, setWorkflow] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const handleGenerate = async () => {
    if (!description) {
      toast({ title: 'Error', description: 'Please provide a description.', variant: 'destructive' });
      return;
    }
    setIsLoading(true);
    setWorkflow('');
    try {
      const result = await generateWorkflowFromDescription(description);
      const cleanedChart = result.workflowDefinition.replace(/```mermaid\n/g, '').replace(/```/g, '').trim();
      setWorkflow(cleanedChart);
    } catch (error) {
      console.error(error);
      toast({ title: 'Error', description: 'Failed to generate workflow.', variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex h-full p-4 gap-4">
      <div className="w-1/3 flex flex-col gap-4">
        <div>
          <h2 className="text-2xl font-headline">Workflow Studio</h2>
          <p className="text-sm text-muted-foreground">Describe a process, and the AI will generate a visual workflow.</p>
        </div>
        <div className="flex flex-col gap-2 flex-grow">
          <Label htmlFor="workflow-description">Process Description</Label>
          <Textarea
            id="workflow-description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="e.g., 'When a new user signs up, send a welcome email. Wait 1 day, then send a follow-up email with tips.'"
            className="flex-grow resize-none"
          />
          <Button onClick={handleGenerate} disabled={isLoading}>
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <Workflow className="mr-2 h-4 w-4" />
                Generate Workflow
              </>
            )}
          </Button>
        </div>
      </div>
      <div className="w-2/3">
        <Label>Visual Workflow</Label>
        <Card className="h-[calc(100%-1.75rem)] mt-2">
            <CardContent className="p-4 h-full">
                <ScrollArea className="h-full">
                    {isLoading ? (
                        <div className="flex items-center justify-center h-full">
                            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                        </div>
                    ) : workflow ? (
                        <MermaidDiagram chart={workflow} />
                    ) : (
                        <div className="flex items-center justify-center h-full text-muted-foreground">
                            Your generated workflow will appear here.
                        </div>
                    )}
                </ScrollArea>
            </CardContent>
        </Card>
      </div>
    </div>
  );
}
