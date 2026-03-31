/**
 * InsightsPanel — rule-based ML-style insight cards.
 * All computation is local — no external APIs, fully private.
 */
import React from 'react'
import clsx from 'clsx'
import { TrendingUp, TrendingDown, Clock, Brain, Target, Minus } from 'lucide-react'

export default function InsightsPanel({ stats, projects }) {
  const insights = buildInsights(stats, projects)
  if (insights.length === 0) return (
    <p className="text-white/25 text-sm text-center py-6">
      Complete a few sessions to see insights here.
    </p>
  )

  return (
    <div className="grid grid-cols-1 gap-3">
      {insights.map((ins, i) => (
        <InsightCard key={i} insight={ins} />
      ))}
    </div>
  )
}

function InsightCard({ insight }) {
  const { icon: Icon, color, title, body, badge } = insight
  return (
    <div className={clsx(
      'flex items-start gap-4 px-4 py-4 rounded-2xl border',
      `bg-${color}-500/8 border-${color}-500/20`
    )}
    style={{
      background:   `color-mix(in srgb, ${colorHex(color)} 8%, transparent)`,
      borderColor:  `color-mix(in srgb, ${colorHex(color)} 25%, transparent)`,
    }}>
      <div
        className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5"
        style={{ background: `color-mix(in srgb, ${colorHex(color)} 20%, transparent)` }}
      >
        <Icon size={16} style={{ color: colorHex(color) }} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <p className="text-sm font-semibold text-white/80">{title}</p>
          {badge && (
            <span
              className="text-[10px] font-mono px-2 py-0.5 rounded-full"
              style={{
                background: `color-mix(in srgb, ${colorHex(color)} 25%, transparent)`,
                color: colorHex(color),
              }}
            >{badge}</span>
          )}
        </div>
        <p className="text-xs text-white/45 leading-relaxed">{body}</p>
      </div>
    </div>
  )
}

// ── Insight generators ─────────────────────────────────────────────
function buildInsights(stats, projects = []) {
  const insights = []

  // 1. Peak focus hours
  if (stats.bestTimeLabel) {
    insights.push({
      icon:  Clock,
      color: 'blue',
      title: 'Peak Focus Hours',
      body:  `You focus most productively around ${stats.bestTimeLabel}. Try scheduling your hardest tasks in that window.`,
      badge: stats.bestTimeLabel,
    })
  }

  // 2. Session trend (vs prior week)
  if (stats.sessionTrend != null) {
    const up  = stats.sessionTrend >= 0
    insights.push({
      icon:  up ? TrendingUp : TrendingDown,
      color: up ? 'emerald' : 'orange',
      title: up ? 'Momentum Building' : 'Focus Dip Detected',
      body:  up
        ? `Your sessions are up ${Math.abs(stats.sessionTrend)}% vs last week. Keep the streak going!`
        : `Sessions down ${Math.abs(stats.sessionTrend)}% vs last week. Even one session today helps.`,
      badge: `${up ? '+' : ''}${stats.sessionTrend}%`,
    })
  }

  // 3. Average session length trend
  if (stats.avgSessionMinutes != null && stats.avgSessionMinutes > 0) {
    const avg = Math.round(stats.avgSessionMinutes)
    const quality = avg >= 45 ? 'Deep work sessions' : avg >= 25 ? 'Solid Pomodoro rhythm' : 'Short bursts'
    insights.push({
      icon:  Brain,
      color: 'violet',
      title: 'Session Pattern',
      body:  `Your average session is ${avg} min. ${quality} — ${avg < 25 ? 'try holding focus a bit longer for deeper work.' : 'you\'re building strong focus habits.'}`,
      badge: `${avg}m avg`,
    })
  }

  // 4. Best day of week
  if (stats.bestDayLabel) {
    insights.push({
      icon:  Target,
      color: 'amber',
      title: 'Best Day',
      body:  `${stats.bestDayLabel} is your most productive day. Plan your most important tasks then.`,
      badge: stats.bestDayLabel,
    })
  }

  // 5. Distraction pattern
  if (stats.distractionRatio != null) {
    const ratio = stats.distractionRatio
    const label = ratio === 0 ? 'Zero distractions' : ratio < 1 ? 'Low distraction rate' : ratio < 3 ? 'Moderate distractions' : 'High distraction rate'
    insights.push({
      icon:  ratio > 2 ? TrendingDown : Minus,
      color: ratio > 2 ? 'orange' : 'emerald',
      title: label,
      body:  ratio === 0
        ? 'Outstanding! You\'ve completed sessions with zero distractions.'
        : ratio < 1
          ? `Only ${ratio.toFixed(1)} distractions per session on average. Excellent focus!`
          : `${ratio.toFixed(1)} distractions per session. ${ratio > 2 ? 'Try blocking distracting sites before starting.' : 'Solid focus — every session gets easier.'}`,
      badge: `${ratio.toFixed(1)}× avg`,
    })
  }

  // 6. Project-specific insight (if project breakdown available)
  if (stats.projectBreakdown && projects.length > 1) {
    const entries  = Object.entries(stats.projectBreakdown).sort((a, b) => b[1] - a[1])
    const topEntry = entries[0]
    if (topEntry) {
      const proj = projects.find(p => p.id === topEntry[0])
      if (proj) {
        const totalMin = Object.values(stats.projectBreakdown).reduce((a, b) => a + b, 0)
        const pct = totalMin > 0 ? Math.round(topEntry[1] / totalMin * 100) : 0
        insights.push({
          icon:  Target,
          color: 'blue',
          title: `Top Project: ${proj.name}`,
          body:  `${pct}% of your total focus time has been on ${proj.name}. ${pct > 60 ? 'You\'re deeply invested in this one area.' : 'Good balance across projects.'}`,
          badge: `${Math.round(topEntry[1])}m`,
        })
      }
    }
  }

  return insights.slice(0, 5)
}

function colorHex(name) {
  const map = {
    blue:    '#4d6ef5',
    violet:  '#8b5cf6',
    emerald: '#10b981',
    orange:  '#f97316',
    amber:   '#f59e0b',
  }
  return map[name] || '#4d6ef5'
}
