'use client';

import React, { useState, useMemo } from 'react';
import { GrammarItem, VocabItem, FuriganaMode } from '@/types';
import { RubyText, VocabRubyText } from './RubyText';
import { Sparkles, BookOpen } from 'lucide-react';

interface GrammarAnnotatedSentenceProps {
  furigana: string;
  original: string;
  grammar?: GrammarItem[];
  vocabulary?: VocabItem[];
  mode?: FuriganaMode;
  activeGrammarIndex?: number | null;
  activeVocabIndex?: number | null;
  onSelectGrammar?: (idx: number) => void;
  onSelectVocab?: (idx: number) => void;
  showAnnotations?: boolean;
}

interface CharMapping {
  fStart: number;
  fEnd: number;
}

const GRAMMAR_COLORS = [
  {
    border: 'border-amber-400/60',
    bg: 'bg-amber-500/15',
    hoverBg: 'hover:bg-amber-500/25',
    activeBg: 'bg-amber-500/30 ring-2 ring-amber-400/50 shadow-amber-500/20',
    badge: 'bg-amber-950/90 text-amber-300 border-amber-500/50',
    tooltipBorder: 'border-amber-500/60',
    titleText: 'text-amber-300',
    dot: 'bg-amber-400',
  },
  {
    border: 'border-sky-400/60',
    bg: 'bg-sky-500/15',
    hoverBg: 'hover:bg-sky-500/25',
    activeBg: 'bg-sky-500/30 ring-2 ring-sky-400/50 shadow-sky-500/20',
    badge: 'bg-sky-950/90 text-sky-300 border-sky-500/50',
    tooltipBorder: 'border-sky-500/60',
    titleText: 'text-sky-300',
    dot: 'bg-sky-400',
  },
  {
    border: 'border-emerald-400/60',
    bg: 'bg-emerald-500/15',
    hoverBg: 'hover:bg-emerald-500/25',
    activeBg: 'bg-emerald-500/30 ring-2 ring-emerald-400/50 shadow-emerald-500/20',
    badge: 'bg-emerald-950/90 text-emerald-300 border-emerald-500/50',
    tooltipBorder: 'border-emerald-500/60',
    titleText: 'text-emerald-300',
    dot: 'bg-emerald-400',
  },
  {
    border: 'border-purple-400/60',
    bg: 'bg-purple-500/15',
    hoverBg: 'hover:bg-purple-500/25',
    activeBg: 'bg-purple-500/30 ring-2 ring-purple-400/50 shadow-purple-500/20',
    badge: 'bg-purple-950/90 text-purple-300 border-purple-500/50',
    tooltipBorder: 'border-purple-500/60',
    titleText: 'text-purple-300',
    dot: 'bg-purple-400',
  },
];

const JLPT_BADGES: Record<string, string> = {
  N1: 'bg-rose-500/20 text-rose-300 border-rose-500/40',
  N2: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
  N3: 'bg-sky-500/20 text-sky-300 border-sky-500/40',
  N4: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
  N5: 'bg-purple-500/20 text-purple-300 border-purple-500/40',
};

/**
 * 建立 original 原文與 furigana 假名標籤字串的 1-to-1 映射表
 */
function buildOrigToFuriganaMap(original: string, furigana: string): CharMapping[] {
  const map: CharMapping[] = [];
  const rubyRegex = /([\u4E00-\u9FAF\u3400-\u4DBF々ヶ〆\u30A0-\u30FFA-Za-z0-9]+)\[([^\[\]]+)\]/g;
  let match;
  let lastIndex = 0;

  while ((match = rubyRegex.exec(furigana)) !== null) {
    const plainText = furigana.slice(lastIndex, match.index);
    for (let i = 0; i < plainText.length; i++) {
      map.push({ fStart: lastIndex + i, fEnd: lastIndex + i + 1 });
    }

    const kanji = match[1];
    const matchStart = match.index;
    const matchEnd = match.index + match[0].length;

    for (let k = 0; k < kanji.length; k++) {
      map.push({ fStart: matchStart, fEnd: matchEnd });
    }

    lastIndex = matchEnd;
  }

  const remaining = furigana.slice(lastIndex);
  for (let i = 0; i < remaining.length; i++) {
    map.push({ fStart: lastIndex + i, fEnd: lastIndex + i + 1 });
  }

  return map;
}

