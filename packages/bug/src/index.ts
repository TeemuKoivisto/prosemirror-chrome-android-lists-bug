import { EditorState } from 'prosemirror-state'
import { EditorView, NodeView } from 'prosemirror-view'
import { keymap } from 'prosemirror-keymap'
import { DOMSerializer, Node as PMNode, Schema } from 'prosemirror-model'
import { baseKeymap } from 'prosemirror-commands'
import { schema } from 'prosemirror-schema-basic'
import { addListNodes } from 'prosemirror-schema-list'
import { wrapInList, splitListItem, liftListItem, sinkListItem } from 'prosemirror-schema-list'
import { exampleSetup } from 'prosemirror-example-setup'
import { applyDevTools } from 'prosemirror-dev-toolkit'

import defaultDoc from './default-pm-doc.json'
import { ParagraphView } from './ParagraphView'
// import { schema } from './schema'
// import { splitListItem } from './splitListItem'

const mySchema = new Schema({
  nodes: addListNodes(schema.spec.nodes, 'paragraph block*', 'block'),
  marks: schema.spec.marks
})

console.log(baseKeymap)

const state = EditorState.create({
  schema: mySchema,
  // plugins: [
  //   keymap({
  //     ...baseKeymap,
  //     // Enter: splitListItem(schema.nodes.listItem)
  //   }),
  // ],
  plugins: exampleSetup({ schema: mySchema, menuBar: false }),
  doc: mySchema.nodeFromJSON(defaultDoc)
})
const view = new EditorView(document.querySelector('#editor') as HTMLElement, {
  state,
  nodeViews: {
    paragraph: (n, v) => new ParagraphView(n, v)
  }
})
applyDevTools(view, { devToolsExpanded: true })
