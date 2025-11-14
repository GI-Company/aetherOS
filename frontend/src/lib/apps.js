import React from 'react';
import { HardDrive, Code, Mail, Settings, Globe, PenTool, Layers, Container } from 'lucide-react';

import FileExplorer from '../apps/FileExplorer';
import CodeEditor from '../apps/CodeEditor';
import BrowserApp from '../apps/Browser';
import DesignStudioApp from '../apps/DesignStudio';
import PixelStreamerApp from '../apps/PixelStreamer';
import VmTerminalApp from '../apps/VmTerminal';


const MailApp = () => React.createElement('div', null, 'Mail App');
const SettingsApp = () => React.createElement('div', null, 'Settings App');

export const APPS = [
  {
    id: 'file-explorer',
    name: 'File Explorer',
    Icon: HardDrive,
    component: FileExplorer,
    defaultSize: { width: 700, height: 500 },
  },
  {
    id: 'code-editor',
    name: 'Code Editor',
    Icon: Code,
    component: CodeEditor,
    defaultSize: { width: 800, height: 600 },
  },
  {
    id: 'browser',
    name: 'Browser',
    Icon: Globe,
    component: BrowserApp,
    defaultSize: { width: 1024, height: 768 },
  },
  {
    id: 'design-studio',
    name: 'Design Studio',
    Icon: PenTool,
    component: DesignStudioApp,
    defaultSize: { width: 700, height: 550 },
  },
  {
    id: 'pixel-streamer',
    name: 'Pixel Streamer',
    Icon: Layers,
    component: PixelStreamerApp,
    defaultSize: { width: 600, height: 650 },
  },
    {
    id: 'virtual-machine',
    name: 'Virtual Machine',
    Icon: Container,
    component: VmTerminalApp,
    defaultSize: { width: 640, height: 480 },
  },
  {
    id: 'mail',
    name: 'Mail',
    Icon: Mail,
    component: MailApp,
    defaultSize: { width: 800, height: 600 },
  },
  {
    id: 'settings',
    name: 'Settings',
    Icon: Settings,
    component: SettingsApp,
    defaultSize: { width: 500, height: 400 },
  },
];
