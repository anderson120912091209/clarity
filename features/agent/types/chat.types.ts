// Temporary stub types - to be replaced during agent rebuild

export interface ChatMessage {
  id?: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp?: Date;
}
