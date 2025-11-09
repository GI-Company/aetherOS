'use client';

import React from 'react';
import Editor, { EditorProps } from '@monaco-editor/react';
import { Loader2 } from 'lucide-react';

const MonacoEditor: React.FC<EditorProps> = (props) => {
  // In a real app, you might want a more sophisticated way to get the theme
  // but for now, we'll check the class on the html element.
  const isDarkMode = typeof document !== 'undefined' && document.documentElement.classList.contains('dark');
  const theme = isDarkMode ? 'vs-dark' : 'light';

  return (
    <Editor
      height="100%"
      theme={theme}
      loading={<Loader2 className="animate-spin" />}
      options={{
        minimap: { enabled: false },
        fontSize: 14,
        wordWrap: 'on',
        scrollBeyondLastLine: false,
        ...props.options,
      }}
      {...props}
    />
  );
};

export default MonacoEditor;
