import { Plugin, PluginKey } from 'prosemirror-state'

export const idPKey = new PluginKey('id')

export function IdPlugin(trackedNodes = ['paragraph']) {
  return new Plugin({
    key: idPKey,
    appendTransaction: (trs, oldState, newState) => {
      const newTr = newState.tr
      trs.forEach(tr => {
        if (!tr.docChanged) return
        const ids = new Set()
        tr.doc.nodesBetween(0, tr.doc.nodeSize - 2, (node, pos) => {
          const addNodeID = trackedNodes.find(t => t === node.type.name)
          if (addNodeID && (!node.attrs.id || ids.has(node.attrs.id))) {
            const id = crypto.randomUUID()
            ids.add(id)
            newTr.setNodeAttribute(pos, 'id', id)
          } else {
            ids.add(node.attrs.id)
          }
        })
      })
      return newTr.docChanged ? newTr.setMeta('origin', 'id-plugin') : null
    }
  })
}
