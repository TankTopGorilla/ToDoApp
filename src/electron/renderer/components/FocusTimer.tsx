import React, { useCallback, useEffect, useRef, useState } from 'react';

const WORK = 25 * 60;
const SHORT_BREAK = 5 * 60;
const LONG_BREAK = 15 * 60;
const CYCLES_BEFORE_LONG = 4;

type Phase = 'idle' | 'working' | 'break';

interface FocusSession {
  phase: Phase;
  timeLeft: number;
  taskTitle: string | null;
  cycleCount: number;
}

interface Props {
  focusTask: { id: number; title: string } | null;
  onFocusComplete: () => void;
}

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export default function FocusTimer({ focusTask, onFocusComplete }: Props) {
  const [session, setSession] = useState<FocusSession>({
    phase: 'idle',
    timeLeft: WORK,
    taskTitle: null,
    cycleCount: 0,
  });
  const [expanded, setExpanded] = useState(false);
  const [taskId, setTaskId] = useState<number | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const prevFocusTaskRef = useRef(focusTask);

  const clearTimer = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  // Start focus when a new task is passed
  useEffect(() => {
    if (focusTask && focusTask !== prevFocusTaskRef.current) {
      prevFocusTaskRef.current = focusTask;
      clearTimer();
      setTaskId(focusTask.id);
      setSession({
        phase: 'working',
        timeLeft: WORK,
        taskTitle: focusTask.title,
        cycleCount: 0,
      });
      setExpanded(true);
    }
  }, [focusTask, clearTimer]);

  const notify = useCallback(async (title: string, body: string) => {
    try {
      await window.electronAPI.sendNotification({ title, body });
    } catch {
      // no-op
    }
  }, []);

  const tick = useCallback(() => {
    setSession(prev => {
      if (prev.phase === 'idle' || prev.timeLeft <= 0) return prev;

      const newTime = prev.timeLeft - 1;

      if (newTime > 0) return { ...prev, timeLeft: newTime };

      clearTimer();

      if (prev.phase === 'working') {
        const newCycle = prev.cycleCount + 1;
        const isLongBreak = newCycle % CYCLES_BEFORE_LONG === 0;
        const breakDuration = isLongBreak ? LONG_BREAK : SHORT_BREAK;

        notify('Pomodoro Complete!', isLongBreak
          ? `Great work! Take a long break (${LONG_BREAK / 60} min).`
          : `Good job! Take a short break (${SHORT_BREAK / 60} min).`);

        return {
          ...prev,
          phase: 'break',
          timeLeft: breakDuration,
          cycleCount: newCycle,
        };
      }

      notify('Break Over!', 'Time to focus again.');
      onFocusComplete();
      return {
        ...prev,
        phase: 'idle',
        timeLeft: WORK,
        taskTitle: null,
      };
    });
  }, [clearTimer, notify, onFocusComplete]);

  useEffect(() => {
    if (session.phase !== 'idle' && session.timeLeft > 0 && !intervalRef.current) {
      intervalRef.current = setInterval(tick, 1000);
    }
    if (session.phase === 'idle') {
      clearTimer();
    }
    return clearTimer;
  }, [session.phase, session.timeLeft, tick, clearTimer]);

  function pause() { clearTimer(); }
  function resume() {
    if (session.phase !== 'idle') {
      intervalRef.current = setInterval(tick, 1000);
    }
  }

  function stop() {
    clearTimer();
    setSession({ phase: 'idle', timeLeft: WORK, taskTitle: null, cycleCount: 0 });
    setTaskId(null);
    setExpanded(false);
    onFocusComplete();
  }

  function skipBreak() {
    clearTimer();
    setSession(prev => ({
      ...prev, phase: 'working', timeLeft: WORK,
    }));
  }

  if (session.phase === 'idle' && !expanded) return null;

  const isRunning = session.phase !== 'idle' && intervalRef.current !== null;
  const progress = session.phase === 'working'
    ? ((WORK - session.timeLeft) / WORK) * 100
    : session.phase === 'break'
    ? ((session.timeLeft > LONG_BREAK / 2 ? SHORT_BREAK : LONG_BREAK) - session.timeLeft) / (session.cycleCount % CYCLES_BEFORE_LONG === 0 ? LONG_BREAK : SHORT_BREAK) * 100
    : 0;

  return (
    <div className="relative">
      {/* Compact pill */}
      {session.phase !== 'idle' && (
        <div
          className={`flex items-center gap-2 px-4 py-2 rounded-full border transition-all cursor-pointer ${
            session.phase === 'working'
              ? 'bg-red-50/80 border-red-300/50 text-red-700'
              : 'bg-emerald-50/80 border-emerald-300/50 text-emerald-700'
          }`}
          onClick={() => setExpanded(!expanded)}
          title={session.taskTitle ?? 'Focus timer'}
        >
          {session.phase === 'working' ? (
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="12" r="10"/></svg>
          ) : (
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M3 12h18M12 3v18"/></svg>
          )}
          <span className="font-bold text-lg tabular-nums tracking-wider font-mono">
            {formatTime(session.timeLeft)}
          </span>
          {session.taskTitle && (
            <span className="text-xs font-medium max-w-[120px] truncate hidden sm:block">
              {session.taskTitle}
            </span>
          )}
        </div>
      )}

      {/* Expanded popover */}
      {expanded && (
        <div
          className="absolute right-0 top-full mt-2 w-72 bg-white rounded-2xl shadow-lg border border-gray-200 p-5 z-50"
          onClick={e => e.stopPropagation()}
        >
          <div className="text-center mb-4">
            <div className={`text-xs font-black uppercase tracking-widest ${
              session.phase === 'working' ? 'text-red-500' : 'text-emerald-500'
            }`}>
              {session.phase === 'working' ? `Focus${taskId ? ` #${taskId}` : ''}` : 'Break'}
            </div>
            <div className="text-4xl font-mono font-black tracking-wider mt-2 tabular-nums">
              {formatTime(session.timeLeft)}
            </div>
            {session.taskTitle && (
              <div className="text-sm text-gray-500 mt-1 truncate">{session.taskTitle}</div>
            )}
          </div>

          <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden mb-4">
            <div
              className={`h-full rounded-full transition-all duration-700 ${
                session.phase === 'working' ? 'bg-red-400' : 'bg-emerald-400'
              }`}
              style={{ width: `${Math.min(progress, 100)}%` }}
            />
          </div>

          <div className="flex items-center justify-center gap-3">
            {session.phase !== 'idle' && (
              <>
                {isRunning ? (
                  <button onClick={pause} className="p-3 bg-amber-100 hover:bg-amber-200 rounded-full text-amber-600 transition-all" title="Pause">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg>
                  </button>
                ) : (
                  <button onClick={resume} className="p-3 bg-emerald-100 hover:bg-emerald-200 rounded-full text-emerald-600 transition-all" title="Resume">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"/></svg>
                  </button>
                )}
                <button onClick={stop} className="p-3 bg-red-100 hover:bg-red-200 rounded-full text-red-600 transition-all" title="Stop">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><rect x="4" y="4" width="16" height="16" rx="2"/></svg>
                </button>
                {session.phase === 'break' && (
                  <button onClick={skipBreak} className="p-3 bg-gray-100 hover:bg-gray-200 rounded-full text-gray-600 transition-all" title="Skip break">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="13 17 18 12 13 7"/><polyline points="6 17 11 12 6 7"/></svg>
                  </button>
                )}
              </>
            )}
          </div>

          {session.cycleCount > 0 && (
            <div className="text-center mt-3 text-xs text-gray-400 font-medium">
              {session.cycleCount} pomodoro{session.cycleCount > 1 ? 's' : ''} today
            </div>
          )}
        </div>
      )}
    </div>
  );
}
