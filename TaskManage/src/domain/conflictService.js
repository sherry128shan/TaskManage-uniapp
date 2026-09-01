import { datePart, toDate } from '../utils/date'

function interval(startAt, endAt) {
  const start = toDate(startAt)
  const end = toDate(endAt)
  if (!start || !end || start >= end) return null
  return { start: start.getTime(), end: end.getTime() }
}

export function taskInterval(task) {
  const start = toDate(task.scheduledStartAt)
  if (!start) return null
  const minutes = Number(task.estimatedMinutes) || 30
  return interval(start, new Date(start.getTime() + minutes * 60 * 1000).toISOString())
}

export function findConflicts(task, tasks = [], events = []) {
  const target = taskInterval(task)
  if (!target) return []
  const conflicts = []
  events.forEach((event) => {
    const current = interval(event.startAt, event.endAt)
    if (current && target.start < current.end && current.start < target.end) {
      conflicts.push({ type: 'event', id: event.id, title: event.title, startAt: event.startAt, endAt: event.endAt })
    }
  })
  tasks.forEach((item) => {
    if (item.id === task.id || datePart(item.scheduledStartAt) !== datePart(task.scheduledStartAt)) return
    const current = taskInterval(item)
    if (current && target.start < current.end && current.start < target.end) {
      conflicts.push({ type: 'task', id: item.id, title: item.title, startAt: item.scheduledStartAt, endAt: new Date(current.end).toISOString() })
    }
  })
  return conflicts
}

export function hasInvalidTaskTime(task) {
  const start = toDate(task.scheduledStartAt)
  const due = toDate(task.dueAt)
  return Boolean(start && due && start.getTime() > due.getTime())
}
