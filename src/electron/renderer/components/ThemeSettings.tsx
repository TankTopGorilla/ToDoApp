import React, { useState } from 'react';
import './ThemeSettings.css';

interface Prefs {
  mode: 'light' | 'dark';
  accent_color: string;
  density: 'compact' | 'comfortable' | 'spacious';
}

interface ThemeSettingsProps {
  prefs: Prefs;
  onSave: (prefs: Prefs) => void;
  onClose: () => void;
}

export default function ThemeSettings({ prefs, onSave, onClose }: ThemeSettingsProps) {
  const [mode, setMode] = useState<'light' | 'dark'>(prefs.mode);
  const [density, setDensity] = useState<'compact' | 'comfortable' | 'spacious'>(prefs.density);
  const [accentColor, setAccentColor] = useState(prefs.accent_color);
  const [error, setError] = useState<string | null>(null);

  const densityOptions: { value: Prefs['density']; label: string }[] = [
    { value: 'compact', label: 'Compact' },
    { value: 'comfortable', label: 'Comfortable' },
    { value: 'spacious', label: 'Spacious' },
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
    });
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Theme Settings</h2>
          <button className="btn btn-ghost" onClick={onClose}>
            ✕
          </button>
        </div>

        <div className="modal-form">
          {error && <div className="form-error">{error}</div>}

          <div>
            <label className="modal-form-label">Theme Mode</label>
            <div className="radio-group">
              <label className="radio-item">
                <input
                  type="radio"
                  name="theme-mode"
                  value="dark"
                  checked={mode === 'dark'}
                  onChange={(e) => {
                    setMode(e.target.value as 'light' | 'dark');
                    setError(null);
                  }}
                />
                <span>Dark</span>
              </label>
              <label className="radio-item">
                <input
                  type="radio"
                  name="theme-mode"
                  value="light"
                  checked={mode === 'light'}
                  onChange={(e) => {
                    setMode(e.target.value as 'light' | 'dark');
                    setError(null);
                  }}
                />
                <span>Light</span>
              </label>
            </div>
          </div>

          <div>
            <label className="modal-form-label">Density</label>
            <select
              className="modal-form-select"
              value={density}
              onChange={(e) => {
                setDensity(e.target.value as 'compact' | 'comfortable' | 'spacious');
                setError(null);
              }}
            >
              {densityOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="modal-form-label">
              Accent Color
              <span className="color-hint">(6-digit hex)</span>
            </label>
            <div className="color-input-row">
              <input
                type="color"
                value={accentColor}
                onChange={(e) => setAccentColor(e.target.value)}
                className="color-picker"
              />
              <input
                type="text"
                value={accentColor}
                onChange={(e) => setAccentColor(e.target.value)}
                className="color-hex-input"
                placeholder="#6366f1"
              />
            </div>
          </div>

          <div className="preview-section">
            <label className="modal-form-label">Preview</label>
            <div
              className="preview-card"
              data-theme={mode}
              data-density={density}
              style={{ '--accent-color': accentColor } as React.CSSProperties}
            >
              <div className="preview-header">
                <div className="preview-logo">
                  <div className="preview-badge"></div>
                  <span>ToDoApp</span>
                </div>
              </div>
              <div className="preview-stats">
                <div className="stat-item">
                  <span className="stat-value">{mode}</span>
                  <span className="stat-label">Mode</span>
                </div>
                <div className="stat-item">
                  <span className="stat-value">{density}</span>
                  <span className="stat-label">Density</span>
                </div>
                <div className="stat-item">
                  <span className="stat-value stat-accent">{accentColor.toUpperCase()}</span>
                  <span className="stat-label">Accent</span>
                </div>
              </div>
            </div>
          </div>

          <div className="modal-footer">
            <button className="btn btn-ghost" onClick={onClose}>
              Cancel
            </button>
            <button className="btn btn-primary" onClick={handleSave}>
              Save Changes
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}