import React from 'react';
import { PageContext } from '../types';
import { Globe, ShieldCheck, Power } from 'lucide-react';

interface ContextBarProps {
  context: PageContext;
  isContextEnabled: boolean;
}

export const ContextBar: React.FC<ContextBarProps> = ({ context, isContextEnabled }) => {
  const wordCount = context.content.split(/\s+/).filter(w => w.length > 0).length;
  const hostname = new URL(context.url).hostname;

  return (
    <div className="h-[57px] border-b border-border bg-white shrink-0 z-10 shadow-sm relative transition-colors duration-300 flex items-center px-4 gap-3">
        
        {/* Status Indicator (Read Only) */}
        <div 
          className="relative flex h-3 w-3 shrink-0 aspect-square items-center justify-center rounded-full" 
          title={isContextEnabled ? "Context Active: Reading Page" : "Context Inactive: General Chat"}
        >
          {isContextEnabled ? (
            <>
              <span className="animate-ping absolute block h-full w-full rounded-full bg-green-400 opacity-75"></span>
              <span className="relative block rounded-full h-2.5 w-2.5 bg-green-500 border border-white shadow-sm transition-transform"></span>
            </>
          ) : (
             <span className="relative block rounded-full h-2.5 w-2.5 bg-gray-300 border border-white shadow-sm transition-colors"></span>
          )}
        </div>

        {/* Middle: Title & Metadata */}
        <div className={`flex flex-col overflow-hidden flex-1 transition-opacity duration-300 ${isContextEnabled ? 'opacity-100' : 'opacity-40 grayscale'}`}>
           <h1 className="text-sm font-semibold text-foreground truncate leading-tight" title={isContextEnabled ? context.title : "Context Disabled"}>
              {isContextEnabled ? context.title : "General Chat Mode"}
           </h1>
           <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground font-medium mt-0.5">
              <Globe className="w-3 h-3 text-muted-foreground" />
              {isContextEnabled ? (
                <>
                  <span className="truncate max-w-[120px]">{hostname}</span>
                  <span className="w-0.5 h-0.5 rounded-full bg-muted-foreground/30" />
                  <span>{wordCount.toLocaleString()} words</span>
                </>
              ) : (
                <span>Reading disabled</span>
              )}
           </div>
        </div>

        <div className="flex items-center gap-1">
            {/* Right: Security/Status Icon */}
            <div className={`shrink-0 h-8 w-8 flex items-center justify-center rounded-md transition-colors ${isContextEnabled ? 'text-green-600' : 'text-gray-300'}`} title={isContextEnabled ? "Context Secure" : "Context Inactive"}>
              {isContextEnabled ? <ShieldCheck className="w-4 h-4" /> : <Power className="w-4 h-4" />}
            </div>
        </div>

    </div>
  );
};