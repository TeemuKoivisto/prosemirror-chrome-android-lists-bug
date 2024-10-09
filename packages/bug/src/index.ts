import { EditorState } from 'prosemirror-state'
import { EditorView, NodeView } from 'prosemirror-view'
import { keymap } from 'prosemirror-keymap'
import { DOMSerializer, Node as PMNode, Schema } from 'prosemirror-model'
import { baseKeymap } from 'prosemirror-commands'

import defaultDoc from './default-pm-doc.json'

class CustomNodeView implements NodeView {
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
    const dom = document.createElement(this.node.type.spec.inline ? 'span' : 'div')
    dom.classList.add('block')
    dom.appendChild(this.createGutter())
    if (contentDOM) {
      dom.appendChild(contentDOM)
    }
    dom.appendChild(this.createGutter())
    this.dom = dom
  }

  createGutter(): HTMLElement {
    const gutter = document.createElement('div')
    gutter.setAttribute('contenteditable', 'false')
    gutter.classList.add('gutter')
    const child = document.createElement('div')
    child.classList.add('child')
    gutter.appendChild(child)
    return gutter
  }
}

const schema = new Schema({
  nodes: {
    doc: {
      content: 'block+'
    },
    paragraph: {
      content: 'inline*',
      group: 'block',
      selectable: false,
      attrs: { id: { default: null }},
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

const state = EditorState.create({
  schema,
  plugins: [keymap(baseKeymap)],
  doc: schema.nodeFromJSON(defaultDoc)
})
const view = new EditorView(document.querySelector('#editor') as HTMLElement, {
  state,
  nodeViews: {
    paragraph: (n, v) => new CustomNodeView(n, v)
  }
})
