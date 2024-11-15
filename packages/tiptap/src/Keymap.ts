import { extensions, isiOS, isMacOS } from '@tiptap/core'
import { Selection } from '@tiptap/pm/state'

export const Keymap = extensions.Keymap.extend({
  addKeyboardShortcuts() {
    const handleBackspace = () =>
      this.editor.commands.first(({ commands }) => [
        () => commands.undoInputRule(),

        // maybe convert first text block node to default node
        () =>
          commands.command(({ tr }) => {
            const { selection, doc } = tr
            const { empty, $anchor } = selection
            const { pos, parent } = $anchor
            const $parentPos =
              $anchor.parent.isTextblock && pos > 0 ? tr.doc.resolve(pos - 1) : $anchor
            const parentIsIsolating = $parentPos.parent.type.spec.isolating

            const parentPos = $anchor.pos - $anchor.parentOffset

            const isAtStart =
              parentIsIsolating && $parentPos.parent.childCount === 1
                ? parentPos === $anchor.pos
                : Selection.atStart(doc).from === pos

            if (
              !empty ||
              !parent.type.isTextblock ||
              parent.textContent.length ||
              !isAtStart ||
              (isAtStart && $anchor.parent.type.name === 'paragraph') // prevent clearNodes when no nodes to clear, otherwise history stack is appended
            ) {
              return false
            }

            return commands.clearNodes()
          }),

        () => commands.deleteSelection(),
        () => commands.joinBackward(),
        () => commands.selectNodeBackward()
      ])

    const handleDelete = () =>
      this.editor.commands.first(({ commands }) => [
        () => commands.deleteSelection(),
        () => commands.deleteCurrentNode(),
        () => commands.joinForward(),
        () => commands.selectNodeForward()
      ])

    const handleEnter = () =>
      this.editor.commands.first(({ commands }) => [
        () => commands.newlineInCode(),
        () => commands.createParagraphNear(),
        () => commands.liftEmptyBlock(),
        () => commands.splitBlock()
      ])

    const baseKeymap = {
      // Enter: handleEnter,
      'Mod-Enter': () => this.editor.commands.exitCode(),
      Backspace: handleBackspace,
      'Mod-Backspace': handleBackspace,
      'Shift-Backspace': handleBackspace,
      Delete: handleDelete,
      'Mod-Delete': handleDelete,
      'Mod-a': () => this.editor.commands.selectAll()
    }

    const pcKeymap = {
      ...baseKeymap
    }

    const macKeymap = {
      ...baseKeymap,
      'Ctrl-h': handleBackspace,
      'Alt-Backspace': handleBackspace,
      'Ctrl-d': handleDelete,
      'Ctrl-Alt-Backspace': handleDelete,
      'Alt-Delete': handleDelete,
      'Alt-d': handleDelete,
      'Ctrl-a': () => this.editor.commands.selectTextblockStart(),
      'Ctrl-e': () => this.editor.commands.selectTextblockEnd()
    }

    if (isiOS() || isMacOS()) {
      return macKeymap
    }

    return pcKeymap
  }
})
