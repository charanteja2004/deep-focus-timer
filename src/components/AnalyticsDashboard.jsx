/**
 * AnalyticsDashboard — Charts + Heatmap + Insights
 *
 * Sections:
 *  1. AI Insight banners
 *  2. Summary stat cards
 *  3. Weekly bar + line charts (Recharts)
 *  4. Full calendar heatmap — every day from first session → today (GitHub style)
 *  5. Session history list (paginated)
 *  6. Seed demo data button
 */
import React, { useState, useRef } from 'react'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  LineChart, Line, CartesianGrid, Legend,
} from 'recharts'
import {
  TrendingUp, Zap, AlertTriangle, Target, Clock,
  Calendar, Flame, Award, Database, Info,
} from 'lucide-react'
import { useAnalytics } from '../hooks/useAnalytics'
import { generateSeedSessions } from '../utils/seedData'
import clsx from 'clsx'

// ── colour helpers ─────────────────────────────────────
const CHART_COLORS = {
  focus:       '#4d6ef5',
  distraction: '#f97316',
}

function minutesToIntensity(min) {
  if (min === 0)   return 0
  if (min < 30)    return 1
  if (min < 60)    return 2
  if (min < 90)    return 3
  return 4
}

const INTENSITY_STYLES = [
  'bg-white/5',
  'bg-brand-600/25',
  'bg-brand-600/50',
  'bg-brand-600/80',
  'bg-brand-600',
]

