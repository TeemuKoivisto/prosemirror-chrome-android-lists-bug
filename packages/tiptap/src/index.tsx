import React from 'react'
import { createRoot } from 'react-dom/client'
import { extensions } from '@tiptap/core'
import { EditorContent, useEditor } from '@tiptap/react'

import { Editor } from '@tiptap/core'
// import { Document } from '@tiptap/extension-document'
// import { BulletList } from '@tiptap/extension-bullet-list'
// import { ListItem } from '@tiptap/extension-list-item'
// import { Paragraph } from './Paragraph'
// import { Text } from '@tiptap/extension-text'
import { ListKeymap } from '@tiptap/extension-list-keymap'
import { Document, BulletList, ListItem, Paragraph, Text } from './extensions'
import { Keymap } from './Keymap'
import { applyDevTools } from 'prosemirror-dev-toolkit'

import defaultDoc from './default-pm-doc.json'

import './styles.css'

export function TiptapEditor() {
  const editor = useEditor({
    content: defaultDoc,
    enableCoreExtensions: false,
    extensions: [
      extensions.ClipboardTextSerializer,
      extensions.Commands,
      extensions.Drop,
      extensions.Editable,
      extensions.FocusEvents,
      extensions.Paste,
      extensions.Tabindex,
      Keymap,
      BulletList,
      Document,
      ListItem,
      Paragraph,
      Text,
      ListKeymap.configure({
        listTypes: [
          {
            itemName: 'listItem',
            wrapperNames: ['bulletList', 'orderedList']
          },
          {
            itemName: 'taskItem',
            wrapperNames: ['taskList']
          }
        ]
      })
    ]
  })
  React.useEffect(() => {
    editor?.view && applyDevTools(editor.view)
  }, [])
  // console.log('editor', editor)
  return <EditorContent editor={editor} className="editor" />
}

const root = createRoot(document.getElementById('root') as HTMLElement)
root.render(<TiptapEditor />)
