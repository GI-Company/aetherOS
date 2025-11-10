
import { Code, Folder, Globe, Mail, Settings, type LucideIcon, Workflow, PenTool, Layers, Users, Container, CreditCard, Image, MessagesSquare, ShieldCheck } from "lucide-react";
import React from "react";
import SettingsApp from "@/app/apps/settings";
import FileExplorerApp from "@/app/apps/file-explorer";
import CodeEditorApp from "@/app/apps/code-editor";
import BrowserApp from "@/app/apps/browser";
import WorkflowStudioApp from "@/app/apps/workflow-studio";
import DesignStudioApp from "@/app/apps/design-studio";
import PixelStreamerApp from "@/app/apps/pixel-streamer";
import BillingApp from "@/app/apps/billing";
import CollaborationApp from "@/app/apps/collaboration";
import ImageViewerApp from "@/app/apps/image-viewer";
import PeopleApp from "@/app/apps/people";


export type App = {
  id: string;
  name: string;
  Icon: LucideIcon;
  component: React.ComponentType<any>; // Allow components to accept props
  defaultSize: { width: number; height: number };
  hideFromDock?: boolean;
};

const MailApp = () => React.createElement('div', { className: 'p-4' }, 'Mail App Content');
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
    id: "image-viewer",
    name: "Image Viewer",
    Icon: Image,
    component: ImageViewerApp,
    defaultSize: { width: 800, height: 600 },
    hideFromDock: true,
  },
  {
    id: "browser",
    name: "Browser",
    Icon: Globe,
    component: BrowserApp,
    defaultSize: { width: 1024, height: 768 },
  },
   {
    id: 'collaboration',
    name: 'Collaboration',
    Icon: MessagesSquare,
    component: CollaborationApp,
    defaultSize: { width: 750, height: 650 },
  },
  {
    id: 'people',
    name: 'People',
    Icon: Users,
    component: PeopleApp,
    defaultSize: { width: 300, height: 500 },
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
    id: 'virtual-machine',
    name: 'Virtual Machine',
    Icon: Container,
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

    