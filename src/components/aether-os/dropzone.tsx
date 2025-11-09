
'use client';

import { UploadCloud } from 'lucide-react';
import { cn } from '@/lib/utils';

interface DropzoneProps {
    visible: boolean;
}

export default function Dropzone({ visible }: DropzoneProps) {
    return (
        <div
            className={cn(
                'pointer-events-none absolute inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm transition-opacity duration-200',
                visible ? 'opacity-100' : 'opacity-0'
            )}
        >
            <div className="flex flex-col items-center gap-4 rounded-lg border-2 border-dashed border-accent p-12">
                <UploadCloud className="h-16 w-16 text-accent" />
                <p className="text-lg font-semibold text-accent">Drop files to upload</p>
            </div>
        </div>
    );
}

    