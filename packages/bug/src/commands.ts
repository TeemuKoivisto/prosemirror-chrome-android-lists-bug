import {
  joinPoint,
  canJoin,
  findWrapping,
  liftTarget,
  canSplit,
  ReplaceStep,
  ReplaceAroundStep,
  replaceStep
} from 'prosemirror-transform'
import {
  Slice,
  Fragment,
  Node,
  NodeType,
  Attrs,
  MarkType,
  ResolvedPos,
  ContentMatch
} from 'prosemirror-model'
import {
  Selection,
  EditorState,
  Transaction,
  TextSelection,
  NodeSelection,
  SelectionRange,
  AllSelection,
  Command
} from 'prosemirror-state'
import { EditorView } from 'prosemirror-view'

/// Delete the selection, if there is one.
export const deleteSelection: Command = (state, dispatch) => {
  if (state.selection.empty) return false
  console.log('deleted sel')
  if (dispatch) dispatch(state.tr.deleteSelection().scrollIntoView())
  return true
}

function atBlockStart(state: EditorState, view?: EditorView): ResolvedPos | null {
  let { $cursor } = state.selection as TextSelection
  if (!$cursor || (view ? !view.endOfTextblock('backward', state) : $cursor.parentOffset > 0))
    return null
  return $cursor
}

/// If the selection is empty and at the start of a textblock, try to
/// reduce the distance between that block and the one before it—if
/// there's a block directly before it that can be joined, join them.
/// If not, try to move the selected block closer to the next one in
/// the document structure by lifting it out of its parent or moving it
/// into a parent of the previous block. Will use the view for accurate
/// (bidi-aware) start-of-textblock detection if given.
export const joinBackward: Command = (state, dispatch, view) => {
  let $cursor = atBlockStart(state, view)
  if (!$cursor) return false

  let $cut = findCutBefore($cursor)

  // If there is no node before this, try to lift
  if (!$cut) {
    let range = $cursor.blockRange(),
      target = range && liftTarget(range)
    if (target == null) return false
    if (dispatch) dispatch(state.tr.lift(range!, target).scrollIntoView())
    return true
  }

  let before = $cut.nodeBefore!
  // Apply the joining algorithm
  if (deleteBarrier(state, $cut, dispatch, -1)) return true

  // If the node below has no content and the node above is
  // selectable, delete the node below and select the one above.
  if (
    $cursor.parent.content.size == 0 &&
    (textblockAt(before, 'end') || NodeSelection.isSelectable(before))
  ) {
    for (let depth = $cursor.depth; ; depth--) {
      let delStep = replaceStep(state.doc, $cursor.before(depth), $cursor.after(depth), Slice.empty)
      if (
        delStep &&
        (delStep as ReplaceStep).slice.size <
          (delStep as ReplaceStep).to - (delStep as ReplaceStep).from
      ) {
        if (dispatch) {
          let tr = state.tr.step(delStep)
          tr.setSelection(
            textblockAt(before, 'end')
              ? Selection.findFrom(tr.doc.resolve(tr.mapping.map($cut.pos, -1)), -1)!
              : NodeSelection.create(tr.doc, $cut.pos - before.nodeSize)
          )
          dispatch(tr.scrollIntoView())
        }
        return true
      }
      if (depth == 1 || $cursor.node(depth - 1).childCount > 1) break
    }
  }

  // If the node before is an atom, delete it
  if (before.isAtom && $cut.depth == $cursor.depth - 1) {
    if (dispatch) dispatch(state.tr.delete($cut.pos - before.nodeSize, $cut.pos).scrollIntoView())
    return true
  }

  return false
}

/// A more limited form of [`joinBackward`]($commands.joinBackward)
/// that only tries to join the current textblock to the one before
/// it, if the cursor is at the start of a textblock.
export const joinTextblockBackward: Command = (state, dispatch, view) => {
  let $cursor = atBlockStart(state, view)
  if (!$cursor) return false
  let $cut = findCutBefore($cursor)
  return $cut ? joinTextblocksAround(state, $cut, dispatch) : false
}

/// A more limited form of [`joinForward`]($commands.joinForward)
/// that only tries to join the current textblock to the one after
/// it, if the cursor is at the end of a textblock.
export const joinTextblockForward: Command = (state, dispatch, view) => {
  let $cursor = atBlockEnd(state, view)
  if (!$cursor) return false
  let $cut = findCutAfter($cursor)
  return $cut ? joinTextblocksAround(state, $cut, dispatch) : false
}

function joinTextblocksAround(
  state: EditorState,
  $cut: ResolvedPos,
  dispatch?: (tr: Transaction) => void
) {
  let before = $cut.nodeBefore!,
    beforeText = before,
    beforePos = $cut.pos - 1
  for (; !beforeText.isTextblock; beforePos--) {
    if (beforeText.type.spec.isolating) return false
    let child = beforeText.lastChild
    if (!child) return false
    beforeText = child
  }
  let after = $cut.nodeAfter!,
    afterText = after,
    afterPos = $cut.pos + 1
  for (; !afterText.isTextblock; afterPos++) {
    if (afterText.type.spec.isolating) return false
    let child = afterText.firstChild
    if (!child) return false
    afterText = child
  }
  let step = replaceStep(state.doc, beforePos, afterPos, Slice.empty) as ReplaceStep | null
  if (
    !step ||
    step.from != beforePos ||
    (step instanceof ReplaceStep && step.slice.size >= afterPos - beforePos)
  )
    return false
  if (dispatch) {
    let tr = state.tr.step(step)
    tr.setSelection(TextSelection.create(tr.doc, beforePos))
    dispatch(tr.scrollIntoView())
  }
  return true
}

