
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

// The server-side context is now a placeholder, as tools return events for the client to dispatch.
export type ToolExecutionContext = {};

export const TOOLS: Record<string, Tool> = {
    openApp: {
        toolId: 'openApp',
        description: 'Opens a specified application. Use this to launch any of the available OS applications.',
        execute: async (context, args) => {
            return { dispatchedEvent: 'openApp', payload: { appId: args.appId, props: args.props } };
        },
    },
    arrangeWindows: {
        toolId: 'arrangeWindows',
        description: 'Arranges the Code Editor and Browser windows side-by-side for a coding workflow.',
        execute: async (context, args) => {
            return { dispatchedEvent: 'arrangeWindows', payload: {} };
        },
    },
    openFile: {
        toolId: 'openFile',
        description: 'Opens a specified file in its default application (e.g., Code Editor for code, Image Viewer for images).',
        execute: async (context, args) => {
            return { dispatchedEvent: 'openFile', payload: { filePath: args.filePath, content: args.content } };
        },
    },
    writeFile: {
        toolId: 'writeFile',
        description: 'Writes or overwrites a file with the given content at the specified path. This is equivalent to saving a file.',
        execute: async (context, args) => {
            // This tool still behaves like openFile on the client, which handles the saving logic.
            return { dispatchedEvent: 'openFile', payload: { filePath: args.filePath, content: args.content } };
        }
    },
    setWallpaper: {
        toolId: 'setWallpaper',
        description: "Sets the user's desktop wallpaper to the specified image URL.",
        execute: async (context, args) => {
             return { dispatchedEvent: 'setWallpaper', payload: { imageUrl: args.imageUrl } };
        },
    },
    generateImage: {
        toolId: 'generateImage',
        description: 'Generates an image from a text prompt using an AI model. Returns the image data.',
        execute: async (context, args) => {
            // This tool calls an AI flow and returns data directly, no client event needed for the generation itself.
            return await generateImage({ prompt: args.prompt });
        },
    },
    designComponent: {
        toolId: 'designComponent',
        description: 'Generates React component code from a text prompt. Returns the generated code.',
        execute: async (context, args) => {
            const result = await designByPromptUiGeneration({ prompt: args.prompt });
            const cleanedCode = result.uiElementCode.replace(/```.*\n/g, '').replace(/```/g, '').trim();
            // Returns data directly to be piped into the next tool (writeFile).
            return { code: cleanedCode };
        }
    },
    searchFiles: {
        toolId: 'searchFiles',
        description: "Performs a semantic search for files based on a natural language query. This is used when a user wants to 'find' or 'search for' a file but not necessarily open it immediately. If the user wants to find AND open, chain this with 'openFile'.",
        execute: async (context, args) => {
             // The client will interpret this event and open the app with the search query.
            return { dispatchedEvent: 'openApp', payload: { appId: 'file-explorer', props: { searchQuery: args.query } } };
        }
    }
};
