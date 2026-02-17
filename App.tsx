import React, { useState, useEffect } from 'react';
import { Header } from './components/Header';
import { Button } from './components/Button';
import { UrlList } from './components/UrlList';
import { HistoryDrawer } from './components/HistoryDrawer';
import { ParsedUrl, ToastMessage, HistoryItem } from './types';
import { extractUrls, decodeSharedUrls, removeDuplicates, sortUrls } from './utils/urlUtils';
import { clearHistory, createShare, getHistory, resolveShare } from './utils/api';
import { ExternalLink, Trash2, Share2, Clipboard, AlertTriangle, FileCheck, ArrowDownAZ, Zap, Timer } from 'lucide-react';

export default function App() {
  const [textInput, setTextInput] = useState('');
  const [parsedUrls, setParsedUrls] = useState<ParsedUrl[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [toast, setToast] = useState<ToastMessage | null>(null);

  const [useDelay, setUseDelay] = useState(false);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [isOpening, setIsOpening] = useState(false);

  const showToast = (type: 'success' | 'error' | 'info', message: string) => {
    setToast({ id: Date.now().toString(), type, message });
    setTimeout(() => setToast(null), 3000);
  };

  useEffect(() => {
    (async () => {
      try {
        const saved = await getHistory();
        setHistory(saved);
      } catch (e) {
        console.error('History load error', e);
      }
    })();
  }, []);


  useEffect(() => {
    const urls = extractUrls(textInput);
    setParsedUrls(urls);
    setSelectedIds(new Set(urls.map((u) => u.id)));
  }, [textInput]);

  useEffect(() => {
    const searchParams = new URLSearchParams(window.location.search);
    const hash = window.location.hash.replace('#', '');
    const hashParams = new URLSearchParams(hash);
    const sharedData = searchParams.get('share') ?? hashParams.get('share');

    if (!sharedData) return;

    (async () => {
      const sharedFromApi = await resolveShare(sharedData);
      if (sharedFromApi.length > 0) {
        setTextInput(sharedFromApi.join('\n'));
        showToast('success', 'Loaded shared links!');
        return;
      }

      const urls = decodeSharedUrls(sharedData);
      if (urls.length > 0) {
        setTextInput(urls.join('\n'));
        showToast('success', 'Loaded shared links!');
      }
    })();
  }, []);

  const handleToggleSelect = (id: string) => {
    const newSet = new Set(selectedIds);
    if (newSet.has(id)) {
      newSet.delete(id);
    } else {
      newSet.add(id);
    }
    setSelectedIds(newSet);
  };

  const handleToggleAll = () => {
    if (selectedIds.size === parsedUrls.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(parsedUrls.map((u) => u.id)));
    }
  };

  const getUrlsToOpen = () => parsedUrls.filter((u) => selectedIds.has(u.id));

  const handleOpenAll = async () => {
    const targets = getUrlsToOpen();
    if (targets.length === 0) return;

    if (targets.length > 10 && !useDelay) {
      const confirm = window.confirm(`Opening ${targets.length} tabs instantly might freeze your browser. Enable "Throttle" mode?`);
      if (confirm) {
        setUseDelay(true);
        await openWithDelay(targets);
        return;
      }
    }

    if (useDelay) {
      await openWithDelay(targets);
    } else {
      openInstantly(targets);
    }
  };

  const openInstantly = (urls: ParsedUrl[]) => {
    let blockedCount = 0;
    urls.forEach((url) => {
      const win = window.open(url.original, '_blank');
      if (!win) blockedCount++;
    });

    if (blockedCount > 0) {
      showToast('error', `${blockedCount} popups blocked. Please allow popups.`);
    } else {
      showToast('success', `Opened ${urls.length} links!`);
    }
  };

  const openWithDelay = async (urls: ParsedUrl[]) => {
    setIsOpening(true);
    let count = 0;

    for (const url of urls) {
      window.open(url.original, '_blank');
      count++;
      await new Promise((r) => setTimeout(r, 1000));
    }

    setIsOpening(false);
    showToast('success', `Opened ${count} links sequence completed.`);
  };

  const handleTools = (action: 'dedupe' | 'sort') => {
    if (parsedUrls.length === 0) return;

    if (action === 'dedupe') {
      const cleaned = removeDuplicates(parsedUrls);
      setTextInput(cleaned);
      showToast('info', 'Duplicates removed');
    } else if (action === 'sort') {
      const sorted = sortUrls(parsedUrls);
      setTextInput(sorted);
      showToast('info', 'List sorted alphabetically');
    }
  };

  const handleClear = () => {
    setTextInput('');
    setParsedUrls([]);
    window.history.pushState('', document.title, window.location.pathname + window.location.search);
  };

  const copyToClipboard = async (value: string) => {
    try {
      await navigator.clipboard.writeText(value);
      return true;
    } catch {
      const textarea = document.createElement('textarea');
      textarea.value = value;
      textarea.setAttribute('readonly', '');
      textarea.style.position = 'absolute';
      textarea.style.left = '-9999px';
      document.body.appendChild(textarea);
      textarea.select();
      const copied = document.execCommand('copy');
      document.body.removeChild(textarea);
      return copied;
    }
  };

  const handleShare = async () => {
    const targets = getUrlsToOpen();
    if (targets.length === 0) return;

    try {
      const id = await createShare(targets.map((u) => u.original));
      if (!id) {
        showToast('error', 'Failed to create share link.');
        return;
      }

      const shareUrl = `${window.location.origin}${window.location.pathname}?share=${id}`;
      const copied = await copyToClipboard(shareUrl);
      if (copied) {
        showToast('success', 'Shareable link copied!');
      } else {
        showToast('error', 'Failed to copy link.');
      }
    } catch {
      showToast('error', 'Failed to create share link.');
    }
  };

  const handlePaste = async () => {
    try {
      const text = await navigator.clipboard.readText();
      setTextInput((prev) => prev + (prev ? '\n' : '') + text);
      showToast('success', 'Pasted from clipboard');
    } catch {
      showToast('error', 'Failed to read clipboard');
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-900 text-slate-100 font-sans">
      <Header onOpenHistory={() => setIsHistoryOpen(true)} />

      <HistoryDrawer
        isOpen={isHistoryOpen}
        onClose={() => setIsHistoryOpen(false)}
        history={history}
        onSelect={(item) => setTextInput(item.fullText)}
        onClear={async () => {
          setHistory([]);
          try {
            await clearHistory();
          } catch {
            showToast('error', 'Failed to clear history');
          }
        }}
      />

      <main className="flex-grow w-full max-w-4xl mx-auto px-4 py-8">
        <div className="text-center mb-8">
          <h1 className="text-3xl md:text-5xl font-bold mb-4 bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-emerald-400 pb-2">
            Open Multiple URLs
          </h1>
          <p className="text-slate-400 max-w-2xl mx-auto text-lg">Bulk open links, remove duplicates, and share lists.</p>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 mb-2 px-1">
          <div className="flex items-center space-x-2">
            <button
              onClick={() => handleTools('dedupe')}
              disabled={parsedUrls.length === 0}
              className="text-xs flex items-center bg-slate-800 hover:bg-slate-700 text-slate-300 px-3 py-1.5 rounded-full border border-slate-700 transition-colors disabled:opacity-50"
            >
              <FileCheck className="w-3 h-3 mr-1.5" />
              Remove Duplicates
            </button>
            <button
              onClick={() => handleTools('sort')}
              disabled={parsedUrls.length === 0}
              className="text-xs flex items-center bg-slate-800 hover:bg-slate-700 text-slate-300 px-3 py-1.5 rounded-full border border-slate-700 transition-colors disabled:opacity-50"
            >
              <ArrowDownAZ className="w-3 h-3 mr-1.5" />
              Sort A-Z
            </button>
          </div>

          <div className="flex items-center">
            <button
              onClick={() => setUseDelay(!useDelay)}
              className={`text-xs flex items-center px-3 py-1.5 rounded-full border transition-colors ${
                useDelay
                  ? 'bg-amber-900/30 border-amber-500/50 text-amber-400'
                  : 'bg-slate-800 border-slate-700 text-slate-400 hover:bg-slate-700'
              }`}
              title="Open links with a 1-second delay to prevent freezing"
            >
              {useDelay ? <Timer className="w-3 h-3 mr-1.5" /> : <Zap className="w-3 h-3 mr-1.5" />}
              {useDelay ? 'Throttle: ON' : 'Throttle: OFF'}
            </button>
          </div>
        </div>

        <div className="bg-slate-800 rounded-2xl shadow-xl p-1 border border-slate-700 relative group">
          <textarea
            value={textInput}
            onChange={(e) => setTextInput(e.target.value)}
            placeholder="Paste your links here..."
            className="w-full h-48 md:h-64 bg-slate-900/50 text-slate-200 p-4 rounded-xl resize-y focus:outline-none focus:ring-2 focus:ring-blue-500/50 border-none placeholder-slate-600 font-mono text-sm leading-relaxed"
          />
          {textInput.length === 0 && (
            <button
              onClick={handlePaste}
              className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-slate-700 hover:bg-slate-600 text-slate-200 px-4 py-2 rounded-lg text-sm font-medium transition-colors opacity-0 group-hover:opacity-100 flex items-center shadow-lg"
            >
              <Clipboard className="w-4 h-4 mr-2" />
              Paste from Clipboard
            </button>
          )}
        </div>

        <div className="mt-6 flex flex-col md:flex-row gap-4 justify-between items-center">
          <div className="flex gap-3 w-full md:w-auto">
            <Button
              onClick={handleOpenAll}
              disabled={getUrlsToOpen().length === 0 || isOpening}
              isLoading={isOpening}
              variant="primary"
              className="w-full md:w-auto flex-1 md:flex-none shadow-blue-500/20 min-w-[160px]"
              icon={!isOpening ? <ExternalLink className="w-4 h-4" /> : undefined}
            >
              {isOpening ? 'Opening...' : `Open ${getUrlsToOpen().length > 0 ? getUrlsToOpen().length : ''} Links`}
            </Button>
            <Button
              onClick={handleShare}
              disabled={getUrlsToOpen().length === 0}
              variant="secondary"
              className="w-full md:w-auto flex-1 md:flex-none"
              icon={<Share2 className="w-4 h-4" />}
            >
              Share
            </Button>
          </div>

          <Button
            onClick={handleClear}
            disabled={parsedUrls.length === 0}
            variant="ghost"
            className="text-red-400 hover:text-red-300 hover:bg-red-900/20"
            icon={<Trash2 className="w-4 h-4" />}
          >
            Clear
          </Button>
        </div>

        <UrlList urls={parsedUrls} selectedIds={selectedIds} onToggleSelect={handleToggleSelect} onToggleAll={handleToggleAll} />

        <div className="mt-12 p-4 bg-yellow-900/20 border border-yellow-700/30 rounded-lg flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-yellow-500 mt-0.5 flex-shrink-0" />
          <div className="text-sm text-yellow-200/80">
            <strong className="text-yellow-400 block mb-1">Tip:</strong>
            If links don't open, enable <strong>Throttle</strong> mode or check your browser's "Popup blocked" icon in the address bar.
          </div>
        </div>
      </main>

      <footer className="w-full border-t border-slate-800 py-8 mt-auto bg-slate-900">
        <div className="max-w-4xl mx-auto px-4 text-center text-slate-500 text-sm">
          <p>© {new Date().getFullYear()} LinkLauncher Pro. Created with React & Tailwind.</p>
        </div>
      </footer>

      {toast && (
        <div
          className={`fixed bottom-6 right-6 px-6 py-3 rounded-lg shadow-2xl transform transition-all duration-300 animate-fade-in z-50 flex items-center
            ${toast.type === 'success' ? 'bg-emerald-600 text-white' : ''}
            ${toast.type === 'error' ? 'bg-red-600 text-white' : ''}
            ${toast.type === 'info' ? 'bg-blue-600 text-white' : ''}
          `}
        >
          {toast.message}
        </div>
      )}
    </div>
  );
}
