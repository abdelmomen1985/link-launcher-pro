export interface ParsedUrl {
  id: string;
  original: string;
  valid: boolean;
  protocol: string | null;
}

export interface ToastMessage {
  id: string;
  type: 'success' | 'error' | 'info';
  message: string;
}

export interface HistoryItem {
  id: string;
  timestamp: number;
  urlCount: number;
  preview: string[]; // Store first 3 urls for preview
  fullText: string;
}
