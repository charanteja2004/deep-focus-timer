/**
 * TaskPanel — Animated task list with Framer Motion check, slide, and drag
 */
import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Check, Trash2, ChevronRight, SendHorizonal } from 'lucide-react'
import clsx from 'clsx'

export default function TaskPanel({ tasks, setTasks, activeTaskId, setActiveTaskId, projects = [] }) {
  const [input, setInput] = useState('')

  const addTask = (e) => {
    e.preventDefault()
    const trimmed = input.trim()
    if (!trimmed) return
    const newTask = { id: Date.now(), text: trimmed, done: false, createdAt: Date.now() }
    setTasks(prev => [...prev, newTask])
    if (!activeTaskId) setActiveTaskId(newTask.id)
    setInput('')
  }

  const toggleDone  = (id) => setTasks(prev => prev.map(t => t.id === id ? { ...t, done: !t.done } : t))
  const deleteTask  = (id) => { setTasks(prev => prev.filter(t => t.id !== id)); if (activeTaskId === id) setActiveTaskId(null) }
  const selectTask  = (id) => setActiveTaskId(prev => prev === id ? null : id)

  const pendingTasks = tasks.filter(t => !t.done)
  const doneTasks    = tasks.filter(t =>  t.done)

  return (
    <div className="flex flex-col gap-3">
      {/* Add task — inline send icon inside input */}
      <form onSubmit={addTask} className="relative">
        <input
          type="text" value={input} onChange={e => setInput(e.target.value)}
          placeholder="Add a task…" maxLength={80}
          className="w-full bg-white/5 border border-white/10 rounded-2xl pl-4 pr-11 py-2.5 text-sm text-white placeholder:text-white/25 transition-all hover:border-white/18 focus:border-brand-500/60"
        />
        <motion.button
          type="submit" disabled={!input.trim()} id="add-task-btn"
          whileHover={{ scale: 1.15 }} whileTap={{ scale: 0.88 }}
          className="absolute right-2.5 top-1/2 -translate-y-1/2 flex items-center justify-center w-7 h-7 rounded-xl transition-all disabled:opacity-25 disabled:cursor-not-allowed"
          style={input.trim()
            ? { background: 'rgba(77,110,245,0.3)', color: '#a5b4fc' }
            : { background: 'transparent', color: 'rgba(255,255,255,0.2)' }
          }
          aria-label="Add task"
        >
          <SendHorizonal size={14} strokeWidth={2.5} />
        </motion.button>
      </form>

      {/* List */}
      {tasks.length === 0 ? (
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }}
          className="text-center py-8 text-white/20 text-sm"
        >
          <div className="text-3xl mb-2">📋</div>
          <p>No tasks yet</p>
          <p className="text-xs mt-1 text-white/15">Add something to focus on</p>
        </motion.div>
      ) : (
        <div className="flex flex-col gap-1 max-h-80 overflow-y-auto pr-1">
          <AnimatePresence initial={false}>
            {pendingTasks.map(task => (
              <TaskItem key={task.id} task={task}
                isActive={activeTaskId === task.id}
                onSelect={selectTask} onToggle={toggleDone} onDelete={deleteTask}
              />
            ))}
          </AnimatePresence>

          <AnimatePresence>
            {doneTasks.length > 0 && (
              <motion.div
                initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                className="mt-2 pt-2 border-t border-white/5"
              >
                <p className="text-xs text-white/20 mb-1.5 px-1">Completed ({doneTasks.length})</p>
                <AnimatePresence>
                  {doneTasks.map(task => (
                    <TaskItem key={task.id} task={task}
                      isActive={false} onSelect={() => {}} onToggle={toggleDone} onDelete={deleteTask} muted
                    />
                  ))}
                </AnimatePresence>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}
    </div>
  )
}

function TaskItem({ task, isActive, onSelect, onToggle, onDelete, muted }) {
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: -8, scale: 0.96 }}
      animate={{ opacity: muted ? 0.45 : 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, x: -20, scale: 0.95 }}
      transition={{ duration: 0.25, ease: [0.34, 1.56, 0.64, 1] }}
      className={clsx(
        'group flex items-center gap-3 px-3 py-2.5 rounded-2xl cursor-pointer',
        'transition-all duration-200',
        isActive
          ? 'bg-brand-600/15 border border-brand-500/25'
          : 'hover:bg-white/5 border border-transparent hover:border-white/8'
      )}
    >
      {/* Check button */}
      <motion.button
        whileHover={{ scale: 1.2 }}
        whileTap={{ scale: 0.85 }}
        onClick={() => onToggle(task.id)}
        className={clsx('task-checkbox flex-shrink-0',
          task.done
            ? 'border-emerald-500 bg-emerald-500/25 text-emerald-400'
            : 'border-white/20 text-white/20 hover:border-brand-400 hover:text-brand-400'
        )}
        aria-label={task.done ? 'Mark incomplete' : 'Mark complete'}
      >
        <AnimatePresence>
          {task.done && (
            <motion.span
              initial={{ scale: 0, rotate: -45 }}
              animate={{ scale: 1, rotate: 0 }}
              exit={{ scale: 0 }}
              transition={{ type: 'spring', stiffness: 400, damping: 20 }}
            >
              <Check size={11} strokeWidth={3.5} />
            </motion.span>
          )}
        </AnimatePresence>
      </motion.button>

      {/* Text */}
      <span
        onClick={() => !task.done && onSelect(task.id)}
        className={clsx('flex-1 text-sm leading-snug select-none',
          task.done ? 'line-through text-white/25' : isActive ? 'text-white' : 'text-white/70'
        )}
      >
        {task.text}
      </span>

      {/* Active / select */}
      {!task.done && (
        <motion.button
          whileHover={{ scale: 1.15 }} whileTap={{ scale: 0.9 }}
          onClick={() => onSelect(task.id)}
          className={clsx('transition-all duration-200 rounded-lg p-1',
            isActive
              ? 'text-brand-400 opacity-100'
              : 'text-white/15 opacity-0 group-hover:opacity-100 hover:text-white/50'
          )}
          title={isActive ? 'Active task' : 'Set as active'}
        >
          <ChevronRight size={14} />
        </motion.button>
      )}

      {/* Delete */}
      <motion.button
        whileHover={{ scale: 1.15 }} whileTap={{ scale: 0.9 }}
        onClick={() => onDelete(task.id)}
        className="opacity-0 group-hover:opacity-100 text-white/15 hover:text-red-400 transition-all duration-200 rounded-lg p-1"
        aria-label="Delete task"
      >
        <Trash2 size={13} />
      </motion.button>
    </motion.div>
  )
}
