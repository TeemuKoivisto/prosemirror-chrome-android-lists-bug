import { DOMSerializer, Node as PMNode, Schema } from 'prosemirror-model'
import { EditorState, Plugin } from 'prosemirror-state'
import { EditorView, NodeView } from 'prosemirror-view'
import { keymap } from 'prosemirror-keymap'
import { baseKeymap } from 'prosemirror-commands'
import { splitListItem } from 'prosemirror-schema-list'
import { applyDevTools } from 'prosemirror-dev-toolkit'
import { backspace } from './commands'

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

class ParagraphView implements NodeView {
  dom: Node
  contentDOM?: HTMLElement
  node: PMNode

  constructor(
    node: PMNode,
    readonly view: EditorView
  ) {
    this.node = node
    this.view = view
    const toDOM = this.node.type.spec.toDOM
    if (!toDOM) {
      throw Error(`No toDOM method provided to node type ${this.node.type}`)
    }
    const { dom: _dom, contentDOM } = DOMSerializer.renderSpec(document, toDOM(this.node))
    this.contentDOM = contentDOM
    this.dom = _dom
  }

  destroy() {
    while (this.dom.firstChild) {
      this.dom.removeChild(this.dom.firstChild)
    }
  }
}

document.querySelector('#join')?.addEventListener('click', () => {
  const tr = view.state.tr
  const pos = 8
  view.dispatch(tr.join(pos).scrollIntoView())
  console.log(`join ${pos}`)
})

// const view = new EditorView(document.querySelector('#editor') as HTMLElement, {
//   state: EditorState.create({
//     schema,
//     plugins: [
//       keymap({
//         // Enter: splitListItem(schema.nodes.list_item),
//         Backspace: backspace
//         // Backspace: baseKeymap['Backspace']
//       })
//     ],
//     doc: schema.nodeFromJSON(defaultDoc)
//   })
// })
const view = new EditorView(document.querySelector('#editor') as HTMLElement, {
  state: EditorState.create({
    schema,
    plugins: [
      keymap({
        Enter: splitListItem(schema.nodes.list_item),
        Backspace: baseKeymap['Backspace']
      }),
      new Plugin({
        props: {
          handleDOMEvents: {
            compositionstart: (view, event) => {
              console.log('compositionstart', event)
            },
            keydown: (view, event) => {
              console.log('keydown', event)
            }
          }
        }
      })
    ],
    doc: schema.nodeFromJSON(defaultDoc)
  }),
  nodeViews: {
    paragraph: (n, v) => new ParagraphView(n, v)
  }
})

applyDevTools(view)
