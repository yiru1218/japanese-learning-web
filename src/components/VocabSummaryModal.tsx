import React, { useState, useMemo } from 'react';
import { AnalyzedLine, VocabItem } from '@/types';
import { VocabRubyText } from './RubyText';
import { X, BookOpen, Copy, Check, Download, Filter } from 'lucide-react';

interface VocabSummaryModalProps {
  isOpen: boolean;
  onClose: () => void;
  lines: AnalyzedLine[];
  songTitle?: string;
}

export const VocabSummaryModal: React.FC<VocabSummaryModalProps> = ({
  isOpen,
  onClose,
  lines,
  songTitle,
}) => {
  const [selectedJlpt, setSelectedJlpt] = useState<string>('ALL');
  const [copied, setCopied] = useState(false);

  // 整理所有不重複單字
  const allVocab = useMemo(() => {
    const map = new Map<string, VocabItem & { count: number; sentence: string }>();

    for (const line of lines) {
      for (const v of line.vocabulary || []) {
        const key = `${v.word}_${v.reading}`;
        if (map.has(key)) {
          const item = map.get(key)!;
          item.count += 1;
        } else {
          map.set(key, {
            ...v,
            count: 1,
            sentence: line.original,
          });
        }
      }
    }

    return Array.from(map.values());
  }, [lines]);

  const filteredVocab = useMemo(() => {
    if (selectedJlpt === 'ALL') return allVocab;
    return allVocab.filter((v) => v.jlpt === selectedJlpt);
  }, [allVocab, selectedJlpt]);

  if (!isOpen) return null;

  // 匯出為 Anki 格式 (單字\t讀音\t詞性\t釋義\t原句)
  const handleExportAnki = () => {
    const header = '單字\t讀音\t詞性\t中文釋義\tJLPT等級\t例句\n';
    const rows = filteredVocab
      .map(
        (v) =>
          `${v.word}\t${v.reading}\t${v.pos || ''}\t${v.meaning}\t${v.jlpt || ''}\t${v.sentence}`
      )
      .join('\n');

    navigator.clipboard.writeText(header + rows);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fade-in">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-3xl max-h-[85vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Modal Header */}
        <div className="p-5 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <span>全曲單字庫總覽</span>
                <span className="text-xs px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 font-mono">
                  共 {allVocab.length} 個生詞
                </span>
              </h3>
              <p className="text-xs text-slate-400">
                {songTitle ? `《${songTitle}》` : '目前歌曲'} 彙整之重點日語單字
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Filter Controls & Export */}
        <div className="p-4 border-b border-slate-800/80 bg-slate-900/80 flex flex-wrap items-center justify-between gap-3">
          {/* JLPT Filters */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-xs text-slate-400 mr-1 flex items-center gap-1">
              <Filter className="w-3 h-3" />
              等級：
            </span>
            {['ALL', 'N5', 'N4', 'N3', 'N2', 'N1'].map((lvl) => (
              <button
                key={lvl}
                onClick={() => setSelectedJlpt(lvl)}
                className={`text-xs px-2.5 py-1 rounded-lg font-medium transition ${
                  selectedJlpt === lvl
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700'
                }`}
              >
                {lvl === 'ALL' ? '全部' : lvl}
              </button>
            ))}
          </div>

          {/* Anki Export Button */}
          <button
            onClick={handleExportAnki}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-medium shadow-md shadow-emerald-600/20 transition"
          >
            {copied ? (
              <>
                <Check className="w-3.5 h-3.5" />
                <span>已複製 Anki 格式！</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5" />
                <span>一鍵複製為 Anki / CSV</span>
              </>
            )}
          </button>
        </div>

        {/* Vocab Table / List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          {filteredVocab.length === 0 ? (
            <div className="text-center py-12 text-slate-500 text-xs">
              此篩選條件下沒有對應的單字。
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {filteredVocab.map((item, idx) => (
                <div
                  key={`sum-${idx}`}
                  className="p-3 rounded-xl bg-slate-950/60 border border-slate-800/80 hover:border-slate-700 transition flex flex-col justify-between"
                >
                  <div className="flex items-start justify-between gap-2 mb-1.5">
                    <div>
                      <div className="font-bold text-white text-base leading-relaxed">
                        <VocabRubyText word={item.word} reading={item.reading} />
                      </div>
                      <div className="flex flex-wrap items-center gap-1.5 mt-1">
                        {item.pos && (
                          <span className="text-[10px] font-medium text-cyan-300 bg-cyan-950/70 border border-cyan-800/60 px-1.5 py-0.5 rounded">
                            {item.pos}
                          </span>
                        )}
                        {item.conjugation && item.conjugation !== '無活用' && (
                          <span className="text-[10px] text-amber-300 bg-amber-950/70 border border-amber-800/60 px-1.5 py-0.5 rounded">
                            活用：{item.conjugation}
                          </span>
                        )}
                        {item.baseForm && item.baseForm !== item.word && (
                          <span className="text-[10px] text-slate-400 bg-slate-900 border border-slate-800 px-1.5 py-0.5 rounded">
                            原形：<span className="text-slate-200">{item.baseForm}</span>
                          </span>
                        )}
                      </div>
                    </div>
                    {item.jlpt && (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 shrink-0">
                        {item.jlpt}
                      </span>
                    )}
                  </div>
                  {item.function && (
                    <div className="text-[10px] text-indigo-300 bg-indigo-950/30 px-2 py-1 rounded border border-indigo-900/40 my-1">
                      <span className="text-indigo-400 font-semibold mr-1">用法：</span>
                      {item.function}
                    </div>
                  )}
                  <p className="text-xs text-slate-200 font-medium mb-1.5">{item.meaning}</p>
                  <div className="text-[11px] text-slate-400 truncate border-t border-slate-900 pt-1">
                    例句：{item.sentence}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
