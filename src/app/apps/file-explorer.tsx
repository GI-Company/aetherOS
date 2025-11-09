
"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Folder, File, Search, Loader2 } from "lucide-react";
import { semanticFileSearch } from "@/ai/flows/semantic-file-search";
import { useToast } from "@/hooks/use-toast";

type FileItem = {
  name: string;
  type: "folder" | "file";
  size: string;
  modified: string;
  path: string;
};

const initialFiles: FileItem[] = [
  { name: "Projects", type: "folder", size: "12.5 GB", modified: "2024-05-20", path: "/Projects" },
  { name: "Documents", type: "folder", size: "2.1 GB", modified: "2024-05-18", path: "/Documents" },
  { name: "proactive-os-assistance.ts", type: "file", size: "2.1 KB", modified: "2024-05-22", path: "/src/ai/flows/proactive-os-assistance.ts"},
  { name: "aether_os_whitepaper.pdf", type: "file", size: "2.3 MB", modified: "2024-04-30", path: "/Documents/aether_os_whitepaper.pdf" },
  { name: "system_boot.log", type: "file", size: "15 KB", modified: "2024-05-21", path: "/var/log/system_boot.log" },
  { name: "q2_earnings_report.docx", type: "file", size: "850 KB", modified: "2024-04-12", path: "/Documents/q2_earnings_report.docx" },
];

interface FileExplorerAppProps {
  onOpenFile?: (filePath: string) => void;
}

export default function FileExplorerApp({ onOpenFile }: FileExplorerAppProps) {
  const [files, setFiles] = useState(initialFiles);
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery) {
      setFiles(initialFiles); // Reset to all files if search is cleared
      return;
    }

    setIsLoading(true);
    try {
      const result = await semanticFileSearch({ query: searchQuery });
      const foundFileNames = result.results;
      
      const newFiles: FileItem[] = foundFileNames.map(name => {
        const existingFile = initialFiles.find(f => f.name.toLowerCase() === name.toLowerCase());
        if (existingFile) {
          return existingFile;
        }
        // Create a new mock file for AI-found items that weren't in the initial list
        const isFolder = !name.includes('.');
        return {
          name: name,
          type: isFolder ? 'folder' : 'file',
          size: '???',
          modified: new Date().toISOString().split('T')[0],
          path: (isFolder ? '/' : '/found/') + name,
        }
      }).filter(Boolean) as FileItem[];

      if (newFiles.length > 0) {
        setFiles(newFiles);
        toast({ title: "Semantic Search Complete", description: `The AI found ${newFiles.length} relevant items.` });
      } else {
        setFiles([]);
        toast({ title: "Search Complete", description: "No items matched your semantic query." });
      }
      
    } catch (error) {
      console.error("Semantic search failed:", error);
      toast({ title: "Search Failed", description: "The AI search service is unavailable.", variant: "destructive" });
      setFiles(initialFiles); // On error, revert to the initial list
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleDoubleClick = (file: FileItem) => {
    if (file.type === 'file' && onOpenFile) {
      onOpenFile(file.path);
    }
  }

  return (
    <div className="flex flex-col h-full">
      <div className="p-2 border-b">
        <form onSubmit={handleSearch}>
          <div className="relative">
            {isLoading ? (
              <Loader2 className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground animate-spin" />
            ) : (
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            )}
            <Input 
              placeholder="Semantic Search (e.g., 'documents about Q2 earnings')" 
              className="pl-9 bg-background/50"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              disabled={isLoading}
            />
          </div>
        </form>
      </div>
      <ScrollArea className="flex-grow">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[400px]">Name</TableHead>
              <TableHead>Size</TableHead>
              <TableHead>Last Modified</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {files.map((file) => (
              <TableRow key={file.path} onDoubleClick={() => handleDoubleClick(file)} className={file.type === 'file' ? 'cursor-pointer' : ''}>
                <TableCell className="font-medium flex items-center gap-2">
                  {file.type === 'folder' ? <Folder className="h-4 w-4 text-accent" /> : <File className="h-4 w-4 text-muted-foreground" />}
                  {file.name}
                </TableCell>
                <TableCell>{file.size}</TableCell>
                <TableCell>{file.modified}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        {files.length === 0 && !isLoading && (
          <div className="text-center p-8 text-muted-foreground">No files found.</div>
        )}
      </ScrollArea>
      <div className="p-2 border-t text-xs text-muted-foreground">
        {isLoading ? 'Searching...' : `${files.length} items`}
      </div>
    </div>
  );
}
