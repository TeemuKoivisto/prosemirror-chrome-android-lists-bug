# [prosemirror-chrome-android-lists-bug](https://teemukoivisto.github.io/prosemirror-chrome-android-lists-bug/)

Insanity-inducing bug with ProseMirror, Android Chrome, NodeViews and list items splitting. Probably due to attributes or something.

Here the initial enter causes the error, subsequent splits do not. I'm pretty sure because the paragraph ids are either erased or equal. Adding an id plugin to set paragraph attributes (eg ids) in an appendtransaction will persist this bug.

https://github.com/user-attachments/assets/3159ae3f-3f9c-4306-be61-f79a8e7526da

There's a similar bug happening with vanilla ProseMirror without Tiptap which isn't as bad but annoying nonetheless. Will see whether the cause is in ProseMirror Android handling or about how NodeViews are used or whether `splitListItem` is wrong. Which I doubt since both the Tiptap and ProseMirror version produces the bug. Removing the NodeView fixes it yet that's not a solution I am ready to make.

## How to reproduce locally

Requires Node >=16 and pnpm

1. `pnpm i`
2. `pnpm tiptap`
3. Connect an Android device
4. Open chrome://inspect/#devices
5. Port forward http://localhost:3300
6. Go to end of `item1`
7. Press enter
