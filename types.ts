
// Data Models
export interface Note {
  id?: number;
  title: string;
  content: string;
  createdAt: number; // Timestamp
  updatedAt: number; // Timestamp
  sourceUrl?: string;
}

export enum MessageRole {
  USER = 'user',
  MODEL = 'model'
}

export interface ChatMessage {
  id: string;
  role: MessageRole;
  content: string;
  attachment?: string; // base64 data url (image/jpeg, etc.)
  isError?: boolean;
}

export interface CustomModel {
  id: string;
  name: string;
  description?: string;
  provider?: 'google' | 'openai';
  baseUrl?: string;
  apiKey?: string;
}

export interface Skill {
  id: string;
  name: string;
  prompt: string;
  modelId?: string; // If undefined/null, use the globally active model
}

export interface NewsSourceConfig {
  id: string;
  name: string;
  url: string;
  type: 'reddit-json' | 'hn-api' | 'rss';
  enabled: boolean;
}

export interface AppSettings {
  modelId: string;
  systemInstruction: string;
  theme: 'light' | 'dark' | 'system';
  customModels: CustomModel[];
  skills: Skill[];
  newsSources: NewsSourceConfig[];
}

// Application State
export enum AppView {
  CHAT = 'CHAT',
  NOTES = 'NOTES',
  HUD = 'HUD',
  SETTINGS = 'SETTINGS'
}

// Simulated Page Context (since we are not a real extension)
export interface PageContext {
  title: string;
  url: string;
  content: string;
}

// --- HUD Types ---

export interface WeatherData {
  temperature: number;
  historicalAvgTemp: number;
  weatherCode: number;
  isDay: boolean;
  windSpeed: number;
  windDirection: number;
  sunrise: string;
  sunset: string;
}

export interface NewsItem {
  id: string;
  title: string;
  summary?: string; // New field for card description
  url: string;
  source: string;
  publishedAt: number; // timestamp
  score?: number;
  comments?: number;
}

export interface TutorCommand {
  term: string;
  definition: string;
  example: string;
  generatedAt: number;
}
