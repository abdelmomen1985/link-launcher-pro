import React from 'react';
import { ParsedUrl } from '../types';
import { ExternalLink, CheckCircle, XCircle, CheckSquare, Square } from 'lucide-react';

interface UrlListProps {
  urls: ParsedUrl[];
  selectedIds: Set<string>;
  onToggleSelect: (id: string) => void;
  onToggleAll: () => void;
}

export const UrlList: React.FC<UrlListProps> = ({ urls, selectedIds, onToggleSelect, onToggleAll }) => {
  if (urls.length === 0) return null;

  const allSelected = urls.length > 0 && selectedIds.size === urls.length;
  const validCount = urls.filter(u => u.valid).length;
  const selectedCount = selectedIds.size;

  // Domain stats
  const domains = urls.reduce((acc, url) => {
    try {
      const hostname = new URL(url.original).hostname.replace('www.', '');
      acc[hostname] = (acc[hostname] || 0) + 1;
    } catch {
      // ignore invalid
    }
    return acc;
  }, {} as Record<string, number>);

  const topDomains = Object.entries(domains)
    .sort(([, a], [, b]) => (b as number) - (a as number))
    .slice(0, 3);

  return (
    <div className="w-full bg-slate-800/50 rounded-xl border border-slate-700 mt-6 animate-fade-in overflow-hidden">
      {/* List Header */}
      <div className="bg-slate-800/80 p-4 border-b border-slate-700 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center space-x-4">
           <button 
            onClick={onToggleAll}
            className="flex items-center text-sm font-medium text-slate-300 hover:text-white transition-colors"
          >
            {allSelected ? (
              <CheckSquare className="w-5 h-5 mr-2 text-blue-500" />
            ) : (
              <Square className="w-5 h-5 mr-2 text-slate-500" />
            )}
            {allSelected ? 'Deselect All' : 'Select All'}
          </button>
          <span className="text-slate-500">|</span>
          <span className="text-sm text-slate-400">
            {selectedCount} selected
          </span>
        </div>
        
        {/* Quick Stats */}
        <div className="flex gap-2 text-xs text-slate-500">
          {topDomains.map(([domain, count]) => (
            <span key={domain} className="bg-slate-900 px-2 py-1 rounded-md border border-slate-700">
              {domain}: {count}
            </span>
          ))}
        </div>
      </div>
      
      {/* List Content */}
      <div className="max-h-[300px] overflow-y-auto p-2 space-y-1">
        {urls.map((url, idx) => {
          const isSelected = selectedIds.has(url.id);
          return (
            <div 
              key={`${url.id}-${idx}`}
              onClick={() => onToggleSelect(url.id)}
              className={`flex items-center justify-between p-2 rounded-lg border cursor-pointer transition-all ${
                isSelected 
                  ? 'bg-blue-900/10 border-blue-500/30' 
                  : 'bg-transparent border-transparent hover:bg-slate-800'
              }`}
            >
              <div className="flex items-center space-x-3 overflow-hidden">
                <div className={`flex-shrink-0 ${isSelected ? 'text-blue-500' : 'text-slate-600'}`}>
                   {isSelected ? <CheckSquare className="w-5 h-5" /> : <Square className="w-5 h-5" />}
                </div>
                
                {url.valid ? (
                  <CheckCircle className="w-4 h-4 text-emerald-500/70 flex-shrink-0" />
                ) : (
                  <XCircle className="w-4 h-4 text-red-500/70 flex-shrink-0" />
                )}
                
                <span className={`truncate text-sm font-mono ${isSelected ? 'text-slate-200' : 'text-slate-500'}`}>
                  {url.original}
                </span>
              </div>
              
              <a 
                href={url.original} 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-slate-600 hover:text-blue-400 p-2 hover:bg-slate-700 rounded-md transition-colors"
                onClick={(e) => e.stopPropagation()}
                title="Open just this link"
              >
                <ExternalLink className="w-4 h-4" />
              </a>
            </div>
          );
        })}
      </div>
    </div>
  );
};