import { Schema } from 'prosemirror-model'

export const schema = new Schema({
  nodes: {
    doc: {
      content: 'block+'
    },
    bullet_list: {
      group: 'block',
      content: 'list_item+',
      parseDOM: [{ tag: 'ul' }],
      toDOM() {
        return ['ul', 0]
      }
    },
    list_item: {
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
      parseDOM: [
        {
          tag: 'p',
          getAttrs: (dom: HTMLElement | string) => {
            if (dom instanceof HTMLElement) {
              return { id: dom.getAttribute('id') }
            }
            return null
          }
        }
      ],
      toDOM(n) {
        return ['p', { id: n.attrs.id || '' }, 0]
      }
    },
    text: {
      group: 'inline'
    }
  }
})
