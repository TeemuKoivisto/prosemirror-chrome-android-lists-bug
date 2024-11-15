# [prosemirror-chrome-android-lists-bug](https://teemukoivisto.github.io/prosemirror-chrome-android-lists-bug/)

Insanity-inducing bug with ProseMirror, Android Chrome, NodeViews and list items splitting.

# Description

Apparently ProseMirror does not cancel native Android Chrome events as it should, letting them execute after which the operation is reversed. This causes annoying twichy behavior and probably relates to the problems with NodeViews as well.

https://github.com/user-attachments/assets/64ad607a-5a4b-4c29-8070-c53ce6547ebe

## Vanilla ProseMirror

This bug happens with lesser extent with just vanilla ProseMirror. Here's two reproductions with the code https://github.com/TeemuKoivisto/prosemirror-chrome-android-lists-bug/tree/main/packages/bug

https://teemukoivisto.github.io/prosemirror-chrome-android-lists-bug

https://github.com/user-attachments/assets/38304859-e605-4433-ada3-2e9cda5a75b6

https://prosemirror.net

https://github.com/user-attachments/assets/f0d150a8-bd06-432a-8fb0-d5b626983ba4

## Tiptap

EDIT: Okay this was a different bug, related to the same issue (mobile Chrome is dumb). It seems you _really_ should use the original DOM element to render your content into, not a random `<div>` wrapper as is the default with TipTap.

https://github.com/user-attachments/assets/3159ae3f-3f9c-4306-be61-f79a8e7526da

Here you can see the editor behave erratically, caused by the contentEditable within `<div>` triggering some quirky event. Changing the NodeViewContent from:

`<NodeViewContent as="p"/>` to `<NodeViewContent />`

and adding `contentDOMElementTag: 'p'` to `ReactNodeViewRenderer` options fixes everything.

https://github.com/ueberdosis/tiptap/issues/5711

## How to reproduce locally

Requires Node >=16 and pnpm

### ProseMirror

1. `pnpm i`
2. `pnpm bug`
3. Connect an Android device
4. Open chrome://inspect/#devices
5. Port forward http://localhost:3300
6. Go to start of `two`
7. Press enter
8. Press backspace
9. Cursor is now incorrectly between `t` and `wo`

### Tiptap

1. `pnpm i`
2. `pnpm tiptap`
3. Connect an Android device
4. Open chrome://inspect/#devices
5. Port forward http://localhost:3300
6. Go to end of `item1`
7. Press enter
8. Extra `list_item` node is produced
