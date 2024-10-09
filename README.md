# [prosemirror-chrome-android-lists-bug](https://teemukoivisto.github.io/prosemirror-chrome-android-lists-bug/)

Insanity-inducing bug with ProseMirror, Android Chrome, NodeViews and list items splitting. Probably due to attributes or something.

https://github.com/user-attachments/assets/3159ae3f-3f9c-4306-be61-f79a8e7526da

## How to reproduce locally

Requires Node >=16 and pnpm

1. `pnpm i`
2. `pnpm tiptap`
3. Connect an Android device
4. Open chrome://inspect/#devices
5. Port forward http://localhost:3300
6. Go to end of `item1`
7. Press enter
