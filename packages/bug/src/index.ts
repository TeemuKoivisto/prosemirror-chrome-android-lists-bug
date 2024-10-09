import { Schema } from 'prosemirror-model'
import { EditorState } from 'prosemirror-state'
import { EditorView } from 'prosemirror-view'
import { keymap } from 'prosemirror-keymap'
import { splitListItem } from 'prosemirror-schema-list'
import { applyDevTools } from 'prosemirror-dev-toolkit'

const defaultDoc = {
  type: 'doc',
  content: [
    {
      type: 'bullet_list',
      content: [
        {
          type: 'list_item',
          content: [
            {
              type: 'paragraph',
              attrs: {
                id: 'id1'
              },
              content: [
                {
                  type: 'text',
                  text: 'one'
                }
              ]
            }
          ]
        },
        {
          type: 'list_item',
          content: [
            {
              type: 'paragraph',
              attrs: {
                id: 'id2'
              },
              content: [
                {
                  type: 'text',
                  text: 'two'
                }
              ]
            }
          ]
        }
      ]
    }
  ]
}

const schema = new Schema({
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

const state = EditorState.create({
  schema,
  plugins: [keymap({ Enter: splitListItem(schema.nodes.list_item) })],
  doc: schema.nodeFromJSON(defaultDoc)
})

const view = new EditorView(document.querySelector('#editor') as HTMLElement, {
  state
})

applyDevTools(view)