/**
 * 從文法 pattern 智慧解析在 original 中的對應文字
 */
function findTargetInOriginal(pattern: string, original: string): string | null {
  if (original.includes(pattern)) return pattern;

  const candidates: string[] = [];

  const quoteMatch = pattern.match(/「([^」]+)」/);
  if (quoteMatch) candidates.push(quoteMatch[1]);

  const parenMatches = pattern.match(/\(([^)]+)\)/g);
  if (parenMatches) {
    parenMatches.forEach((p) => {
      const clean = p.slice(1, -1).trim();
      clean.split(/[\s,、\/->]+/).forEach((w) => candidates.push(w));
    });
  }

  pattern
    .replace(/[〜~+]/g, ' ')
    .split(/\s+/)
    .forEach((part) => {
      const cleaned = part.replace(/[()（）「」]/g, '').trim();
      const metaWords = [
        '動詞', '連體形', '連用形', '未然形', '名詞', '時間名詞', '形容詞', '疑問詞',
        '格助詞', '副助詞', '助動詞', '手段', '原因', 'て形', 'ます形去掉ます', '口語常用',
      ];
      if (cleaned && !metaWords.includes(cleaned)) {
        candidates.push(cleaned);
      }
    });

  const sorted = candidates
    .filter((c) => c.length > 0 && original.includes(c))
    .sort((a, b) => b.length - a.length);

  return sorted[0] || null;
}

/**
 * 尋找單字在 original 句子中的起始位置
 */
function findVocabInOriginal(vocab: VocabItem, original: string): { start: number; length: number } | null {
  // 1. 直接全字匹配
  if (original.includes(vocab.word)) {
    return { start: original.indexOf(vocab.word), length: vocab.word.length };
  }
  // 2. 如果單字是漢字+送假名（如 分かる -> 分かった），匹配漢字部
  const kanjiMatch = vocab.word.match(/^([\u4E00-\u9FAF]+)/);
  if (kanjiMatch && original.includes(kanjiMatch[1])) {
    const start = original.indexOf(kanjiMatch[1]);
    // 評估在句子中的長度
    let len = kanjiMatch[1].length;
    while (start + len < original.length && len < vocab.word.length + 1) {
      const nextChar = original[start + len];
      if (/[\u3040-\u309F]/.test(nextChar)) {
        len++;
      } else {
        break;
      }
    }
    return { start, length: len };
  }
  return null;
}