// ── Main component ─────────────────────────────────────
export default function AnalyticsDashboard({ sessions, onSeedData, onClearData }) {
  const stats        = useAnalytics(sessions)
  const [historyPage, setHistoryPage] = useState(0)
  const [tooltip, setTooltip]         = useState(null)  // { day, x, y }
  const heatmapRef   = useRef(null)
  const PAGE_SIZE    = 8

  const paginatedHistory = [...sessions]
    .sort((a, b) => b.completedAt - a.completedAt)
    .slice(historyPage * PAGE_SIZE, (historyPage + 1) * PAGE_SIZE)

  // ── Heatmap: group allDays into ISO weeks ──────────────
  // Each week = array[7] (Mon index 0 … Sun index 6)
  const heatmapWeeks = buildHeatmapWeeks(stats.allDays)

  // ── Month labels: one per first week a month appears ──
  const monthLabels = buildMonthLabels(heatmapWeeks)

  return (
    <div className="flex flex-col gap-8 pb-8 animate-fade-in">

      {/* ── 1. Insight banners ─────────────────────────── */}
      {(stats.bestDurationRange || stats.lowFocusAlert || stats.bestTimeLabel || stats.bestDayLabel) && (
        <div className="flex flex-col gap-2">
          {stats.lowFocusAlert && (
            <InsightBadge icon={<AlertTriangle size={14} />} color="orange">
              Your recent sessions had many distractions — try shorter 25-min blocks.
            </InsightBadge>
          )}
          {stats.bestDurationRange && (
            <InsightBadge icon={<Zap size={14} />} color="blue">
              You focus best in <strong>{stats.bestDurationRange}</strong> sessions.
            </InsightBadge>
          )}
          {stats.bestTimeLabel && (
            <InsightBadge icon={<Clock size={14} />} color="violet">
              Peak focus time: <strong>{stats.bestTimeLabel}</strong>.
            </InsightBadge>
          )}
          {stats.bestDayLabel && (
            <InsightBadge icon={<Calendar size={14} />} color="emerald">
              Your most productive day is <strong>{stats.bestDayLabel}</strong>.
            </InsightBadge>
          )}
        </div>
      )}

      {/* ── 2. Stat cards ──────────────────────────────── */}
      <div className="grid grid-cols-2 gap-3">
        <StatCard icon={<Clock size={15} />}    label="Today"          value={`${stats.todayFocusMinutes}m`}                          sub={`${stats.todaySessions} session${stats.todaySessions !== 1 ? 's' : ''}`}         color="blue"    />
        <StatCard icon={<Target size={15} />}   label="Total Focus"    value={formatHours(stats.totalFocusMinutes)}                    sub={`${stats.totalSessions} sessions all-time`}                                         color="violet"  />
        <StatCard icon={<Flame size={15} />}    label="Day Streak"     value={`${stats.streak}d`}                                      sub={stats.streak > 1 ? '🔥 Keep going!' : 'Start today'}                               color="orange"  />
        <StatCard icon={<Award size={15} />}    label="Best Day"       value={`${stats.bestDayMinutes}m`}                              sub={`${stats.bestDaySessions} sessions in a day`}                                       color="emerald" />
      </div>

      {/* ── 3a. Weekly focus bar chart ─────────────────── */}
      <Section title="Last 7 Days" icon={<TrendingUp size={14} />}>
        <ResponsiveContainer width="100%" height={170}>
          <BarChart data={stats.weekly} barGap={4}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false} />
            <XAxis dataKey="day"          tick={{ fill: 'rgba(255,255,255,0.35)', fontSize: 11 }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fill: 'rgba(255,255,255,0.35)', fontSize: 10 }} axisLine={false} tickLine={false} unit="m" width={32} />
            <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255,255,255,0.04)' }} />
            <Bar dataKey="focusMinutes" name="Focus (min)" fill={CHART_COLORS.focus} radius={[4,4,0,0]} maxBarSize={36} />
          </BarChart>
        </ResponsiveContainer>
      </Section>

      {/* ── 3b. Sessions vs Distractions line ─────────── */}
      <Section title="Sessions vs Distractions" icon={<TrendingUp size={14} />}>
        <ResponsiveContainer width="100%" height={150}>
          <LineChart data={stats.weekly}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false} />
            <XAxis dataKey="day"           tick={{ fill: 'rgba(255,255,255,0.35)', fontSize: 11 }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fill: 'rgba(255,255,255,0.35)', fontSize: 10 }} axisLine={false} tickLine={false} width={26} />
            <Tooltip content={<CustomTooltip />} />
            <Line type="monotone" dataKey="sessions"     name="Sessions"     stroke={CHART_COLORS.focus}       strokeWidth={2} dot={{ r:3, fill: CHART_COLORS.focus }} />
            <Line type="monotone" dataKey="distractions" name="Distractions" stroke={CHART_COLORS.distraction} strokeWidth={2} dot={{ r:3, fill: CHART_COLORS.distraction }} strokeDasharray="4 2" />
            <Legend wrapperStyle={{ color: 'rgba(255,255,255,0.4)', fontSize: 11, paddingTop: 6 }} />
          </LineChart>
        </ResponsiveContainer>
      </Section>

      {/* ── 4. Full calendar heatmap ────────────────────── */}
      <Section title={`All-Time Focus Calendar${stats.firstDay ? ` (since ${fmtDate(stats.firstDay)})` : ''}`} icon={<Calendar size={14} />}>
        {stats.allDays.length === 0 ? (
          <p className="text-white/30 text-sm text-center py-4">
            Complete your first session to see the calendar.
          </p>
        ) : (
          <div className="flex flex-col gap-3">
            {/* Heatmap grid */}
            <div
              className="relative overflow-x-auto pb-2"
              ref={heatmapRef}
            >
              {/* Month labels row */}
              <div className="flex mb-1 ml-8 gap-0">
                {monthLabels.map((ml, i) => (
                  <div
                    key={i}
                    className="text-[10px] text-white/30 flex-shrink-0"
                    style={{ width: ml.width * 13, minWidth: ml.width * 13 }}
                  >
                    {ml.label}
                  </div>
                ))}
              </div>

              <div className="flex gap-0">
                {/* Day-of-week labels */}
                <div className="flex flex-col gap-[2px] mr-1.5 flex-shrink-0">
                  {['M','T','W','T','F','S','S'].map((d, i) => (
                    <div key={i} className="text-[9px] text-white/20 h-[11px] flex items-center justify-end pr-0.5">
                      {i % 2 === 0 ? d : ''}
                    </div>
                  ))}
                </div>

                {/* Heatmap weeks */}
                <div className="flex gap-[2px] flex-shrink-0">
                  {heatmapWeeks.map((week, wi) => (
                    <div key={wi} className="flex flex-col gap-[2px]">
                      {week.map((day, di) => {
                        if (!day) return <div key={di} className="w-[11px] h-[11px]" />
                        const intensity = minutesToIntensity(day.focusMinutes)
                        return (
                          <div
                            key={di}
                            className={clsx(
                              'w-[11px] h-[11px] rounded-[2px] cursor-pointer transition-transform hover:scale-125',
                              INTENSITY_STYLES[intensity]
                            )}
                            onMouseEnter={(e) => {
                              const rect = e.target.getBoundingClientRect()
                              const boxRect = heatmapRef.current?.getBoundingClientRect()
                              setTooltip({
                                day,
                                x: rect.left - (boxRect?.left || 0) + 14,
                                y: rect.top  - (boxRect?.top  || 0) - 50,
                              })
                            }}
                            onMouseLeave={() => setTooltip(null)}
                          />
                        )
                      })}
                    </div>
                  ))}
                </div>
              </div>

              {/* Heatmap tooltip */}
              {tooltip && (
                <div
                  className="absolute z-20 bg-surface-900/95 border border-white/10 rounded-xl px-3 py-2 text-xs pointer-events-none shadow-xl"
                  style={{ left: tooltip.x, top: tooltip.y, minWidth: 140 }}
                >
                  <p className="text-white/50 mb-1">{fmtDateFull(tooltip.day.date)}</p>
                  {tooltip.day.focusMinutes > 0 ? (
                    <>
                      <p className="text-brand-300 font-medium">{tooltip.day.focusMinutes} min focused</p>
                      <p className="text-white/40">{tooltip.day.sessions} session{tooltip.day.sessions !== 1 ? 's' : ''}</p>
                      {tooltip.day.distractions > 0 && (
                        <p className="text-orange-400/70">{tooltip.day.distractions} distraction{tooltip.day.distractions !== 1 ? 's' : ''}</p>
                      )}
                    </>
                  ) : (
                    <p className="text-white/30">No focus time</p>
                  )}
                </div>
              )}
            </div>

            {/* Legend */}
            <div className="flex items-center gap-2 text-xs text-white/30 ml-8">
              <span>Less</span>
              {INTENSITY_STYLES.map((cls, i) => (
                <div key={i} className={clsx('w-[11px] h-[11px] rounded-[2px]', cls)} />
              ))}
              <span>More</span>
            </div>
          </div>
        )}
      </Section>

      {/* ── 5. Session history ─────────────────────────── */}
      <Section title="Session History" icon={<Clock size={14} />}>
        {sessions.length === 0 ? (
          <p className="text-white/30 text-sm text-center py-4">No sessions recorded yet.</p>
        ) : (
          <>
            <div className="flex flex-col gap-1">
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
                >← Newer</button>
                <span className="text-xs text-white/25">
                  {historyPage * PAGE_SIZE + 1}–{Math.min((historyPage + 1) * PAGE_SIZE, sessions.length)} of {sessions.length}
                </span>
                <button
                  onClick={() => setHistoryPage(p => p + 1)}
                  disabled={(historyPage + 1) * PAGE_SIZE >= sessions.length}
                  className="text-xs text-white/40 hover:text-white/80 disabled:opacity-20 transition-colors px-2 py-1"
                >Older →</button>
              </div>
            )}
          </>
        )}
      </Section>

      {/* ── 6. Seed / Clear data ───────────────────────── */}
      <Section title="Demo Data" icon={<Database size={14} />}>
        <div className="flex flex-col gap-3">
          <div className="flex items-start gap-2 text-xs text-white/30 bg-white/3 rounded-xl p-3 border border-white/5">
            <Info size={12} className="flex-shrink-0 mt-0.5" />
            <span>
              Load 30 days of realistic demo sessions to see how the calendar and insights look with real data.
              This won't delete your existing sessions.
            </span>
          </div>
          <div className="flex gap-2">
            <button
              id="seed-data-btn"
              onClick={onSeedData}
              className={clsx(
                'flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium',
                'bg-brand-600/20 text-brand-300 border border-brand-500/30',
                'hover:bg-brand-600/30 transition-all'
              )}
            >
              <Database size={14} />
              Load 30-Day Demo Data
            </button>
            {sessions.length > 0 && (
              <button
                id="clear-data-btn-analytics"
                onClick={() => {
                  if (confirm('Clear ALL sessions? This cannot be undone.')) onClearData()
                }}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500/20 transition-all"
              >
                Clear All
              </button>
            )}
          </div>
        </div>
      </Section>

    </div>
  )
}

