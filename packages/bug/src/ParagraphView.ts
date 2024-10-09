import { EditorView, NodeView } from 'prosemirror-view'
import { DOMSerializer, Node as PMNode, Schema } from 'prosemirror-model'

export class ParagraphView implements NodeView {
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
    contentDOM && dom.appendChild(contentDOM)
    this.dom = dom
  }
}
