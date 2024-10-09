import * as React from 'react'
import { Paragraph as BaseParagraph } from '@tiptap/extension-paragraph'
import { NodeViewContent, NodeViewWrapper, ReactNodeViewRenderer } from '@tiptap/react'

const ParagraphComponent = () => {
  return (
    <NodeViewWrapper>
      <NodeViewContent as="p" />
    </NodeViewWrapper>
  )
}

export const Paragraph = BaseParagraph.extend({
  addAttributes() {
    return {
      id: {
        default: ''
      }
    }
  },
  addNodeView() {
    return ReactNodeViewRenderer(ParagraphComponent)
  }
})
