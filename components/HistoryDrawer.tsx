import React from 'react';
import { HistoryItem } from '../types';
import { X, Clock, ArrowRight } from 'lucide-react';

interface HistoryDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  history: HistoryItem[];
  onSelect: (item: HistoryItem) => void;
  onClear: () => void;
}

export const HistoryDrawer: React.FC<HistoryDrawerProps> = ({ 
  isOpen, 
  onClose, 
  history, 
  onSelect,
  onClear
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/50 backdrop-blur-sm transition-opacity" 
        onClick={onClose}
      />

      {/* Drawer */}
      <div className="relative w-full max-w-md bg-slate-900 h-full shadow-2xl border-l border-slate-800 flex flex-col animate-fade-in">
        <div className="p-5 border-b border-slate-800 flex items-center justify-between bg-slate-900">
          <h2 className="text-xl font-bold text-white flex items-center">
            <Clock className="w-5 h-5 mr-2 text-blue-500" />
            History
          </h2>
          <button onClick={onClose} className="text-slate-400 hover:text-white p-1 rounded-md hover:bg-slate-800">
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {history.length === 0 ? (
            <div className="text-center text-slate-500 mt-10">
              <p>No history yet.</p>
              <p className="text-sm mt-2">Open or share links to save them here.</p>
            </div>
          ) : (
            history.map((item) => (
              <div 
                key={item.id}
                onClick={() => { onSelect(item); onClose(); }}
                className="bg-slate-800/50 border border-slate-700 rounded-xl p-4 cursor-pointer hover:border-blue-500/50 hover:bg-slate-800 transition-all group"
              >
                <div className="flex justify-between items-start mb-2">
                  <span className="text-xs text-slate-400 font-mono">
                    {new Date(item.timestamp).toLocaleString()}
                  </span>
                  <span className="bg-slate-700 text-slate-300 text-xs px-2 py-0.5 rounded-full">
                    {item.urlCount} Links
                  </span>
                </div>
                <div className="space-y-1 mb-3">
                  {item.preview.map((url, i) => (
                    <div key={i} className="text-xs text-slate-500 truncate pl-2 border-l-2 border-slate-700">
                      {url}
                    </div>
                  ))}
                  {item.urlCount > 3 && (
                    <div className="text-xs text-slate-600 pl-3">
                      + {item.urlCount - 3} more...
                    </div>
                  )}
                </div>
                <div className="flex items-center text-sm text-blue-400 font-medium opacity-0 group-hover:opacity-100 transition-opacity">
                  Restore this list <ArrowRight className="w-4 h-4 ml-1" />
                </div>
              </div>
            ))
          )}
        </div>

        {history.length > 0 && (
          <div className="p-4 border-t border-slate-800 bg-slate-900">
            <button 
              onClick={onClear}
              className="w-full py-2 text-sm text-red-400 hover:text-red-300 hover:bg-red-900/20 rounded-lg transition-colors"
            >
              Clear History
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
