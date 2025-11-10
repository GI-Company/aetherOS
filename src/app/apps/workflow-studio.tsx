
"use client";

import { useState } from 'react';
import { generateWorkflowFromDescription } from '@/ai/flows/generate-workflow-from-description';
import { agenticToolUser } from '@/ai/flows/agenticToolUser';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Workflow, Play } from 'lucide-react';
import MermaidDiagram from '@/components/mermaid-diagram';
import { Card, CardContent } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { TOOLS } from '@/lib/tools';
import { useFirebase } from '@/firebase';

// This is a simplified context for demonstration.
// In a real app, this would be passed down from the Desktop component.
const createMockContext = (toast: any) => ({
    onOpenApp: (app: any, props: any) => toast({ title: `Action: Open App`, description: `${app.name} with props: ${JSON.stringify(props)}` }),
    onOpenFile: (path: string, content?: string) => toast({ title: `Action: Open File`, description: path }),
    onArrangeWindows: () => toast({ title: `Action: Arrange Windows` }),
    setWallpaper: (url: string) => toast({ title: `Action: Set Wallpaper` }),
});


export default function WorkflowStudioApp() {
  const [description, setDescription] = useState('');
  const [workflow, setWorkflow] = useState('');
  const [isLoading, setIsLoading] = useState<'generate' | 'execute' | false>(false);
  const { toast } = useToast();
  const { user } = useFirebase();

  const handleGenerate = async () => {
    if (!description) {
      toast({ title: 'Error', description: 'Please provide a description.', variant: 'destructive' });
      return;
    }
    setIsLoading('generate');
    setWorkflow('');
    try {
      const result = await generateWorkflowFromDescription(description);
      const cleanedChart = result.workflowDefinition.replace(/```mermaid\n/g, '').replace(/```/g, '').trim();
      setWorkflow(cleanedChart);
      toast({ title: 'Workflow Generated', description: 'The visual workflow has been updated.' });
    } catch (error) {
      console.error(error);
      toast({ title: 'Error', description: 'Failed to generate workflow.', variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleExecute = async () => {
    if (!description || !user) {
        toast({ title: "Cannot execute workflow", description: "Please generate a workflow from a description first.", variant: "destructive" });
        return;
    }
    setIsLoading('execute');
    toast({ title: "Executing Workflow...", description: "The Aether-Architect is running the steps."});

    try {
        const workflowPlan = await agenticToolUser(description);
        
        if (workflowPlan.steps.length > 0) {
            let stepResult: any = {};
            const mockContext = createMockContext(toast); // Using mock context for demonstration

            for (const step of workflowPlan.steps) {
                const tool = TOOLS[step.toolId];
                if (!tool) {
                    throw new Error(`Tool with ID '${step.toolId}' not found.`);
                }

                let toolInput = {...step.inputs};
                if (toolInput.imageUrl === '{{result.imageUrl}}' && stepResult.imageUrl) {
                    toolInput.imageUrl = stepResult.imageUrl;
                }
                if (toolInput.content === '{{result.code}}' && stepResult.code) {
                    toolInput.content = stepResult.code;
                }

                stepResult = await tool.execute(mockContext, toolInput);
            }
            toast({ title: "Workflow Execution Complete!", description: `Finished running ${workflowPlan.name}.`});
        } else {
            toast({ title: "No actions to execute", description: "This is a conversational prompt with no workflow steps."});
        }
    } catch (err: any) {
        console.error("Workflow execution failed:", err);
        toast({ title: "Workflow Failed", description: err.message, variant: "destructive" });
    } finally {
        setIsLoading(false);
    }
  }

  return (
    <div className="flex h-full p-4 gap-4 flex-col md:flex-row">
      <div className="w-full md:w-1/3 flex flex-col gap-4">
        <div>
          <h2 className="text-2xl font-headline">Workflow Studio</h2>
          <p className="text-sm text-muted-foreground">Describe a process to visualize and execute it.</p>
        </div>
        <div className="flex flex-col gap-2 flex-grow">
          <Label htmlFor="workflow-description">Process Description</Label>
          <Textarea
            id="workflow-description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="e.g., 'When a new user signs up, send a welcome email. Wait 1 day, then send a follow-up email with tips.'"
            className="flex-grow resize-none"
            disabled={!!isLoading}
          />
          <div className="flex gap-2">
            <Button onClick={handleGenerate} disabled={!!isLoading} className="flex-grow">
                {isLoading === 'generate' ? (
                <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Visualizing...
                </>
                ) : (
                <>
                    <Workflow className="mr-2 h-4 w-4" />
                    Visualize
                </>
                )}
            </Button>
            <Button onClick={handleExecute} disabled={!!isLoading || !workflow} variant="secondary" className="flex-grow">
                {isLoading === 'execute' ? (
                <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Executing...
                </>
                ) : (
                <>
                    <Play className="mr-2 h-4 w-4" />
                    Execute
                </>
                )}
            </Button>
          </div>
        </div>
      </div>
      <div className="w-full md:w-2/3 flex flex-col">
        <Label>Visual Workflow</Label>
        <Card className="h-full mt-2 flex-grow">
            <CardContent className="p-4 h-full">
                <ScrollArea className="h-full">
                    {isLoading === 'generate' ? (
                        <div className="flex items-center justify-center h-full">
                            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                        </div>
                    ) : workflow ? (
                        <MermaidDiagram chart={workflow} />
                    ) : (
                        <div className="flex items-center justify-center h-full text-muted-foreground text-center">
                            Describe a process and click "Visualize" to see the workflow diagram here.
                        </div>
                    )}
                </ScrollArea>
            </CardContent>
        </Card>
      </div>
    </div>
  );
}
