import React, { useState } from 'react';
import { LEVEL_UNLOCKS, getTitleForLevel } from '../../../types/task';

interface Prefs {
  mode: 'light' | 'dark';
  accent_color: string;
  density: string;
  background?: string;
}

interface ThemeSettingsProps {
  prefs: Prefs;
  unlockedThemes: string[];
  currentLevel: number;
  onSave: (prefs: Prefs) => void;
  onClose: () => void;
}

const DEFAULT_PREFS = {
  mode: 'dark' as const,
  accent_color: '#6366f1',
  density: 'comfortable',
  background: 'default',
};

const PRESET_COLORS: { id: string; label: string; colors: string[]; level?: number }[] = [
  { id: 'default', label: 'Default', colors: ['#6366f1', '#4f46e5', '#818cf8'], level: 1 },
  { id: 'palette-sunset', label: 'Sunset', colors: ['#f97316', '#ea580c', '#fb923c'], level: 2 },
  { id: 'theme-ocean', label: 'Ocean', colors: ['#06b6d4', '#0891b2', '#22d3ee'], level: 5 },
  { id: 'theme-forest', label: 'Forest', colors: ['#10b981', '#059669', '#34d399'], level: 7 },
  { id: 'theme-royal', label: 'Royal', colors: ['#8b5cf6', '#7c3aed', '#a78bfa'], level: 9 },
];

const BG_VARIANTS: { id: string; label: string; desc: string; level: number }[] = [
  { id: 'default', label: 'Default', desc: 'Vibrant blue-green gradient', level: 1 },
  { id: 'bg-midnight', label: 'Midnight', desc: 'Darker sidebar + main area', level: 3 },
];

