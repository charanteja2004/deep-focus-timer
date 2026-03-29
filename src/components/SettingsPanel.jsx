/**
 * SettingsPanel — Timer durations, theme, sound preferences
 */
import React from 'react'
import { Moon, Sun, Volume2, VolumeX, RotateCcw } from 'lucide-react'
import { SOUNDS } from '../hooks/useAmbientSound'
import clsx from 'clsx'

const PRESET_DURATIONS = [
  { label: '25 min', value: 25 },
  { label: '50 min', value: 50 },
  { label: '90 min', value: 90 },
]

export default function SettingsPanel({
  settings, setSettings,
  darkMode, setDarkMode,
  sound, onSoundChange, volume, onVolumeChange,
  onClearData,
}) {
  const update = (key) => (value) =>
    setSettings(prev => ({ ...prev, [key]: value }))

  return (
    <div className="flex flex-col gap-8 animate-fade-in pb-8">

      {/* ── Timer durations ──────────────────────────── */}
      <Section title="Focus Duration">
        <div className="flex gap-2 mb-4">
          {PRESET_DURATIONS.map(p => (
            <button
              key={p.value}
              id={`preset-${p.value}`}
              onClick={() => update('focusDuration')(p.value)}
              className={clsx(
                'flex-1 py-2 rounded-xl text-sm font-medium transition-all duration-200',
                settings.focusDuration === p.value
                  ? 'bg-brand-600 text-white'
                  : 'bg-white/5 text-white/50 hover:bg-white/10 hover:text-white'
              )}
            >
              {p.label}
            </button>
          ))}
        </div>
        <SliderRow
          label="Custom Focus"
          value={settings.focusDuration}
          min={5} max={120} step={5}
          unit="min"
          onChange={update('focusDuration')}
          id="slider-focus"
        />
      </Section>

      <Section title="Break Duration">
        <SliderRow
          label="Short Break"
          value={settings.shortBreakDuration}
          min={1} max={30} step={1}
          unit="min"
          onChange={update('shortBreakDuration')}
          id="slider-short-break"
        />
        <SliderRow
          label="Long Break"
          value={settings.longBreakDuration}
          min={5} max={60} step={5}
          unit="min"
          onChange={update('longBreakDuration')}
          id="slider-long-break"
        />
        <SliderRow
          label="Sessions until long break"
          value={settings.sessionsUntilLongBreak}
          min={2} max={8} step={1}
          unit=""
          onChange={update('sessionsUntilLongBreak')}
          id="slider-long-break-interval"
        />
      </Section>

      <Section title="Auto Cycle">
        <ToggleRow
          label="Auto-start breaks"
          value={settings.autoStartBreaks}
          onChange={update('autoStartBreaks')}
          id="toggle-auto-breaks"
        />
        <ToggleRow
          label="Auto-start focus after break"
          value={settings.autoStartFocus}
          onChange={update('autoStartFocus')}
          id="toggle-auto-focus"
        />
      </Section>

      {/* ── Appearance ───────────────────────────────── */}
      <Section title="Appearance">
        <div className="flex items-center justify-between">
          <span className="text-sm text-white/60">Theme</span>
          <button
            id="theme-toggle"
            onClick={() => setDarkMode(d => !d)}
            className={clsx(
              'flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium',
              'bg-white/5 hover:bg-white/10 text-white/70 hover:text-white',
              'transition-all duration-200 border border-white/10'
            )}
          >
            {darkMode ? <><Sun size={14} /> Light mode</> : <><Moon size={14} /> Dark mode</>}
          </button>
        </div>
      </Section>

      {/* ── Ambient sound ────────────────────────────── */}
      <Section title="Ambient Sound">
        <div className="grid grid-cols-3 gap-2 mb-4">
          {Object.entries(SOUNDS).map(([key, val]) => (
            <button
              key={key}
              id={`sound-${key}`}
              onClick={() => onSoundChange(key)}
              className={clsx(
                'flex flex-col items-center gap-1 py-3 rounded-xl text-xs font-medium',
                'transition-all duration-200 border',
                sound === key
                  ? 'bg-brand-600/20 border-brand-500/40 text-brand-300'
                  : 'bg-white/5 border-white/10 text-white/40 hover:bg-white/10 hover:text-white/70'
              )}
            >
              <span className="text-lg">{val.icon}</span>
              {val.label}
            </button>
          ))}
        </div>
        {sound !== 'none' && (
          <SliderRow
            label="Volume"
            value={Math.round(volume * 100)}
            min={0} max={100} step={5}
            unit="%"
            onChange={v => onVolumeChange(v / 100)}
            id="slider-volume"
          />
        )}
      </Section>

      {/* ── Danger zone ──────────────────────────────── */}
      <Section title="Data">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-white/60">Clear all data</p>
            <p className="text-xs text-white/30">Removes sessions, tasks, stats</p>
          </div>
          <button
            id="clear-data-btn"
            onClick={() => {
              if (confirm('Clear all data? This cannot be undone.')) onClearData()
            }}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500/20 transition-all"
          >
            <RotateCcw size={12} /> Reset
          </button>
        </div>
      </Section>
    </div>
  )
}

function Section({ title, children }) {
  return (
    <div className="flex flex-col gap-4">
      <h3 className="text-xs font-semibold uppercase tracking-widest text-white/30">{title}</h3>
      <div className="flex flex-col gap-3">{children}</div>
    </div>
  )
}

function SliderRow({ label, value, min, max, step, unit, onChange, id }) {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <label htmlFor={id} className="text-sm text-white/60">{label}</label>
        <span className="text-sm font-mono text-white/80">{value}{unit}</span>
      </div>
      <input
        id={id}
        type="range"
        min={min} max={max} step={step}
        value={value}
        onChange={e => onChange(Number(e.target.value))}
        className="w-full bg-white/10 h-1 accent-brand-500"
        style={{ accentColor: '#4d6ef5' }}
      />
      <div className="flex justify-between text-xs text-white/20">
        <span>{min}{unit}</span>
        <span>{max}{unit}</span>
      </div>
    </div>
  )
}

function ToggleRow({ label, value, onChange, id }) {
  return (
    <div className="flex items-center justify-between">
      <label htmlFor={id} className="text-sm text-white/60 cursor-pointer">{label}</label>
      <button
        id={id}
        role="switch"
        aria-checked={value}
        onClick={() => onChange(!value)}
        className={clsx(
          'relative w-10 h-5 rounded-full transition-all duration-300',
          value ? 'bg-brand-600' : 'bg-white/15'
        )}
      >
        <span className={clsx(
          'absolute top-0.5 w-4 h-4 rounded-full bg-white shadow-sm transition-all duration-300',
          value ? 'left-5.5' : 'left-0.5'
        )}
        style={{ left: value ? '22px' : '2px' }}
        />
      </button>
    </div>
  )
}
