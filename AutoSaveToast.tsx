import React, { useEffect, useState } from 'react';
import { HardDriveDownload, CheckCheck } from 'lucide-react';

export interface AutoSaveNotification {
  id: number;
  title: string;
  detail?: string;
  type?: 'upgrade' | 'mission' | 'sync' | 'vessel';
}

interface AutoSaveToastProps {
  notification: AutoSaveNotification | null;
}

export const AutoSaveToast: React.FC<AutoSaveToastProps> = ({ notification }) => {
  const [activeItem, setActiveItem] = useState<AutoSaveNotification | null>(null);
  const [visible, setVisible] = useState<boolean>(false);

  useEffect(() => {
    if (notification) {
      setActiveItem(notification);
      // Small frame delay to trigger CSS transition animation
      const animFrame = requestAnimationFrame(() => {
        setVisible(true);
      });
      return () => cancelAnimationFrame(animFrame);
    } else {
      setVisible(false);
      const timer = setTimeout(() => {
        setActiveItem(null);
      }, 350);
      return () => clearTimeout(timer);
    }
  }, [notification]);

  if (!activeItem) return null;

  return (
    <div
      id="autosave-toast-container"
      className="fixed bottom-5 right-5 z-[90] pointer-events-none select-none flex flex-col items-end"
      aria-live="polite"
    >
      <div
        id="autosave-toast-indicator"
        className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl bg-zinc-950/95 backdrop-blur-md border border-cyan-500/40 text-zinc-200 shadow-[0_4px_24px_rgba(0,0,0,0.7),0_0_16px_rgba(0,240,255,0.2)] transition-all duration-300 ease-out transform ${
          visible
            ? 'opacity-100 translate-y-0 scale-100'
            : 'opacity-0 translate-y-4 scale-95'
        }`}
      >
        {/* Beacon Icon with status ping */}
        <div className="relative flex items-center justify-center w-8 h-8 rounded-lg bg-cyan-950/80 border border-cyan-500/40 text-cyan-400">
          {activeItem.type === 'upgrade' ? (
            <CheckCheck className="w-4 h-4 text-emerald-400" />
          ) : (
            <HardDriveDownload className="w-4 h-4 text-cyan-400" />
          )}
          <span className="absolute -top-0.5 -right-0.5 flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
          </span>
        </div>

        {/* Notification Text */}
        <div className="flex flex-col text-left">
          <div className="flex items-center gap-2">
            <span className="font-mono text-[11px] font-bold tracking-wider text-white uppercase drop-shadow-[0_0_8px_rgba(0,240,255,0.5)]">
              {activeItem.title}
            </span>
            <span className="font-mono text-[9px] px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
              AUTO-SAVED
            </span>
          </div>
          {activeItem.detail && (
            <span className="font-mono text-[10px] text-zinc-400 tracking-tight mt-0.5">
              {activeItem.detail}
            </span>
          )}
        </div>
      </div>
    </div>
  );
};
