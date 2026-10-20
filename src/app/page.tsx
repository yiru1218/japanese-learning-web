'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { Header } from '@/components/Header';
import { YouTubeInput } from '@/components/YouTubeInput';
import { YouTubePlayer } from '@/components/YouTubePlayer';
import { LyricCard } from '@/components/LyricCard';
import { ApiKeyModal } from '@/components/ApiKeyModal';
import { VocabSummaryModal } from '@/components/VocabSummaryModal';
import { HistoryModal } from '@/components/HistoryModal';
import { SongData, FuriganaMode, AnalyzedLine } from '@/types';
import { DEMO_SONGS } from '@/data/demoSongs';
import { deduplicateLines, extractVideoId } from '@/lib/youtube';
import {
  Layers,
  Sparkles,
  Search,
  Filter,
  CheckCircle2,
  Bookmark,
  Share2,
  TrendingDown,
  ChevronDown,
  ChevronUp,
  Compass,
} from 'lucide-react';

export default function HomePage() {
  const [currentSong, setCurrentSong] = useState<SongData>(DEMO_SONGS[0]);
  const [furiganaMode, setFuriganaMode] = useState<FuriganaMode>('show');
  const [seekToTime, setSeekToTime] = useState<number | null>(null);
  const [currentPlaybackTime, setCurrentPlaybackTime] = useState<number>(0);
  const [autoScrollFollow, setAutoScrollFollow] = useState<boolean>(true);
  const [apiKey, setApiKey] = useState<string>('');
  const [isApiKeyModalOpen, setIsApiKeyModalOpen] = useState(false);
  const [isVocabModalOpen, setIsVocabModalOpen] = useState(false);
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  const [songHistory, setSongHistory] = useState<SongData[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [bookmarkedIds, setBookmarkedIds] = useState<Set<string>>(new Set());
  const [showOnlyBookmarks, setShowOnlyBookmarks] = useState(false);
  const [isMounted, setIsMounted] = useState(false);

  // 初始化讀取 LocalStorage 中的 API Key、收藏與歷史記錄
  useEffect(() => {
    setIsMounted(true);
    if (typeof window !== 'undefined') {
      const savedKey = localStorage.getItem('uta_gemini_api_key') || '';
      setApiKey(savedKey);
      try {
        const savedBookmarks = JSON.parse(localStorage.getItem('uta_bookmarks') || '[]');
        if (Array.isArray(savedBookmarks)) {
          setBookmarkedIds(new Set(savedBookmarks));
        }
      } catch {
        // ignore
      }
      try {
        const savedHistory = JSON.parse(localStorage.getItem('uta_song_history') || '[]');
        if (Array.isArray(savedHistory) && savedHistory.length > 0) {
          setSongHistory(savedHistory);
        } else {
          // 若初次使用尚無分析記錄，自動將示範精選歌曲預載入歷史庫，方便即刻體驗
          const initialHistory: SongData[] = DEMO_SONGS.map((s, i) => ({
            ...s,
            id: s.id || `demo-${s.videoId || i}`,
            savedAt: Date.now() - (i + 1) * 3600000,
          }));
          setSongHistory(initialHistory);
          localStorage.setItem('uta_song_history', JSON.stringify(initialHistory));
        }
      } catch {
        // ignore
      }
    }
  }, []);

  const saveSongToHistory = (song: SongData) => {
    setSongHistory((prev) => {
      // 避免重複新增同一首 (以 videoId 或 title 為依據)
      const filtered = prev.filter((s) =>
        song.videoId ? s.videoId !== song.videoId : s.title !== song.title
      );
      const updated = [
        { ...song, id: song.id || `song-${Date.now()}`, savedAt: Date.now() },
        ...filtered,
      ].slice(0, 30);
      if (typeof window !== 'undefined') {
        localStorage.setItem('uta_song_history', JSON.stringify(updated));
      }
      return updated;
    });
  };

  const handleDeleteHistorySong = (songId: string) => {
    setSongHistory((prev) => {
      const updated = prev.filter((s) => s.id !== songId);
      if (typeof window !== 'undefined') {
        localStorage.setItem('uta_song_history', JSON.stringify(updated));
      }
      return updated;
    });
  };

  const handleClearAllHistory = () => {
    setSongHistory([]);
    if (typeof window !== 'undefined') {
      localStorage.removeItem('uta_song_history');
    }
  };

  const handleSaveApiKey = (key: string) => {
    setApiKey(key);
    if (typeof window !== 'undefined') {
      if (key) {
        localStorage.setItem('uta_gemini_api_key', key);
      } else {
        localStorage.removeItem('uta_gemini_api_key');
      }
    }
  };

  const handleToggleBookmark = (lineId: string) => {
    setBookmarkedIds((prev) => {
      const next = new Set(prev);
      if (next.has(lineId)) {
        next.delete(lineId);
      } else {
        next.add(lineId);
      }
      if (typeof window !== 'undefined') {
        localStorage.setItem('uta_bookmarks', JSON.stringify(Array.from(next)));
      }
      return next;
    });
  };

  // 1. YouTube 網址分析流程
  const handleAnalyzeUrl = async (url: string) => {
    setIsLoading(true);
    setErrorMessage('');
    setStatusMessage('正在檢查本機快取與 YouTube 歌詞軌...');

    try {
      const videoId = extractVideoId(url);
      if (!videoId) {
        throw new Error('無法辨識此 YouTube 網址，請確認網址格式正確。');
      }

      // 先檢查本地快取歷史，若曾分析過則 0 秒秒開！
      const cached = songHistory.find((s) => s.videoId === videoId);
      if (cached && cached.lines.length > 0) {
        setCurrentSong(cached);
        setStatusMessage('');
        setIsLoading(false);
        return;
      }

      // 步驟一：呼叫後端 API 抓取 CC 字幕
      const res = await fetch('/api/captions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ videoId }),
      });

      const data = await res.json();

      if (!data.success) {
        if (data.reason === 'NO_CC_AVAILABLE') {
          // 影片無 CC 字幕：仍可為使用者載入播放器，並導引手動貼上歌詞
          setCurrentSong({
            videoId,
            title: `YouTube 影片 (${videoId})`,
            sourceType: 'youtube',
            totalLines: 0,
            uniqueLines: 0,
            lines: [],
          });
          setErrorMessage(
            '此 YouTube 影片未開放 CC 字幕軌（許多音樂錄影帶 MV 是畫面硬字幕）。建議切換為「手動貼上歌詞」模式，同樣可即時完成去重與深度解析！'
          );
          setIsLoading(false);
          setStatusMessage('');
          return;
        }
        throw new Error(data.message || data.error || '無法抓取字幕');
      }

      const rawLines = data.lines as { text: string; timestamp: number }[];
      setStatusMessage(`已成功抓取 ${rawLines.length} 行字幕，正在進行歌詞智慧去重...`);

      // 步驟二：去重處理
      const deduplicated = deduplicateLines(rawLines);
      setStatusMessage(
        `去重完成！原歌詞 ${rawLines.length} 行，精煉為 ${deduplicated.length} 句不重複歌詞。正在由 AI 分析單字與文法...`
      );

      // 步驟三：呼叫 AI 進行逐句詳細解析
      const analyzeRes = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lines: deduplicated,
          apiKey: apiKey || undefined,
        }),
      });

      const analyzeData = await analyzeRes.json();

      if (analyzeData.error) {
        // 依然保留已成功抓到的歌詞與時間戳，讓播放器與時間軸仍能正常操作
        setCurrentSong({
          videoId,
          title: `YouTube 影片 (${videoId})`,
          sourceType: 'youtube',
          totalLines: rawLines.length,
          uniqueLines: deduplicated.length,
          lines: deduplicated.map((d, idx) => ({
            id: `line-${idx}`,
            original: d.original,
            furigana: d.original,
            romaji: '',
            translation: {
              literal: '（AI 伺服器尖峰繁忙中，可點擊再次重試）',
              poetic: '（AI 伺服器尖峰繁忙中，可點擊再次重試）',
            },
            vocabulary: [],
            grammar: [],
            nuance: `在全曲中出現 ${d.occurrences} 次`,
            occurrences: d.occurrences,
            timestamps: d.timestamps,
          })),
        });
        throw new Error(analyzeData.error);
      }

      const lines: AnalyzedLine[] = analyzeData.analyzedLines || [];

      const newSong: SongData = {
        id: `yt-${videoId}`,
        videoId,
        title: `YouTube 影片 (${videoId})`,
        sourceType: 'youtube',
        totalLines: rawLines.length,
        uniqueLines: deduplicated.length,
        lines,
        savedAt: Date.now(),
      };

      setCurrentSong(newSong);
      saveSongToHistory(newSong);

      if (analyzeData.warning === 'NO_API_KEY') {
        setErrorMessage(analyzeData.message);
      }
    } catch (err: unknown) {
      console.error(err);
      setErrorMessage(err instanceof Error ? err.message : '分析失敗，請稍後再試');
    } finally {
      setIsLoading(false);
      setStatusMessage('');
    }
  };

  // 2. 手動貼歌詞分析流程
  const handleAnalyzeManual = async (lyricsText: string, title?: string, videoId?: string) => {
    setIsLoading(true);
    setErrorMessage('');
    setStatusMessage('正在整理歌詞並進行去重過濾...');

    try {
      const rawLines = lyricsText
        .split('\n')
        .map((l) => l.trim())
        .filter((l) => l.length > 0)
        .map((text) => ({ text }));

      if (rawLines.length === 0) {
        throw new Error('請至少輸入一句歌詞');
      }

      const deduplicated = deduplicateLines(rawLines);

      // 檢查是否已在歷史快取中
      const songTitle = title || '自選日語歌詞';
      const cached = songHistory.find(
        (s) =>
          s.title === songTitle ||
          (s.lines.length === deduplicated.length &&
            s.lines[0]?.original === deduplicated[0]?.original)
      );
      if (cached && cached.lines.length > 0) {
        setCurrentSong(cached);
        setIsLoading(false);
        setStatusMessage('');
        return;
      }

      setStatusMessage(
        `去重完成！原歌詞共 ${rawLines.length} 行，精煉為 ${deduplicated.length} 句不重複歌詞。正在連線 AI 解析中...`
      );

      const analyzeRes = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lines: deduplicated,
          apiKey: apiKey || undefined,
        }),
      });

      const analyzeData = await analyzeRes.json();

      if (analyzeData.error) {
        throw new Error(analyzeData.error);
      }

      const lines: AnalyzedLine[] = analyzeData.analyzedLines || [];

      const newSong: SongData = {
        id: `manual-${Date.now()}`,
        videoId: videoId || currentSong.videoId || 'x8VYWazR5mE',
        title: songTitle,
        sourceType: 'manual',
        totalLines: rawLines.length,
        uniqueLines: deduplicated.length,
        lines,
        savedAt: Date.now(),
      };

      setCurrentSong(newSong);
      saveSongToHistory(newSong);

      if (analyzeData.warning === 'NO_API_KEY') {
        setErrorMessage(analyzeData.message);
      }
    } catch (err: unknown) {
      console.error(err);
      setErrorMessage(err instanceof Error ? err.message : '分析失敗，請檢查輸入內容');
    } finally {
      setIsLoading(false);
      setStatusMessage('');
    }
  };

  // 篩選與搜尋歌詞
  const displayLines = useMemo(() => {
    let result = currentSong.lines;

    if (showOnlyBookmarks) {
      result = result.filter((l) => bookmarkedIds.has(l.id));
    }

    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      result = result.filter(
        (l) =>
          l.original.toLowerCase().includes(q) ||
          l.romaji.toLowerCase().includes(q) ||
          l.translation.poetic.toLowerCase().includes(q) ||
          l.translation.literal.toLowerCase().includes(q) ||
          l.vocabulary.some(
            (v) =>
              v.word.toLowerCase().includes(q) ||
              v.reading.toLowerCase().includes(q) ||
              v.meaning.toLowerCase().includes(q)
          ) ||
          l.grammar.some(
            (g) => g.pattern.toLowerCase().includes(q) || g.explanation.toLowerCase().includes(q)
          )
      );
    }

    return result;
  }, [currentSong.lines, searchQuery, showOnlyBookmarks, bookmarkedIds]);

  // 全曲單字統計
  const totalVocabCount = useMemo(() => {
    const set = new Set<string>();
    currentSong.lines.forEach((l) => {
      l.vocabulary?.forEach((v) => set.add(v.word));
    });
    return set.size;
  }, [currentSong.lines]);

  // 根據左側 YouTube 播放秒數，即時匹配右側歌詞（實現聚焦同步）
  // 加入 0.45 秒預先聚焦補償 (Lead Time)，消除音訊播放與卡片滾動的延遲感，讓人聲開口前瞬間就已對齊卡片
  const activeLineId = useMemo(() => {
    if (currentPlaybackTime <= 0 || !currentSong.lines?.length) return null;

    const LEAD_TIME = 0.45; // 提早 0.45 秒聚焦
    const effectiveTime = currentPlaybackTime + LEAD_TIME;

    let matchedId: string | null = null;
    let closestTime = -1;

    for (const line of currentSong.lines) {
      for (const ts of line.timestamps || []) {
        if (effectiveTime >= ts && ts > closestTime) {
          closestTime = ts;
          matchedId = line.id;
        }
      }
    }
    return matchedId;
  }, [currentPlaybackTime, currentSong.lines]);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-indigo-500 selection:text-white">
      {/* Top Navbar */}
      <Header
        furiganaMode={furiganaMode}
        onFuriganaModeChange={setFuriganaMode}
        onOpenApiKeyModal={() => setIsApiKeyModalOpen(true)}
        onOpenVocabModal={() => setIsVocabModalOpen(true)}
        onOpenHistoryModal={() => setIsHistoryModalOpen(true)}
        historyCount={isMounted ? songHistory.length : 0}
        vocabCount={totalVocabCount}
        hasApiKey={isMounted ? Boolean(apiKey) : false}
      />

      {/* Main Container */}
      <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full">
        {/* Input & Demo Selector Card */}
        <YouTubeInput
          onAnalyzeUrl={handleAnalyzeUrl}
          onAnalyzeManual={handleAnalyzeManual}
          onSelectDemoSong={(song) => {
            setCurrentSong(song);
            saveSongToHistory(song);
            setErrorMessage('');
            setSearchQuery('');
          }}
          isLoading={isLoading}
          statusMessage={statusMessage}
          errorMessage={errorMessage}
        />

        {/* Content Layout: Left YouTube Player / Right Analyzed Cards */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Left Column: Fixed / Sticky Player & Overview Stats (5 cols on lg) */}
          <div className="lg:col-span-5 lg:sticky lg:top-20 lg:self-start space-y-4 max-h-[calc(100vh-6rem)] overflow-y-auto pr-1">
            {currentSong.videoId && (
              <YouTubePlayer
                videoId={currentSong.videoId}
                seekToTime={seekToTime}
                onSeekHandled={() => setSeekToTime(null)}
                onTimeUpdate={(sec) => setCurrentPlaybackTime(sec)}
                title={currentSong.title}
                artist={currentSong.artist}
              />
            )}

            {/* Song Analytics Summary Card */}
            <div className="bg-slate-900/70 border border-slate-800 rounded-2xl p-5 shadow-lg backdrop-blur-sm">
              <h3 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
                <Layers className="w-4 h-4 text-indigo-400" />
                <span>歌曲分析數據摘要</span>
              </h3>

              <div className="grid grid-cols-3 gap-3 mb-4">
                <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800 text-center">
                  <div className="text-xs text-slate-400 mb-0.5">總歌詞行數</div>
                  <div className="text-lg font-bold text-white font-mono">
                    {currentSong.totalLines || currentSong.lines.length}
                  </div>
                </div>
                <div className="p-3 rounded-xl bg-indigo-950/30 border border-indigo-800/40 text-center">
                  <div className="text-xs text-indigo-300 mb-0.5">不重複精煉</div>
                  <div className="text-lg font-bold text-indigo-400 font-mono">
                    {currentSong.uniqueLines || currentSong.lines.length}
                  </div>
                </div>
                <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800 text-center">
                  <div className="text-xs text-slate-400 mb-0.5">累計重點單字</div>
                  <div className="text-lg font-bold text-emerald-400 font-mono">
                    {totalVocabCount}
                  </div>
                </div>
              </div>

              {currentSong.totalLines > currentSong.uniqueLines && (
                <div className="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-xs text-rose-300 flex items-center gap-2">
                  <TrendingDown className="w-4 h-4 shrink-0 text-rose-400" />
                  <span>
                    已為您自動過濾{' '}
                    <strong>{currentSong.totalLines - currentSong.uniqueLines} 句重複副歌</strong>
                    ，省去冗餘閱讀時間！
                  </span>
                </div>
              )}
            </div>

            {/* Study Tips Box */}
            <div className="p-4 rounded-2xl bg-gradient-to-br from-indigo-950/40 via-slate-900 to-slate-950 border border-indigo-900/30 text-xs text-slate-300 space-y-2">
              <div className="flex items-center gap-2 text-indigo-300 font-semibold">
                <Sparkles className="w-4 h-4 text-amber-400" />
                <span>學習小技巧</span>
              </div>
              <ul className="list-disc list-inside space-y-1 text-slate-400 text-[11px] leading-relaxed">
                <li>
                  點擊歌詞卡片上的 <span className="text-indigo-300 font-mono">00:18</span>{' '}
                  時間按鈕，影片會立即跳轉同步播放。
                </li>
                <li>
                  左邊音樂播放時，右邊歌詞卡片會<strong>自動高亮並聚焦滑動</strong>（可點擊右側按鈕切換跟隨狀態）。
                </li>
                <li>
                  右上角可一鍵切換「顯示/隱藏假名」，適合自我測驗漢字讀音。
                </li>
                <li>
                  點擊單句卡片右上方的喇叭圖示，可聆聽標準日語發音。
                </li>
              </ul>
            </div>
          </div>

          {/* Right Column: Deduplicated Analyzed Sentences (7 cols on lg) */}
          <div className="lg:col-span-7 space-y-4">
            {/* Filter and Search Bar */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-slate-900/60 border border-slate-800/80 p-3 rounded-2xl">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="搜尋歌詞、假名、單字或文法句型..."
                  className="w-full pl-9 pr-3 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white placeholder-slate-500 outline-none focus:border-indigo-500 transition"
                />
              </div>

              <div className="flex items-center gap-2 shrink-0">
                {/* 自動聚焦跟隨切換按鈕 */}
                <button
                  type="button"
                  onClick={() => setAutoScrollFollow(!autoScrollFollow)}
                  title={autoScrollFollow ? '點擊暫停自動滾動聚焦' : '點擊開啟播放自動滾動聚焦'}
                  className={`text-xs px-3 py-1.5 rounded-xl border flex items-center gap-1.5 transition ${autoScrollFollow
                      ? 'bg-indigo-600/20 border-indigo-500/40 text-indigo-300 font-medium'
                      : 'bg-slate-950 border-slate-800 text-slate-500 hover:text-slate-300'
                    }`}
                >
                  <Compass className={`w-3.5 h-3.5 ${autoScrollFollow ? 'animate-spin' : ''}`} style={{ animationDuration: '8s' }} />
                  <span>{autoScrollFollow ? '聚焦跟隨中' : '跟隨已暫停'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => setShowOnlyBookmarks(!showOnlyBookmarks)}
                  className={`text-xs px-3 py-1.5 rounded-xl border flex items-center gap-1.5 transition ${showOnlyBookmarks
                      ? 'bg-amber-500/20 border-amber-500/40 text-amber-300 font-medium'
                      : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                    }`}
                >
                  <Bookmark className="w-3.5 h-3.5 fill-current" />
                  <span>已收藏 ({bookmarkedIds.size})</span>
                </button>
              </div>
            </div>

            {/* List of Sentences */}
            {displayLines.length === 0 ? (
              <div className="bg-slate-900/40 border border-dashed border-slate-800 rounded-2xl p-12 text-center space-y-2">
                <div className="w-12 h-12 rounded-full bg-slate-800 text-slate-400 flex items-center justify-center mx-auto">
                  <Search className="w-5 h-5" />
                </div>
                <h4 className="text-sm font-semibold text-white">查無符合條件的歌詞句子</h4>
                <p className="text-xs text-slate-500">
                  {showOnlyBookmarks ? '尚未有收藏的句子，點擊卡片右上角的書籤即可加入。' : '請嘗試更換搜尋關鍵字。'}
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {displayLines.map((line, idx) => (
                  <LyricCard
                    key={line.id || `line-${idx}`}
                    line={line}
                    index={idx}
                    furiganaMode={furiganaMode}
                    onJumpToTimestamp={(sec) => setSeekToTime(sec)}
                    isBookmarked={bookmarkedIds.has(line.id)}
                    onToggleBookmark={handleToggleBookmark}
                    isActive={line.id === activeLineId}
                    autoScroll={autoScrollFollow}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="w-full border-t border-slate-900 bg-slate-950/80 py-6 mt-12 text-center text-xs text-slate-500">
        <p>UtaStudy 歌学び — 次世代 YouTube 日語歌詞互動學習系統</p>
      </footer>

      {/* Modals */}
      <ApiKeyModal
        isOpen={isApiKeyModalOpen}
        onClose={() => setIsApiKeyModalOpen(false)}
        apiKey={apiKey}
        onSaveKey={handleSaveApiKey}
      />

      <VocabSummaryModal
        isOpen={isVocabModalOpen}
        onClose={() => setIsVocabModalOpen(false)}
        lines={currentSong.lines}
        songTitle={currentSong.title}
      />

      <HistoryModal
        isOpen={isHistoryModalOpen}
        onClose={() => setIsHistoryModalOpen(false)}
        history={songHistory}
        onSelectSong={(song) => {
          setCurrentSong(song);
          setErrorMessage('');
          setSearchQuery('');
        }}
        onDeleteSong={handleDeleteHistorySong}
        onClearHistory={handleClearAllHistory}
      />
    </div>
  );
}