export default function ThemeSettings({ prefs, unlockedThemes, currentLevel, onSave, onClose }: ThemeSettingsProps) {
  const [mode, setMode] = useState<'light' | 'dark'>(prefs.mode as 'light' | 'dark');
  const [density, setDensity] = useState(prefs.density);
  const [accentColor, setAccentColor] = useState(prefs.accent_color);
  const [background, setBackground] = useState(prefs.background || 'default');
  const [error, setError] = useState<string | null>(null);

  const hasUnlock = (id: string) => unlockedThemes.includes(id) || currentLevel >= 10;
  const unlockAtLevel = (id: string) => {
    for (const [lvl, items] of Object.entries(LEVEL_UNLOCKS)) {
      if (items.some(i => i.id === id)) return Number(lvl);
    }
    return null;
  };

  const densityOptions: { value: string; label: string; level: number }[] = [
    { value: 'comfortable', label: 'Comfortable', level: 1 },
    { value: 'spacious', label: 'Spacious', level: 1 },
    { value: 'compact', label: 'Compact', level: 1 },
    { value: 'density-pro', label: 'Pro Density', level: 10 },
  ];

  const handleSave = () => {
    setError(null);
    if (!/^#[0-9a-fA-F]{6}$/.test(accentColor)) {
      setError('Invalid accent color. Use 6-digit hex (e.g., #6366f1).');
      return;
    }
    onSave({
      mode,
      accent_color: accentColor,
      density,
      background,
    });
  };

  const handleRevertToDefault = () => {
    setMode(DEFAULT_PREFS.mode);
    setDensity(DEFAULT_PREFS.density);
    setAccentColor(DEFAULT_PREFS.accent_color);
    setBackground(DEFAULT_PREFS.background);
  };

  const isLocked = (id: string) => !hasUnlock(id);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: 'rgba(0, 0, 0, 0.5)', backdropFilter: 'blur(6px)' }}
      onClick={onClose}
    >
      <div
        className="p-6 w-full max-w-lg max-h-[85vh] overflow-y-auto"
        style={{
          background: 'rgba(30, 41, 59, 0.92)',
          borderRadius: '1.5rem',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          backdropFilter: 'blur(12px)',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-white">Theme Settings</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white p-1">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>

        {error && <div className="text-red-400 text-sm font-medium mb-4 bg-red-500/10 p-3 rounded-lg">{error}</div>}

        {/* Theme Mode */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-300 mb-3">Theme Mode</label>
          <div className="flex gap-3">
            {['dark', 'light'].map(opt => (
              <button
                key={opt}
                onClick={() => setMode(opt as 'light' | 'dark')}
                className={`flex-1 py-3 rounded-xl border text-sm font-bold transition-all ${
                  mode === opt
                    ? 'bg-blue-600/30 border-blue-500/50 text-blue-300'
                    : 'bg-gray-700/40 border-gray-600 text-gray-400 hover:bg-gray-700/60'
                }`}
              >
                {opt === 'dark' ? '🌙 Dark' : '☀️ Light'}
              </button>
            ))}
          </div>
        </div>

        {/* Background Variant */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-300 mb-3">Background</label>
          <div className="space-y-2">
            {BG_VARIANTS.map(v => {
              const locked = isLocked(v.id);
              return (
                <div
                  key={v.id}
                  className={`flex items-center justify-between p-3 rounded-xl border transition-all ${
                    locked
                      ? 'opacity-50 border-gray-700 bg-gray-800/30'
                      : v.id === background
                      ? 'border-blue-500/50 bg-blue-500/10 cursor-pointer'
                      : 'border-gray-600 bg-gray-700/40 cursor-pointer hover:bg-gray-700/60'
                  }`}
                  onClick={() => !locked && setBackground(v.id)}
                >
                  <div>
                    <span className="text-sm font-medium text-white">{v.label}</span>
                    <p className="text-xs text-gray-400 mt-0.5">{v.desc}</p>
                  </div>
                  {locked && (
                    <div className="flex items-center gap-1.5 text-xs text-gray-500">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
                      Level {v.level} ({getTitleForLevel(v.level)})
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Accent Color */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-300 mb-3">
            Accent Color
            <span className="text-gray-500 font-normal ml-2">(hex)</span>
          </label>
          <div className="flex gap-3 mb-4">
            <input
              type="color"
              value={accentColor}
              onChange={(e) => setAccentColor(e.target.value)}
              className="w-12 h-12 rounded-xl border border-gray-600 cursor-pointer bg-transparent"
            />
            <input
              type="text"
              value={accentColor}
              onChange={(e) => setAccentColor(e.target.value)}
              className="flex-1 px-4 py-2 bg-gray-700/60 border border-gray-600 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm font-mono"
              placeholder="#6366f1"
            />
          </div>

          {/* Palette presets */}
          <label className="block text-xs font-medium text-gray-400 mb-2">Presets</label>
          <div className="grid grid-cols-5 gap-2">
            {PRESET_COLORS.map(p => {
              const locked = isLocked(p.id);
              return (
                <button
                  key={p.id}
                  disabled={locked}
                  onClick={() => !locked && setAccentColor(p.colors[0])}
                  className={`relative flex flex-col items-center gap-1.5 p-2 rounded-xl border transition-all ${
                    locked
                      ? 'border-gray-700 opacity-40 cursor-not-allowed'
                      : accentColor === p.colors[0]
                      ? 'border-blue-500/50 bg-blue-500/10'
                      : 'border-gray-600 hover:border-gray-500 bg-gray-700/40'
                  }`}
                  title={locked ? `Unlocks at Level ${p.level}` : p.label}
                >
                  <div className="flex gap-0.5">
                    {p.colors.map((c, ci) => (
                      <div key={ci} className="w-4 h-4 rounded-full border border-white/20" style={{ backgroundColor: c }} />
                    ))}
                  </div>
                  <span className="text-[10px] text-gray-400 font-medium">{p.label}</span>
                  {locked && (
                    <div className="absolute inset-0 flex items-center justify-center bg-gray-900/60 rounded-xl">
                      <div className="flex items-center gap-1 text-[10px] text-gray-400">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
                        Lv.{p.level}
                      </div>
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Density */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-300 mb-3">Density</label>
          <div className="grid grid-cols-2 gap-2">
            {densityOptions.map(opt => {
              const locked = isLocked(opt.value);
              return (
                <button
                  key={opt.value}
                  disabled={locked}
                  onClick={() => !locked && setDensity(opt.value)}
                  className={`py-3 px-4 rounded-xl border text-sm font-medium transition-all ${
                    locked
                      ? 'border-gray-700 opacity-40 cursor-not-allowed bg-gray-800/30'
                      : density === opt.value
                      ? 'bg-blue-600/30 border-blue-500/50 text-blue-300'
                      : 'bg-gray-700/40 border-gray-600 text-gray-400 hover:bg-gray-700/60'
                  }`}
                >
                  <span>{opt.label}</span>
                  {locked && (
                    <div className="flex items-center justify-center gap-1 mt-1 text-[10px] text-gray-500">
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
                      Level {opt.level}
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        <div className="flex items-center gap-3 pt-4 border-t border-white/10">
          <button
            onClick={handleRevertToDefault}
            className="px-4 py-2.5 text-orange-300 hover:text-orange-200 border border-orange-600/40 rounded-xl text-sm font-bold hover:bg-orange-500/10 transition-all"
          >
            Revert to Default
          </button>
          <div className="flex-1"></div>
          <button
            onClick={onClose}
            className="px-6 py-2.5 text-gray-300 hover:text-white border border-gray-600 rounded-xl text-sm font-bold hover:bg-gray-700 transition-all"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="aero-btn px-6 py-2.5 text-white rounded-xl text-sm font-bold"
          >
            Save Changes
          </button>
        </div>
      </div>
    </div>
  );
}
