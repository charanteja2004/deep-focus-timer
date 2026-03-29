/**
 * TaskPanel — Add / manage tasks, select active task, mark complete
 */
import React, { useState } from 'react'
import { Plus, Check, Trash2, ChevronRight, Circle } from 'lucide-react'
import clsx from 'clsx'

export default function TaskPanel({ tasks, setTasks, activeTaskId, setActiveTaskId }) {
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

  const toggleDone = (id) => {
    setTasks(prev => prev.map(t => t.id === id ? { ...t, done: !t.done } : t))
  }

  const deleteTask = (id) => {
    setTasks(prev => prev.filter(t => t.id !== id))
    if (activeTaskId === id) setActiveTaskId(null)
  }

  const selectTask = (id) => {
    setActiveTaskId(prev => prev === id ? null : id)
  }

  const pendingTasks = tasks.filter(t => !t.done)
  const doneTasks    = tasks.filter(t => t.done)

  return (
    <div className="flex flex-col gap-4 animate-fade-in">
      {/* Add task form */}
      <form onSubmit={addTask} className="flex gap-2">
        <input
          type="text"
          value={input}
          onChange={e => setInput(e.target.value)}
          placeholder="Add a task for this session…"
          className={clsx(
            'flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-2.5',
            'text-sm text-white placeholder:text-white/30',
            'transition-all duration-200 hover:border-white/20',
            'focus:border-brand-500/50'
          )}
          maxLength={80}
        />
        <button
          type="submit"
          disabled={!input.trim()}
          id="add-task-btn"
          className={clsx(
            'flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-medium',
            'bg-brand-600 text-white transition-all duration-200',
            'hover:bg-brand-500 active:scale-95',
            'disabled:opacity-30 disabled:cursor-not-allowed',
            'btn-ripple'
          )}
        >
          <Plus size={15} />
          Add
        </button>
      </form>

      {/* Task list */}
      {tasks.length === 0 ? (
        <div className="text-center py-6 text-white/25 text-sm">
          No tasks yet — add something to focus on
        </div>
      ) : (
        <div className="flex flex-col gap-1 max-h-72 overflow-y-auto pr-1">
          {/* Pending tasks */}
          {pendingTasks.map(task => (
            <TaskItem
              key={task.id}
              task={task}
              isActive={activeTaskId === task.id}
              onSelect={selectTask}
              onToggle={toggleDone}
              onDelete={deleteTask}
            />
          ))}
          {/* Completed tasks */}
          {doneTasks.length > 0 && (
            <div className="mt-3 pt-3 border-t border-white/5">
              <p className="text-xs text-white/25 mb-2 px-1">Completed</p>
              {doneTasks.map(task => (
                <TaskItem
                  key={task.id}
                  task={task}
                  isActive={false}
                  onSelect={() => {}}
                  onToggle={toggleDone}
                  onDelete={deleteTask}
                  muted
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function TaskItem({ task, isActive, onSelect, onToggle, onDelete, muted }) {
  return (
    <div className={clsx(
      'group flex items-center gap-3 px-3 py-2.5 rounded-xl',
      'transition-all duration-200 cursor-pointer',
      isActive
        ? 'bg-brand-600/20 border border-brand-500/30'
        : 'hover:bg-white/5 border border-transparent',
      muted && 'opacity-40'
    )}>
      {/* Done toggle */}
      <button
        onClick={() => onToggle(task.id)}
        id={`task-done-${task.id}`}
        className={clsx(
          'task-checkbox flex-shrink-0 transition-all',
          task.done
            ? 'border-emerald-500 bg-emerald-500/20 text-emerald-400'
            : 'border-white/20 text-white/20 hover:border-white/50'
        )}
        aria-label={task.done ? 'Mark incomplete' : 'Mark complete'}
      >
        {task.done && <Check size={11} strokeWidth={3} />}
      </button>

      {/* Task text */}
      <span
        className={clsx(
          'flex-1 text-sm leading-snug',
          task.done ? 'line-through text-white/30' : 'text-white/80',
          isActive && !task.done && 'text-white'
        )}
        onClick={() => !task.done && onSelect(task.id)}
      >
        {task.text}
      </span>

      {/* Active indicator / select */}
      {!task.done && (
        <button
          onClick={() => onSelect(task.id)}
          id={`task-select-${task.id}`}
          className={clsx(
            'transition-all duration-200 rounded-lg p-1',
            isActive
              ? 'text-brand-400 opacity-100'
              : 'text-white/20 opacity-0 group-hover:opacity-100 hover:text-white/60'
          )}
          aria-label={isActive ? 'Deselect task' : 'Set as active task'}
          title={isActive ? 'Active task' : 'Set as active'}
        >
          {isActive ? <ChevronRight size={14} /> : <Circle size={14} />}
        </button>
      )}

      {/* Delete */}
      <button
        onClick={() => onDelete(task.id)}
        id={`task-delete-${task.id}`}
        className="opacity-0 group-hover:opacity-100 text-white/20 hover:text-red-400 transition-all duration-200 rounded-lg p-1"
        aria-label="Delete task"
      >
        <Trash2 size={13} />
      </button>
    </div>
  )
}
