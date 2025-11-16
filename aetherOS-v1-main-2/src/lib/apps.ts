
import { Code, Folder, Globe, Mail, Settings, type LucideIcon, Workflow, PenTool, Layers, Users, Container, CreditCard, Image, MessagesSquare, Bot } from "lucide-react";
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


export type AppManifest = {
  id: string;
  name: string;
  version: string;
  developer: string;
  description: string;
  permissions: string[];
  entry_point: string;
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

const ICONS: { [key: string]: LucideIcon } = {
  Folder, Code, Image, Globe, MessagesSquare, Users, Bot, PenTool, Layers, Container, Mail, Settings, CreditCard
};

const COMPONENTS: { [key: string]: React.ComponentType<any> } = {
    'file-explorer': FileExplorerApp,
    'code-editor': CodeEditorApp,
    'image-viewer': ImageViewerApp,
    'browser': BrowserApp,
    'collaboration': CollaborationApp,
    'people': PeopleApp,
    'agent-console': AgentConsoleApp,
    'design-studio': DesignStudioApp,
    'pixel-streamer': PixelStreamerApp,
    'virtual-machine': VmTerminalApp,
    'mail': MailApp,
    'settings': SettingsApp,
    'billing': BillingApp
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
  billingManifest
];

export const APPS: App[] = MANIFESTS.map(manifest => {
    const iconName = manifest.id.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join('');
    const IconComponent = ICONS[Object.keys(ICONS).find(key => key.toLowerCase() === iconName.replace(/-/g, '').toLowerCase()) || 'Code'];

    return {
        manifest,
        Icon: IconComponent,
        component: COMPONENTS[manifest.id],
    };
});
