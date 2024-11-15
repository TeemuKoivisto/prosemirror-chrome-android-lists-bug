import React from 'react'
import { mergeAttributes, Node } from '@tiptap/core'
import { NodeViewContent, NodeViewWrapper, ReactNodeViewRenderer } from '@tiptap/react'
import { Plugin } from '@tiptap/pm/state'
// import { splitListItem } from './splitListItemTiptap'
import { splitListItem } from './splitListItemOrig'
import { ParagraphView } from './ParagraphView'

export const Document = Node.create({
  name: 'doc',
  topNode: true,
  content: 'block+'
})

export const Text = Node.create({
  name: 'text',
  group: 'inline'
})

const ParagraphComponent = () => {
  return (
    <NodeViewWrapper>
      <NodeViewContent />
    </NodeViewWrapper>
  )
}

export const Paragraph = Node.create({
  name: 'paragraph',

  priority: 1000,

  addOptions() {
    return {
      HTMLAttributes: {}
    }
  },

  group: 'block',

  content: 'inline*',

  parseHTML() {
    return [{ tag: 'p' }]
  },

  renderHTML({ HTMLAttributes }) {
    return ['p', mergeAttributes(this.options.HTMLAttributes, HTMLAttributes), 0]
  },

  addAttributes() {
    return {
      id: {
        default: ''
      }
    }
  },

  addNodeView() {
    return ReactNodeViewRenderer(ParagraphComponent, {
      // @BUG -> THIS FIXES EVERYTHING!!!!
      contentDOMElementTag: 'p'
    })
  }

  // addProseMirrorPlugins() {
  //   return [
  //     new Plugin({
  //       props: {
  //         nodeViews: {
  //           paragraph: (n, v) => new ParagraphView(n, v)
  //         }
  //       }
  //     })
  //   ]
  // }
})

export const ListItem = Node.create({
  name: 'listItem',

  addOptions() {
    return {
      HTMLAttributes: {},
      bulletListTypeName: 'bulletList',
      orderedListTypeName: 'orderedList'
    }
  },

  content: 'paragraph block*',

  defining: true,

  parseHTML() {
    return [
      {
        tag: 'li'
      }
    ]
  },

  renderHTML({ HTMLAttributes }) {
    return ['li', mergeAttributes(this.options.HTMLAttributes, HTMLAttributes), 0]
  },

  addKeyboardShortcuts() {
    const nodeType = this.editor.schema.nodes[this.name]
    return {
      // Enter: () => this.editor.commands.splitListItem(nodeType)
      Enter: () => this.editor.commands.command(splitListItem(nodeType))
    }
  }
})

export const BulletList = Node.create({
  name: 'bulletList',

  addOptions() {
    return {
      itemTypeName: 'listItem',
      HTMLAttributes: {},
      keepMarks: false,
      keepAttributes: false
    }
  },

  group: 'block list',

  content() {
    return `${this.options.itemTypeName}+`
  },

  parseHTML() {
    return [{ tag: 'ul' }]
  },

  renderHTML({ HTMLAttributes }) {
    return ['ul', mergeAttributes(this.options.HTMLAttributes, HTMLAttributes), 0]
  }
})
