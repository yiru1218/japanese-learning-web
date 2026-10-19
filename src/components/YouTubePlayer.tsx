'use client';

import React, { useRef, useEffect, useState } from 'react';
import { ExternalLink, Radio, Volume2 } from 'lucide-react';

interface YouTubePlayerProps {
  videoId: string;
  currentTime?: number;
  seekToTime?: number | null;
  onSeekHandled?: () => void;
  onTimeUpdate?: (seconds: number) => void;
  title?: string;
  artist?: string;
}

declare global {
  interface Window {
    onYouTubeIframeAPIReady?: () => void;
    YT?: any;
  }
}

export const YouTubePlayer: React.FC<YouTubePlayerProps> = ({
  videoId,
  seekToTime,
  onSeekHandled,
  onTimeUpdate,
  title,
  artist,
}) => {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const playerRef = useRef<any>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentSec, setCurrentSec] = useState(0);

  // 1. 載入 YouTube IFrame API Script (確保能精準獲取當前播放進度)
  useEffect(() => {
    let isCancelled = false;

    const initYT = () => {
      if (isCancelled || !iframeRef.current || !window.YT || !window.YT.Player) return;
      try {
        playerRef.current = new window.YT.Player(iframeRef.current, {
          events: {
            onStateChange: (event: any) => {
              // 1 = PLAYING, 2 = PAUSED, 0 = ENDED
              if (event.data === 1) {
                setIsPlaying(true);
                if (intervalRef.current) clearInterval(intervalRef.current);
                intervalRef.current = setInterval(() => {
                  if (playerRef.current && typeof playerRef.current.getCurrentTime === 'function') {
                    const sec = playerRef.current.getCurrentTime();
                    setCurrentSec(sec);
                    onTimeUpdate?.(sec);
                  }
                }, 250);
              } else {
                setIsPlaying(false);
                if (intervalRef.current) {
                  clearInterval(intervalRef.current);
                  intervalRef.current = null;
                }
                if (playerRef.current && typeof playerRef.current.getCurrentTime === 'function') {
                  const sec = playerRef.current.getCurrentTime();
                  setCurrentSec(sec);
                  onTimeUpdate?.(sec);
                }
              }
            },
          },
        });
      } catch (err) {
        console.warn('YouTube Player initialization fallback:', err);
      }
    };

    if (window.YT && window.YT.Player) {
      initYT();
    } else {
      const existingScript = document.getElementById('youtube-iframe-api');
      if (!existingScript) {
        const tag = document.createElement('script');
        tag.id = 'youtube-iframe-api';
        tag.src = 'https://www.youtube.com/iframe_api';
        document.body.appendChild(tag);
      }

      const prevReady = window.onYouTubeIframeAPIReady;
      window.onYouTubeIframeAPIReady = () => {
        if (prevReady) prevReady();
        initYT();
      };
    }

    // 2. 備用 postMessage 監聽機制 (針對各瀏覽器跨域事件提供雙重保障)
    const handleMessage = (event: MessageEvent) => {
      try {
        if (typeof event.data === 'string') {
          const data = JSON.parse(event.data);
          if (
            data.event === 'infoDelivery' &&
            data.info &&
            typeof data.info.currentTime === 'number'
          ) {
            setCurrentSec(data.info.currentTime);
            onTimeUpdate?.(data.info.currentTime);
          }
        }
      } catch {
        // ignore non-json messages
      }
    };

    window.addEventListener('message', handleMessage);

    const pingTimer = setInterval(() => {
      iframeRef.current?.contentWindow?.postMessage(
        JSON.stringify({ event: 'listening' }),
        '*'
      );
    }, 500);

    return () => {
      isCancelled = true;
      window.removeEventListener('message', handleMessage);
      clearInterval(pingTimer);
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [videoId, onTimeUpdate]);

  // 3. 處理點擊時間戳記跳轉 (Seek to)
  useEffect(() => {
    if (seekToTime !== null && seekToTime !== undefined) {
      if (playerRef.current && typeof playerRef.current.seekTo === 'function') {
        playerRef.current.seekTo(seekToTime, true);
        playerRef.current.playVideo?.();
      } else if (iframeRef.current) {
        iframeRef.current.contentWindow?.postMessage(
          JSON.stringify({
            event: 'command',
            func: 'seekTo',
            args: [seekToTime, true],
          }),
          '*'
        );
        iframeRef.current.contentWindow?.postMessage(
          JSON.stringify({
            event: 'command',
            func: 'playVideo',
            args: [],
          }),
          '*'
        );
      }
      setCurrentSec(seekToTime);
      onTimeUpdate?.(seekToTime);
      if (onSeekHandled) {
        onSeekHandled();
      }
    }
  }, [seekToTime, onSeekHandled, onTimeUpdate]);

  const formatSec = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl sticky top-0 z-10">
      <div className="relative w-full aspect-video bg-black">
        <iframe
          ref={iframeRef}
          id="uta-study-yt-player"
          src={`https://www.youtube-nocookie.com/embed/${videoId}?enablejsapi=1&rel=0&modestbranding=1`}
          title="YouTube video player"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          allowFullScreen
          suppressHydrationWarning
          className="w-full h-full border-0"
        />
      </div>

      <div className="p-4 border-t border-slate-800/80 bg-slate-900/60 flex items-center justify-between gap-3">
        <div className="truncate pr-2">
          <div className="flex items-center gap-2">
            <h4 className="text-sm font-semibold text-white truncate">{title || '未命名曲目'}</h4>
            {isPlaying && (
              <span className="flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 shrink-0">
                <Radio className="w-2.5 h-2.5 animate-pulse text-emerald-400" />
                播放中
              </span>
            )}
          </div>
          <div className="flex items-center gap-2 text-xs text-slate-400 truncate mt-0.5">
            <span>{artist || 'YouTube 來源'}</span>
            <span>•</span>
            <span className="font-mono text-indigo-300 font-semibold">{formatSec(currentSec)}</span>
          </div>
        </div>

        <a
          href={`https://www.youtube.com/watch?v=${videoId}`}
          target="_blank"
          rel="noreferrer"
          title="在 YouTube 開啟原影片"
          className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition shrink-0"
        >
          <ExternalLink className="w-4 h-4" />
        </a>
      </div>
    </div>
  );
};
