import { HistoryItem } from '../types';

const API_BASE = import.meta.env.VITE_API_BASE_URL || '';

const toJson = async <T>(res: Response): Promise<T> => {
  if (!res.ok) {
    throw new Error(`Request failed: ${res.status}`);
  }
  return res.json() as Promise<T>;
};

export const getHistory = async (): Promise<HistoryItem[]> => {
  const res = await fetch(`${API_BASE}/api/history`);
  const data = await toJson<{ history: HistoryItem[] }>(res);
  return data.history;
};

export const saveHistoryEntry = async (urls: string[], fullText: string): Promise<HistoryItem | null> => {
  const res = await fetch(`${API_BASE}/api/history`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ urls, fullText }),
  });
  const data = await toJson<{ item: HistoryItem }>(res);
  return data.item;
};

export const clearHistory = async (): Promise<void> => {
  const res = await fetch(`${API_BASE}/api/history`, { method: 'DELETE' });
  if (!res.ok) {
    throw new Error(`Request failed: ${res.status}`);
  }
};

export const createShare = async (urls: string[]): Promise<string | null> => {
  const res = await fetch(`${API_BASE}/api/shares`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ urls }),
  });
  const data = await toJson<{ id: string }>(res);
  return data.id;
};

export const resolveShare = async (id: string): Promise<string[]> => {
  const res = await fetch(`${API_BASE}/api/shares/${encodeURIComponent(id)}`);
  if (!res.ok) {
    return [];
  }
  const data = await res.json() as { urls?: string[] };
  return Array.isArray(data.urls) ? data.urls : [];
};
