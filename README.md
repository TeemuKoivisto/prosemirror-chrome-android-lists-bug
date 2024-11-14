# [prosemirror-chrome-android-lists-bug](https://teemukoivisto.github.io/prosemirror-chrome-android-lists-bug/)

Insanity-inducing bug with ProseMirror, Android Chrome, NodeViews and list items splitting.

## Vanilla ProseMirror

This bug happens with lesser extent with just vanilla ProseMirror. Here's two reproductions with the code https://github.com/TeemuKoivisto/prosemirror-chrome-android-lists-bug/tree/main/packages/bug

https://teemukoivisto.github.io/prosemirror-chrome-android-lists-bug

https://github.com/user-attachments/assets/38304859-e605-4433-ada3-2e9cda5a75b6

https://github.com/user-attachments/assets/64ad607a-5a4b-4c29-8070-c53ce6547ebe

https://prosemirror.net

https://github.com/user-attachments/assets/f0d150a8-bd06-432a-8fb0-d5b626983ba4

## Tiptap

Here the initial enter causes the error, subsequent splits do not. I'm pretty sure because the paragraph ids are either erased or equal. Adding an id plugin to set paragraph attributes (eg ids) in an `appendTransaction` will persist this bug.

https://github.com/user-attachments/assets/3159ae3f-3f9c-4306-be61-f79a8e7526da

This is similar to bug above which is probably due to Android and ProseMirror conflicting on how to handle list item splits. But not sure. NodeViews however make it a lot more detrimental to user experience.

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
