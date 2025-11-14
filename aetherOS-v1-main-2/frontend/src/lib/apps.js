import React from 'react';
import { HardDrive, Code, Mail, Settings, Terminal as TerminalIcon } from 'lucide-react';
import Terminal from '../apps/Terminal';
import FileExplorer from '../apps/FileExplorer';

const CodeEditor = () => React.createElement('div', null, 'Code Editor');
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
    id: 'terminal',
    name: 'Terminal',
    Icon: TerminalIcon,
    component: Terminal,
    defaultSize: { width: 640, height: 480 },
  },
  {
    id: 'code-editor',
    name: 'Code Editor',
    Icon: Code,
    component: CodeEditor,
    defaultSize: { width: 800, height: 600 },
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