export const GrammarAnnotatedSentence: React.FC<GrammarAnnotatedSentenceProps> = ({
  furigana,
  original,
  grammar = [],
  vocabulary = [],
  mode = 'show',
  activeGrammarIndex = null,
  activeVocabIndex = null,
  onSelectGrammar,
  onSelectVocab,
  showAnnotations = true,
}) => {
  const [hoveredGrammarIdx, setHoveredGrammarIdx] = useState<number | null>(null);
  const [hoveredVocabIdx, setHoveredVocabIdx] = useState<number | null>(null);

  // 解析所有文法點與單字在句子中的位置區間
  const { segments, grammarPills } = useMemo(() => {
    const map = buildOrigToFuriganaMap(original, furigana);
    if (map.length === 0) {
      return {
        segments: [{ type: 'text' as const, fText: furigana, oText: original }],
        grammarPills: [],
      };
    }

    interface UnifiedSpan {
      type: 'grammar' | 'vocab';
      index: number;
      origStart: number;
      origEnd: number;
      targetText: string;
      grammarItem?: GrammarItem;
      vocabItem?: VocabItem;
    }

    const rawSpans: UnifiedSpan[] = [];

    // 1. 搜集文法區間
    if (showAnnotations) {
      grammar.forEach((item, gIdx) => {
        const target = item.target || findTargetInOriginal(item.pattern, original);
        if (target && original.includes(target)) {
          const start = original.indexOf(target);
          const end = start + target.length;
          rawSpans.push({
            type: 'grammar',
            index: gIdx,
            origStart: start,
            origEnd: end,
            targetText: target,
            grammarItem: item,
          });
        }
      });
    }

    // 2. 搜集單字區間
    vocabulary.forEach((item, vIdx) => {
      const loc = findVocabInOriginal(item, original);
      if (loc) {
        rawSpans.push({
          type: 'vocab',
          index: vIdx,
          origStart: loc.start,
          origEnd: loc.start + loc.length,
          targetText: original.slice(loc.start, loc.start + loc.length),
          vocabItem: item,
        });
      }
    });

    // 依起始位置排序
    rawSpans.sort((a, b) => a.origStart - b.origStart);

    // 平滑裁切處理重疊區間
    const nonOverlapping: UnifiedSpan[] = [];
    let lastOrigEnd = 0;

    for (const span of rawSpans) {
      let start = span.origStart;
      let end = span.origEnd;

      if (start < lastOrigEnd) {
        // 若重疊，將起始點截齊至前一區間結束處
        if (end > lastOrigEnd + 1) {
          start = lastOrigEnd;
        } else {
          continue; // 跨度過小則跳過
        }
      }

      nonOverlapping.push({
        ...span,
        origStart: start,
        origEnd: end,
        targetText: original.slice(start, end),
      });

      lastOrigEnd = end;
    }

    if (nonOverlapping.length === 0) {
      return {
        segments: [{ type: 'text' as const, fText: furigana, oText: original }],
        grammarPills: [],
      };
    }

    // 3. 切割 furigana
    type Segment =
      | { type: 'text'; fText: string; oText: string }
      | {
          type: 'grammar';
          gramIndex: number;
          item: GrammarItem;
          fText: string;
          oText: string;
          targetText: string;
        }
      | {
          type: 'vocab';
          vocabIndex: number;
          item: VocabItem;
          fText: string;
          oText: string;
          targetText: string;
        };

    const resultSegments: Segment[] = [];
    let currentFIndex = 0;
    let currentOIndex = 0;

    for (const span of nonOverlapping) {
      const fStart = map[span.origStart]?.fStart ?? 0;
      const fEnd = map[span.origEnd - 1]?.fEnd ?? furigana.length;

      // 前方未標註之普通文字
      if (fStart > currentFIndex) {
        resultSegments.push({
          type: 'text',
          fText: furigana.slice(currentFIndex, fStart),
          oText: original.slice(currentOIndex, span.origStart),
        });
      }

      if (span.type === 'grammar') {
        resultSegments.push({
          type: 'grammar',
          gramIndex: span.index,
          item: span.grammarItem!,
          fText: furigana.slice(fStart, fEnd),
          oText: original.slice(span.origStart, span.origEnd),
          targetText: span.targetText,
        });
      } else {
        resultSegments.push({
          type: 'vocab',
          vocabIndex: span.index,
          item: span.vocabItem!,
          fText: furigana.slice(fStart, fEnd),
          oText: original.slice(span.origStart, span.origEnd),
          targetText: span.targetText,
        });
      }

      currentFIndex = fEnd;
      currentOIndex = span.origEnd;
    }

    // 句尾剩餘文字
    if (currentFIndex < furigana.length) {
      resultSegments.push({
        type: 'text',
        fText: furigana.slice(currentFIndex),
        oText: original.slice(currentOIndex),
      });
    }

    // 提取文法導覽 pills
    const pills = nonOverlapping
      .filter((s) => s.type === 'grammar')
      .map((s) => ({
        gramIndex: s.index,
        targetText: s.targetText,
        pattern: s.grammarItem!.pattern,
        explanation: s.grammarItem!.explanation,
      }));

    return { segments: resultSegments, grammarPills: pills };
  }, [furigana, original, grammar, vocabulary, showAnnotations]);

  return (
    <div className="space-y-2">
      {/* 主歌詞句子（附帶單字與文法即時 Hover 卡片） */}
      <div className="text-xl sm:text-2xl font-bold tracking-wide text-white leading-relaxed flex flex-wrap items-baseline gap-y-2">
        {segments.map((seg, idx) => {
          if (seg.type === 'text') {
            return (
              <RubyText
                key={`seg-text-${idx}`}
                text={seg.fText}
                original={seg.oText}
                mode={mode}
              />
            );
          }

          // A. 文法標註區段
          if (seg.type === 'grammar') {
            const color = GRAMMAR_COLORS[seg.gramIndex % GRAMMAR_COLORS.length];
            const isActive =
              activeGrammarIndex === seg.gramIndex || hoveredGrammarIdx === seg.gramIndex;

            return (
              <span
                key={`seg-gram-${idx}`}
                onClick={() => onSelectGrammar?.(seg.gramIndex)}
                onMouseEnter={() => setHoveredGrammarIdx(seg.gramIndex)}
                onMouseLeave={() => setHoveredGrammarIdx(null)}
                className={`relative group/gram inline-flex items-baseline mx-0.5 px-1.5 py-0.5 rounded-xl border transition-all duration-200 cursor-pointer shadow-sm select-none ${
                  color.border
                } ${isActive ? color.activeBg : `${color.bg} ${color.hoverBg}`}`}
              >
                {/* 假名漢字排版 */}
                <RubyText text={seg.fText} original={seg.oText} mode={mode} />

                {/* 文法序號角標 */}
                <span
                  className={`inline-flex items-center gap-0.5 ml-1 px-1 py-0.2 rounded text-[10px] font-bold font-mono align-top border shadow-sm ${color.badge}`}
                >
                  <span>{`#${seg.gramIndex + 1}`}</span>
                  <span className="hidden sm:inline text-[9px] font-sans">文法</span>
                </span>

                {/* 懸停文法 Tooltip 浮動卡片 */}
                {hoveredGrammarIdx === seg.gramIndex && (
                  <span className="absolute left-1/2 -translate-x-1/2 bottom-full mb-2.5 w-72 max-w-[90vw] p-3 rounded-2xl bg-slate-900/98 backdrop-blur-md border border-slate-700 shadow-2xl z-50 text-left pointer-events-none animate-fade-in ring-1 ring-white/10">
                    <span className="flex items-center gap-1.5 text-xs font-bold mb-1 block">
                      <span className={`w-2 h-2 rounded-full ${color.dot} shrink-0`}></span>
                      <span className={color.titleText}>
                        文法標註 #{seg.gramIndex + 1}：{seg.item.pattern}
                      </span>
                    </span>
                    <span className="text-xs text-slate-300 leading-relaxed font-normal block mb-1.5">
                      {seg.item.explanation}
                    </span>
                    <span className="text-[10px] text-indigo-400 font-semibold block pt-1 border-t border-slate-800">
                      👇 點擊可直接定位下方完整文法剖析
                    </span>
                    <span className="absolute top-full left-1/2 -translate-x-1/2 -mt-px border-4 border-transparent border-t-slate-900 block"></span>
                  </span>
                )}
              </span>
            );
          }

          // B. 單字標註區段 (Hover 出現單字小卡片)
          const vocab = seg.item;
          const isVocabActive =
            activeVocabIndex === seg.vocabIndex || hoveredVocabIdx === seg.vocabIndex;
          const jlptStyle = (vocab.jlpt && JLPT_BADGES[vocab.jlpt]) || 'bg-slate-800 text-slate-300 border-slate-700';

          return (
            <span
              key={`seg-vocab-${idx}`}
              onClick={() => onSelectVocab?.(seg.vocabIndex)}
              onMouseEnter={() => setHoveredVocabIdx(seg.vocabIndex)}
              onMouseLeave={() => setHoveredVocabIdx(null)}
              className={`relative group/vocab inline-flex items-baseline mx-0.5 px-1 py-0.5 rounded-lg border-b-2 transition-all duration-200 cursor-pointer select-none ${
                isVocabActive
                  ? 'border-cyan-400 bg-cyan-500/20 text-cyan-100 ring-2 ring-cyan-400/40 shadow-lg shadow-cyan-500/20'
                  : 'border-cyan-500/40 hover:border-cyan-400 hover:bg-cyan-500/10 text-white'
              }`}
            >
              <RubyText text={seg.fText} original={seg.oText} mode={mode} />

              {/* 懸停單字 Hover 卡片 */}
              {hoveredVocabIdx === seg.vocabIndex && (
                <span className="absolute left-1/2 -translate-x-1/2 bottom-full mb-2.5 w-72 max-w-[90vw] p-3 rounded-2xl bg-slate-900/98 backdrop-blur-xl border border-cyan-500/50 shadow-2xl z-50 text-left pointer-events-none animate-fade-in ring-1 ring-cyan-500/30">
                  {/* 單字讀音與 JLPT 等級 */}
                  <span className="flex items-center justify-between gap-2 mb-1.5 pb-1 border-b border-slate-800/80 block">
                    <span className="font-bold text-white text-base block">
                      <VocabRubyText word={vocab.word} reading={vocab.reading} />
                    </span>
                    {vocab.jlpt && (
                      <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded border ${jlptStyle}`}>
                        {vocab.jlpt}
                      </span>
                    )}
                  </span>

                  {/* 詞性、活用、原形標籤 */}
                  <span className="flex flex-wrap items-center gap-1 mb-1.5 block">
                    {vocab.pos && (
                      <span className="text-[10px] font-semibold text-cyan-300 bg-cyan-950/80 border border-cyan-800/70 px-1.5 py-0.2 rounded">
                        {vocab.pos}
                      </span>
                    )}
                    {vocab.conjugation && vocab.conjugation !== '無活用' && (
                      <span className="text-[10px] font-medium text-amber-300 bg-amber-950/80 border border-amber-800/70 px-1.5 py-0.2 rounded">
                        活用：{vocab.conjugation}
                      </span>
                    )}
                    {vocab.baseForm && vocab.baseForm !== vocab.word && (
                      <span className="text-[10px] text-slate-300 bg-slate-900 border border-slate-800 px-1.5 py-0.2 rounded">
                        原形：<span className="text-white font-medium">{vocab.baseForm}</span>
                      </span>
                    )}
                  </span>

                  {/* 中文釋義 */}
                  <span className="text-xs text-slate-200 font-medium leading-relaxed block mb-1">
                    {vocab.meaning}
                  </span>

                  {/* 句中文法機能 */}
                  {vocab.function && (
                    <span className="text-[10px] text-indigo-200 bg-indigo-950/50 p-1.5 rounded border border-indigo-900/50 block mb-1">
                      <span className="text-indigo-400 font-semibold mr-1">用法：</span>
                      {vocab.function}
                    </span>
                  )}

                  <span className="text-[10px] text-cyan-400 font-medium block pt-1 border-t border-slate-800">
                    👇 點擊定位下方重點單字詳情
                  </span>

                  {/* 下方小箭頭 */}
                  <span className="absolute top-full left-1/2 -translate-x-1/2 -mt-px border-4 border-transparent border-t-slate-900 block"></span>
                </span>
              )}
            </span>
          );
        })}
      </div>

      {/* 句子下方：句中文法對照快捷標籤 (Quick Pills) */}
      {grammarPills.length > 0 && showAnnotations && (
        <div className="flex flex-wrap items-center gap-1.5 pt-1">
          <span className="text-[11px] font-medium text-slate-400 flex items-center gap-1 mr-0.5">
            <Sparkles className="w-3 h-3 text-amber-400" />
            <span>句中文法標註：</span>
          </span>
          {grammarPills.map((pill) => {
            const color = GRAMMAR_COLORS[pill.gramIndex % GRAMMAR_COLORS.length];
            const isActive =
              activeGrammarIndex === pill.gramIndex || hoveredGrammarIdx === pill.gramIndex;
            return (
              <button
                key={`pill-${pill.gramIndex}`}
                type="button"
                onClick={() => onSelectGrammar?.(pill.gramIndex)}
                onMouseEnter={() => setHoveredGrammarIdx(pill.gramIndex)}
                onMouseLeave={() => setHoveredGrammarIdx(null)}
                className={`text-[11px] px-2.5 py-0.5 rounded-full border transition-all flex items-center gap-1 shadow-sm ${
                  isActive
                    ? `${color.activeBg} ${color.border} font-bold text-white`
                    : `bg-slate-950/70 ${color.border} text-slate-300 hover:text-white hover:${color.bg}`
                }`}
                title={pill.explanation}
              >
                <span className={`w-1.5 h-1.5 rounded-full ${color.dot}`}></span>
                <span className="font-mono text-[10px] font-bold">#{pill.gramIndex + 1}</span>
                <span className="font-medium">{pill.targetText}</span>
                <span className="text-slate-500 font-normal hidden sm:inline">
                  ({pill.pattern.split('+')[0].trim().slice(0, 8)})
                </span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};
