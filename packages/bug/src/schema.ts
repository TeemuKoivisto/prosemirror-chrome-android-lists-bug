import { DOMSerializer, Node as PMNode, Schema } from 'prosemirror-model'

// const mySchema = new Schema({
//   nodes: addListNodes(baseSchema.spec.nodes, "paragraph block*", "block"),
//   marks: baseSchema.spec.marks
// })

export const schema = new Schema({
  nodes: {
    doc: {
      content: 'block+'
    },
    bulletList: {
      group: 'block',
      content: 'listItem+',
      parseDOM: [{ tag: 'ul' }],
      toDOM() {
        return ['ul', 0]
      }
    },
    listItem: {
      content: 'paragraph+',
      parseDOM: [{ tag: 'li' }],
      toDOM() {
        return ['li', 0]
      }
    },
    paragraph: {
      content: 'inline*',
      group: 'block',
      selectable: false,
      attrs: { id: { default: null } },
      parseDOM: [{ tag: 'p' }],
      toDOM(n) {
        return ['p', { id: n.attrs.id || '' }, 0]
      }
    },
    text: {
      group: 'inline'
    }
  }
})
