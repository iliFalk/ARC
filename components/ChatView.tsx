
import React, { useState, useRef, useEffect } from 'react';
import { ArrowUp, Copy, BookmarkPlus, Loader2, Brain, Camera, X, ScanText, Globe, ExternalLink, MessageSquarePlus } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { ChatMessage, MessageRole, PageContext, AppSettings, Skill } from '../types';
import { generateChatResponse, extractTextFromImage } from '../services/geminiService';

// --- HOOK: Shared Chat Logic ---

export const useChat = (
  context: PageContext, 
  settings: AppSettings, 
  isContextEnabled: boolean
) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [attachment, setAttachment] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isExtracting, setIsExtracting] = useState(false);
  const stopGenerationRef = useRef<boolean>(false);

  const executeMessage = async (text: string, img: string | null = null, modelOverride?: string) => {
    if (!text.trim() && !img) return;

    stopGenerationRef.current = false;

    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      role: MessageRole.USER,
      content: text,
      attachment: img || undefined
    };

    setMessages(prev => [...prev, userMsg]);
    setIsLoading(true);

    try {
      const responseText = await generateChatResponse(
        text || "Analyzing...", 
        messages, 
        context, 
        settings, 
        userMsg.attachment,
        modelOverride,
        isContextEnabled
      );
      
      if (stopGenerationRef.current) return;

      const botMsg: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: MessageRole.MODEL,
        content: responseText
      };
      setMessages(prev => [...prev, botMsg]);

    } catch (error) {
      if (stopGenerationRef.current) return;
      const errorMsg: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: MessageRole.MODEL,
        content: "Sorry, I encountered an error while processing your request. Please try again.",
        isError: true
      };
      setMessages(prev => [...prev, errorMsg]);
    } finally {
      if (!stopGenerationRef.current) {
          setIsLoading(false);
      }
    }
  }

  const handleSend = async () => {
    if ((!input.trim() && !attachment) || isLoading) return;
    const currentInput = input;
    const currentAttachment = attachment;
    
    setInput('');
    setAttachment(null);

    await executeMessage(currentInput, currentAttachment);
  };

  const handleStop = () => {
    stopGenerationRef.current = true;
    setIsLoading(false);
  };

  const handleNewChat = () => {
    setMessages([]);
    setInput('');
    setAttachment(null);
    setIsExtracting(false);
    setIsLoading(false);
  };

  const handleSkillClick = async (skill: Skill) => {
    if (isLoading) return;
    await executeMessage(skill.prompt, attachment, skill.modelId);
    if (attachment) setAttachment(null);
  };

  const handleScreenshot = async () => {
    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: false });
      const track = stream.getVideoTracks()[0];
      const video = document.createElement('video');
      video.srcObject = stream;
      video.muted = true;
      video.playsInline = true;
      
      await new Promise((resolve) => {
        video.onloadedmetadata = () => { video.play(); resolve(true); };
      });
      await new Promise(r => setTimeout(r, 500));

      const canvas = document.createElement('canvas');
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        setAttachment(canvas.toDataURL('image/jpeg', 0.8));
      }
      track.stop();
      stream.getTracks().forEach(t => t.stop());
    } catch (err: any) {
      console.error("Screenshot failed:", err);
    }
  };

  const handleExtractText = async () => {
    if (!attachment) return;
    setIsExtracting(true);
    try {
      const extractedText = await extractTextFromImage(attachment, settings.modelId);
      setInput(prev => prev ? `${prev}\n\n${extractedText}` : extractedText);
    } catch (e) {
      alert("Could not grab text.");
    } finally {
      setIsExtracting(false);
    }
  };

  return {
    messages,
    input, setInput,
    attachment, setAttachment,
    isLoading,
    isExtracting,
    handleSend,
    handleStop,
    handleNewChat,
    handleSkillClick,
    handleScreenshot,
    handleExtractText
  };
};

// --- COMPONENT: Chat List (Content Body) ---

interface ChatListProps {
  messages: ChatMessage[];
  onSaveNote: (text: string) => void;
  onCitationClick: (id: string) => void;
  isLoading: boolean;
  isContextEnabled: boolean;
  onNewChat: () => void;
  hasMessages: boolean;
}

