import React, { useState } from 'react';
import { X, Save } from 'lucide-react';
import { AppSettings } from '../types';
import { Button } from './Button';

interface SettingsModalProps {
  settings: AppSettings;
  onSave: (newSettings: AppSettings) => void;
  onClose: () => void;
}

const AVAILABLE_MODELS = [
  { id: 'gemini-3-flash-preview', name: 'Gemini 3 Flash (Fast & Efficient)' },
  { id: 'gemini-3-pro-preview', name: 'Gemini 3 Pro (Complex Reasoning)' },
  { id: 'gemini-2.5-flash-preview', name: 'Gemini 2.5 Flash (Legacy)' },
];

export const SettingsModal: React.FC<SettingsModalProps> = ({ settings, onSave, onClose }) => {
  const [modelId, setModelId] = useState(settings.modelId);
  const [systemInstruction, setSystemInstruction] = useState(settings.systemInstruction);

  const handleSave = () => {
    onSave({
      ...settings,
      modelId,
      systemInstruction
    });
    onClose();
  };

  return (
    <div className="absolute inset-0 bg-black/20 backdrop-blur-sm z-50 flex items-center justify-center p-8">
      <div className="bg-white rounded-xl shadow-2xl w-full h-full max-h-[500px] flex flex-col border border-border animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-border flex items-center justify-between">
          <h2 className="text-lg font-semibold text-foreground">Workspace Settings</h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          
          {/* Model Selection */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">AI Model</label>
            <div className="relative">
              <select
                value={modelId}
                onChange={(e) => setModelId(e.target.value)}
                className="w-full appearance-none bg-muted/50 border border-border text-sm text-foreground rounded-lg p-2.5 pr-8 focus:ring-1 focus:ring-primary focus:border-primary outline-none transition-all"
              >
                {AVAILABLE_MODELS.map(model => (
                  <option key={model.id} value={model.id}>
                    {model.name}
                  </option>
                ))}
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-muted-foreground">
                <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/></svg>
              </div>
            </div>
            <p className="text-[10px] text-muted-foreground">
              Select the model that best fits your task complexity.
            </p>
          </div>

          {/* System Instruction */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">System Instructions</label>
            <textarea
              value={systemInstruction}
              onChange={(e) => setSystemInstruction(e.target.value)}
              className="w-full h-48 bg-muted/50 border border-border text-sm text-foreground rounded-lg p-3 focus:ring-1 focus:ring-primary focus:border-primary outline-none transition-all resize-none font-mono leading-relaxed"
              placeholder="Define how the AI should behave..."
            />
            <p className="text-[10px] text-muted-foreground">
              Custom rules for the AI assistant (e.g. "Be concise", "Answer in French").
            </p>
          </div>

          {/* API Key Info (Read Only for Demo) */}
          <div className="space-y-2 pt-2 border-t border-border">
            <label className="text-sm font-medium text-foreground">API Configuration</label>
            <div className="bg-muted/30 p-3 rounded-lg border border-border/50 flex items-center justify-between">
                <span className="text-xs text-muted-foreground">API Key Source</span>
                <span className="text-xs font-mono bg-green-100 text-green-700 px-2 py-0.5 rounded border border-green-200">Environment (Pre-configured)</span>
            </div>
          </div>

        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-border bg-muted/10 flex justify-end gap-2">
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSave} className="gap-2">
            <Save className="w-4 h-4" /> Save Changes
          </Button>
        </div>

      </div>
    </div>
  );
};