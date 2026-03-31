/**
 * GamificationPanel — Animated XP bar with shimmer, level badge, achievement grid
 */
import React from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import clsx from 'clsx'

export function LevelBadge({ level }) {
  return (
    <motion.div
      whileHover={{ scale: 1.08 }}
      className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border cursor-default"
      style={{
        background: 'linear-gradient(135deg, rgba(245,158,11,0.2), rgba(234,88,12,0.15))',
        borderColor: 'rgba(245,158,11,0.35)',
        color: '#fcd34d',
        boxShadow: '0 0 12px rgba(245,158,11,0.2)',
      }}
      data-tooltip={`Level ${level}`}
    >
      <span>⚔</span>
      <span>Lv {level}</span>
    </motion.div>
  )
}

export default function GamificationPanel({ xp, level, achievements, progress, newAchievement }) {
  return (
    <div className="flex flex-col gap-6">

      {/* XP + Level card */}
      <div className="gradient-border-card p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <motion.div
              whileHover={{ rotate: [0, -10, 10, 0], scale: 1.1 }}
              transition={{ duration: 0.5 }}
              className="w-14 h-14 rounded-2xl flex items-center justify-center text-white font-bold text-xl"
              style={{
                background: 'linear-gradient(135deg, #f59e0b, #ea580c)',
                boxShadow: '0 4px 20px rgba(245,158,11,0.4)',
              }}
            >
              {level}
            </motion.div>
            <div>
              <p className="text-white font-semibold">Level {level}</p>
              <p className="text-white/35 text-xs">{xp.toLocaleString()} XP total</p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-xs text-white/25">Next level</p>
            <p className="text-sm font-mono text-white/50">
              {progress.xpInLevel} <span className="text-white/25">/</span> {progress.xpNeeded}
            </p>
          </div>
        </div>

        {/* XP progress bar */}
        <div className="relative h-2.5 bg-white/8 rounded-full overflow-hidden">
          <motion.div
            className="h-full rounded-full relative overflow-hidden"
            style={{ background: 'linear-gradient(90deg, #f59e0b, #f97316)' }}
            initial={{ width: 0 }}
            animate={{ width: `${Math.min(100, Math.round(progress.progress * 100))}%` }}
            transition={{ duration: 1.2, ease: [0.34, 1.56, 0.64, 1], delay: 0.2 }}
          >
            {/* Shimmer */}
            <div className="absolute inset-0 xp-bar-shimmer" />
          </motion.div>
        </div>
        <p className="text-[11px] text-white/20 text-center mt-2">
          {progress.xpNeeded - progress.xpInLevel} XP until Level {level + 1}
        </p>
      </div>

      {/* New achievement toast (inline) */}
      <AnimatePresence>
        {newAchievement && (
          <motion.div
            initial={{ opacity: 0, y: -10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="flex items-center gap-3 px-4 py-3 rounded-2xl border border-amber-500/30 bg-amber-500/10"
          >
            <span className="text-2xl">{newAchievement.icon}</span>
            <div>
              <p className="text-amber-300 text-sm font-semibold">🎉 Achievement Unlocked!</p>
              <p className="text-amber-400/60 text-xs">{newAchievement.title}</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Achievements grid */}
      <div>
        <p className="text-xs text-white/25 uppercase tracking-widest font-semibold mb-3">
          Achievements ({achievements.filter(a => a.unlocked).length}/{achievements.length})
        </p>
        <div className="grid grid-cols-2 gap-2.5">
          {achievements.map((a, i) => (
            <motion.div
              key={a.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.04 }}
              whileHover={a.unlocked ? { scale: 1.03, y: -2 } : {}}
              className={clsx(
                'flex flex-col gap-2 p-3.5 rounded-2xl border transition-all',
                a.unlocked
                  ? 'border-white/10 bg-white/5 cursor-default'
                  : 'border-white/4 bg-white/2 opacity-45'
              )}
              style={a.unlocked ? {
                boxShadow: '0 2px 16px rgba(0,0,0,0.3)'
              } : {}}
            >
              <span className={clsx('text-2xl', !a.unlocked && 'grayscale opacity-50')}>
                {a.unlocked ? a.icon : '🔒'}
              </span>
              <div>
                <p className={clsx('text-xs font-medium', a.unlocked ? 'text-white/80' : 'text-white/30')}>
                  {a.title}
                </p>
                <p className="text-[10px] text-white/25 leading-relaxed mt-0.5">{a.desc}</p>
              </div>
              {a.unlocked && (
                <span className="text-[10px] text-emerald-400/70">✓ Unlocked</span>
              )}
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  )
}