function textblockAt(node: Node, side: 'start' | 'end', only = false) {
  for (
    let scan: Node | null = node;
    scan;
    scan = side == 'start' ? scan.firstChild : scan.lastChild
  ) {
    if (scan.isTextblock) return true
    if (only && scan.childCount != 1) return false
  }
  return false
}

/// When the selection is empty and at the start of a textblock, select
/// the node before that textblock, if possible. This is intended to be
/// bound to keys like backspace, after
/// [`joinBackward`](#commands.joinBackward) or other deleting
/// commands, as a fall-back behavior when the schema doesn't allow
/// deletion at the selected point.
export const selectNodeBackward: Command = (state, dispatch, view) => {
  console.log('selectNodeBackward')
  let { $head, empty } = state.selection,
    $cut: ResolvedPos | null = $head
  if (!empty) return false

  if ($head.parent.isTextblock) {
    if (view ? !view.endOfTextblock('backward', state) : $head.parentOffset > 0) return false
    $cut = findCutBefore($head)
  }
  let node = $cut && $cut.nodeBefore
  if (!node || !NodeSelection.isSelectable(node)) return false
  if (dispatch)
    dispatch(
      state.tr
        .setSelection(NodeSelection.create(state.doc, $cut!.pos - node.nodeSize))
        .scrollIntoView()
    )
  return true
}

function findCutBefore($pos: ResolvedPos): ResolvedPos | null {
  if (!$pos.parent.type.spec.isolating)
    for (let i = $pos.depth - 1; i >= 0; i--) {
      if ($pos.index(i) > 0) return $pos.doc.resolve($pos.before(i + 1))
      if ($pos.node(i).type.spec.isolating) break
    }
  return null
}

function atBlockEnd(state: EditorState, view?: EditorView): ResolvedPos | null {
  let { $cursor } = state.selection as TextSelection
  if (
    !$cursor ||
    (view
      ? !view.endOfTextblock('forward', state)
      : $cursor.parentOffset < $cursor.parent.content.size)
  )
    return null
  return $cursor
}

/// If the selection is empty and the cursor is at the end of a
/// textblock, try to reduce or remove the boundary between that block
/// and the one after it, either by joining them or by moving the other
/// block closer to this one in the tree structure. Will use the view
/// for accurate start-of-textblock detection if given.
export const joinForward: Command = (state, dispatch, view) => {
  let $cursor = atBlockEnd(state, view)
  if (!$cursor) return false

  let $cut = findCutAfter($cursor)
  // If there is no node after this, there's nothing to do
  if (!$cut) return false

  let after = $cut.nodeAfter!
  // Try the joining algorithm
  if (deleteBarrier(state, $cut, dispatch, 1)) return true

  // If the node above has no content and the node below is
  // selectable, delete the node above and select the one below.
  if (
    $cursor.parent.content.size == 0 &&
    (textblockAt(after, 'start') || NodeSelection.isSelectable(after))
  ) {
    let delStep = replaceStep(state.doc, $cursor.before(), $cursor.after(), Slice.empty)
    if (
      delStep &&
      (delStep as ReplaceStep).slice.size <
        (delStep as ReplaceStep).to - (delStep as ReplaceStep).from
    ) {
      if (dispatch) {
        let tr = state.tr.step(delStep)
        tr.setSelection(
          textblockAt(after, 'start')
            ? Selection.findFrom(tr.doc.resolve(tr.mapping.map($cut.pos)), 1)!
            : NodeSelection.create(tr.doc, tr.mapping.map($cut.pos))
        )
        dispatch(tr.scrollIntoView())
      }
      return true
    }
  }

  // If the next node is an atom, delete it
  if (after.isAtom && $cut.depth == $cursor.depth - 1) {
    if (dispatch) dispatch(state.tr.delete($cut.pos, $cut.pos + after.nodeSize).scrollIntoView())
    return true
  }

  return false
}

/// When the selection is empty and at the end of a textblock, select
/// the node coming after that textblock, if possible. This is intended
/// to be bound to keys like delete, after
/// [`joinForward`](#commands.joinForward) and similar deleting
/// commands, to provide a fall-back behavior when the schema doesn't
/// allow deletion at the selected point.
export const selectNodeForward: Command = (state, dispatch, view) => {
  let { $head, empty } = state.selection,
    $cut: ResolvedPos | null = $head
  if (!empty) return false
  if ($head.parent.isTextblock) {
    if (
      view ? !view.endOfTextblock('forward', state) : $head.parentOffset < $head.parent.content.size
    )
      return false
    $cut = findCutAfter($head)
  }
  let node = $cut && $cut.nodeAfter
  if (!node || !NodeSelection.isSelectable(node)) return false
  if (dispatch)
    dispatch(state.tr.setSelection(NodeSelection.create(state.doc, $cut!.pos)).scrollIntoView())
  return true
}