// ── Sub-components ─────────────────────────────────────

function StatCard({ icon, label, value, sub, color }) {
  const cm = {
    blue:    'from-brand-600/15 to-transparent border-brand-500/20 text-brand-400',
    violet:  'from-violet-600/15 to-transparent border-violet-500/20 text-violet-400',
    orange:  'from-orange-600/15 to-transparent border-orange-500/20 text-orange-400',
    emerald: 'from-emerald-600/15 to-transparent border-emerald-500/20 text-emerald-400',
  }
  return (
    <div className={clsx('rounded-2xl border bg-gradient-to-br p-4 flex flex-col gap-1', cm[color])}>
      <div className="flex items-center gap-1.5 opacity-60 mb-1">{icon}<span className="text-xs font-medium">{label}</span></div>
      <span className="text-2xl font-semibold tracking-tight">{value}</span>
      <span className="text-xs opacity-40">{sub}</span>
    </div>
  )
}

function Section({ title, icon, children }) {
  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-2 text-white/40">
        {icon}
        <span className="text-[11px] font-semibold uppercase tracking-widest">{title}</span>
      </div>
      {children}
    </div>
  )
}

function InsightBadge({ icon, color, children }) {
  const cm = {
    blue:    'bg-brand-500/10 border-brand-500/20 text-brand-300',
    orange:  'bg-orange-500/10 border-orange-500/20 text-orange-300',
    violet:  'bg-violet-500/10 border-violet-500/20 text-violet-300',
    emerald: 'bg-emerald-500/10 border-emerald-500/20 text-emerald-300',
  }
  return (
    <div className={clsx('flex items-start gap-2.5 rounded-xl border px-4 py-3 text-sm', cm[color])}>
      <span className="flex-shrink-0 mt-0.5">{icon}</span>
      <span>{children}</span>
    </div>
  )
}

