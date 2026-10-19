import React from 'react';
import { FuriganaMode } from '@/types';
import { Sparkles, Key, BookOpen, Eye, EyeOff, HelpCircle, Music, History } from 'lucide-react';

interface HeaderProps {
  furiganaMode: FuriganaMode;
  onFuriganaModeChange: (mode: FuriganaMode) => void;
  onOpenApiKeyModal: () => void;
  onOpenVocabModal: () => void;
  onOpenHistoryModal: () => void;
  historyCount: number;
  vocabCount: number;
  hasApiKey: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  furiganaMode,
  onFuriganaModeChange,
  onOpenApiKeyModal,
  onOpenVocabModal,
  onOpenHistoryModal,
  historyCount,
  vocabCount,
  hasApiKey,
}) => {
  return (
    <header className="sticky top-0 z-40 w-full backdrop-blur-md bg-slate-950/80 border-b border-slate-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Logo & Title */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 via-rose-500 to-amber-400 p-[2px] shadow-lg shadow-indigo-500/20">
            <div className="w-full h-full bg-slate-950 rounded-[10px] flex items-center justify-center">
              <Music className="w-5 h-5 text-indigo-400 animate-pulse" />
            </div>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-lg sm:text-xl tracking-tight bg-gradient-to-r from-white via-slate-200 to-indigo-300 bg-clip-text text-transparent">
                UtaStudy 歌学び
              </span>
              <span className="text-xs px-2 py-0.5 rounded-full bg-indigo-500/10 border border-indigo-500/30 text-indigo-300 font-mono">
                AI 日語歌詞神器
              </span>
            </div>
            <p className="text-xs text-slate-400 hidden sm:block">
              YouTube 歌詞去重・假名標註・逐句文法單字全解析
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Furigana Mode Switcher */}
          <div className="bg-slate-900 border border-slate-800 p-1 rounded-lg flex items-center text-xs">
            <button
              onClick={() => onFuriganaModeChange('show')}
              title="一律顯示假名"
              className={`px-2.5 py-1 rounded-md transition-all flex items-center gap-1.5 ${
                furiganaMode === 'show'
                  ? 'bg-indigo-600 text-white font-medium shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Eye className="w-3.5 h-3.5" />
              <span className="hidden md:inline">顯示假名</span>
            </button>
            <button
              onClick={() => onFuriganaModeChange('hover')}
              title="懸停時才顯示假名"
              className={`px-2.5 py-1 rounded-md transition-all flex items-center gap-1.5 ${
                furiganaMode === 'hover'
                  ? 'bg-indigo-600 text-white font-medium shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <HelpCircle className="w-3.5 h-3.5" />
              <span className="hidden md:inline">懸停顯示</span>
            </button>
            <button
              onClick={() => onFuriganaModeChange('hide')}
              title="隱藏假名（自主測驗模式）"
              className={`px-2.5 py-1 rounded-md transition-all flex items-center gap-1.5 ${
                furiganaMode === 'hide'
                  ? 'bg-indigo-600 text-white font-medium shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <EyeOff className="w-3.5 h-3.5" />
              <span className="hidden md:inline">隱藏假名</span>
            </button>
          </div>

          {/* History Button */}
          <button
            onClick={onOpenHistoryModal}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 text-xs text-slate-300 hover:text-white font-medium transition"
          >
            <History className="w-3.5 h-3.5 text-indigo-400" />
            <span className="hidden sm:inline">歷史庫</span>
            {historyCount > 0 && (
              <span className="px-1.5 py-0.2 bg-indigo-500/20 text-indigo-300 rounded-full text-[10px]">
                {historyCount}
              </span>
            )}
          </button>

          {/* Vocab Summary Button */}
          {vocabCount > 0 && (
            <button
              onClick={onOpenVocabModal}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 text-xs text-indigo-300 font-medium transition"
            >
              <BookOpen className="w-3.5 h-3.5 text-indigo-400" />
              <span>全曲單字庫</span>
              <span className="ml-0.5 px-1.5 py-0.2 bg-indigo-500/20 text-indigo-300 rounded-full text-[10px]">
                {vocabCount}
              </span>
            </button>
          )}

          {/* API Key Modal Button */}
          <button
            onClick={onOpenApiKeyModal}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-medium transition ${
              hasApiKey
                ? 'bg-emerald-950/40 border-emerald-800/60 text-emerald-300 hover:bg-emerald-900/50'
                : 'bg-slate-900 hover:bg-slate-800 border-amber-500/40 text-amber-300'
            }`}
          >
            <Key className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">{hasApiKey ? 'Gemini 已連線' : '設定 API Key'}</span>
          </button>
        </div>
      </div>
    </header>
  );
};
