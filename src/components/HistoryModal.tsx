import React from 'react';
import { SongData } from '@/types';
import { X, History, Trash2, Play, Music, ExternalLink, Calendar } from 'lucide-react';

interface HistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  history: SongData[];
  onSelectSong: (song: SongData) => void;
  onDeleteSong: (songId: string) => void;
  onClearHistory: () => void;
}

export const HistoryModal: React.FC<HistoryModalProps> = ({
  isOpen,
  onClose,
  history,
  onSelectSong,
  onDeleteSong,
  onClearHistory,
}) => {
  if (!isOpen) return null;

  const formatDate = (timestamp?: number) => {
    if (!timestamp) return '剛才';
    const d = new Date(timestamp);
    return `${d.getMonth() + 1}/${d.getDate()} ${String(d.getHours()).padStart(2, '0')}:${String(
      d.getMinutes()
    ).padStart(2, '0')}`;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fade-in">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-2xl max-h-[85vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="p-5 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
              <History className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <span>已分析歌曲歷史庫</span>
                <span className="text-xs px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 font-mono">
                  共 {history.length} 首
                </span>
              </h3>
              <p className="text-xs text-slate-400">
                已自動快取至瀏覽器本地，隨時點選立即重溫，不需重複消耗 AI 額度！
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

        {/* Action bar */}
        {history.length > 0 && (
          <div className="px-5 py-2.5 bg-slate-950/40 border-b border-slate-800/80 flex items-center justify-between text-xs text-slate-400">
            <span>點擊任意歌曲即可立即載入學習</span>
            <button
              onClick={onClearHistory}
              className="text-rose-400 hover:text-rose-300 hover:underline flex items-center gap-1 text-[11px]"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>清空所有記錄</span>
            </button>
          </div>
        )}

        {/* Song List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2.5">
          {history.length === 0 ? (
            <div className="text-center py-16 text-slate-500 space-y-2">
              <History className="w-8 h-8 mx-auto text-slate-600" />
              <p className="text-sm font-medium text-slate-400">尚無歷史分析記錄</p>
              <p className="text-xs text-slate-600">
                每當您輸入 YouTube 網址或貼上歌詞完成分析後，系統會自動快取於此！
              </p>
            </div>
          ) : (
            history.map((song) => (
              <div
                key={song.id || song.title}
                className="group p-3.5 rounded-xl bg-slate-950/60 border border-slate-800 hover:border-indigo-500/60 transition flex items-center justify-between gap-3"
              >
                <div
                  onClick={() => {
                    onSelectSong(song);
                    onClose();
                  }}
                  className="flex-1 cursor-pointer min-w-0"
                >
                  <div className="flex items-center gap-2 mb-1">
                    <Music className="w-4 h-4 text-indigo-400 shrink-0" />
                    <h4 className="font-semibold text-sm text-white group-hover:text-indigo-300 transition truncate">
                      {song.title}
                    </h4>
                    {song.videoId && (
                      <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-800 text-slate-400 font-mono shrink-0">
                        YT: {song.videoId}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-3 text-xs text-slate-400 flex-wrap">
                    <span>
                      不重複歌詞：<strong className="text-indigo-400">{song.uniqueLines} 句</strong>
                    </span>
                    <span>
                      原歌詞：<strong>{song.totalLines} 行</strong>
                    </span>
                    <span className="text-slate-500 flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      {formatDate(song.savedAt)}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => {
                      onSelectSong(song);
                      onClose();
                    }}
                    className="px-3 py-1.5 rounded-lg bg-indigo-600/20 hover:bg-indigo-600 text-indigo-300 hover:text-white border border-indigo-500/30 text-xs font-medium transition flex items-center gap-1"
                  >
                    <Play className="w-3 h-3 fill-current" />
                    <span>載入</span>
                  </button>

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      if (song.id) onDeleteSong(song.id);
                    }}
                    title="刪除此記錄"
                    className="p-1.5 rounded-lg hover:bg-rose-500/20 text-slate-500 hover:text-rose-400 transition"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
