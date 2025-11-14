
'use client';

import React from 'react';
import Editor from '@monaco-editor/react';
import { Loader2 } from 'lucide-react';

const MonacoEditor = (props) => {
  // In a real app, you might want a more sophisticated way to get the theme
  // but for now, we'll assume dark theme.
  const theme = 'vs-dark';

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
