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
    if (contentDOM) {
      const contentWrapper = document.createElement('div')
      contentWrapper.appendChild(contentDOM)
      dom.appendChild(contentWrapper)
    }
    const divBehindContent = document.createElement('div')
    const wrapper = document.createElement('div')
    wrapper.setAttribute('contenteditable', 'false')
    wrapper.appendChild(divBehindContent)
    dom.appendChild(wrapper)
    this.dom = dom
  }

  ignoreMutation = (mutation: MutationRecord) => {
    if (!this.dom || !this.contentDOM || this.node.isLeaf || this.node.isAtom) {
      return true
    } else if (this.contentDOM === mutation.target && mutation.type === 'attributes') {
      return true
    }
    return !this.contentDOM.contains(mutation.target)
  }

  destroy() {
    while (this.dom.firstChild) {
      this.dom.removeChild(this.dom.firstChild)
    }
  }
}
