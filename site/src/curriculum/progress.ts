import { useSyncExternalStore } from 'react'
import { CONFIG } from '../config'
import { initialAttempts } from './load'
import { clearedAt, type Attempt } from './quiz'
import type { Curriculum, NodeState, Status } from './types'

/** Quiz attempts per lesson id, as recorded in progress/<id>.json. */
export type ProgressFile = Readonly<Record<string, readonly Attempt[]>>

const KEY = CONFIG.storage.progressKey

/** the learner's own attempts, kept in the browser so a built (static) site remembers progress across reloads */
function loadLocal(): Record<string, Attempt[]> {
  try {
    const raw: unknown = JSON.parse(localStorage.getItem(KEY) ?? 'null')
    if (!raw || typeof raw !== 'object') return {}
    const out: Record<string, Attempt[]> = {}
    for (const [id, attempts] of Object.entries(raw as Record<string, unknown>)) {
      if (Array.isArray(attempts)) out[id] = attempts as Attempt[]
    }
    return out
  } catch {
    return {}
  }
}

function saveLocal(state: ProgressFile) {
  try {
    localStorage.setItem(KEY, JSON.stringify(state))
  } catch {
    /* storage blocked or full (e.g. private mode): progress simply will not persist */
  }
}

// committed progress/ files seed the map; the browser's own record (localStorage) takes precedence
let current: ProgressFile = { ...initialAttempts, ...loadLocal() }
const listeners = new Set<() => void>()

export const progress = {
  get: () => current,
  subscribe(listener: () => void) {
    listeners.add(listener)
    return () => listeners.delete(listener)
  },
  /** record an attempt (graded in the page, or returned by the dev server) and remember it in the browser */
  add(id: string, attempt: Attempt) {
    current = { ...current, [id]: [...(current[id] ?? []), attempt] }
    saveLocal(current)
    listeners.forEach((l) => l())
  },
}

export function useProgress(): ProgressFile {
  return useSyncExternalStore(progress.subscribe, progress.get, progress.get)
}

export function attemptsOf(p: ProgressFile, id: string): readonly Attempt[] {
  return p[id] ?? []
}

/** done once no wrong answer is left (retries ask only the wrong topics); in progress before that */
export function statusOf(p: ProgressFile, id: string): Status {
  const attempts = attemptsOf(p, id)
  if (clearedAt(attempts) >= 0) return 'done'
  return attempts.length > 0 ? 'in_progress' : 'todo'
}

/** date of the attempt that left no wrong answer */
export function passedOn(p: ProgressFile, id: string): string | undefined {
  const attempts = attemptsOf(p, id)
  return attempts[clearedAt(attempts)]?.date
}

export function nodeState(c: Curriculum, p: ProgressFile, id: string): NodeState {
  const s = statusOf(p, id)
  if (s !== 'todo') return s
  return c.byId.get(id)!.requires.every((r) => statusOf(p, r) === 'done') ? 'available' : 'locked'
}
