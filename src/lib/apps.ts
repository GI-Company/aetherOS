import { Code, Folder, Globe, Mail, Settings, type LucideIcon, Workflow, PenTool, Camera } from "lucide-react";
import SettingsApp from "@/app/apps/settings";
import FileExplorerApp from "@/app/apps/file-explorer";
import CodeEditorApp from "@/app/apps/code-editor";
import BrowserApp from "@/app/apps/browser";
import WorkflowStudioApp from "@/app/apps/workflow-studio";
import DesignStudioApp from "@/app/apps/design-studio";
import PixelStreamerApp from "@/app/apps/pixel-streamer";

export type App = {
  id: string;
  name: string;
  Icon: LucideIcon;
  component: React.ComponentType;
  defaultSize: { width: number; height: number };
};

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
    Icon: Camera,
    component: PixelStreamerApp,
    defaultSize: { width: 600, height: 450 },
  },
  {
    id: "mail",
    name: "Mail",
    Icon: Mail,
    component: () => <div className="p-4">Mail App Content</div>,
    defaultSize: { width: 800, height: 600 },
  },
  {
    id: "settings",
    name: "Settings",
    Icon: Settings,
    component: SettingsApp,
    defaultSize: { width: 600, height: 500 },
  },
];
