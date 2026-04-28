import React, { useState, useRef } from 'react';
import { Plus, Trash2, Smartphone, Moon, Sun, Monitor, Cpu, Info, Globe, Key, Download, Upload, Database, Zap, ChevronDown, ChevronRight } from 'lucide-react';
import { AppSettings, CustomModel, Skill } from '../types';
import { Button } from './Button';
import { db } from '../db';

interface SettingsViewProps {
  settings: AppSettings;
  onSave: (newSettings: AppSettings) => void;
}

const BUILT_IN_MODELS = [
  { id: 'gemini-3-flash-preview', name: 'Gemini 3 Flash', description: 'Fast & Efficient' },
  { id: 'gemini-3-pro-preview', name: 'Gemini 3 Pro', description: 'Complex Reasoning' },
  { id: 'gemini-2.5-flash-preview', name: 'Gemini 2.5 Flash', description: 'Legacy (Stable)' },
];

export const SettingsView: React.FC<SettingsViewProps> = ({ settings, onSave }) => {
  // Local state for immediate feedback, though we sync to parent on changes
  const [modelId, setModelId] = useState(settings.modelId);
  const [systemInstruction, setSystemInstruction] = useState(settings.systemInstruction);
  const [customModels, setCustomModels] = useState<CustomModel[]>(settings.customModels || []);
  const [skills, setSkills] = useState<Skill[]>(settings.skills || []);
  
  const [isAddingModel, setIsAddingModel] = useState(false);
  const [isAddingSkill, setIsAddingSkill] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Section visibility state
  const [sections, setSections] = useState({
    general: true,
    skills: true,
    intelligence: true,
    customModels: true,
    data: true
  });

  const toggleSection = (key: keyof typeof sections) => {
    setSections(prev => ({ ...prev, [key]: !prev[key] }));
  };
  
  // New Model Form State
  const [newModelName, setNewModelName] = useState('');
  const [newModelId, setNewModelId] = useState('');
  const [newProvider, setNewProvider] = useState<'google' | 'openai'>('openai');
  const [newBaseUrl, setNewBaseUrl] = useState('');
  const [newApiKey, setNewApiKey] = useState('');

  // New Skill Form State
  const [newSkillName, setNewSkillName] = useState('');
  const [newSkillPrompt, setNewSkillPrompt] = useState('');
  const [newSkillModel, setNewSkillModel] = useState('');

  const handleUpdate = (updates: Partial<AppSettings>) => {
    onSave({
      ...settings,
      modelId,
      systemInstruction,
      customModels,
      skills,
      ...updates
    });
  };

  const handleAddCustomModel = () => {
    if (!newModelName || !newModelId) return;
    
    const newModel: CustomModel = {
      id: newModelId,
      name: newModelName,
      description: newProvider === 'openai' ? 'OpenAI Compatible' : 'Custom Gemini',
      provider: newProvider,
      baseUrl: newProvider === 'openai' ? newBaseUrl : undefined,
      apiKey: newProvider === 'openai' ? newApiKey : undefined
    };
    
    const updatedModels = [...customModels, newModel];
    setCustomModels(updatedModels);
    setIsAddingModel(false);
    
    // Reset Form
    setNewModelName('');
    setNewModelId('');
    setNewBaseUrl('');
    setNewApiKey('');
    setNewProvider('openai');
    
    // Auto-select the new model? Why not.
    setModelId(newModelId);
    handleUpdate({ customModels: updatedModels, modelId: newModelId });
  };

  const handleDeleteModel = (id: string) => {
    const updatedModels = customModels.filter(m => m.id !== id);
    setCustomModels(updatedModels);
    
    // If we deleted the active model, revert to default
    let newActiveId = modelId;
    if (modelId === id) {
      newActiveId = BUILT_IN_MODELS[0].id;
      setModelId(newActiveId);
    }
    
    handleUpdate({ customModels: updatedModels, modelId: newActiveId });
  };

  const handleAddSkill = () => {
    if (!newSkillName || !newSkillPrompt) return;

    const newSkill: Skill = {
        id: Date.now().toString(),
        name: newSkillName,
        prompt: newSkillPrompt,
        modelId: newSkillModel || undefined
    };

    const updatedSkills = [...skills, newSkill];
    setSkills(updatedSkills);
    handleUpdate({ skills: updatedSkills });
    setIsAddingSkill(false);

    // Reset Form
    setNewSkillName('');
    setNewSkillPrompt('');
    setNewSkillModel('');
  };

  const handleDeleteSkill = (id: string) => {
      const updatedSkills = skills.filter(s => s.id !== id);
      setSkills(updatedSkills);
      handleUpdate({ skills: updatedSkills });
  };

  const handleExport = async () => {
    try {
      const notes = await db.notes.toArray();
      const backup = {
        version: 1, // Schema version for future compatibility checks
        timestamp: Date.now(),
        settings: settings,
        notes: notes
      };
      
      const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `ai-workspace-backup-${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Export failed:", error);
      alert("Failed to export data.");
    }
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const jsonContent = event.target?.result as string;
        const data = JSON.parse(jsonContent);

        // Basic Validation
        if (!data.version || !data.settings || !data.notes) {
          throw new Error("Invalid backup file format");
        }

        if (confirm(`Restore backup from ${new Date(data.timestamp).toLocaleDateString()}? \n\nThis will update your settings and ADD ${data.notes.length} notes to your current list.`)) {
          
          // 1. Restore Settings
          onSave(data.settings);
          // Sync local state
          setModelId(data.settings.modelId);
          setSystemInstruction(data.settings.systemInstruction);
          setCustomModels(data.settings.customModels);
          setSkills(data.settings.skills || []);

          // 2. Restore Notes
          // We remove the old IDs to treat them as new entries, avoiding collisions with existing DB
          const notesToImport = data.notes.map((n: any) => {
            const { id, ...rest } = n; 
            return rest;
          });
          
          await db.notes.bulkAdd(notesToImport);
          
          alert("Import successful! Your workspace has been updated.");
        }
      } catch (err) {
        console.error(err);
        alert("Failed to import file. It may be corrupted or from an incompatible version.");
      } finally {
        // Reset file input so same file can be selected again if needed
        if (fileInputRef.current) fileInputRef.current.value = '';
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="flex flex-col h-full bg-neutral-50/50">
      <div className="flex-1 overflow-y-auto">
        <div className="p-4 space-y-6">

          {/* SECTION: GENERAL */}
          <section className="space-y-3">
            <button 
                onClick={() => toggleSection('general')}
                className="w-full flex items-center justify-between group"
            >
                <h3 className="text-[11px] font-bold text-foreground/50 uppercase tracking-widest group-hover:text-foreground transition-colors">General</h3>
                {sections.general ? <ChevronDown className="w-4 h-4 text-foreground/50 group-hover:text-foreground" /> : <ChevronRight className="w-4 h-4 text-foreground/50 group-hover:text-foreground" />}
            </button>
            
            {sections.general && (
                <div className="bg-white rounded-xl border border-border overflow-hidden shadow-sm animate-in fade-in slide-in-from-top-1">
                   <div className="p-4 flex items-center justify-between">
                      <span className="text-sm font-semibold text-foreground">Appearance</span>
                      <div className="flex bg-muted p-1 rounded-lg">
                        <button 
                          onClick={() => handleUpdate({ theme: 'light' })}
                          className={`p-1.5 rounded-md transition-all ${settings.theme === 'light' ? 'bg-white shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
                        >
                          <Sun className="w-4 h-4" />
                        </button>
                        <button 
                           onClick={() => handleUpdate({ theme: 'system' })}
                           className={`p-1.5 rounded-md transition-all ${settings.theme === 'system' ? 'bg-white shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
                        >
                          <Monitor className="w-4 h-4" />
                        </button>
                        <button 
                           onClick={() => handleUpdate({ theme: 'dark' })}
                           className={`p-1.5 rounded-md transition-all ${settings.theme === 'dark' ? 'bg-white shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
                        >
                          <Moon className="w-4 h-4" />
                        </button>
                      </div>
                   </div>
                </div>
            )}
          </section>

          {/* SECTION: SKILLS */}
          <section className="space-y-3">
            <div className="flex items-center justify-between">
                <button 
                    onClick={() => toggleSection('skills')}
                    className="flex items-center gap-2 group"
                >
                     <h3 className="text-[11px] font-bold text-foreground/50 uppercase tracking-widest group-hover:text-foreground transition-colors">Skills</h3>
                     {sections.skills ? <ChevronDown className="w-3.5 h-3.5 text-foreground/50 group-hover:text-foreground" /> : <ChevronRight className="w-3.5 h-3.5 text-foreground/50 group-hover:text-foreground" />}
                </button>
                {!isAddingSkill && (
                  <button 
                    onClick={() => { setIsAddingSkill(true); setSections(prev => ({...prev, skills: true})); }}
                    className="text-[10px] flex items-center gap-1 text-primary font-black hover:opacity-80 transition-opacity"
                  >
                    <Plus className="w-3 h-3" strokeWidth={3} /> Add Skill
                  </button>
                )}
             </div>

             {sections.skills && (
                 <div className="bg-white rounded-xl border border-border shadow-sm overflow-hidden animate-in fade-in slide-in-from-top-1">
                    {isAddingSkill && (
                        <div className="p-4 bg-muted/20 border-b border-border animate-in slide-in-from-top-2">
                            <h4 className="text-sm font-bold mb-4 text-foreground">Create New Skill</h4>
                            <div className="space-y-4">
                                <div>
                                    <label className="text-[11px] text-foreground font-bold uppercase tracking-wide">Skill Name</label>
                                    <input 
                                        type="text" 
                                        value={newSkillName}
                                        onChange={e => setNewSkillName(e.target.value)}
                                        placeholder="e.g. Summarize Page"
                                        className="w-full mt-1.5 px-3 py-2.5 bg-white border border-border rounded-lg text-sm focus:outline-none focus:border-primary font-bold placeholder:font-normal text-foreground"
                                    />
                                </div>
                                <div>
                                    <label className="text-[11px] text-foreground font-bold uppercase tracking-wide">Prompt</label>
                                    <textarea
                                        value={newSkillPrompt}
                                        onChange={e => setNewSkillPrompt(e.target.value)}
                                        placeholder="e.g. Summarize the main points of this page in 3 bullet points."
                                        className="w-full mt-1.5 px-3 py-2.5 bg-white border border-border rounded-lg text-sm focus:outline-none focus:border-primary text-foreground min-h-[80px]"
                                    />
                                </div>
                                <div>
                                    <label className="text-[11px] text-foreground font-bold uppercase tracking-wide">Model (Optional)</label>
                                    <select
                                        value={newSkillModel}
                                        onChange={(e) => setNewSkillModel(e.target.value)}
                                        className="w-full mt-1.5 px-3 py-2.5 bg-white border border-border rounded-lg text-sm focus:outline-none focus:border-primary text-foreground appearance-none cursor-pointer"
                                    >
                                        <option value="">Use Active Model (Default)</option>
                                        <optgroup label="Official Models">
                                            {BUILT_IN_MODELS.map(m => (
                                                <option key={m.id} value={m.id}>{m.name}</option>
                                            ))}
                                        </optgroup>
                                        {customModels.length > 0 && (
                                            <optgroup label="Custom Models">
                                                {customModels.map(m => (
                                                    <option key={m.id} value={m.id}>{m.name}</option>
                                                ))}
                                            </optgroup>
                                        )}
                                    </select>
                                </div>
                                
                                <div className="flex gap-2 pt-2">
                                    <Button size="sm" onClick={handleAddSkill} disabled={!newSkillName || !newSkillPrompt} className="px-6 font-black">
                                        Save Skill
                                    </Button>
                                    <Button size="sm" variant="ghost" onClick={() => setIsAddingSkill(false)} className="font-bold">
                                        Cancel
                                    </Button>
                                </div>
                            </div>
                        </div>
                    )}

                    {skills.length === 0 && !isAddingSkill ? (
                        <div className="p-8 text-center">
                            <p className="text-xs text-foreground/40 font-bold">No skills added.</p>
                        </div>
                    ) : (
                        <div className="divide-y divide-border">
                            {skills.map(skill => (
                                <div key={skill.id} className="p-3.5 flex items-center justify-between hover:bg-muted/30 transition-colors group">
                                    <div className="flex items-center gap-3.5">
                                        <div className="bg-muted p-2 rounded-lg text-foreground/60">
                                            <Zap className="w-4 h-4 text-yellow-600 fill-yellow-600/10" />
                                        </div>
                                        <div>
                                            <div className="flex items-center gap-2">
                                                <div className="text-sm font-bold text-foreground">{skill.name}</div>
                                            </div>
                                            <div className="text-[10px] text-foreground/40 mt-0.5 line-clamp-1 max-w-[200px]">{skill.prompt}</div>
                                        </div>
                                    </div>
                                    <button 
                                        onClick={() => handleDeleteSkill(skill.id)}
                                        className="p-2 text-foreground/30 hover:text-red-600 hover:bg-red-50 rounded-md opacity-0 group-hover:opacity-100 transition-all"
                                        title="Delete skill"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                 </div>
             )}
          </section>

          {/* SECTION: INTELLIGENCE */}
          <section className="space-y-3">
             <button 
                onClick={() => toggleSection('intelligence')}
                className="w-full flex items-center justify-between group"
            >
                <h3 className="text-[11px] font-bold text-foreground/50 uppercase tracking-widest group-hover:text-foreground transition-colors">Intelligence</h3>
                {sections.intelligence ? <ChevronDown className="w-4 h-4 text-foreground/50 group-hover:text-foreground" /> : <ChevronRight className="w-4 h-4 text-foreground/50 group-hover:text-foreground" />}
            </button>
            
            {sections.intelligence && (
                <div className="bg-white rounded-xl border border-border shadow-sm overflow-hidden animate-in fade-in slide-in-from-top-1">
                  
                  {/* Active Model Selection */}
                  <div className="p-4 border-b border-border/50">
                     <label className="text-sm font-semibold mb-2.5 block text-foreground">Active Model</label>
                     <div className="relative">
                        <select
                          value={modelId}
                          onChange={(e) => {
                            setModelId(e.target.value);
                            handleUpdate({ modelId: e.target.value });
                          }}
                          className="w-full appearance-none bg-muted/20 border border-border text-sm text-foreground font-bold rounded-lg p-3 pr-10 focus:ring-1 focus:ring-primary focus:border-primary outline-none transition-all cursor-pointer"
                        >
                          <optgroup label="Official Models">
                            {BUILT_IN_MODELS.map(m => (
                              <option key={m.id} value={m.id}>{m.name}</option>
                            ))}
                          </optgroup>
                          {customModels.length > 0 && (
                            <optgroup label="Custom Models">
                              {customModels.map(m => (
                                <option key={m.id} value={m.id}>{m.name}</option>
                              ))}
                            </optgroup>
                          )}
                        </select>
                        <div className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-foreground/40">
                          <Cpu className="w-4 h-4" />
                        </div>
                     </div>
                  </div>

                  {/* System Instructions */}
                  <div className="p-4">
                     <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                           <label className="text-sm font-semibold text-foreground">System Instructions</label>
                           <span 
                             className="text-[9px] bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full border border-blue-200 font-black tracking-tight"
                           >
                             GLOBAL
                           </span>
                        </div>
                     </div>
                     
                     <textarea
                        value={systemInstruction}
                        onChange={(e) => {
                          setSystemInstruction(e.target.value);
                          handleUpdate({ systemInstruction: e.target.value });
                        }}
                        className="w-full h-36 bg-muted/10 border border-border text-xs text-foreground rounded-lg p-3.5 focus:ring-1 focus:ring-primary focus:border-primary outline-none transition-all resize-none font-mono leading-relaxed font-medium placeholder:text-muted-foreground/40"
                        placeholder="You are a helpful assistant..."
                     />
                     <p className="text-[10px] text-foreground/60 font-semibold mt-2.5 leading-relaxed">
                       Instructions define the AI's personality and rules across all chats.
                     </p>
                  </div>

                </div>
            )}
          </section>

          {/* SECTION: CUSTOM MODELS */}
          <section className="space-y-3">
             <div className="flex items-center justify-between">
                <button 
                    onClick={() => toggleSection('customModels')}
                    className="flex items-center gap-2 group"
                >
                    <h3 className="text-[11px] font-bold text-foreground/50 uppercase tracking-widest group-hover:text-foreground transition-colors">Custom Models</h3>
                    {sections.customModels ? <ChevronDown className="w-3.5 h-3.5 text-foreground/50 group-hover:text-foreground" /> : <ChevronRight className="w-3.5 h-3.5 text-foreground/50 group-hover:text-foreground" />}
                </button>
                {!isAddingModel && (
                  <button 
                    onClick={() => { setIsAddingModel(true); setSections(prev => ({...prev, customModels: true})); }}
                    className="text-[10px] flex items-center gap-1 text-primary font-black hover:opacity-80 transition-opacity"
                  >
                    <Plus className="w-3 h-3" strokeWidth={3} /> Add New
                  </button>
                )}
             </div>

             {sections.customModels && (
                 <div className="bg-white rounded-xl border border-border shadow-sm overflow-hidden animate-in fade-in slide-in-from-top-1">
                    {isAddingModel && (
                      <div className="p-4 bg-muted/20 border-b border-border animate-in slide-in-from-top-2">
                         <h4 className="text-sm font-bold mb-4 text-foreground">Add Custom Model</h4>
                         <div className="space-y-4">
                            
                            {/* Provider Toggle */}
                            <div className="flex gap-6">
                                <label className="flex items-center gap-2 text-xs font-bold cursor-pointer text-foreground">
                                    <input 
                                        type="radio" 
                                        name="provider" 
                                        value="openai" 
                                        checked={newProvider === 'openai'} 
                                        onChange={() => setNewProvider('openai')}
                                        className="accent-primary w-4 h-4"
                                    />
                                    OpenAI Compatible
                                </label>
                                <label className="flex items-center gap-2 text-xs font-bold cursor-pointer text-foreground">
                                    <input 
                                        type="radio" 
                                        name="provider" 
                                        value="google" 
                                        checked={newProvider === 'google'} 
                                        onChange={() => setNewProvider('google')}
                                        className="accent-primary w-4 h-4"
                                    />
                                    Google Gemini
                                </label>
                            </div>

                            {/* Display Name */}
                            <div>
                               <label className="text-[11px] text-foreground font-bold uppercase tracking-wide">Display Name</label>
                               <input 
                                  type="text" 
                                  value={newModelName}
                                  onChange={e => setNewModelName(e.target.value)}
                                  placeholder={newProvider === 'openai' ? "e.g. Local Llama 3" : "e.g. Gemini 1.5 Pro Exp"}
                                  className="w-full mt-1.5 px-3 py-2.5 bg-white border border-border rounded-lg text-sm focus:outline-none focus:border-primary font-bold placeholder:font-normal text-foreground"
                               />
                            </div>

                            {/* Provider Specific Fields */}
                            {newProvider === 'openai' && (
                                <div className="grid grid-cols-1 gap-4 animate-in fade-in slide-in-from-top-1 duration-200">
                                    <div>
                                       <label className="text-[11px] text-foreground font-bold uppercase tracking-wide flex items-center gap-1.5">
                                          <Globe className="w-3 h-3" /> API Base URL
                                       </label>
                                       <input 
                                          type="text" 
                                          value={newBaseUrl}
                                          onChange={e => setNewBaseUrl(e.target.value)}
                                          placeholder="e.g. http://localhost:11434/v1"
                                          className="w-full mt-1.5 px-3 py-2.5 bg-white border border-border rounded-lg text-sm focus:outline-none focus:border-primary font-mono text-xs font-medium text-foreground"
                                       />
                                    </div>
                                    <div>
                                       <label className="text-[11px] text-foreground font-bold uppercase tracking-wide flex items-center gap-1.5">
                                          <Key className="w-3 h-3" /> API Key (Optional)
                                       </label>
                                       <input 
                                          type="password" 
                                          value={newApiKey}
                                          onChange={e => setNewApiKey(e.target.value)}
                                          placeholder="sk-..."
                                          className="w-full mt-1.5 px-3 py-2.5 bg-white border border-border rounded-lg text-sm focus:outline-none focus:border-primary font-mono text-xs font-medium text-foreground"
                                       />
                                    </div>
                                </div>
                            )}

                            {/* Model ID */}
                            <div>
                               <div className="flex justify-between items-center">
                                 <label className="text-[11px] text-foreground font-bold uppercase tracking-wide">Model ID</label>
                                 <a href="https://ai.google.dev/models/gemini" target="_blank" className="text-[10px] text-blue-700 font-black hover:underline">Reference</a>
                               </div>
                               <input 
                                  type="text" 
                                  value={newModelId}
                                  onChange={e => setNewModelId(e.target.value)}
                                  placeholder={newProvider === 'openai' ? "e.g. llama3" : "e.g. gemini-1.5-pro-001"}
                                  className="w-full mt-1.5 px-3 py-2.5 bg-white border border-border rounded-lg text-sm focus:outline-none focus:border-primary font-mono text-xs font-medium text-foreground"
                               />
                            </div>

                            {/* Actions */}
                            <div className="flex gap-2 pt-2">
                               <Button size="sm" onClick={handleAddCustomModel} disabled={!newModelName || !newModelId} className="px-6 font-black">
                                 Save Model
                               </Button>
                               <Button size="sm" variant="ghost" onClick={() => setIsAddingModel(false)} className="font-bold">
                                 Cancel
                               </Button>
                            </div>
                         </div>
                      </div>
                    )}

                    {customModels.length === 0 && !isAddingModel ? (
                      <div className="p-8 text-center">
                        <p className="text-xs text-foreground/40 font-bold">No custom models added.</p>
                      </div>
                    ) : (
                      <div className="divide-y divide-border">
                        {customModels.map(model => (
                          <div key={model.id} className="p-3.5 flex items-center justify-between hover:bg-muted/30 transition-colors group">
                             <div className="flex items-center gap-3.5">
                                <div className="bg-muted p-2 rounded-lg text-foreground/60">
                                   <Smartphone className="w-4 h-4" />
                                </div>
                                <div>
                                   <div className="flex items-center gap-2">
                                      <div className="text-sm font-bold text-foreground">{model.name}</div>
                                      <span className="text-[9px] font-black uppercase tracking-widest text-foreground/40 border border-border px-1.5 py-0.5 rounded bg-muted/50">
                                        {model.provider || 'custom'}
                                      </span>
                                   </div>
                                   <div className="text-[10px] font-mono text-foreground/40 mt-0.5 font-semibold">{model.id}</div>
                                </div>
                             </div>
                             <div className="flex items-center gap-3">
                                {modelId === model.id && (
                                   <span className="text-[9px] bg-green-100 text-green-800 px-2 py-0.5 rounded-full font-black border border-green-200">ACTIVE</span>
                                )}
                                <button 
                                  onClick={() => handleDeleteModel(model.id)}
                                  className="p-2 text-foreground/30 hover:text-red-600 hover:bg-red-50 rounded-md opacity-0 group-hover:opacity-100 transition-all"
                                  title="Delete model"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                             </div>
                          </div>
                        ))}
                      </div>
                    )}
                 </div>
             )}
          </section>

          {/* SECTION: DATA & STORAGE */}
          <section className="space-y-3">
             <button 
                onClick={() => toggleSection('data')}
                className="w-full flex items-center justify-between group"
            >
                <h3 className="text-[11px] font-bold text-foreground/50 uppercase tracking-widest group-hover:text-foreground transition-colors">Data & Storage</h3>
                {sections.data ? <ChevronDown className="w-4 h-4 text-foreground/50 group-hover:text-foreground" /> : <ChevronRight className="w-4 h-4 text-foreground/50 group-hover:text-foreground" />}
            </button>
            
            {sections.data && (
                 <div className="bg-white rounded-xl border border-border overflow-hidden shadow-sm p-4 animate-in fade-in slide-in-from-top-1">
                    <div className="flex items-center gap-4">
                      <div className="p-3 bg-muted rounded-lg text-foreground/70">
                        <Database className="w-5 h-5" />
                      </div>
                      <div className="flex-1">
                        <h4 className="text-sm font-bold text-foreground">Workspace Backup</h4>
                        <p className="text-[10px] text-muted-foreground mt-1">
                          Export your settings and notes to a JSON file. Use this to transfer your workspace to another browser.
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex gap-3 mt-4 pt-3 border-t border-border/50">
                      <Button 
                        onClick={handleExport}
                        variant="secondary"
                        className="flex-1 text-xs font-bold gap-2"
                      >
                        <Download className="w-3.5 h-3.5" /> Export Data
                      </Button>
                      
                      <div className="flex-1 relative">
                        <input 
                          type="file" 
                          accept=".json" 
                          onChange={handleImport} 
                          ref={fileInputRef}
                          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10" 
                        />
                        <Button 
                          variant="secondary"
                          className="w-full text-xs font-bold gap-2"
                        >
                          <Upload className="w-3.5 h-3.5" /> Restore Data
                        </Button>
                      </div>
                    </div>
                 </div>
            )}
          </section>

          {/* INFO */}
          <div className="text-center pt-4 pb-10">
             <div className="flex items-center justify-center gap-1.5 text-[10px] text-foreground/40 font-black tracking-tight">
               <Info className="w-3.5 h-3.5" />
               CHANGES ARE SAVED AUTOMATICALLY
             </div>
             <p className="text-[10px] text-foreground/20 mt-2 font-black">
               V1.0.0 · LOCAL ENGINE
             </p>
          </div>

        </div>
      </div>
    </div>
  );
};