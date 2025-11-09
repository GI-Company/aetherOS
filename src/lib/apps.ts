import { Code, Folder, Globe, Mail, Settings, type LucideIcon, Workflow, PenTool, Layers, Users, Monitor, CreditCard } from "lucide-react";
import React from "react";
import SettingsApp from "@/app/apps/settings";
import FileExplorerApp from "@/app/apps/file-explorer";
import CodeEditorApp from "@/app/apps/code-editor";
import BrowserApp from "@/app/apps/browser";
import WorkflowStudioApp from "@/app/apps/workflow-studio";
import DesignStudioApp from "@/app/apps/design-studio";
import PixelStreamerApp from "@/app/apps/pixel-streamer";
import BillingApp from "@/app/apps/billing";


export type App = {
  id: string;
  name: string;
  Icon: LucideIcon;
  component: React.ComponentType<any>; // Allow components to accept props
  defaultSize: { width: number; height: number };
};

const MailApp = () => React.createElement('div', { className: 'p-4' }, 'Mail App Content');
const CollaborationApp = () => React.createElement('div', { className: 'p-4 flex items-center justify-center h-full text-muted-foreground' }, 'Real-time Collaboration features would be here.');
const VirtualMachineApp = () => React.createElement('div', { className: 'p-4 flex items-center justify-center h-full text-muted-foreground' }, 'Embedded VM would be displayed here.');


export const APPS: App[] = [
  {
    id: "file-explorer",
    name: "File Explorer",
    Icon: Folder,
    component: FileExplorerApp,
    defaultSize: { width: 700, height: 500 },
  },
  {
    id: "code-editor",
    name: "Code Editor",
    Icon: Code,
    component: CodeEditorApp,
    defaultSize: { width: 800, height: 600 },
  },
  {
    id: "browser",
    name: "Browser",
    Icon: Globe,
    component: BrowserApp,
    defaultSize: { width: 1024, height: 768 },
  },
  {
    id: "workflow-studio",
    name: "Workflow Studio",
    Icon: Workflow,
    component: WorkflowStudioApp,
    defaultSize: { width: 900, height: 650 },
  },
  {
    id: "design-studio",
    name: "Design Studio",
    Icon: PenTool,
    component: DesignStudioApp,
    defaultSize: { width: 700, height: 550 },
  },
  {
    id: "pixel-streamer",
    name: "Pixel Streamer",
    Icon: Layers,
    component: PixelStreamerApp,
    defaultSize: { width: 600, height: 450 },
  },
  {
    id: 'collaboration',
    name: 'Collaboration',
    Icon: Users,
    component: CollaborationApp,
    defaultSize: { width: 900, height: 650 },
  },
  {
    id: 'virtual-machine',
    name: 'Virtual Machine',
    Icon: Monitor,
    component: VirtualMachineApp,
    defaultSize: { width: 1024, height: 768 },
  },
  {
    id: "mail",
    name: "Mail",
    Icon: Mail,
    component: MailApp,
    defaultSize: { width: 800, height: 600 },
  },
  {
    id: "settings",
    name: "Settings",
    Icon: Settings,
    component: SettingsApp,
    defaultSize: { width: 600, height: 550 },
  },
    {
    id: "billing",
    name: "Billing",
    Icon: CreditCard,
    component: BillingApp,
    defaultSize: { width: 900, height: 700 },
  },
];
