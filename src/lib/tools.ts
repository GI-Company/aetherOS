'use client';

import { App, APPS } from './apps';
import { generateImage } from '@/ai/flows/generate-image';
import { designByPromptUiGeneration } from '@/ai/flows/design-by-prompt-ui-generation';

/**
 * @fileoverview Central registry for all client-side tools available to the AI agent.
 */

export type Tool = {
    toolId: string;
    description: string;
    execute: (context: ToolExecutionContext, args: any) => Promise<any>;
};

export type ToolExecutionContext = {
    onOpenApp: (app: App, props?: Record<string, any>) => void;
    onOpenFile: (filePath: string, content?: string) => void;
    onArrangeWindows: () => void;
    setWallpaper: (imageUrl: string) => void;
    // Add other context methods as needed, e.g., getFileSystem, etc.
};

export const TOOLS: Record<string, Tool> = {
    openApp: {
        toolId: 'openApp',
        description: 'Opens a specified application. Use this to launch any of the available OS applications.',
        execute: async (context, args) => {
            const appToOpen = APPS.find(a => a.id === args.appId);
            if (appToOpen) {
                context.onOpenApp(appToOpen, args.props);
                return { success: true, message: `Opened ${appToOpen.name}` };
            }
            return { success: false, message: `App with ID '${args.appId}' not found.` };
        },
    },
    arrangeWindows: {
        toolId: 'arrangeWindows',
        description: 'Arranges the Code Editor and Browser windows side-by-side for a coding workflow.',
        execute: async (context, args) => {
            context.onArrangeWindows();
            return { success: true, message: 'Windows arranged.' };
        },
    },
    openFile: {
        toolId: 'openFile',
        description: 'Opens a specified file in its default application (e.g., Code Editor for code, Image Viewer for images).',
        execute: async (context, args) => {
            context.onOpenFile(args.filePath, args.content);
            return { success: true, message: `Opening file ${args.filePath}` };
        },
    },
    writeFile: {
        toolId: 'writeFile',
        description: 'Writes or overwrites a file with the given content at the specified path. This is equivalent to saving a file.',
        execute: async (context, args) => {
            context.onOpenFile(args.filePath, args.content);
            return { success: true, message: `File content written to ${args.filePath}` };
        }
    },
    setWallpaper: {
        toolId: 'setWallpaper',
        description: "Sets the user's desktop wallpaper to the specified image URL.",
        execute: async (context, args) => {
            context.setWallpaper(args.imageUrl);
            return { success: true, message: 'Wallpaper has been set.' };
        },
    },
    generateImage: {
        toolId: 'generateImage',
        description: 'Generates an image from a text prompt using an AI model. Returns the image data.',
        execute: async (context, args) => {
            return await generateImage({ prompt: args.prompt });
        },
    },
    designComponent: {
        toolId: 'designComponent',
        description: 'Generates React component code from a text prompt. Returns the generated code.',
        execute: async (context, args) => {
            const result = await designByPromptUiGeneration({ prompt: args.prompt });
            const cleanedCode = result.uiElementCode.replace(/```.*\n/g, '').replace(/```/g, '').trim();
            return { code: cleanedCode };
        }
    },
    searchFiles: {
        toolId: 'searchFiles',
        description: "Performs a semantic search for files based on a natural language query. This is used when a user wants to 'find' or 'search for' a file but not necessarily open it immediately. If the user wants to find AND open, chain this with 'openFile'.",
        execute: async (context, args) => {
             // In a real scenario, this would interact with a file search service.
             // For the agent's planning purposes, we can simulate its effect.
            context.onOpenApp(APPS.find(a => a.id === 'file-explorer')!, { searchQuery: args.query });
            return { success: true, message: `Searching for files matching: ${args.query}` };
        }
    }
};