function HistoryRow({ session }) {
  const date    = new Date(session.completedAt)
  const time    = date.toLocaleTimeString('en', { hour: '2-digit', minute: '2-digit' })
  const day     = date.toLocaleDateString('en', { month: 'short', day: 'numeric' })
  const dur     = Math.round(session.duration / 60)
  const distr   = session.distractions || 0
  const quality = session.partial ? 'partial' : distr === 0 ? 'perfect' : distr <= 2 ? 'good' : 'noisy'
  const qColor  = {
    perfect: 'text-emerald-400',
    good: 'text-brand-400',
    noisy: 'text-orange-400',
    partial: 'text-white/30',
  }
  const qLabel  = {
    perfect: '✦ Perfect',
    good: '● Good',
    noisy: '○ Noisy',
    partial: '· Partial',
  }

  return (
    <div className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-white/4 transition-colors group">
      <span className={clsx('text-xs font-medium w-16 flex-shrink-0', qColor[quality])}>
        {qLabel[quality]}
      </span>
      <span className="text-sm text-white/70 flex-1">{dur} min</span>
      {distr > 0 && <span className="text-xs text-orange-400/50">{distr}× distracted</span>}
      <span className="text-xs text-white/25 tabular-nums">{day}, {time}</span>
    </div>
  )
}

function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-surface-900/95 border border-white/10 rounded-xl px-3 py-2 text-xs shadow-xl">
      <p className="text-white/50 mb-1">{label}</p>
      {payload.map((p, i) => (
        <p key={i} style={{ color: p.color }}>
          {p.name}: <strong>{p.value}</strong>
        </p>
      ))}
    </div>
  )
}

// ── Heatmap helpers ─────────────────────────────────────

/**
 * Build array of weeks, each week = array[7] (Mon=0 … Sun=6).
 * allDays is already sorted from oldest to newest.
 */
function buildHeatmapWeeks(allDays) {
  if (!allDays.length) return []

  // Find the Monday of the first day
  const first    = new Date(allDays[0].date)
  const dow      = first.getDay()          // 0=Sun
  const offset   = (dow === 0 ? 6 : dow - 1) // shift to Mon=0
  const startMon = new Date(first)
  startMon.setDate(startMon.getDate() - offset)

  // Build a map for O(1) lookup
  const dayMap = {}
  for (const d of allDays) dayMap[d.date] = d

  // Generate weeks
  const today    = new Date().toISOString().slice(0, 10)
  const weeks    = []
  let cur        = new Date(startMon)

  while (true) {
    const week = []
    for (let i = 0; i < 7; i++) {
      const k = cur.toISOString().slice(0, 10)
      if (k > today) {
        week.push(null)  // future — empty cell
      } else if (allDays.length && k < allDays[0].date) {
        week.push(null)  // before any data
      } else {
        week.push(dayMap[k] || { date: k, focusMinutes: 0, sessions: 0, distractions: 0 })
      }
      cur.setDate(cur.getDate() + 1)
    }
    weeks.push(week)
    if (cur.toISOString().slice(0, 10) > today) break
  }

  return weeks
}

/** Build month label positions for the heatmap header */
function buildMonthLabels(weeks) {
  const labels = []
  let lastMonth = null
  let count = 0

  for (const week of weeks) {
    // Use first non-null day of week to get month
    const day = week.find(d => d)
    const month = day ? new Date(day.date).toLocaleDateString('en', { month: 'short', year: '2-digit' }) : null

    if (month !== lastMonth) {
      if (lastMonth !== null) labels.push({ label: lastMonth, width: count })
      lastMonth = month
      count = 1
    } else {
      count++
    }
  }
  if (lastMonth) labels.push({ label: lastMonth, width: count })
  return labels
}

function formatHours(minutes) {
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  return h > 0 ? `${h}h ${m}m` : `${m}m`
}

function fmtDate(isoDate) {
  return new Date(isoDate).toLocaleDateString('en', { month: 'short', day: 'numeric', year: 'numeric' })
}

function fmtDateFull(isoDate) {
  return new Date(isoDate).toLocaleDateString('en', { weekday: 'short', month: 'long', day: 'numeric', year: 'numeric' })
}
