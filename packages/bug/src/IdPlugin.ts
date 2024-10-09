import { Node as PMNode } from 'prosemirror-model'
import { Plugin, PluginKey } from 'prosemirror-state'

interface Options {
  trackedNodes?: string[]
  createID?: () => string
}

function getEditedBlocksRange(oldDoc: PMNode, newDoc: PMNode): [number, number] | undefined {
  const from = oldDoc.content.findDiffStart(newDoc.content)
  const to = oldDoc.content.findDiffEnd(newDoc.content)?.b
  if (from === null || to === undefined) return undefined
  let start = newDoc.resolve(from)
  if (start.depth === 0) {
    start = newDoc.resolve(Math.min(from + 1, newDoc.nodeSize - 2))
  }
  let end = newDoc.resolve(to)
  if (end.depth === 0) {
    end = newDoc.resolve(Math.max(to - 1, 0))
  }
  return [start.before(1), end.after(1)]
}

export const idPKey = new PluginKey('id')

export function IdPlugin(trackedNodes = ['paragraph']) {
  return new Plugin({
    key: idPKey,
    appendTransaction: (trs, oldState, newState) => {
      const newTr = newState.tr
      trs.forEach(tr => {
        const changedRange = tr.docChanged && getEditedBlocksRange(oldState.doc, newState.doc)
        if (!changedRange || tr.getMeta('y-sync$')) return
        const ids = new Set()
        console.log('hello', tr)
        tr.doc.nodesBetween(changedRange[0], changedRange[1], (node, pos) => {
          const addNodeID = trackedNodes.find(t => t === node.type.name)
          if (addNodeID) {
            console.log('node', node)
          }
          if (addNodeID && (!node.attrs.id || ids.has(node.attrs.id))) {
            const id = crypto.randomUUID()
            ids.add(id)
            newTr.setNodeAttribute(pos, 'id', id)
            console.log('add', id)
          } else {
            console.log('exists', node.attrs.id)
            ids.add(node.attrs.id)
          }
        })
      })
      if (newTr.docChanged) {
        console.log('newTr', newTr)
      }
      return newTr.docChanged ? newTr.setMeta('origin', 'id-plugin') : null
    },
    view: editorView => {
      const tr = editorView.state.tr
      const ids = new Set()
      tr.doc.descendants((node, pos) => {
        const addID = trackedNodes.find(t => t === node.type.name)
        if (addID && (!node.attrs.id || node.attrs.id.length > 10 || ids.has(node.attrs.id))) {
          const id = crypto.randomUUID()
          ids.add(id)
          tr.setNodeAttribute(pos, 'id', id)
        } else {
          ids.add(node.attrs.id)
        }
      })
      if (tr.docChanged) {
        editorView.dispatch(tr)
      }
      return {}
    }
  })
}
