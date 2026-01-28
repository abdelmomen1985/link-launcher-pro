import React from 'react';
import { Layers, History } from 'lucide-react';

interface HeaderProps {
  onOpenHistory: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onOpenHistory }) => {
  return (
    <nav className="w-full border-b border-slate-800 bg-slate-900/50 backdrop-blur-md sticky top-0 z-50">
      <div className="max-w-4xl mx-auto px-4 h-16 flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <div className="bg-blue-600 p-1.5 rounded-lg">
            <Layers className="w-6 h-6 text-white" />
          </div>
          <span className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-slate-400">
            LinkLauncher Pro
          </span>
        </div>
        
        <div className="flex items-center gap-4">
          <button 
            onClick={onOpenHistory}
            className="flex items-center text-sm font-medium text-slate-400 hover:text-white transition-colors p-2 rounded-lg hover:bg-slate-800"
            title="View History"
          >
            <History className="w-5 h-5 sm:mr-2" />
            <span className="hidden sm:inline">History</span>
          </button>
        </div>
      </div>
    </nav>
  );
};