export const ChatList: React.FC<ChatListProps> = ({ messages, onSaveNote, onCitationClick, isLoading, isContextEnabled, onNewChat, hasMessages }) => {
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  const EmptyState = () => (
    <div className="flex flex-col items-center justify-center h-full text-center pb-10 animate-in fade-in duration-500">
      <div className={`p-4 rounded-2xl mb-4 transition-colors duration-300 ${isContextEnabled ? 'bg-muted/30' : 'bg-gray-100'}`}>
        <Brain className={`w-8 h-8 transition-colors duration-300 ${isContextEnabled ? 'text-foreground' : 'text-gray-400'}`} strokeWidth={1.5} />
      </div>
      <h3 className="text-base font-bold text-foreground tracking-tight">
        {isContextEnabled ? 'Chat with this page' : 'General Chat Mode'}
      </h3>
      <p className="text-xs text-muted-foreground mt-2 max-w-[200px] font-medium leading-relaxed">
        {isContextEnabled 
          ? 'Ask questions, summarize findings, or extract details from the current tab.'
          : 'Ask general questions or brainstorm ideas without page context.'}
      </p>
    </div>
  );

  return (
    <div className="relative h-full w-full">
      <div className="absolute inset-0 overflow-y-auto p-4 space-y-6 scroll-smooth">
        {messages.length === 0 ? <EmptyState /> : (
          messages.map((msg) => (
            <div key={msg.id} className={`flex w-full ${msg.role === MessageRole.USER ? 'justify-end' : 'justify-start'}`}>
              <div className={`
                group relative max-w-[85%] rounded-2xl p-4 text-sm leading-relaxed flex flex-col gap-2
                ${msg.role === MessageRole.USER 
                  ? 'bg-muted text-foreground rounded-tr-none shadow-sm font-medium' 
                  : 'bg-white text-foreground rounded-tl-none border border-border shadow-sm'
                }
                ${msg.isError ? 'text-red-500 border-red-200 bg-red-50/30' : ''}
              `}>
                {msg.attachment && (
                  <div className="rounded-lg overflow-hidden border border-border/50 max-h-[200px] w-full bg-black/5">
                    <img src={msg.attachment} alt="Screenshot" className="w-full h-full object-contain" />
                  </div>
                )}
                <div className="prose prose-sm max-w-none prose-p:my-1 prose-ul:my-1 prose-li:my-0 text-foreground antialiased font-normal">
                  <ReactMarkdown
                      components={{
                          // Custom renderer for citations: turns [1](cite:1) into interactive buttons
                          a: ({node, ...props}) => {
                            if (props.href && props.href.startsWith('cite:')) {
                              const id = props.href.split(':')[1];
                              return (
                                <button
                                  onClick={(e) => { e.preventDefault(); onCitationClick(id); }}
                                  className="inline-flex items-center justify-center text-[10px] h-4 min-w-[16px] px-0.5 -mt-2 ml-0.5 rounded-sm bg-blue-100 text-blue-700 font-bold border border-blue-200 hover:bg-blue-200 hover:border-blue-300 transition-colors cursor-pointer align-super"
                                  title="Jump to source"
                                >
                                  {id}
                                </button>
                              );
                            }
                            return <a {...props} className="text-blue-600 hover:underline inline-flex items-center gap-0.5" target="_blank" rel="noopener noreferrer">{props.children}<ExternalLink className="w-3 h-3 opacity-50"/></a>;
                          }
                      }}
                  >
                      {/* Pre-process content to transform simple [1] text into citation links [1](cite:1) */}
                      {msg.content.replace(/\[(\d+)\]/g, '[$1](cite:$1)')}
                  </ReactMarkdown>
                </div>
                {msg.role === MessageRole.MODEL && !msg.isError && (
                  <div className="opacity-0 group-hover:opacity-100 transition-opacity absolute -bottom-8 left-0 flex items-center gap-2 text-[11px] bg-white shadow-md border border-border rounded-md p-1 z-10 font-black">
                    <button onClick={() => navigator.clipboard.writeText(msg.content)} className="flex items-center gap-1 px-2 py-1 hover:bg-muted rounded text-foreground hover:text-primary transition-colors">
                      <Copy className="w-3 h-3" /> Copy
                    </button>
                    <div className="w-[1px] h-3 bg-border"></div>
                    <button onClick={() => onSaveNote(msg.content)} className="flex items-center gap-1 px-2 py-1 hover:bg-muted rounded text-green-700 hover:text-green-800 transition-colors">
                      <BookmarkPlus className="w-3 h-3" /> Save to Notes
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))
        )}
        {isLoading && (
          <div className="flex justify-start w-full">
            <div className="bg-white pl-0 py-2 rounded-2xl flex items-center gap-2 text-foreground font-black italic text-xs">
              <Loader2 className="w-4 h-4 animate-spin text-primary" />
              Thinking...
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Floating New Chat Button (Bottom Right) */}
      {hasMessages && (
        <button
          onClick={onNewChat}
          className="absolute bottom-4 right-4 h-9 w-9 bg-white/60 hover:bg-white border border-border/50 hover:border-border shadow-sm hover:shadow-md backdrop-blur-sm rounded-full flex items-center justify-center text-muted-foreground hover:text-foreground transition-all z-20"
          title="Start New Chat"
        >
          <MessageSquarePlus className="w-4 h-4" />
        </button>
      )}
    </div>
  );
};

// --- COMPONENT: Chat Input (Global Footer) ---

interface ChatInputProps {
  input: string;
  setInput: (val: string) => void;
  onSend: () => void;
  onStop: () => void;
  isLoading: boolean;
  attachment: string | null;
  setAttachment: (val: string | null) => void;
  onScreenshot: () => void;
  onExtractText: () => void;
  isExtracting: boolean;
  settings: AppSettings;
  onSkillClick: (skill: Skill) => void;
  isContextEnabled: boolean;
  onToggleContext: () => void;
}

export const ChatInput: React.FC<ChatInputProps> = (props) => {
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      props.onSend();
    }
  };

  return (
    <div className="px-4 pt-2 pb-4 bg-white relative">
      
      {/* Skills Bar */}
      {props.settings.skills && props.settings.skills.length > 0 && (
        <div className="flex items-center gap-2 overflow-x-auto pb-2 -mx-4 px-4 scrollbar-hide mb-1">
          {props.settings.skills.map(skill => (
             <button
               key={skill.id}
               onClick={() => props.onSkillClick(skill)}
               disabled={props.isLoading}
               className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 bg-muted/50 hover:bg-muted border border-border/60 hover:border-primary/30 rounded-full text-[10px] font-bold text-foreground transition-all active:scale-95 disabled:opacity-50"
             >
               {skill.name}
             </button>
          ))}
        </div>
      )}

      {/* Attachment Preview */}
      {props.attachment && (
        <div className="flex items-end gap-3 mb-3 animate-in slide-in-from-bottom-2 duration-200">
          <div className="relative group">
             <div className="absolute -top-1.5 -right-1.5 z-10">
                <button onClick={() => props.setAttachment(null)} className="bg-gray-800 text-white rounded-full p-0.5 hover:bg-black transition-colors shadow-sm">
                  <X className="w-3 h-3" />
                </button>
             </div>
             <img src={props.attachment} alt="Preview" className="h-14 w-auto rounded-lg border border-border shadow-md" />
          </div>
          <button onClick={props.onExtractText} disabled={props.isExtracting} className="flex items-center gap-1.5 px-3 py-1.5 h-8 bg-blue-50 hover:bg-blue-100 text-blue-700 text-[11px] font-black rounded-lg border border-blue-200 transition-colors mb-0.5">
            {props.isExtracting ? <Loader2 className="w-3.5 h-3.5 animate-spin"/> : <ScanText className="w-3.5 h-3.5"/>}
            {props.isExtracting ? 'Scanning...' : 'Grab Text'}
          </button>
        </div>
      )}

      {/* Main Input Box */}
      <div className="flex items-center rounded-xl border border-border shadow-sm bg-white focus-within:ring-1 focus-within:ring-primary focus-within:border-primary transition-all pr-1.5 min-h-[44px]">
        
        {/* Context Toggle Switch */}
        <button 
           onClick={props.onToggleContext}
           className={`ml-1 h-8 w-8 flex items-center justify-center rounded-lg transition-all shrink-0 ${
             props.isContextEnabled 
               ? 'text-green-600 bg-green-50 hover:bg-green-100' 
               : 'text-muted-foreground/60 hover:bg-muted hover:text-foreground'
           }`}
           title={props.isContextEnabled ? "Disable Page Context" : "Enable Page Context"}
        >
           <Globe className="w-4 h-4" />
        </button>

        <textarea
          value={props.input}
          onChange={(e) => props.setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={
              props.attachment ? "Ask about screenshot..." : 
              props.isContextEnabled ? "Ask about this page..." : "Ask Gemini anything..."
          }
          className="flex-1 max-h-32 py-3 pl-2 bg-transparent resize-none text-sm font-bold text-[#000000] opacity-100 focus:outline-none placeholder:text-foreground/40 placeholder:font-bold"
          rows={1}
          style={{ lineHeight: '1.25rem' }}
        />
        <div className="flex items-center gap-1.5 shrink-0 py-1.5 self-center">
          <button 
            onClick={props.onScreenshot}
            className={`h-8 w-8 flex items-center justify-center rounded-lg transition-colors ${props.attachment ? 'text-green-700 bg-green-50 border border-green-200' : 'text-foreground/60 hover:bg-muted hover:text-foreground'}`}
            title="Take Screenshot"
          >
            <Camera className="w-4 h-4" />
          </button>
          <button 
            onClick={props.isLoading ? props.onStop : props.onSend}
            disabled={(!props.input.trim() && !props.attachment && !props.isLoading)} 
            className={`h-8 w-8 flex items-center justify-center rounded-lg transition-all ${
              (!props.input.trim() && !props.attachment && !props.isLoading)
                ? 'bg-muted text-muted-foreground/50 cursor-not-allowed' 
                : 'bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm'
            }`}
          >
            {props.isLoading ? (
               <div className="relative flex items-center justify-center w-5 h-5">
                  <Loader2 className="w-full h-full animate-spin" />
                  <div className="absolute inset-0 flex items-center justify-center">
                      <div className="w-2.5 h-2.5 bg-current rounded-[2px]" />
                  </div>
               </div>
            ) : (
               <ArrowUp className="w-4 h-4" strokeWidth={3} />
            )}
          </button>
        </div>
      </div>
      <div className="text-[9px] text-center text-foreground font-medium mt-2.5 tracking-normal opacity-40">
        Powered by AI, fact-checked by you
      </div>
    </div>
  );
};
