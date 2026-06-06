# OmniVault — Personal Media Vault

OmniVault is a secure, elegant, and high-performance personal media vault designed for organizing and retrieving links, notes, images, videos, and documents seamlessly. It prioritizes keyboard-first navigation and native device security.

## 🛠 Tech Stack
- **Frontend**: Next.js 14 (App Router), React, standard CSS (Vanilla CSS for ultimate customization).
- **Backend**: Next.js API Routes.
- **Database**: MongoDB (via Mongoose).
- **Security**: WebAuthn (`@simplewebauthn`) for Touch ID / biometric folder locking.
- **Search**: `fuse.js` for instant, fuzzy client-side searching.
- **Authentication**: NextAuth.js (Google OAuth).
- **Icons / UI**: Custom glassmorphic designs, CSS variables for multi-theme support (Dark, Light, Dracula, Forest, Solarized, Ocean Deep).

## ✨ Features Implemented
- **Multi-Format Storage**: Store texts, links, images, videos, and documents.
- **Fuzzy Search**: Instant, typo-tolerant search across all items.
- **Theming Engine**: Dynamic CSS variable injection supporting 6 distinct themes with smooth transitions.
- **Drag & Drop**: Effortlessly organize items into folders by dragging them over the sidebar.
- **Biometric Security**: Lock specific folders using your Mac's Touch ID. Authentication is required to view or delete locked folders.
- **Masonry Layout**: Responsive CSS grid masonry for visualizing items of different sizes efficiently.
- **Inline Editing**: Double-click any note or link to edit it inline with standard keyboard shortcuts.

---

## ⌨️ Global Keyboard Shortcuts

OmniVault is designed for keyboard nerds. You can navigate the entire application without touching your mouse.

### Global Actions
- <kbd>Ctrl</kbd> + <kbd>Space</kbd> (or <kbd>Cmd</kbd> + <kbd>/</kbd> or <kbd>Cmd</kbd> + <kbd>B</kbd>): **Toggle Sidebar** visibility.
- <kbd>Shift</kbd> + <kbd>N</kbd>: **Quick Capture** (Opens the text/link note ingest panel).
- <kbd>Cmd</kbd> + <kbd>Shift</kbd> + <kbd>N</kbd> (Mac) or <kbd>Ctrl</kbd> + <kbd>Shift</kbd> + <kbd>N</kbd> (Windows): **Media Upload** (Opens the file upload modal).
- <kbd>/</kbd>: **Search** (Focuses the global search bar).

### Tag & Filter Navigation
You can instantly switch between media types using number row shortcuts (works with both <kbd>Ctrl</kbd> or <kbd>Option</kbd> on Mac, and top row or Numpad):
- <kbd>Ctrl</kbd> + <kbd>1</kbd>: Show **Notes (Texts)**
- <kbd>Ctrl</kbd> + <kbd>2</kbd>: Show **Images**
- <kbd>Ctrl</kbd> + <kbd>3</kbd>: Show **Videos**
- <kbd>Ctrl</kbd> + <kbd>4</kbd>: Show **Links**
- <kbd>Ctrl</kbd> + <kbd>5</kbd>: Show **Documents**
- <kbd>Ctrl</kbd> + <kbd>6</kbd>: Show **All**

### Inline Text Editing (Rich Text Formatting)
When writing or editing a note, the following standard shortcuts apply:
- <kbd>Cmd</kbd> + <kbd>B</kbd>: **Bold** `**text**`
- <kbd>Cmd</kbd> + <kbd>I</kbd>: *Italic* `*text*`
- <kbd>Cmd</kbd> + <kbd>K</kbd>: [Link](url)
- <kbd>Cmd</kbd> + <kbd>E</kbd>: `Inline Code`
