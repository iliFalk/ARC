# Project Guidelines

## 1. Project Overview
**AI Browser Workspace** is a high-performance sidebar extension designed for researchers and Sysadmins. It functions as a "Second Brain," allowing users to chat with web page context, manage notes, and access quick utilities (HUD).

## 2. Tech Stack
- **Framework:** React 18+ (Vite)
- **Language:** TypeScript
- **Styling:** Tailwind CSS
- **Icons:** Lucide React
- **State Persistence:** 
  - `localStorage` for App Settings & User Preferences.
  - `IndexedDB` (via Dexie.js) for large text data (Notes).
- **AI SDK:** `@google/genai` (Gemini API).

## 3. UI/UX Principles
### Layout
- **Sidebar Architecture:** The app is designed to live in a browser sidebar (`w-[400px]`). Space is at a premium.
- **Global Header:** Context-aware headers that change based on the active view (Chat, HUD, Notes, Settings).
- **Global Footer:** Used primarily in the Chat view for input controls. Other views use the full height for content.

### Interaction Design
- **Floating Action Buttons (FAB):** Use FABs for contextual actions within scrollable areas to keep fixed footers clean.
  - *Example:* The "New Chat" button is positioned as a FAB in the bottom-right of the chat list (`absolute bottom-4 right-4`).
- **Feedback:** All save/copy actions must trigger a Toast notification.
- **Empty States:** Every list (Chat, Notes, News) must have a helpful empty state.

### Components
- **ChatView:**
  - `ChatList`: Renders messages and the "New Chat" FAB. Handles citation clicks.
  - `ChatInput`: Handles text entry, screenshots (`navigator.mediaDevices`), and skill triggers.
- **ContextBar:** Visual indicator of the active page context. Green pulse = Reading; Grey = Disabled.
- **ContextSimulator:** Simulates a browser tab connection for the MVP.

## 4. Coding Standards
### Gemini API
- **Initialization:** Always use `new GoogleGenAI({ apiKey: process.env.API_KEY })`.
- **Models:** Default to `gemini-3-flash-preview`. Use `gemini-3-pro-preview` for "Thinking" or complex tasks.
- **Safety:** Handle API errors gracefully and display them in the chat stream.

### State Management
- Lift state up to `App.tsx` when shared between views (e.g., `Chat` state is needed to save notes).
- Use `useLiveQuery` (Dexie) for reactive database reads.

### Styling (Tailwind)
- Use semantic colors (`bg-primary`, `text-muted-foreground`) defined in `index.html` configuration.
- Ensure dark mode compatibility (via system preference or manual toggle).
- Use `backdrop-blur` for floating elements to maintain readability over content.

## 5. File Structure
- `index.tsx` & `App.tsx`: Entry point and main router/layout logic.
- `components/`: Reusable UI components.
- `services/`: API wrappers (Gemini, OCR).
- `types.ts`: Shared TypeScript interfaces.
- `db.ts`: Database schema configuration.

---
*Always update this file when architectural patterns or major UI decisions change.*