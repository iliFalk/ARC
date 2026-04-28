import React from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { Trash2, Calendar, Link as LinkIcon } from 'lucide-react';
import { db } from '../db';
import { Note } from '../types';

// --- NOTES LIST COMPONENT ---

interface NotesListProps {
  onSelectNote: (id: number) => void;
  onDeleteNote: (id: number) => void;
}

export const NotesList: React.FC<NotesListProps> = ({ onSelectNote, onDeleteNote }) => {
  const notes = useLiveQuery(() => db.notes.orderBy('updatedAt').reverse().toArray());

  return (
    <div className="h-full flex flex-col bg-white">
      <div className="flex-1 overflow-y-auto p-2 space-y-2">
        {!notes || notes.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 text-muted-foreground text-xs">
            <p>No notes yet.</p>
            <p>Create one or save from Chat.</p>
          </div>
        ) : (
          notes.map(note => (
            <div 
              key={note.id}
              onClick={() => onSelectNote(note.id as number)}
              className="group relative p-3 rounded-lg border border-transparent hover:border-border hover:bg-muted/40 cursor-pointer transition-all"
            >
              <div className="flex justify-between items-start mb-1 pr-8">
                <h3 className="font-medium text-sm text-foreground truncate">
                  {note.title || 'Untitled Note'}
                </h3>
              </div>
              
              {/* Delete Button */}
              <button 
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  e.preventDefault();
                  onDeleteNote(note.id as number);
                }}
                onMouseDown={(e) => {
                  // Prevent parent click from firing if it relies on mouse down/up sequences
                  e.stopPropagation();
                }}
                className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 p-2 hover:bg-red-100 hover:text-red-600 rounded-md text-muted-foreground transition-all z-50"
                title="Delete Note"
              >
                <Trash2 className="w-4 h-4" />
              </button>

              <p className="text-xs text-muted-foreground line-clamp-2 h-8 mb-2 pr-4">
                {note.content || 'No additional text'}
              </p>
              <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Calendar className="w-3 h-3" />
                  {new Date(note.updatedAt).toLocaleDateString()}
                </span>
                {note.sourceUrl && (
                  <span className="flex items-center gap-1 truncate max-w-[100px]">
                    <LinkIcon className="w-3 h-3" />
                    Source
                  </span>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

// --- NOTES EDITOR BODY COMPONENT ---

interface NotesEditorProps {
  content: string;
  onChange: (newContent: string) => void;
  onBlur: () => void;
}

export const NotesEditor: React.FC<NotesEditorProps> = ({ content, onChange, onBlur }) => {
  return (
    <div className="h-full flex flex-col bg-white">
      <textarea 
        className="flex-1 w-full p-4 resize-none focus:outline-none text-sm leading-relaxed text-foreground"
        value={content}
        onChange={(e) => onChange(e.target.value)}
        onBlur={onBlur}
        placeholder="Start writing..."
      />
    </div>
  );
};