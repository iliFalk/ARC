import Dexie, { type EntityTable } from 'dexie';
import { Note } from './types';

// Database Schema definition
const db = new Dexie('AIWorkspaceDB') as Dexie & {
  notes: EntityTable<
    Note,
    'id' // primary key "id" (for the typings only)
  >;
};

// Schema declaration:
// ++id = auto-incremented primary key
// title, content, createdAt, updatedAt, sourceUrl = indexes
db.version(1).stores({
  notes: '++id, title, createdAt, updatedAt'
});

export { db };