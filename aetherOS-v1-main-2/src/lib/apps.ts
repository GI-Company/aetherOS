
import { Code, Folder, Globe, Mail, Settings, type LucideIcon, Workflow, PenTool, Layers, Users, Container, CreditCard, Image, MessagesSquare, Bot, ShoppingBasket } from "lucide-react";
import React from "react";
import FileExplorerApp from "@/app/apps/file-explorer";
import CodeEditorApp from "@/app/apps/code-editor";
import ImageViewerApp from "@/app/apps/image-viewer";
import BrowserApp from "@/app/apps/browser";
import CollaborationApp from "@/app/apps/collaboration";
import PeopleApp from "@/app/apps/people";
import AgentConsoleApp from "@/app/apps/agent-console";
import DesignStudioApp from "@/app/apps/design-studio";
import PixelStreamerApp from "@/app/apps/pixel-streamer";
import VmTerminalApp from "@/app/apps/vm-terminal";
import MailApp from "@/app/apps/mail";
import SettingsApp from "@/app/apps/settings";
import BillingApp from "@/app/apps/billing";
import AppStoreApp from "@/app/apps/app-store";

// Import manifests
import fileExplorerManifest from '@/app/apps/file-explorer/manifest.json';
import codeEditorManifest from '@/app/apps/code-editor/manifest.json';
import imageViewerManifest from '@/app/apps/image-viewer/manifest.json';
import browserManifest from '@/app/apps/browser/manifest.json';
import collaborationManifest from '@/app/apps/collaboration/manifest.json';
import peopleManifest from '@/app/apps/people/manifest.json';
import agentConsoleManifest from '@/app/apps/agent-console/manifest.json';
import designStudioManifest from '@/app/apps/design-studio/manifest.json';
import pixelStreamerManifest from '@/app/apps/pixel-streamer/manifest.json';
import vmTerminalManifest from '@/app/apps/vm-terminal/manifest.json';
import mailManifest from '@/app/apps/mail/manifest.json';
import settingsManifest from '@/app/apps/settings/manifest.json';
import billingManifest from '@/app/apps/billing/manifest.json';
import helloWorldManifest from '@/app/apps/hello-world/manifest.json';
import appStoreManifest from '@/app/apps/app-store/manifest.json';


export type AppManifest = {
  id: string;
  name: string;
  version: string;
  developer: string;
  description: string;
  entry: string;
  permissions: Record<string, any>;
  sandbox: {
      profile: 'ui' | 'background' | 'agent' | 'privileged';
  };
  signing: {
      publicKey: string;
      fingerprint: string;
  };
  ui_hints: {
    resizable: boolean;
    theme: string;
    defaultSize: { width: number; height: number };
    hideFromDock?: boolean;
  };
};

export type App = {
  manifest: AppManifest;
  Icon: LucideIcon;
  component: React.ComponentType<any>;
};

// A helper map to associate manifest IDs with their components and icons.
const APP_METADATA: { [key: string]: { component: React.ComponentType<any>, icon: LucideIcon } } = {
    [fileExplorerManifest.id]: { component: FileExplorerApp, icon: Folder },
    [codeEditorManifest.id]: { component: CodeEditorApp, icon: Code },
    [imageViewerManifest.id]: { component: ImageViewerApp, icon: Image },
    [browserManifest.id]: { component: BrowserApp, icon: Globe },
    [collaborationManifest.id]: { component: CollaborationApp, icon: MessagesSquare },
    [peopleManifest.id]: { component: PeopleApp, icon: Users },
    [agentConsoleManifest.id]: { component: AgentConsoleApp, icon: Bot },
    [designStudioManifest.id]: { component: DesignStudioApp, icon: PenTool },
    [pixelStreamerManifest.id]: { component: PixelStreamerApp, icon: Layers },
    [vmTerminalManifest.id]: { component: VmTerminalApp, icon: Container },
    [mailManifest.id]: { component: MailApp, icon: Mail },
    [settingsManifest.id]: { component: SettingsApp, icon: Settings },
    [billingManifest.id]: { component: BillingApp, icon: CreditCard },
    [appStoreManifest.id]: { component: AppStoreApp, icon: ShoppingBasket },
    [helloWorldManifest.id]: { component: () => null, icon: Code }, // No UI component for wasm app
};

const MANIFESTS: AppManifest[] = [
  fileExplorerManifest,
  codeEditorManifest,
  imageViewerManifest,
  browserManifest,
  collaborationManifest,
  peopleManifest,
  agentConsoleManifest,
  designStudioManifest,
  pixelStreamerManifest,
  vmTerminalManifest,
  mailManifest,
  settingsManifest,
  billingManifest,
  appStoreManifest,
  helloWorldManifest
];

export const APPS: App[] = MANIFESTS.map(manifest => {
    const metadata = APP_METADATA[manifest.id];
    if (!metadata) {
        // Fallback for any manifests that might not be mapped
        console.warn(`No metadata found for app with ID: ${manifest.id}`);
        return {
            manifest,
            Icon: Settings, // Default icon
            component: () => React.createElement('div', null, `App not found: ${manifest.name}`),
        };
    }
    return {
        manifest,
        Icon: metadata.icon,
        component: metadata.component,
    };
});
