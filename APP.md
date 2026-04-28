# MASTER PRODUCT SPECIFICATION: AI BROWSER WORKSPACE

## 1. Screen Overview

The application is a sidebar-based "Second Brain" designed for researchers and Sysadmins. It consists of four primary views managed by a global sidebar navigation.

| Screen | Purpose |
| :--- | :--- |
| **1. Chat (Home)** | Main interface for AI interaction, grounded in the context of the active web page. |
| **2. HUD (Dashboard)** | A "Heads-Up Display" for quick utilities: Weather, Sysadmin commands, and News. |
| **3. Notes** | A persistent storage area for research, drafts, and saved chat outputs. |
| **4. Settings** | Configuration for AI models, API keys, personalized skills, and data backup. |

---

## 2. Screen-by-Screen Breakdown

### Screen 1: Chat Interface (Home)

**Primary UI Elements:**
*   **Global Context Bar (Header):**
    *   **Status Icon:** A pulsing green dot (active) or grey dot (inactive).
    *   **Page Metadata:** Displays the simulated Page Title (e.g., "Understanding React 18") and hostname.
    *   **Security Icon:** Shield icon indicating secure context reading.
*   **Message List (Body):**
    *   **User Message:** Right-aligned bubble, grey background. Displays text and thumbnail of attachments.
    *   **AI Message:** Left-aligned bubble, white background. Supports Markdown (bold, lists, code blocks).
    *   **Citation Links:** `[1]` formatted as clickable buttons.
    *   **Action Overlay (Hover):** Buttons to "Copy Text" and "Save to Notes".
*   **Input Area (Footer):**
    *   **Skill Chips:** Horizontal scrollable list of quick actions (e.g., "Summarize", "Explain Code").
    *   **Attachment Preview:** Thumbnail of screenshot/image with a "Remove (X)" button and a "Grab Text" (OCR) button.
    *   **Context Toggle:** Globe icon button to enable/disable reading the current page.
    *   **Text Input:** Auto-expanding textarea.
    *   **Screenshot Button:** Camera icon to capture the screen.
    *   **Send Button:** Arrow icon (transforms to spinner during loading).

**Navigation & Workflows:**
1.  **Sending a Message:** User types -> Clicks Send -> Message added to list -> AI "Thinking" state -> AI Response streams in.
2.  **Using Context:** User toggles the "Globe" icon green. The AI now receives the page content hidden in the prompt.
3.  **Vision Task:** User clicks Camera -> Selects Window -> Image appears in preview -> User clicks Send (analysis) or "Grab Text" (OCR).
4.  **Saving Info:** User hovers over an AI response -> Clicks "Save to Notes" -> Toast notification confirms save.

---

### Screen 2: HUD (Dashboard)

**Primary UI Elements:**
*   **Weather Widget:**
    *   **Card:** Gradient background (Orange/Blue based on temp).
    *   **Data:** Temp, Conditions (Cloud/Sun icons), Wind speed, Sunrise/Sunset.
    *   **Controls:** Edit button (pencil) to search for a city manually or use "Current Location".
*   **Sysadmin Tutor Widget:**
    *   **Card:** Dark mode terminal aesthetic.
    *   **Content:** A technical term, definition, and a code block command (e.g., `netstat -an`).
    *   **Controls:** Refresh button (fetch new term), Copy button (clipboard).
*   **News Feed:**
    *   **Header:** "Latest Headlines" with Refresh and Settings (Gear) icons.
    *   **Settings Panel (Toggle):** Inputs to add new RSS/JSON sources and checkboxes to toggle existing ones.
    *   **News List:** Scrollable list of cards showing Headline, Summary, Source Name, and Relative Time.

**Navigation & Workflows:**
1.  **City Search:** Click "Edit" on Weather -> Type City -> Select from API results.
2.  **Learning:** Click Refresh on Tutor -> Read new command -> Click Copy -> Paste into terminal.
3.  **News Config:** Click Gear icon -> Uncheck "Reddit" -> Feed updates immediately to remove Reddit items.

---

### Screen 3: Notes Manager

