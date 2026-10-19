import React, { useState } from 'react';
import { X, Key, ShieldCheck, ExternalLink, Sparkles, AlertCircle } from 'lucide-react';

interface ApiKeyModalProps {
  isOpen: boolean;
  onClose: () => void;
  apiKey: string;
  onSaveKey: (key: string) => void;
}

export const ApiKeyModal: React.FC<ApiKeyModalProps> = ({
  isOpen,
  onClose,
  apiKey,
  onSaveKey,
}) => {
  const [inputVal, setInputVal] = useState(apiKey);
  const [statusMsg, setStatusMsg] = useState('');

  if (!isOpen) return null;

  const handleSave = () => {
    onSaveKey(inputVal.trim());
    setStatusMsg('儲存成功！已套用 Gemini API 金鑰');
    setTimeout(() => {
      setStatusMsg('');
      onClose();
    }, 900);
  };

  const handleClear = () => {
    setInputVal('');
    onSaveKey('');
    setStatusMsg('已清除金鑰');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md p-6 shadow-2xl relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
            <Key className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-white">Gemini API 設定</h3>
            <p className="text-xs text-slate-400">連接 Google AI 模型進行即時歌詞解析</p>
          </div>
        </div>

        <div className="space-y-4">
          <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800/80 text-xs text-slate-300 space-y-2">
            <div className="flex items-start gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              <span>
                <strong>金鑰安全存儲：</strong> 您的 API Key 僅會儲存在您自己的瀏覽器本地
                (localStorage)，絕不經由第三方伺服器洩漏。
              </span>
            </div>
            <div className="flex items-center gap-1.5 text-indigo-300">
              <Sparkles className="w-3.5 h-3.5 text-amber-400 shrink-0" />
              <a
                href="https://aistudio.google.com/app/apikey"
                target="_blank"
                rel="noreferrer"
                className="hover:underline flex items-center gap-1 font-medium"
              >
                前往 Google AI Studio 免費領取 API Key
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5">
              Google Gemini API Key
            </label>
            <input
              type="password"
              value={inputVal}
              onChange={(e) => setInputVal(e.target.value)}
              placeholder="AIzaSy..."
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 text-sm text-white placeholder-slate-600 outline-none transition font-mono"
            />
          </div>

          {statusMsg && (
            <p className="text-xs font-medium text-emerald-400 animate-pulse text-center">
              {statusMsg}
            </p>
          )}

          <div className="flex items-center justify-between pt-2">
            {apiKey && (
              <button
                type="button"
                onClick={handleClear}
                className="text-xs text-rose-400 hover:text-rose-300 hover:underline"
              >
                清除金鑰
              </button>
            )}
            <div className="flex items-center gap-2 ml-auto">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl text-xs text-slate-400 hover:text-white hover:bg-slate-800 transition"
              >
                取消
              </button>
              <button
                type="button"
                onClick={handleSave}
                className="px-5 py-2 rounded-xl text-xs font-medium bg-gradient-to-r from-indigo-600 to-rose-600 hover:from-indigo-500 hover:to-rose-500 text-white shadow-lg shadow-indigo-500/25 transition"
              >
                確認儲存
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
