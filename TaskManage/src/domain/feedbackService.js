import { datePart, startOfWeekISO, todayISO, toDate } from '../utils/date'

function inRange(value, start, end) {
  const date = toDate(value)
  return Boolean(date && date >= start && date < end)
}

function rangeForWeek(weekStart) {
  const start = new Date(`${weekStart}T00:00:00`)
  const end = new Date(start)
  end.setDate(end.getDate() + 7)
  return { start, end }
}

export function getTodayFeedback(tasks, date = todayISO()) {
  const dayStart = new Date(`${date}T00:00:00`)
  const dayEnd = new Date(dayStart)
  dayEnd.setDate(dayEnd.getDate() + 1)
  const relevant = tasks.filter((task) => task.status !== 'cancelled' && (datePart(task.scheduledStartAt) === date || datePart(task.dueAt) === date || inRange(task.completedAt, dayStart, dayEnd)))
  const due = relevant.filter((task) => task.status !== 'done')
  const completed = relevant.filter((task) => task.status === 'done' && inRange(task.completedAt, dayStart, dayEnd))
  const onTime = completed.filter((task) => task.dueAt && toDate(task.completedAt) <= toDate(task.dueAt))
  return { total: due.length + completed.length, completed: completed.length, onTime: onTime.length, overdue: due.filter((task) => task.dueAt && toDate(task.dueAt) < dayStart).length }
}

export function getWeeklyFeedback(tasks, weekStart = startOfWeekISO(), logs = []) {
  const { start, end } = rangeForWeek(weekStart)
  const active = tasks.filter((task) => task.status !== 'cancelled')
  const dueTasks = active.filter((task) => inRange(task.dueAt, start, end) || (toDate(task.dueAt) && toDate(task.dueAt) < end && toDate(task.dueAt) >= start))
  const completed = active.filter((task) => inRange(task.completedAt, start, end))
  const denominator = dueTasks.filter((task) => !task.completionTimeUnknown && (task.status === 'done' || toDate(task.dueAt) < new Date())).length
  const onTime = dueTasks.filter((task) => task.status === 'done' && !task.completionTimeUnknown && toDate(task.completedAt) <= toDate(task.dueAt)).length
  const rescheduled = logs.filter((log) => log.action === 'rescheduled' && inRange(log.occurredAt, start, end)).length
  const daily = Array.from({ length: 7 }, (_, index) => {
    const date = new Date(start)
    date.setDate(date.getDate() + index)
    const key = todayISO(date)
    return { date: key, label: new Intl.DateTimeFormat('zh-CN', { weekday: 'short' }).format(date), count: completed.filter((task) => datePart(task.completedAt) === key).length }
  })
  const peakDay = daily.reduce((peak, item) => item.count > peak.count ? item : peak, daily[0])
  const byType = active.reduce((result, task) => {
    if (datePart(task.dueAt) < weekStart || datePart(task.dueAt) >= todayISO(end)) return result
    result[task.type] = (result[task.type] || 0) + 1
    return result
  }, {})
  return { weekStart, planned: dueTasks.length, completed: completed.length, denominator, onTime, onTimeRate: denominator ? Math.round((onTime / denominator) * 100) : 0, rescheduled, daily, peakDay, byType }
}
