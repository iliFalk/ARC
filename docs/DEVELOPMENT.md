# ARC — development

How the app stores data, which model it asks for, and how to build it.

The install and use steps sit in the [README](../README.md). The screen specification is in
[APP.md](../APP.md), the design rules in [guidelines.md](../guidelines.md).

## Data model

`db.ts` declares one IndexedDB database with Dexie. The table `notes` holds the saved answers and
counts as the only durable store of the app.

```ts
db.version(1).stores({
  notes: '++id, title, createdAt, updatedAt'
});
```

Preferences and the selected theme stay in `localStorage`. A backup of the notes leaves the app
through the Settings screen.

## The model

`services/geminiService.ts` asks for `settings.modelId` and falls back to `gemini-3-flash-preview`:

```ts
const modelId = settings.modelId || 'gemini-3-flash-preview';
```

The Settings screen writes `modelId` into the application state.

## The key

`vite.config.ts` reads `GEMINI_API_KEY` from `.env` through `loadEnv` and replaces
`process.env.GEMINI_API_KEY` in the code:

```ts
'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY)
```

The value goes into the bundle at build time, so a published build carries the key of the build
machine. Use a separate key for a build that leaves your machine.

## Build

1. Run `npm install`.
2. Run `npm run build` for the production bundle.
3. Run `npm run preview` to serve that bundle locally.

The dev server listens on port 3000 and accepts connections from the network (`host: '0.0.0.0'`).

## The page context

`App.tsx` holds one fixed page context in `DEFAULT_CONTEXT`: a React 18 article. The Chat screen
sends that text in the prompt, and the header shows its title and its address. The app reads no
browser page on its own, so a real page needs a change in that constant. `APP.md` section 2
describes each screen and its interaction.
