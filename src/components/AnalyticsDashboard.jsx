/**
 * AnalyticsDashboard — Charts + insights from session history
 * Uses Recharts for weekly bar chart, distraction pie chart.
 */
import React, { useState } from 'react'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line, CartesianGrid, Legend,
} from 'recharts'
import { TrendingUp, Zap, AlertTriangle, Target, Clock, Calendar, Flame, Award } from 'lucide-react'
import { useAnalytics } from '../hooks/useAnalytics'
import clsx from 'clsx'
import { formatTime } from '../hooks/useTimer'

const COLORS = {
  focus:       '#4d6ef5',
  distraction: '#f97316',
  break:       '#10b981',
}

export default function AnalyticsDashboard({ sessions }) {
  const stats = useAnalytics(sessions)
  const [historyPage, setHistoryPage] = useState(0)
  const PAGE_SIZE = 8
  const paginatedHistory = [...sessions].reverse().slice(historyPage * PAGE_SIZE, (historyPage + 1) * PAGE_SIZE)

  return (
    <div className="flex flex-col gap-8 animate-fade-in pb-8">
      {/* ── Insight banner ─────────────────────────────── */}
      {(stats.bestDurationRange || stats.lowFocusAlert || stats.bestTimeLabel) && (
        <div className="flex flex-col gap-2">
          {stats.lowFocusAlert && (
            <InsightBadge icon={<AlertTriangle size={14} />} color="orange">
              Your recent sessions had many distractions. Consider shorter bursts or a break.
            </InsightBadge>
          )}
          {stats.bestDurationRange && (
            <InsightBadge icon={<Zap size={14} />} color="blue">
              You focus best in <strong>{stats.bestDurationRange}</strong> sessions (based on your history).
            </InsightBadge>
          )}
          {stats.bestTimeLabel && (
            <InsightBadge icon={<Clock size={14} />} color="violet">
              Your peak focus time is around <strong>{stats.bestTimeLabel}</strong>.
            </InsightBadge>
          )}
        </div>
      )}

      {/* ── Summary stats ──────────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard icon={<Clock size={16} />} label="Today" value={`${stats.todayFocusMinutes}m`} sub={`${stats.todaySessions} sessions`} color="blue" />
        <StatCard icon={<Target size={16} />} label="Total Focus" value={`${Math.round(stats.totalFocusMinutes / 60)}h ${stats.totalFocusMinutes % 60}m`} sub={`${stats.totalSessions} sessions`} color="violet" />
        <StatCard icon={<Flame size={16} />} label="Streak" value={`${stats.streak}d`} sub={stats.streak > 1 ? 'Keep it up!' : 'Start today!'} color="orange" />
        <StatCard icon={<Award size={16} />} label="Avg Distractions" value={stats.distractionRatio.toFixed(1)} sub="per session" color="emerald" />
      </div>

      {/* ── Weekly focus chart ──────────────────────────── */}
      <Section title="Weekly Focus" icon={<Calendar size={15} />}>
        <ResponsiveContainer width="100%" height={180}>
          <BarChart data={stats.weekly} barGap={4}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false} />
            <XAxis dataKey="day" tick={{ fill: 'rgba(255,255,255,0.35)', fontSize: 12 }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fill: 'rgba(255,255,255,0.35)', fontSize: 11 }} axisLine={false} tickLine={false} unit="m" width={36} />
            <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255,255,255,0.04)' }} />
            <Bar dataKey="focusMinutes" name="Focus (min)" fill={COLORS.focus} radius={[4,4,0,0]} maxBarSize={32} />
          </BarChart>
        </ResponsiveContainer>
      </Section>

      {/* ── Distraction trend ──────────────────────────── */}
      <Section title="Focus vs Distractions" icon={<TrendingUp size={15} />}>
        <ResponsiveContainer width="100%" height={160}>
          <LineChart data={stats.weekly}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false} />
            <XAxis dataKey="day" tick={{ fill: 'rgba(255,255,255,0.35)', fontSize: 12 }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fill: 'rgba(255,255,255,0.35)', fontSize: 11 }} axisLine={false} tickLine={false} width={30} />
            <Tooltip content={<CustomTooltip />} cursor={{ stroke: 'rgba(255,255,255,0.1)' }} />
            <Line type="monotone" dataKey="sessions" name="Sessions" stroke={COLORS.focus} strokeWidth={2} dot={{ r: 3, fill: COLORS.focus }} />
            <Line type="monotone" dataKey="distractions" name="Distractions" stroke={COLORS.distraction} strokeWidth={2} dot={{ r: 3, fill: COLORS.distraction }} strokeDasharray="4 2" />
            <Legend wrapperStyle={{ color: 'rgba(255,255,255,0.4)', fontSize: 12, paddingTop: 8 }} />
          </LineChart>
        </ResponsiveContainer>
      </Section>

      {/* ── Session history ─────────────────────────────── */}
      <Section title="Session History" icon={<Clock size={15} />}>
        {sessions.length === 0 ? (
          <p className="text-white/30 text-sm text-center py-4">No sessions recorded yet.</p>
        ) : (
          <>
            <div className="flex flex-col gap-1.5">
              {paginatedHistory.map((s, i) => (
                <HistoryRow key={i} session={s} />
              ))}
            </div>
            {sessions.length > PAGE_SIZE && (
              <div className="flex items-center justify-between mt-3 pt-3 border-t border-white/5">
                <button
                  onClick={() => setHistoryPage(p => Math.max(0, p - 1))}
                  disabled={historyPage === 0}
                  className="text-xs text-white/40 hover:text-white/80 disabled:opacity-20 transition-colors px-2 py-1"
                >
                  ← Newer
                </button>
                <span className="text-xs text-white/25">
                  {historyPage * PAGE_SIZE + 1}–{Math.min((historyPage + 1) * PAGE_SIZE, sessions.length)} of {sessions.length}
                </span>
                <button
                  onClick={() => setHistoryPage(p => p + 1)}
                  disabled={(historyPage + 1) * PAGE_SIZE >= sessions.length}
                  className="text-xs text-white/40 hover:text-white/80 disabled:opacity-20 transition-colors px-2 py-1"
                >
                  Older →
                </button>
              </div>
            )}
          </>
        )}
      </Section>
    </div>
  )
}

