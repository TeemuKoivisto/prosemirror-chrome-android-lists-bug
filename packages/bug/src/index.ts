import { EditorState } from 'prosemirror-state'
import { EditorView } from 'prosemirror-view'
import { keymap } from 'prosemirror-keymap'
import { wrapInList, splitListItem, liftListItem, sinkListItem } from 'prosemirror-schema-list'
import { applyDevTools } from 'prosemirror-dev-toolkit'

import { IdPlugin } from './IdPlugin'
import { ParagraphView } from './ParagraphView'
import { schema } from './schema'
// import { splitListItem } from './splitListItem'
import defaultDoc from './default-pm-doc.json'

const state = EditorState.create({
  schema,
  plugins: [keymap({ Enter: splitListItem(schema.nodes.list_item) }), IdPlugin()],
  doc: schema.nodeFromJSON(defaultDoc)
})
const view = new EditorView(document.querySelector('#editor') as HTMLElement, {
  state,
  nodeViews: {
    paragraph: (n, v) => new ParagraphView(n, v)
  }
})
applyDevTools(view, { devToolsExpanded: true })
