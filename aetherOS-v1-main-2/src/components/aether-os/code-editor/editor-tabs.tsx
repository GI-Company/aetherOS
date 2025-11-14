
"use client";

import React, { useRef, lazy, Suspense } from "react";
import { Button } from "@/components/ui/button";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { X, Loader2, Save } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAether } from "@/lib/aether_sdk_client";
import { osEvent } from "@/lib/events";

const MonacoEditor = lazy(() => import("@/components/aether-os/monaco-editor"));

export type EditorFile = {
    id: string;
    name: string;
    path: string;
    content: string;
    isDirty: boolean;
};

interface EditorTabsProps {
    files: EditorFile[];
    activeFileId: string | null;
    onTabClick: (fileId: string) => void;
    onCloseTab: (fileId: string) => void;
    onContentChange: (fileId: string, content: string) => void;
    onSave: (fileId: string) => void;
}

export default function EditorTabs({
    files,
    activeFileId,
    onTabClick,
    onCloseTab,
    onContentChange,
    onSave,
}: EditorTabsProps) {

    const activeFile = files.find(f => f.id === activeFileId);
    const editorRef = useRef<any>(null); // To hold Monaco editor instance
    const aether = useAether();
    const { toast } = useToast();
    const [isSaving, setIsSaving] = React.useState(false);

    const handleEditorDidMount = (editor: any) => {
        editorRef.current = editor;
    };

    const handleSave = () => {
        if (!activeFile || !aether) {
            toast({ title: "Cannot Save", description: "No active file or aether client unavailable.", variant: "destructive" });
            return;
        }

        setIsSaving(true);
        toast({ title: "Saving...", description: `Saving ${activeFile.name}` });

        aether.publish('vfs:write', { path: activeFile.path, content: activeFile.content });

        const sub = aether.subscribe('vfs:write:result', (env) => {
            if (env.payload.path === activeFile.path) { // Match response to the file being saved
                toast({ title: "File Saved!", description: `${activeFile.name} has been saved.` });
                onSave(activeFile.id);
                setIsSaving(false);
                osEvent.emit('file-system-change');
                sub(); // unsubscribe
            }
        });
        const errSub = aether.subscribe('vfs:write:error', (env) => {
            if (env.meta?.correlationId) { // This assumes backend sends correlationId
                toast({ title: "Save failed", description: env.payload.error, variant: 'destructive'});
                setIsSaving(false);
                errSub();
            }
        });
    };

    return (
        <div className="flex flex-col h-full w-full bg-card">
            {/* Tabs */}
            <div className="flex-shrink-0 border-b">
                <ScrollArea className="w-full whitespace-nowrap">
                    <div className="flex">
                        {files.map(file => (
                            <div
                                key={file.id}
                                onClick={() => onTabClick(file.id)}
                                className={cn(
                                    "flex items-center gap-2 px-3 py-2 border-r text-sm cursor-pointer",
                                    activeFileId === file.id
                                        ? "bg-background text-foreground"
                                        : "bg-muted/50 text-muted-foreground hover:bg-muted"
                                )}
                            >
                                <span className={cn(file.isDirty && "italic")}>{file.name}{file.isDirty ? '*' : ''}</span>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-5 w-5 rounded-full"
                                    onClick={(e) => { e.stopPropagation(); onCloseTab(file.id); }}
                                >
                                    <X className="h-3 w-3" />
                                </Button>
                            </div>
                        ))}
                    </div>
                     <ScrollBar orientation="horizontal" />
                </ScrollArea>
            </div>

            {/* Editor Pane */}
            <div className="flex-grow relative">
                {activeFile ? (
                    <>
                        <div className="absolute top-2 right-2 z-10">
                            <Button variant="secondary" size="sm" onClick={handleSave} disabled={isSaving || !activeFile.isDirty}>
                                {isSaving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
                                Save
                            </Button>
                        </div>
                        <Suspense fallback={<div className="flex items-center justify-center h-full"><Loader2 className="animate-spin h-8 w-8" /></div>}>
                            <MonacoEditor
                                value={activeFile.content}
                                onMount={handleEditorDidMount}
                                onChange={(value) => onContentChange(activeFile.id, value || '')}
                                language={activeFile.name.split('.').pop() === 'tsx' ? 'typescript' : 'javascript'}
                                path={activeFile.path}
                            />
                        </Suspense>
                    </>
                ) : (
                    <div className="flex h-full w-full items-center justify-center text-muted-foreground">
                        <p>Select a file from the tree to start editing.</p>
                    </div>
                )}
            </div>
        </div>
    );
}
