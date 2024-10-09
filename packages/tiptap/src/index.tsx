import React from 'react'
import { createRoot } from 'react-dom/client'
import { EditorContent, useEditor } from '@tiptap/react'

import { Editor } from '@tiptap/core'
// import { Document } from '@tiptap/extension-document'
// import { BulletList } from '@tiptap/extension-bullet-list'
// import { ListItem } from '@tiptap/extension-list-item'
// import { Paragraph } from './Paragraph'
// import { Text } from '@tiptap/extension-text'
import { Document, BulletList, ListItem, Paragraph, Text } from './extensions'
import { applyDevTools } from 'prosemirror-dev-toolkit'

import defaultDoc from './default-pm-doc.json'

import './styles.css'

export function TiptapEditor() {
  const editor = useEditor({
    content: defaultDoc,
    extensions: [BulletList, Document, ListItem, Paragraph, Text]
  })
  React.useEffect(() => {
    editor?.view && applyDevTools(editor.view)
  }, [])
  // console.log('editor', editor)
  return <EditorContent editor={editor} className="editor" />
}

const root = createRoot(document.getElementById('root') as HTMLElement)
root.render(<TiptapEditor />)
