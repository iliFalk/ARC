
import React, { useState, useEffect } from 'react';
import { MessageSquare, FileText, Settings, ArrowLeft, Plus, LayoutDashboard } from 'lucide-react';
import { AppView, PageContext, AppSettings, NewsSourceConfig } from './types';
import { useChat, ChatList, ChatInput } from './components/ChatView';
import { NotesList, NotesEditor } from './components/NotesView';
import { SettingsView } from './components/SettingsView';
import { HUDView } from './components/HUDView';
import { ContextBar } from './components/ContextSimulator'; 
import { Button } from './components/Button';
import { db } from './db';

// Active Page Context
const DEFAULT_CONTEXT: PageContext = {
  title: "Understanding React 18 Concurrent Features",
  url: "https://react.dev/blog/2022/03/29/react-v18",
  content: `React 18 introduces Concurrent React, a foundational change to React's rendering model. Concurrent React enables new features like Suspense, automatic batching, and transitions.

  One of the key features is useTransition. This hook lets you mark some state updates as not urgent. Other state updates are considered urgent by default. Urgent updates (like typing, clicking, or pressing) need immediate response to match our physical intuition about how objects behave. However, transition updates (like switching views) can be delayed if the user interacts with the UI in the meantime.
  
  Another major addition is Suspense for Data Fetching on the Server. This lets you wait for data on the server and stream HTML to the client as soon as it is ready, rather than waiting for all data load before sending any HTML.
  
  Automatic Batching: React 18 features automatic batching for all updates, regardless of where they originate. This means that updates inside of promises, setTimeouts, native event handlers, or any other event were not batched in React 17. In React 18, they are batched automatically.
  
  These improvements pave the way for a more responsive and fluid user experience, particularly for heavy applications.`
};

const DEFAULT_SETTINGS: AppSettings = {
  modelId: 'gemini-3-flash-preview',
  theme: 'system',
  customModels: [],
  newsSources: [
    { id: '1', name: 'r/sysadmin', url: 'https://www.reddit.com/r/sysadmin/hot.rss', type: 'rss', enabled: true },
    { id: '2', name: 'r/netsec', url: 'https://www.reddit.com/r/netsec/hot.rss', type: 'rss', enabled: true },
    { id: '3', name: 'HackerNews', url: 'https://hacker-news.firebaseio.com/v0/topstories.json', type: 'hn-api', enabled: true }
  ],
  skills: [
    {
        id: '1',
        name: 'Summarize',
        prompt: 'Summarize this page in 3 concise bullet points.'
    },
    {
        id: '2',
        name: 'Explain Code',
        prompt: 'Identify any code snippets in the context and explain how they work step-by-step.'
    },
    {
        id: '3',
        name: 'Key Terms',
        prompt: 'Extract the top 5 key technical terms from this page and define them simply.'
    }
  ],
  systemInstruction: `You are a helpful research assistant living in a browser sidebar. 
Your goal is to help the user synthesize information from the active web page.

RULES:
1. Answer the user's question using ONLY the provided context. 
2. If the answer is not in the context, say "I couldn't find that information in the current page."
3. When citing facts from the text, append a footnote like [1] or [2] at the end of the sentence.
4. Keep answers concise and readable (markdown supported).
5. Do not use markdown headers (#) excessively; prefer bolding or lists.`
};

const SETTINGS_STORAGE_KEY = 'ai_workspace_settings';

