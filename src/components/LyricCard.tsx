import React, { useState, useRef, useEffect } from 'react';
import { AnalyzedLine, FuriganaMode } from '@/types';
import { RubyText, VocabRubyText } from './RubyText';
import { GrammarAnnotatedSentence } from './GrammarAnnotatedSentence';
import { formatTimestamp } from '@/lib/youtube';
import {
  Play,
  Repeat,
  BookOpen,
  HelpCircle,
  Lightbulb,
  ChevronDown,
  ChevronUp,
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

const JLPT_COLORS: Record<string, string> = {
  N1: 'bg-rose-500/15 border-rose-500/30 text-rose-300',
  N2: 'bg-amber-500/15 border-amber-500/30 text-amber-300',
  N3: 'bg-sky-500/15 border-sky-500/30 text-sky-300',
  N4: 'bg-emerald-500/15 border-emerald-500/30 text-emerald-300',
  N5: 'bg-purple-500/15 border-purple-500/30 text-purple-300',
};

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
  const [isExpanded, setIsExpanded] = useState(true);
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
      {/* Top Header: Index, Occurrences & Action Buttons */}
      <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
        <div className="flex items-center gap-2">
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

          {/* 折疊按鈕 */}
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-white transition"
          >
            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Main Lyric Text with Furigana & In-Sentence Grammar/Vocab Annotations */}
      <div className="mb-3">
        <GrammarAnnotatedSentence
          furigana={line.furigana}
          original={line.original}
          grammar={line.grammar}
          vocabulary={line.vocabulary}
          mode={furiganaMode}
          activeGrammarIndex={activeGrammarIdx}
          activeVocabIndex={activeVocabIdx}
          onSelectGrammar={(gIdx) => {
            setActiveGrammarIdx(gIdx);
            setIsExpanded(true);
            setTimeout(() => {
              const el = document.getElementById(`gram-card-${line.id}-${gIdx}`);
              el?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
            }, 60);
          }}
          onSelectVocab={(vIdx) => {
            setActiveVocabIdx(vIdx);
            setIsExpanded(true);
            setTimeout(() => {
              const el = document.getElementById(`vocab-card-${line.id}-${vIdx}`);
              el?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
            }, 60);
          }}
          showAnnotations={showGrammarAnnotation}
        />
      </div>

      {/* Timestamps (Click to jump YouTube player) */}
      {line.timestamps && line.timestamps.length > 0 && onJumpToTimestamp && (
        <div className="flex flex-wrap items-center gap-1.5 mb-4">
          <span className="text-[11px] text-slate-400 font-medium mr-1">影片時間點：</span>
          {line.timestamps.map((sec, idx) => (
            <button
              key={`ts-${idx}`}
              onClick={() => onJumpToTimestamp(sec)}
              className="group/ts inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md bg-indigo-950/60 hover:bg-indigo-600 border border-indigo-800/60 hover:border-indigo-500 text-xs font-mono text-indigo-300 hover:text-white transition shadow-sm"
              title={`跳轉至 ${formatTimestamp(sec)}`}
            >
              <Play className="w-2.5 h-2.5 fill-current text-indigo-400 group-hover/ts:text-white" />
              <span>{formatTimestamp(sec)}</span>
            </button>
          ))}
        </div>
      )}

      {/* Translations */}
      <div className="space-y-1.5 p-3 rounded-xl bg-slate-950/60 border border-slate-800/80 mb-4">
        <div className="flex items-start gap-2 text-sm">
          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 shrink-0 mt-0.5">
            意譯
          </span>
          <span className="text-slate-100 font-medium leading-relaxed">
            {line.translation.poetic}
          </span>
        </div>
        {line.translation.literal && line.translation.literal !== line.translation.poetic && (
          <div className="flex items-start gap-2 text-xs text-slate-400">
            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 shrink-0 mt-0.5">
              直譯
            </span>
            <span className="leading-relaxed">{line.translation.literal}</span>
          </div>
        )}
      </div>

      {/* Detailed Analysis Breakdown (Expandable) */}
      {isExpanded && (
        <div className="space-y-3.5 pt-1 border-t border-slate-800/60 animate-fade-in">
          {/* Vocabulary Section */}
          {line.vocabulary && line.vocabulary.length > 0 && (
            <div>
              <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-300">
                  <BookOpen className="w-3.5 h-3.5 text-indigo-400" />
                  <span>重點單字拆解 ({line.vocabulary.length})</span>
                </div>
                <span className="text-[10px] text-slate-500">
                  💡 懸停上方句子中的單字，可即時查看單字解析浮卡
                </span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {line.vocabulary.map((vocab, vIdx) => {
                  const jlptStyle =
                    (vocab.jlpt && JLPT_COLORS[vocab.jlpt]) ||
                    'bg-slate-800 border-slate-700 text-slate-300';
                  const isVocabSelected = activeVocabIdx === vIdx;
                  return (
                    <div
                      key={`vocab-${vIdx}`}
                      id={`vocab-card-${line.id}-${vIdx}`}
                      onMouseEnter={() => setActiveVocabIdx(vIdx)}
                      onMouseLeave={() => setActiveVocabIdx(null)}
                      onClick={() => setActiveVocabIdx(isVocabSelected ? null : vIdx)}
                      className={`p-3 rounded-xl border transition-all cursor-pointer flex flex-col justify-between ${
                        isVocabSelected
                          ? 'bg-cyan-950/40 border-cyan-400 ring-2 ring-cyan-400/40 shadow-xl shadow-cyan-500/10'
                          : 'bg-slate-950/50 border border-slate-800/80 hover:border-cyan-500/40'
                      }`}
                    >
                      <div>
                        <div className="flex items-center justify-between gap-2 mb-1.5">
                          <div className="font-bold text-white text-base leading-relaxed">
                            <VocabRubyText word={vocab.word} reading={vocab.reading} />
                          </div>
                          {vocab.jlpt && (
                            <span
                              className={`text-[9px] font-bold px-1.5 py-0.5 rounded border shrink-0 ${jlptStyle}`}
                            >
                              {vocab.jlpt}
                            </span>
                          )}
                        </div>

                        {/* 詳細詞性、活用與原形標籤 */}
                        <div className="flex flex-wrap items-center gap-1.5 mb-2">
                          {vocab.pos && (
                            <span className="text-[10px] font-semibold text-cyan-300 bg-cyan-950/80 border border-cyan-800/70 px-2 py-0.5 rounded-md flex items-center gap-1 shadow-sm">
                              <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 shrink-0"></span>
                              {vocab.pos}
                            </span>
                          )}
                          {vocab.conjugation && vocab.conjugation !== '無活用' && (
                            <span className="text-[10px] font-medium text-amber-300 bg-amber-950/80 border border-amber-800/70 px-2 py-0.5 rounded-md">
                              活用：{vocab.conjugation}
                            </span>
                          )}
                          {vocab.baseForm && vocab.baseForm !== vocab.word && (
                            <span className="text-[10px] text-slate-300 bg-slate-900 border border-slate-700/80 px-2 py-0.5 rounded-md">
                              原形：<span className="text-white font-medium">{vocab.baseForm}</span>
                            </span>
                          )}
                        </div>

                        {/* 文法功能/接續特色 */}
                        {vocab.function && (
                          <div className="text-[11px] text-indigo-200/90 leading-relaxed mb-2 bg-indigo-950/40 p-2 rounded-lg border border-indigo-800/50">
                            <span className="font-semibold text-indigo-400 mr-1.5">文法機能：</span>
                            {vocab.function}
                          </div>
                        )}
                      </div>

                      <p className="text-xs text-slate-200 font-medium leading-relaxed mt-1">
                        {vocab.meaning}
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Grammar Points */}
          {line.grammar && line.grammar.length > 0 && (
            <div>
              <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-300">
                  <HelpCircle className="w-3.5 h-3.5 text-amber-400" />
                  <span>文法句型解析 ({line.grammar.length})</span>
                </div>
                <span className="text-[10px] text-slate-500">
                  💡 點擊或懸停文法卡片，句子對應字詞即時高亮
                </span>
              </div>
              <div className="space-y-2">
                {line.grammar.map((gram, gIdx) => {
                  const isSelected = activeGrammarIdx === gIdx;
                  return (
                    <div
                      key={`gram-${gIdx}`}
                      id={`gram-card-${line.id}-${gIdx}`}
                      onMouseEnter={() => setActiveGrammarIdx(gIdx)}
                      onMouseLeave={() => setActiveGrammarIdx(null)}
                      onClick={() => setActiveGrammarIdx(isSelected ? null : gIdx)}
                      className={`p-3 rounded-xl border transition-all cursor-pointer ${
                        isSelected
                          ? 'bg-amber-500/15 border-amber-400 ring-2 ring-amber-400/40 shadow-lg shadow-amber-500/10'
                          : 'bg-gradient-to-r from-amber-500/5 to-transparent border-amber-500/20 hover:border-amber-500/50'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <span className="inline-flex items-center gap-1.5 text-xs font-bold text-amber-300 px-2 py-0.5 rounded bg-amber-500/10 border border-amber-500/20">
                          <span className="w-1.5 h-1.5 rounded-full bg-amber-400"></span>
                          <span>標註 #{gIdx + 1}：{gram.pattern}</span>
                        </span>
                        {gram.target && (
                          <span className="text-[10px] text-amber-300/90 bg-amber-950/80 border border-amber-800/60 px-2 py-0.5 rounded-md font-mono">
                            句中位置：「{gram.target}」
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-300 leading-relaxed mt-1">
                        {gram.explanation}
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Nuance & Cultural Context */}
          {line.nuance && (
            <div className="flex items-start gap-2.5 p-3 rounded-xl bg-indigo-950/20 border border-indigo-900/40 text-xs">
              <Lightbulb className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" />
              <div>
                <span className="font-semibold text-indigo-300 block mb-0.5">
                  歌詞意境與語感補充
                </span>
                <p className="text-slate-300 leading-relaxed">{line.nuance}</p>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