/* Sub-components */

function StatCard({ icon, label, value, sub, color }) {
  const colorMap = {
    blue:    'from-brand-600/20 to-brand-800/10 border-brand-500/20 text-brand-400',
    violet:  'from-violet-600/20 to-violet-800/10 border-violet-500/20 text-violet-400',
    orange:  'from-orange-600/20 to-orange-800/10 border-orange-500/20 text-orange-400',
    emerald: 'from-emerald-600/20 to-emerald-800/10 border-emerald-500/20 text-emerald-400',
  }
  return (
    <div className={clsx('rounded-2xl border bg-gradient-to-br p-4 flex flex-col gap-1', colorMap[color])}>
      <div className="flex items-center gap-1.5 opacity-60 mb-1">{icon}<span className="text-xs font-medium">{label}</span></div>
      <span className="text-2xl font-semibold tracking-tight">{value}</span>
      <span className="text-xs opacity-40">{sub}</span>
    </div>
  )
}

function Section({ title, icon, children }) {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-2 text-white/50">
        {icon}
        <span className="text-xs font-semibold uppercase tracking-widest">{title}</span>
      </div>
      {children}
    </div>
  )
}

function InsightBadge({ icon, color, children }) {
  const colorMap = {
    blue:   'bg-brand-500/10 border-brand-500/20 text-brand-300',
    orange: 'bg-orange-500/10 border-orange-500/20 text-orange-300',
    violet: 'bg-violet-500/10 border-violet-500/20 text-violet-300',
  }
  return (
    <div className={clsx('flex items-start gap-2.5 rounded-xl border px-4 py-3 text-sm', colorMap[color])}>
      <span className="flex-shrink-0 mt-0.5">{icon}</span>
      <span>{children}</span>
    </div>
  )
}

function HistoryRow({ session }) {
  const date = new Date(session.completedAt)
  const time = date.toLocaleTimeString('en', { hour: '2-digit', minute: '2-digit' })
  const day  = date.toLocaleDateString('en', { month: 'short', day: 'numeric' })
  const dur  = Math.round(session.duration / 60)
  const distr= session.distractions || 0
  const quality = distr === 0 ? 'perfect' : distr <= 2 ? 'good' : 'noisy'
  const qColor = { perfect: 'text-emerald-400', good: 'text-brand-400', noisy: 'text-orange-400' }

  return (
    <div className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-white/4 transition-colors">
      <span className={clsx('text-xs font-medium w-14', qColor[quality])}>
        {quality === 'perfect' ? '✦ Perfect' : quality === 'good' ? '● Good' : '○ Noisy'}
      </span>
      <span className="text-sm text-white/70 flex-1">{dur} min session</span>
      {distr > 0 && <span className="text-xs text-orange-400/60">{distr} distract.</span>}
      <span className="text-xs text-white/25 tabular-nums">{day} {time}</span>
    </div>
  )
}

function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-surface-900/95 border border-white/10 rounded-xl px-3 py-2 text-sm shadow-xl">
      <p className="text-white/50 mb-1 text-xs">{label}</p>
      {payload.map((p, i) => (
        <p key={i} style={{ color: p.color }} className="text-xs">
          {p.name}: <strong>{p.value}</strong>
        </p>
      ))}
    </div>
  )
}
