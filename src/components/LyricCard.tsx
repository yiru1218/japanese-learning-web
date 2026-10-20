import React, { useState, useRef, useEffect } from 'react';
import { AnalyzedLine, FuriganaMode } from '@/types';
import { GrammarAnnotatedSentence } from './GrammarAnnotatedSentence';
import { formatTimestamp } from '@/lib/youtube';
import {
  Play,
  Repeat,
  Lightbulb,
  Bookmark,
  Volume2,
  Music,
  Sparkles,
} from 'lucide-react';

interface LyricCardProps {
  line: AnalyzedLine;
  index: number;
  furiganaMode: FuriganaMode;
  onJumpToTimestamp?: (seconds: number) => void;
  isBookmarked?: boolean;
  onToggleBookmark?: (lineId: string) => void;
  isActive?: boolean;
  autoScroll?: boolean;
}

export const LyricCard: React.FC<LyricCardProps> = ({
  line,
  index,
  furiganaMode,
  onJumpToTimestamp,
  isBookmarked = false,
  onToggleBookmark,
  isActive = false,
  autoScroll = true,
}) => {
  const [activeGrammarIdx, setActiveGrammarIdx] = useState<number | null>(null);
  const [activeVocabIdx, setActiveVocabIdx] = useState<number | null>(null);
  const [showGrammarAnnotation, setShowGrammarAnnotation] = useState(true);
  const cardRef = useRef<HTMLDivElement>(null);

  // 當音樂播放進度對應到此歌詞時，自動將卡片平滑滾動至視野中心
  useEffect(() => {
    if (isActive && autoScroll && cardRef.current) {
      cardRef.current.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
      });
    }
  }, [isActive, autoScroll]);

  // 語音朗讀 (使用瀏覽器原生 Web Speech API 日語朗讀)
  const handleSpeak = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(line.original);
      utterance.lang = 'ja-JP';
      utterance.rate = 0.9;
      window.speechSynthesis.speak(utterance);
    }
  };

  return (
    <div
      ref={cardRef}
      className={`transition-all duration-300 rounded-2xl p-5 backdrop-blur-sm ${
        isActive
          ? 'bg-slate-900 border-2 border-indigo-500 shadow-2xl shadow-indigo-500/25 ring-2 ring-indigo-500/40'
          : 'bg-slate-900/80 border border-slate-800 hover:border-slate-700/80 shadow-lg'
      }`}
    >
      {/* Top Header: Index, Occurrences, Timestamps & Action Buttons */}
      <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
        <div className="flex flex-wrap items-center gap-2">
          <span
            className={`text-xs font-mono font-bold px-2 py-0.5 rounded-md border transition ${
              isActive
                ? 'bg-indigo-600 text-white border-indigo-400'
                : 'bg-slate-800 text-indigo-400 border-slate-700/60'
            }`}
          >
            #{String(index + 1).padStart(2, '0')}
          </span>

          {isActive && (
            <span className="flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-indigo-500/20 border border-indigo-400 text-indigo-300 animate-pulse">
              <Music className="w-3 h-3 text-indigo-400" />
              正在播放 ♪
            </span>
          )}

          {line.occurrences > 1 ? (
            <span className="flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full bg-rose-500/10 border border-rose-500/30 text-rose-300">
              <Repeat className="w-3 h-3" />
              重複出現 {line.occurrences} 次
            </span>
          ) : (
            <span className="text-[11px] text-slate-500 font-mono">出現 1 次</span>
          )}

          {/* 影片時間點 (置於卡片頂端狀態欄，點擊即可跳轉播放) */}
          {line.timestamps && line.timestamps.length > 0 && onJumpToTimestamp && (
            <div className="flex items-center gap-1.5 ml-0.5">
              {line.timestamps.map((sec, idx) => (
                <button
                  key={`ts-${idx}`}
                  onClick={() => onJumpToTimestamp(sec)}
                  className="group/ts inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md bg-indigo-950/70 hover:bg-indigo-600 border border-indigo-800/60 hover:border-indigo-400 text-xs font-mono text-indigo-300 hover:text-white transition shadow-sm"
                  title={`跳轉至 ${formatTimestamp(sec)}`}
                >
                  <Play className="w-2.5 h-2.5 fill-current text-indigo-400 group-hover/ts:text-white" />
                  <span>{formatTimestamp(sec)}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="flex items-center gap-1.5">
          {/* TTS 發音按鈕 */}
          <button
            onClick={handleSpeak}
            title="日語真人語音朗讀"
            className="p-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-indigo-300 transition"
          >
            <Volume2 className="w-4 h-4" />
          </button>

          {/* 收藏切換 */}
          {onToggleBookmark && (
            <button
              onClick={() => onToggleBookmark(line.id)}
              title={isBookmarked ? '取消收藏' : '加入學習清單'}
              className={`p-1.5 rounded-lg transition ${
                isBookmarked
                  ? 'bg-amber-500/20 text-amber-400 border border-amber-500/40'
                : 'bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-white'
              }`}
            >
              <Bookmark className="w-4 h-4 fill-current" />
            </button>
          )}

          {/* 句中文法標註切換 */}
          {line.grammar && line.grammar.length > 0 && (
            <button
              onClick={() => setShowGrammarAnnotation(!showGrammarAnnotation)}
              title={showGrammarAnnotation ? '點擊隱藏句中文法標註' : '點擊顯示句中文法標註'}
              className={`px-2 py-1 rounded-lg text-xs font-medium transition flex items-center gap-1 ${
                showGrammarAnnotation
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                  : 'bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-white border border-slate-700/60'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              <span className="hidden sm:inline">句中文法</span>
            </button>
          )}
        </div>
      </div>

      {/* Main Lyric Text with Furigana & In-Sentence Grammar/Vocab Annotations */}
      <div>
        <GrammarAnnotatedSentence
          furigana={line.furigana}
          original={line.original}
          grammar={line.grammar}
          vocabulary={line.vocabulary}
          mode={furiganaMode}
          activeGrammarIndex={activeGrammarIdx}
          activeVocabIndex={activeVocabIdx}
          onSelectGrammar={(gIdx) => {
            setActiveGrammarIdx((prev) => (prev === gIdx ? null : gIdx));
          }}
          onSelectVocab={(vIdx) => {
            setActiveVocabIdx((prev) => (prev === vIdx ? null : vIdx));
          }}
          showAnnotations={showGrammarAnnotation}
          translationSlot={
            <div className="pt-2.5 border-t border-slate-800/70 space-y-1.5">
              {/* 主要意譯：自然流暢的中文歌詞，緊貼日文正下方 */}
              <div className="flex items-start gap-2.5">
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 shrink-0 mt-0.5 select-none">
                  意譯
                </span>
                <span className="text-base sm:text-lg text-slate-100 font-medium leading-relaxed tracking-wide">
                  {line.translation.poetic}
                </span>
              </div>

              {/* 直譯 (若與意譯不同) */}
              {line.translation.literal && line.translation.literal !== line.translation.poetic && (
                <div className="flex items-start gap-2.5 text-xs text-slate-400 pl-0.5">
                  <span className="text-[10px] font-medium px-1.5 py-0.2 rounded bg-slate-800 text-slate-400 border border-slate-700/60 shrink-0 mt-0.5 select-none">
                    直譯
                  </span>
                  <span className="leading-relaxed text-slate-400">
                    {line.translation.literal}
                  </span>
                </div>
              )}
            </div>
          }
        />
      </div>

      {/* 歌詞意境補充 (深層文化隱喻與語感細節) */}
      {line.nuance && (
        <div className="mt-2.5 p-3 rounded-xl bg-slate-950/60 border border-slate-800/80 flex items-start gap-2 text-xs text-indigo-300">
          <Lightbulb className="w-3.5 h-3.5 text-indigo-400 shrink-0 mt-0.5" />
          <div className="leading-relaxed">
            <span className="font-semibold text-indigo-300 mr-1.5">歌詞意境補充：</span>
            <span className="text-slate-300">{line.nuance}</span>
          </div>
        </div>
      )}
    </div>
  );
};