const App: React.FC = () => {
  const [activeView, setActiveView] = useState<AppView>(AppView.CHAT);
  const [lastActiveView, setLastActiveView] = useState<AppView>(AppView.CHAT);
  const [pageContext] = useState<PageContext>(DEFAULT_CONTEXT);
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('Saved to Notes');
  const [isContextEnabled, setIsContextEnabled] = useState(true);

  // --- Settings Persistence ---
  const [settings, setSettings] = useState<AppSettings>(() => {
    const saved = localStorage.getItem(SETTINGS_STORAGE_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        // Migration: Ensure newsSources exists
        if (!parsed.newsSources) parsed.newsSources = DEFAULT_SETTINGS.newsSources;
        return parsed;
      } catch (e) {
        return DEFAULT_SETTINGS;
      }
    }
    return DEFAULT_SETTINGS;
  });

  useEffect(() => {
    localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settings));
  }, [settings]);

  // --- Chat State (Lifted to App Level) ---
  const chat = useChat(pageContext, settings, isContextEnabled);

  // --- Notes State ---
  const [activeNoteId, setActiveNoteId] = useState<number | null>(null);
  const [noteTitle, setNoteTitle] = useState('');
  const [noteContent, setNoteContent] = useState('');
  const [isSavingNote, setIsSavingNote] = useState(false);

  // Load Note Logic
  const handleSelectNote = async (id: number) => {
     const note = await db.notes.get(id);
     if (note) {
        setNoteTitle(note.title);
        setNoteContent(note.content);
        setActiveNoteId(id);
     }
  };

  const handleCreateNote = async () => {
    const id = await db.notes.add({
      title: 'Untitled Note',
      content: '',
      createdAt: Date.now(),
      updatedAt: Date.now()
    });
    setActiveNoteId(id as number);
    setNoteTitle('Untitled Note');
    setNoteContent('');
  };

  const handleSaveNote = async () => {
    if (!activeNoteId) return;
    setIsSavingNote(true);
    await db.notes.update(activeNoteId, {
      title: noteTitle || 'Untitled Note',
      content: noteContent,
      updatedAt: Date.now()
    });
    setTimeout(() => setIsSavingNote(false), 500);
  };

  const handleDeleteNote = async (id: number) => {
    await db.notes.delete(id);
    if (activeNoteId === id) setActiveNoteId(null);
  };

  const handleBackFromNote = () => {
    handleSaveNote();
    setActiveNoteId(null);
  };

  // --- View Switching Logic ---

  const handleOpenSettings = () => {
    if (activeView !== AppView.SETTINGS) {
      setLastActiveView(activeView);
      setActiveView(AppView.SETTINGS);
    }
  };

  const handleCloseSettings = () => {
    setActiveView(lastActiveView);
  };

  const triggerToast = (msg: string) => {
    setToastMessage(msg);
    setShowToast(true);
    setTimeout(() => setShowToast(false), 2000);
  };

  // Handle "Save to Notes" from Chat
  const handleChatSaveToNotes = async (content: string) => {
    try {
      const recentNote = await db.notes.orderBy('updatedAt').last();
      if (recentNote) {
        const newContent = recentNote.content + `\n\n> Captured from AI:\n${content}`;
        await db.notes.update(recentNote.id as number, {
          content: newContent,
          updatedAt: Date.now()
        });
      } else {
        await db.notes.add({
          title: `Research: ${pageContext.title.substring(0, 20)}...`,
          content: `> Captured from AI:\n${content}`,
          createdAt: Date.now(),
          updatedAt: Date.now(),
          sourceUrl: pageContext.url
        });
      }
      triggerToast("Saved to Notes");
    } catch (error) {
      console.error("Failed to save note:", error);
    }
  };

  const handleCitationClick = (id: string) => {
    console.log(`Scrolling to citation [${id}]`);
    triggerToast(`Scrolling to source [${id}]...`);
  };

  const handleUpdateNewsSources = (sources: NewsSourceConfig[]) => {
    setSettings(prev => ({ ...prev, newsSources: sources }));
  };

  // --- Header Renderer ---
  const renderHeader = () => {
    switch (activeView) {
        case AppView.CHAT:
            return (
               <ContextBar 
                 context={pageContext} 
                 isContextEnabled={isContextEnabled}
               />
            );
        case AppView.HUD:
            return (
              <div className="px-4 py-3 border-b border-border bg-white sticky top-0 z-30 flex items-center gap-2 h-[57px]">
                <LayoutDashboard className="w-5 h-5 text-primary" />
                <h1 className="font-bold text-sm text-foreground">Sysadmin Dashboard</h1>
              </div>
            );
        case AppView.SETTINGS:
            return (
              <div className="px-4 py-3 border-b border-border bg-white sticky top-0 z-30 flex items-center gap-2 h-[57px]">
                <Button variant="ghost" size="sm" className="-ml-2 h-9 w-9 p-0 text-foreground" onClick={handleCloseSettings}>
                  <ArrowLeft className="w-5 h-5" />
                </Button>
                <h1 className="font-bold text-sm text-foreground">Workspace Settings</h1>
              </div>
            );
        case AppView.NOTES:
            if (activeNoteId) {
                // Editor Header
                return (
                  <div className="px-4 py-2 border-b border-border flex items-center justify-between gap-2 bg-white h-[57px] sticky top-0 z-30">
                    <div className="flex items-center gap-2 flex-1">
                      <Button variant="ghost" size="sm" className="-ml-2 h-9 w-9 p-0" onClick={handleBackFromNote}>
                        <ArrowLeft className="w-4 h-4" />
                      </Button>
                      <input 
                        type="text" 
                        value={noteTitle}
                        onChange={(e) => setNoteTitle(e.target.value)}
                        onBlur={handleSaveNote}
                        placeholder="Note Title"
                        className="flex-1 bg-transparent text-sm font-semibold focus:outline-none truncate"
                      />
                    </div>
                    <div className="flex items-center gap-1">
                        <div className="text-[10px] text-muted-foreground font-medium mr-2">
                            {isSavingNote ? 'Saving...' : 'Saved'}
                        </div>
                    </div>
                  </div>
                );
            } else {
                // List Header
                return (
                  <div className="px-4 py-3 border-b border-border flex justify-between items-center bg-white sticky top-0 z-30 h-[57px]">
                    <h2 className="font-semibold text-sm">My Notes</h2>
                    <Button size="sm" onClick={handleCreateNote} className="gap-1 font-bold">
                      <Plus className="w-3.5 h-3.5 stroke-[3px]" /> New
                    </Button>
                  </div>
                );
            }
        default:
            return null;
    }
  };

  // --- Body Renderer (Middle Content Area) ---
  const renderBody = () => {
    switch (activeView) {
      case AppView.SETTINGS:
        return <SettingsView settings={settings} onSave={setSettings} />;
      case AppView.HUD:
        return <HUDView settings={settings} onUpdateNewsSources={handleUpdateNewsSources} />;
      case AppView.NOTES:
        if (activeNoteId) {
            return <NotesEditor content={noteContent} onChange={setNoteContent} onBlur={handleSaveNote} />;
        }
        return <NotesList onSelectNote={handleSelectNote} onDeleteNote={handleDeleteNote} />;
      case AppView.CHAT:
      default:
        return (
          <ChatList 
            messages={chat.messages} 
            onSaveNote={handleChatSaveToNotes}
            onCitationClick={handleCitationClick}
            isLoading={chat.isLoading}
            isContextEnabled={isContextEnabled}
            onNewChat={chat.handleNewChat}
            hasMessages={chat.messages.length > 0}
          />
        );
    }
  };

  // --- Footer Renderer (Bottom Full Width) ---
  const renderFooter = () => {
    if (activeView === AppView.CHAT) {
      return (
        <ChatInput 
          input={chat.input}
          setInput={chat.setInput}
          onSend={chat.handleSend}
          onStop={chat.handleStop}
          isLoading={chat.isLoading}
          attachment={chat.attachment}
          setAttachment={chat.setAttachment}
          onScreenshot={chat.handleScreenshot}
          onExtractText={chat.handleExtractText}
          isExtracting={chat.isExtracting}
          settings={settings}
          onSkillClick={chat.handleSkillClick}
          isContextEnabled={isContextEnabled}
          onToggleContext={() => setIsContextEnabled(!isContextEnabled)}
        />
      );
    }
    return null;
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-neutral-900 p-8">
      {/* App Container */}
      <div className="w-[400px] h-[600px] bg-white rounded-lg shadow-2xl overflow-hidden flex flex-col relative ring-1 ring-white/10">
        
        {/* Row 1: Global Header - Always Full Width */}
        <div className="w-full shrink-0 z-30 bg-white">
            {renderHeader()}
        </div>

        {/* Row 2: Content Body + Sidebar */}
        <div className="flex-1 flex flex-row min-h-0 relative overflow-hidden bg-white">
            
            {/* Left Panel: Main Content Area */}
            <div className="flex-1 flex flex-col h-full min-w-0 relative">
                
                {/* Toast Notification */}
                <div 
                  className={`absolute top-4 left-1/2 -translate-x-1/2 bg-gray-900/90 backdrop-blur text-white text-xs font-medium px-4 py-2 rounded-full shadow-xl transition-all duration-300 z-50 flex items-center gap-2 ${showToast ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-2 pointer-events-none'}`}
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-green-400 shadow-[0_0_8px_rgba(74,222,128,0.5)]"></span>
                  {toastMessage}
                </div>

                {/* Main View Render */}
                <div className="flex-1 overflow-hidden relative">
                  {renderBody()}
                </div>
            </div>

            {/* Right Panel: Vertical Sidebar Navigation */}
            <div className="w-[56px] bg-muted/40 border-l border-border flex flex-col items-center py-3 gap-3 shrink-0 z-20 backdrop-blur-sm">
                
                {/* Nav Items */}
                <div className="flex flex-col gap-2 w-full px-1.5">
                    <button 
                      onClick={() => setActiveView(AppView.CHAT)}
                      className={`group relative flex flex-col items-center justify-center gap-1 py-2 rounded-lg transition-all duration-200 ${activeView === AppView.CHAT ? 'bg-white text-foreground shadow-sm ring-1 ring-black/5' : 'text-muted-foreground/60 hover:text-foreground hover:bg-white/60'}`}
                      title="Chat"
                    >
                       <MessageSquare className={`w-4 h-4 ${activeView === AppView.CHAT ? 'stroke-[2.5px]' : 'stroke-2'}`} />
                       <span className="text-[9px] font-bold">Chat</span>
                    </button>

                    <button 
                      onClick={() => setActiveView(AppView.HUD)}
                      className={`group relative flex flex-col items-center justify-center gap-1 py-2 rounded-lg transition-all duration-200 ${activeView === AppView.HUD ? 'bg-white text-foreground shadow-sm ring-1 ring-black/5' : 'text-muted-foreground/60 hover:text-foreground hover:bg-white/60'}`}
                      title="Dashboard"
                    >
                       <LayoutDashboard className={`w-4 h-4 ${activeView === AppView.HUD ? 'stroke-[2.5px]' : 'stroke-2'}`} />
                       <span className="text-[9px] font-bold">HUD</span>
                    </button>

                    <button 
                      onClick={() => setActiveView(AppView.NOTES)}
                      className={`group relative flex flex-col items-center justify-center gap-1 py-2 rounded-lg transition-all duration-200 ${activeView === AppView.NOTES ? 'bg-white text-foreground shadow-sm ring-1 ring-black/5' : 'text-muted-foreground/60 hover:text-foreground hover:bg-white/60'}`}
                      title="Notes"
                    >
                       <FileText className={`w-4 h-4 ${activeView === AppView.NOTES ? 'stroke-[2.5px]' : 'stroke-2'}`} />
                       <span className="text-[9px] font-bold">Notes</span>
                    </button>
                </div>

                <div className="flex-1" />

                {/* Settings Button */}
                <div className="w-full px-1.5 mb-1">
                     <button 
                      onClick={handleOpenSettings}
                      className={`group w-full flex flex-col items-center justify-center gap-1 py-2 rounded-lg transition-all duration-200 ${activeView === AppView.SETTINGS ? 'bg-primary text-primary-foreground shadow-sm' : 'text-muted-foreground/60 hover:text-foreground hover:bg-white/60'}`}
                      title="Settings"
                    >
                      <Settings className="w-4 h-4" />
                    </button>
                </div>

            </div>
        </div>

        {/* Row 3: Global Footer - Full Width (Active Only in Chat) */}
        {activeView === AppView.CHAT && (
            <div className="w-full shrink-0 z-30 bg-white border-t border-border min-h-[57px]">
                {renderFooter()}
            </div>
        )}

      </div>
    </div>
  );
};

export default App;
