import React, { useCallback, useEffect, useState } from 'react';
import { getTitleForLevel, getXpForLevel, UserStats } from '../../../types/task';

interface Props {
  refreshKey?: number;
}

export default function XpBar({ refreshKey }: Props) {
  const [stats, setStats] = useState<UserStats | null>(null);
  const [playerTitle, setPlayerTitle] = useState<string | null>(null);
  const [statusEmoji, setStatusEmoji] = useState('');

  const load = useCallback(async () => {
    const result = await window.electronAPI.getStats();
    if (result && typeof result === 'object' && !('error' in result)) {
      const r = result as { stats: UserStats; unlocks: string[]; player_title: string | null; status_emoji: string };
      setStats(r.stats);
      setPlayerTitle(r.player_title);
      setStatusEmoji(r.status_emoji);
    }
  }, []);

  useEffect(() => { load(); }, [load, refreshKey]);

  if (!stats) return null;

  const currentLevelXp = getXpForLevel(stats.level);
  const nextLevelXp = getXpForLevel(stats.level + 1);
  const xpInCurrentLevel = stats.xp - currentLevelXp;
  const xpNeededForNext = nextLevelXp - currentLevelXp;
  const progress = xpNeededForNext > 0 ? Math.min(xpInCurrentLevel / xpNeededForNext * 100, 100) : 100;
  const title = playerTitle || getTitleForLevel(stats.level);
  const isMaxLevel = stats.level >= 10;

  return (
    <div className="bg-white/5 border border-white/10 rounded-xl p-3 backdrop-blur-xl">
      {/* Level badge + title */}
      <div className="flex items-center gap-2 mb-2">
        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-amber-400 to-orange-600 flex items-center justify-center font-black text-white text-xs shadow-[0_0_10px_rgba(251,146,60,0.3)]">
          {stats.level}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1">
            <span className="text-white text-xs font-bold truncate">{title}</span>
            {statusEmoji && <span className="text-xs">{statusEmoji}</span>}
          </div>
          <span className="text-white/40 text-[9px] font-bold uppercase tracking-widest">
            {stats.xp.toLocaleString()} XP
          </span>
        </div>
      </div>

      {/* XP progress bar */}
      <div className="relative w-full h-1.5 bg-white/10 rounded-full overflow-hidden mb-1.5">
        <div
          className="h-full rounded-full bg-gradient-to-r from-amber-400 to-orange-500 transition-all duration-500"
          style={{ width: `${isMaxLevel ? 100 : progress}%` }}
        />
      </div>

      {/* XP text */}
      <div className="flex justify-between text-[9px] text-white/30 font-medium">
        {isMaxLevel ? (
          <span>Max Level</span>
        ) : (
          <>
            <span>{xpInCurrentLevel.toLocaleString()} / {xpNeededForNext.toLocaleString()} XP</span>
            <span>Level {stats.level + 1}</span>
          </>
        )}
      </div>

      {/* Streak */}
      {stats.current_streak > 0 && (
        <div className="flex items-center justify-center gap-1 mt-1.5 pt-1.5 border-t border-white/10">
          <span className={stats.current_streak >= 3 ? 'text-orange-400' : 'text-white/40'}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
              <path d="M13.5.67s.74 2.65.74 4.8c0 2.06-1.35 3.73-3.41 3.73-2.07 0-3.63-1.67-3.63-3.73l.03-.36C5.21 7.51 4 10.62 4 14c0 4.42 3.58 8 8 8s8-3.58 8-8C20 8.61 17.41 3.8 13.5.67z"/>
            </svg>
          </span>
          <span className="text-[10px] font-bold text-white/50">
            {stats.current_streak} day{stats.current_streak !== 1 ? 's' : ''} streak
          </span>
          {stats.current_streak >= 3 && (
            <span className="text-[9px] font-black text-orange-400/60">×{Math.min(1 + (stats.current_streak - 1) * 0.5, 3).toFixed(1)}</span>
          )}
        </div>
      )}

      {/* Stats summary */}
      <div className="flex justify-between mt-1.5 text-[9px] text-white/25 font-medium">
        <span>Added: {stats.total_tasks_added}</span>
        <span>Done: {stats.total_tasks_completed}</span>
      </div>
    </div>
  );
}
