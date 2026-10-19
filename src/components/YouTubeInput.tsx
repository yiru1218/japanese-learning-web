import React, { useState } from 'react';
import { Search, Sparkles, FileText, Music2, AlertCircle, ArrowRight, Loader2 } from 'lucide-react';
import { DEMO_SONGS } from '@/data/demoSongs';
import { SongData } from '@/types';

interface YouTubeInputProps {
  onAnalyzeUrl: (url: string) => Promise<void>;
  onAnalyzeManual: (lyricsText: string, title?: string, videoId?: string) => Promise<void>;
  onSelectDemoSong: (song: SongData) => void;
  isLoading: boolean;
  statusMessage?: string;
  errorMessage?: string;
}

export const YouTubeInput: React.FC<YouTubeInputProps> = ({
  onAnalyzeUrl,
  onAnalyzeManual,
  onSelectDemoSong,
  isLoading,
  statusMessage,
  errorMessage,
}) => {
  const [url, setUrl] = useState('');
  const [isManualMode, setIsManualMode] = useState(false);
  const [manualText, setManualText] = useState('');
  const [manualTitle, setManualTitle] = useState('');

  const handleUrlSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!url.trim()) return;
    onAnalyzeUrl(url.trim());
  };

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualText.trim()) return;
    onAnalyzeManual(manualText, manualTitle.trim() || undefined);
  };

  return (
    <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 shadow-2xl backdrop-blur-md mb-8">
      {/* Title & Quick Demo Buttons */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <span>開始日語歌詞學習</span>
            <span className="text-xs font-normal px-2.5 py-0.5 rounded-full bg-rose-500/10 border border-rose-500/20 text-rose-300">
              去重・逐句解析
            </span>
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            輸入 YouTube MV 網址自動抓字幕，或直接貼上日文歌詞，AI 自動去重並詳細剖析單字文法
          </p>
        </div>

        {/* Quick Demo Songs Selector */}
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs text-slate-400 font-medium flex items-center gap-1">
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            快速試用範例：
          </span>
          {DEMO_SONGS.map((song) => (
            <button
              key={song.title}
              type="button"
              onClick={() => onSelectDemoSong(song)}
              className="text-xs px-3 py-1.5 rounded-xl bg-slate-800/80 hover:bg-slate-700 border border-slate-700/60 text-slate-200 hover:text-white transition flex items-center gap-1.5 font-medium shadow-sm"
            >
              <Music2 className="w-3.5 h-3.5 text-indigo-400" />
              <span>{song.title}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Tabs: YouTube URL Mode vs Manual Text Mode */}
      <div className="flex items-center gap-2 border-b border-slate-800 pb-3 mb-4">
        <button
          type="button"
          onClick={() => setIsManualMode(false)}
          className={`text-xs font-semibold px-3 py-1.5 rounded-lg transition flex items-center gap-1.5 ${
            !isManualMode
              ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
              : 'text-slate-400 hover:text-white hover:bg-slate-800'
          }`}
        >
          <Search className="w-3.5 h-3.5" />
          <span>YouTube 網址模式</span>
        </button>
        <button
          type="button"
          onClick={() => setIsManualMode(true)}
          className={`text-xs font-semibold px-3 py-1.5 rounded-lg transition flex items-center gap-1.5 ${
            isManualMode
              ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
              : 'text-slate-400 hover:text-white hover:bg-slate-800'
          }`}
        >
          <FileText className="w-3.5 h-3.5" />
          <span>手動貼上歌詞（100% 成功）</span>
        </button>
      </div>

      {!isManualMode ? (
        /* YouTube URL Form */
        <form onSubmit={handleUrlSubmit} className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-2">
            <div className="relative flex-1">
              <input
                type="text"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="貼上 YouTube 影片網址，例如：https://www.youtube.com/watch?v=..."
                disabled={isLoading}
                className="w-full px-4 py-3 rounded-2xl bg-slate-950 border border-slate-700/80 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 text-sm text-white placeholder-slate-500 outline-none transition"
              />
            </div>
            <button
              type="submit"
              disabled={isLoading || !url.trim()}
              className="px-6 py-3 rounded-2xl font-semibold text-sm bg-gradient-to-r from-indigo-600 via-indigo-500 to-rose-600 hover:from-indigo-500 hover:to-rose-500 text-white shadow-lg shadow-indigo-500/25 disabled:opacity-50 disabled:cursor-not-allowed transition flex items-center justify-center gap-2 shrink-0"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>分析處理中...</span>
                </>
              ) : (
                <>
                  <span>抓取歌詞並解析</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </div>
        </form>
      ) : (
        /* Manual Text Form */
        <form onSubmit={handleManualSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                歌曲名稱（選填）
              </label>
              <input
                type="text"
                value={manualTitle}
                onChange={(e) => setManualTitle(e.target.value)}
                placeholder="例如：米津玄師 - Lemon"
                className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-700 text-xs text-white placeholder-slate-600 outline-none"
              />
            </div>
          </div>
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-xs font-medium text-slate-300">
                日文歌詞（一行一句，副歌重複句子會由 AI 自動去重）
              </label>
              <button
                type="button"
                onClick={() =>
                  setManualText(`夢ならばどれほどよかったでしょう
未だにあなたのことを夢にみる
忘れた物を取りに帰るように
古びた思い出の埃を払う
夢ならばどれほどよかったでしょう`)
                }
                className="text-[11px] text-indigo-400 hover:underline"
              >
                載入示範歌詞
              </button>
            </div>
            <textarea
              rows={5}
              value={manualText}
              onChange={(e) => setManualText(e.target.value)}
              placeholder="貼上日文歌詞，例如：&#10;夢ならばどれほどよかったでしょう&#10;未だにあなたのことを夢にみる..."
              className="w-full px-4 py-3 rounded-2xl bg-slate-950 border border-slate-700/80 focus:border-indigo-500 text-xs text-white placeholder-slate-600 outline-none leading-relaxed font-sans"
            />
          </div>
          <button
            type="submit"
            disabled={isLoading || !manualText.trim()}
            className="w-full py-3 rounded-2xl font-semibold text-sm bg-gradient-to-r from-indigo-600 to-rose-600 hover:from-indigo-500 hover:to-rose-500 text-white shadow-lg shadow-indigo-500/25 disabled:opacity-50 transition flex items-center justify-center gap-2"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>AI 正在進行去重與句型解析...</span>
              </>
            ) : (
              <>
                <span>立即分析歌詞</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>
      )}

      {/* Status or Error Notifications */}
      {statusMessage && (
        <div className="mt-4 p-3 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-xs text-indigo-300 flex items-center gap-2 animate-fade-in">
          <Loader2 className="w-4 h-4 animate-spin shrink-0 text-indigo-400" />
          <span>{statusMessage}</span>
        </div>
      )}

      {errorMessage && (
        <div className="mt-4 p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-xs text-rose-300 flex items-start gap-2.5 animate-fade-in">
          <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
          <div className="flex-1">
            <span className="font-semibold block mb-0.5">貼心提示</span>
            <span>{errorMessage}</span>
            {!isManualMode && (
              <div className="mt-2.5">
                <button
                  type="button"
                  onClick={() => setIsManualMode(true)}
                  className="px-3.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium flex items-center gap-1.5 transition shadow-sm"
                >
                  <FileText className="w-3.5 h-3.5" />
                  <span>一鍵切換到「手動貼上歌詞」模式</span>
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
