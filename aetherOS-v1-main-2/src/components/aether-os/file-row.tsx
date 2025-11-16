
'use client';

import { useState, useEffect } from 'react';
import { getStorage, ref, getDownloadURL } from 'firebase/storage';
import { TableRow, TableCell } from '@/components/ui/table';
import { FileItem } from '@/lib/types';
import { formatBytes } from '@/lib/utils';
import { format } from 'date-fns';
import { Folder, File, MoreVertical, Trash2 } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import Image from 'next/image';
import CodePreview from './code-preview';

interface FileRowProps {
  file: FileItem;
  onDoubleClick: (file: FileItem) => void;
  onDelete: (file: FileItem) => void;
}

const FileRow = ({ file, onDoubleClick, onDelete }: FileRowProps) => {
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [isLoadingUrl, setIsLoadingUrl] = useState(false);

  const isImage = !file.isDir && /\.(jpg|jpeg|png|gif|webp)$/i.test(file.name);
  const isCode = !file.isDir && /\.(ts|tsx|js|jsx|json|css|md)$/i.test(file.name);

  useEffect(() => {
    let isMounted = true;
    const fetchUrl = async () => {
      if (isImage) {
        setIsLoadingUrl(true);
        try {
          const storage = getStorage();
          const url = await getDownloadURL(ref(storage, file.path));
          if (isMounted) {
            setImageUrl(url);
          }
        } catch (error) {
          console.error("Error fetching image URL for thumbnail:", error);
          if (isMounted) {
            setImageUrl(null);
          }
        } finally {
          if (isMounted) {
            setIsLoadingUrl(false);
          }
        }
      }
    };
    fetchUrl();

    return () => {
      isMounted = false;
    };
  }, [file.path, isImage]);
  
  const renderIcon = () => {
    return <div className="w-10 h-10 rounded bg-muted flex items-center justify-center overflow-hidden flex-shrink-0">
        {file.isDir ? (
             <Folder className="h-5 w-5 text-accent" />
        ) : isImage ? (
            isLoadingUrl ? <Skeleton className="h-full w-full" /> : imageUrl ? (
             <Image src={imageUrl} alt={file.name} width={40} height={40} className="object-cover h-full w-full" />
          ) : <File className="h-5 w-5 text-muted-foreground" />
        ) : isCode ? (
            <CodePreview filePath={file.path} />
        ) : (
            <File className="h-5 w-5 text-muted-foreground" />
        )}
    </div>
  }

  return (
    <TableRow onDoubleClick={() => onDoubleClick(file)} className="cursor-pointer group">
      <TableCell className="font-medium flex items-center gap-3">
        {renderIcon()}
        <span>{file.name}</span>
      </TableCell>
      <TableCell>{!file.isDir ? formatBytes(file.size) : '--'}</TableCell>
      <TableCell className="hidden md:table-cell">{format(file.modTime, "PPp")}</TableCell>
      <TableCell className="text-right">
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="opacity-0 group-hover:opacity-100 h-8 w-8">
                    <MoreVertical className="h-4 w-4" />
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
                <DropdownMenuItem onSelect={() => onDelete(file)} className="text-destructive focus:text-destructive-foreground focus:bg-destructive">
                    <Trash2 className="mr-2 h-4 w-4" />
                    <span>Delete</span>
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
      </TableCell>
    </TableRow>
  )
}

export default FileRow;

    