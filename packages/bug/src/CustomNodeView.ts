import { EditorView, NodeView } from 'prosemirror-view'
import { DOMSerializer, Node as PMNode } from 'prosemirror-model'

import type { SvelteComponent } from 'svelte'

import ParagraphView from './ParagraphView.svelte'

export class CustomNodeView implements NodeView {
  dom: HTMLElement
  contentDOM?: HTMLElement | null
  node: PMNode
  getPos: () => number | undefined

  editing = false
  mounted?: SvelteComponent

  constructor(
    node: PMNode,
    readonly view: EditorView,
    getPos: () => number | undefined
  ) {
    this.node = node
    this.view = view
    this.getPos = getPos

    const toDOM = this.node.type.spec.toDOM
    if (!toDOM) {
      throw Error(`No toDOM method provided to node type ${this.node.type}`)
    }
    const { dom, contentDOM } = DOMSerializer.renderSpec(document, toDOM(this.node))
    this.dom = document.createElement(this.node.type.spec.inline ? 'span' : 'div')
    this.dom.classList.add('block')
    this.contentDOM = contentDOM
    this.renderSvelte()
  }

  get props() {
    return {
      node: this.node,
      getPos: this.getPos,
      view: this.view,
      contentDOM: (node: HTMLElement) => {
        if (this.contentDOM) {
          node.appendChild(this.contentDOM)
        }
      }
    }
  }

  render() {
    const name = document.createElement('div')
    name.classList.add('name')
    name.contentEditable = 'false'
    const input = document.createElement('input')
    input.classList.add('hidden')
    input.value = this.node.attrs.name || ''
    input.onkeydown = (e: KeyboardEvent) => this.handleInputKeydown(e)
    name.appendChild(input)
    const btn = document.createElement('button')
    btn.textContent = this.node.attrs.name || 'Set Name'
    btn.onclick = () => this.toggleEditing()
    name.appendChild(btn)
    this.dom.appendChild(name)
    const cdom = document.createElement('div')
    this.contentDOM && cdom.appendChild(this.contentDOM)
    this.dom.appendChild(cdom)
  }

  renderSvelte() {
    this.mounted = new ParagraphView({ target: this.dom, props: this.props })
  }

  handleInputKeydown(e: KeyboardEvent) {
    if (e.key === 'Enter') {
      const pos = this.getPos()
      if (pos !== undefined && e.currentTarget instanceof HTMLInputElement) {
        const tr = this.view.state.tr
        tr.setNodeAttribute(pos, 'name', e.currentTarget.value)
        this.view.dispatch(tr)
      }
      this.toggleEditing()
    } else if (e.key === 'Escape') {
      if (e.currentTarget instanceof HTMLInputElement) {
        e.currentTarget.value = ''
      }
      this.toggleEditing()
    }
    e.stopPropagation()
  }

  toggleEditing() {
    if (this.editing) {
      this.dom.querySelector('input')?.classList.add('hidden')
      this.dom.querySelector('button')?.classList.remove('hidden')
    } else {
      const input = this.dom.querySelector('input') as HTMLInputElement
      input.classList.remove('hidden')
      input.focus()
      this.dom.querySelector('button')!.classList.add('hidden')
    }
    this.editing = !this.editing
  }

  ignoreMutation = (mutation: MutationRecord) => {
    if (!this.dom || !this.contentDOM || this.node.isLeaf || this.node.isAtom) {
      return true
    } else if (this.contentDOM === mutation.target && mutation.type === 'attributes') {
      return true
    }
    return !this.contentDOM.contains(mutation.target)
  }
}
