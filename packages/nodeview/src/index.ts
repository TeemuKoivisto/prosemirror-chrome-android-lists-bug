import { EditorState } from 'prosemirror-state'
import { EditorView } from 'prosemirror-view'
import { keymap } from 'prosemirror-keymap'
// import { splitListItem } from 'prosemirror-schema-list'
import { applyDevTools } from 'prosemirror-dev-toolkit'

import { IdPlugin } from './IdPlugin'
import { ParagraphView } from './ParagraphView'
import { schema } from './schema'
// import { splitListItem } from './splitListItemOrig'
import { splitListItem } from './splitListItemTiptap'

import defaultDoc from './default-pm-doc.json'

const state = EditorState.create({
  schema,
  plugins: [keymap({ Enter: splitListItem(schema.nodes.list_item) })],
  doc: schema.nodeFromJSON(defaultDoc)
})
const view = new EditorView(document.querySelector('#editor') as HTMLElement, {
  state,
  nodeViews: {
    // paragraph: (n, v) => new ParagraphView(n, v)
  }
})
applyDevTools(view, { devToolsExpanded: true })
