# ARC (Augmented Response Core)

A browser workspace with an AI sidebar.

```text
App.tsx        the workspace shell
components/    ChatView, NotesView, HUDView, SettingsView, ContextSimulator
db.ts          the local store
APP.md         the product spec
```

- **What it is:** a React, Vite and TypeScript app; `APP.md` is the product spec.
- **What it does:** keeps the chat next to the open page and adds a HUD dashboard and further sidebar views, so research and sysadmin work stays in one window instead of two.
- **What it needs:** Node 20 or newer, npm, and a Gemini API key.
- **How do I start:** run `npm install`, set `GEMINI_API_KEY`, then `npm run dev`.

## Install

1. Download the repository as an archive and unpack it whole.
2. In the unpacked folder run `npm install`.
3. Set `GEMINI_API_KEY` in your environment, then run `npm run dev` and open the address it prints.

## Use

| View | What it shows |
|---|---|
| `ChatView` | the conversation with the model |
| `NotesView` | notes taken while reading |
| `HUDView` | the dashboard over the page |
| `SettingsView` | key, model and appearance |

`APP.md` lists the screens and their purpose; `guidelines.md` holds the design rules.

## Settings

| Setting | Meaning |
|---|---|
| `GEMINI_API_KEY` | the key the app calls the model with; it stays in the environment |

## Docs

- `APP.md` — the product spec.
- `guidelines.md` — the design rules.