**Primary UI Elements:**
*   **Header (List Mode):** Title "My Notes" and a "+ New" button.
*   **Note List:**
    *   **Cards:** Display Title, truncated content, Date, and "Source" icon (if linked to a URL).
    *   **Delete Action:** Trash icon appears on hover.
*   **Header (Editor Mode):** Back Arrow button, Title Input field, "Saved" status indicator.
*   **Editor:** Full-screen textarea for content entry.

**Navigation & Workflows:**
1.  **Create Note:** Click "+ New" -> View switches to Editor -> User types -> Auto-save on blur.
2.  **Edit Note:** Click existing note card -> View switches to Editor.
3.  **Delete Note:** Hover over card -> Click Trash icon -> Note removed from DB.
4.  **Return:** Click Back Arrow -> Returns to List View.

---

### Screen 4: Settings & Configuration

**Primary UI Elements:**
*   **Navigation:** Collapsible accordions for distinct sections.
*   **General:** Theme toggle (Light/Dark/System).
*   **Skills:**
    *   **List:** Existing skills with Delete icons.
    *   **Add Form:** Inputs for Name, Prompt, and optional Model selection.
*   **Intelligence:**
    *   **Model Dropdown:** Select between Gemini Flash, Pro, or Custom.
    *   **System Instructions:** Large textarea to define AI persona.
*   **Custom Models:**
    *   **Add Form:** Radio toggle (OpenAI/Google), inputs for Name, Model ID, Base URL, API Key.
*   **Data:**
    *   **Export:** Button to download JSON.
    *   **Restore:** File input to upload JSON.

**Navigation & Workflows:**
1.  **Changing Model:** Open "Intelligence" -> Select "Gemini 3 Pro" -> App now uses Pro model for all chats.
2.  **Adding Custom LLM:** Open "Custom Models" -> Click "Add New" -> Select "OpenAI Compatible" -> Enter Localhost URL (e.g., Ollama) -> Save.
3.  **Backup:** Open "Data" -> Click Export -> Browser downloads `backup.json`.

---

## 3. Behind the Scenes (Technical Architecture)

**1. Data Storage:**
*   **IndexedDB (Dexie.js):** Used for **Notes**. Chosen for ability to store large amounts of text/structured data asynchronously.
*   **LocalStorage:** Used for **AppSettings** (Theme, Models, News Config) and **Weather Location**. Chosen for synchronous access and simplicity.

**2. API Layer (`geminiService.ts`):**
*   **Chat:** Stateless wrappers around the Gemini SDK. History is managed by the React Component (`ChatView`) and passed to the service on every call.
*   **Vision:** Images are converted to Base64 strings on the client and sent as `inlineData`.
*   **Tutor:** Uses `responseSchema` to force Gemini to return JSON (strictly typed commands) instead of free text.

**3. External Integrations:**
*   **Weather:** Calls `open-meteo.com` (No API key required). Uses Geocoding API for city search.
*   **News:**
    *   **RSS:** Proxied via `rss2json.com` to bypass CORS.
    *   **HackerNews:** Uses Firebase REST API.
    *   **Reddit:** Fetches `.json` version of subreddit URLs.

**4. Context Simulation:**
*   The `PageContext` is currently a hardcoded object in `App.tsx`. In a real extension, this would be injected via a Content Script.

---

## 4. Functional Summary (User Journey)

**Scenario: A Sysadmin researching a server issue.**

1.  **Discovery:** The user opens the app (Sidebar). They check the **HUD**. They see the weather is hot (warning) and read a "Tip of the Day" about `netstat`.
2.  **Investigation:** They switch to **Chat**. They toggle "Context" ON. They ask, "What does this article say about concurrency?" (referring to the active page).
3.  **Synthesis:** The AI responds. The user takes a screenshot of their actual terminal window using the **Camera** icon. They ask: "What does this error log mean?".
4.  **Capture:** The AI explains the error. The user clicks **"Save to Notes"** on the explanation.
5.  **Refinement:** The user switches to **Notes**. They open the newly created note, add their own observations, and title it "Server Outage Log".
6.  **Configuration:** Realizing they need more reasoning power, they go to **Settings** and switch the Active Model to "Gemini 3 Pro".