function findCutAfter($pos: ResolvedPos) {
  if (!$pos.parent.type.spec.isolating)
    for (let i = $pos.depth - 1; i >= 0; i--) {
      let parent = $pos.node(i)
      if ($pos.index(i) + 1 < parent.childCount) return $pos.doc.resolve($pos.after(i + 1))
      if (parent.type.spec.isolating) break
    }
  return null
}

function joinMaybeClear(
  state: EditorState,
  $pos: ResolvedPos,
  dispatch: ((tr: Transaction) => void) | undefined
) {
  debugger
  let before = $pos.nodeBefore,
    after = $pos.nodeAfter,
    index = $pos.index()
  if (!before || !after || !before.type.compatibleContent(after.type)) return false
  if (!before.content.size && $pos.parent.canReplace(index - 1, index)) {
    if (dispatch) dispatch(state.tr.delete($pos.pos - before.nodeSize, $pos.pos).scrollIntoView())
    return true
  }
  if (
    !$pos.parent.canReplace(index, index + 1) ||
    !(after.isTextblock || canJoin(state.doc, $pos.pos))
  )
    return false
  if (dispatch) dispatch(state.tr.join($pos.pos).scrollIntoView())
  // @BUG returns here
  return true
}

function deleteBarrier(
  state: EditorState,
  $cut: ResolvedPos,
  dispatch: ((tr: Transaction) => void) | undefined,
  dir: number
) {
  let before = $cut.nodeBefore!,
    after = $cut.nodeAfter!,
    conn,
    match
  let isolated = before.type.spec.isolating || after.type.spec.isolating
  // @BUG returns here
  if (!isolated && joinMaybeClear(state, $cut, dispatch)) return true

  let canDelAfter = !isolated && $cut.parent.canReplace($cut.index(), $cut.index() + 1)
  if (
    canDelAfter &&
    (conn = (match = before.contentMatchAt(before.childCount)).findWrapping(after.type)) &&
    match.matchType(conn[0] || after.type)!.validEnd
  ) {
    if (dispatch) {
      let end = $cut.pos + after.nodeSize,
        wrap = Fragment.empty
      for (let i = conn.length - 1; i >= 0; i--) wrap = Fragment.from(conn[i].create(null, wrap))
      wrap = Fragment.from(before.copy(wrap))
      let tr = state.tr.step(
        new ReplaceAroundStep(
          $cut.pos - 1,
          end,
          $cut.pos,
          end,
          new Slice(wrap, 1, 0),
          conn.length,
          true
        )
      )
      let $joinAt = tr.doc.resolve(end + 2 * conn.length)
      if (
        $joinAt.nodeAfter &&
        $joinAt.nodeAfter.type == before.type &&
        canJoin(tr.doc, $joinAt.pos)
      )
        tr.join($joinAt.pos)
      dispatch(tr.scrollIntoView())
    }
    return true
  }

  let selAfter =
    after.type.spec.isolating || (dir > 0 && isolated) ? null : Selection.findFrom($cut, 1)
  let range = selAfter && selAfter.$from.blockRange(selAfter.$to),
    target = range && liftTarget(range)
  if (target != null && target >= $cut.depth) {
    if (dispatch) dispatch(state.tr.lift(range!, target).scrollIntoView())
    return true
  }

  if (canDelAfter && textblockAt(after, 'start', true) && textblockAt(before, 'end')) {
    let at = before,
      wrap = []
    for (;;) {
      wrap.push(at)
      if (at.isTextblock) break
      at = at.lastChild!
    }
    let afterText = after,
      afterDepth = 1
    for (; !afterText.isTextblock; afterText = afterText.firstChild!) afterDepth++
    if (at.canReplace(at.childCount, at.childCount, afterText.content)) {
      if (dispatch) {
        let end = Fragment.empty
        for (let i = wrap.length - 1; i >= 0; i--) end = Fragment.from(wrap[i].copy(end))
        let tr = state.tr.step(
          new ReplaceAroundStep(
            $cut.pos - wrap.length,
            $cut.pos + after.nodeSize,
            $cut.pos + afterDepth,
            $cut.pos + after.nodeSize - afterDepth,
            new Slice(end, wrap.length, 0),
            0,
            true
          )
        )
        dispatch(tr.scrollIntoView())
      }
      return true
    }
  }

  return false
}

/// Combine a number of command functions into a single function (which
/// calls them one by one until one returns true).
export function chainCommands(...commands: readonly Command[]): Command {
  return function (state, dispatch, view) {
    for (let i = 0; i < commands.length; i++) if (commands[i](state, dispatch, view)) return true
    return false
  }
}

export let backspace = chainCommands(deleteSelection, joinBackward, selectNodeBackward)
let del = chainCommands(deleteSelection, joinForward, selectNodeForward)
