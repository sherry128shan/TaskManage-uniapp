import { readStorage, writeStorage } from '../../utils/storage'
import { endOfDayISO } from '../../utils/date'
import { createId } from '../../utils/ids'

export const CURRENT_SCHEMA_VERSION = 2

function versionKey(userId) {
  return `schema-version:${userId}`
}

function toISO(value) {
  if (!value) return new Date().toISOString()
  if (typeof value === 'number') return new Date(value).toISOString()
  return value
}

function migrateTask(task, userId) {
  const dueAt = task.dueAt || (task.dueDate ? endOfDayISO(task.dueDate) : null)
  const status = ['todo', 'doing', 'done', 'cancelled'].includes(task.status) ? task.status : 'todo'
  return {
    id: task.id || createId('task'),
    userId,
    title: String(task.title || '').trim().slice(0, 80),
    description: String(task.description || '').trim().slice(0, 500),
    type: task.type || 'other',
    courseId: task.courseId || null,
    eventId: task.eventId || null,
    dueAt,
    scheduledStartAt: task.scheduledStartAt || null,
    estimatedMinutes: Number.isFinite(Number(task.estimatedMinutes)) ? Number(task.estimatedMinutes) : null,
    priority: task.priority || 'normal',
    status,
    startedAt: task.startedAt || null,
    completedAt: task.completedAt || null,
    completionTimeUnknown: status === 'done' && !task.completedAt,
    source: task.source || 'manual',
    createdAt: toISO(task.createdAt),
    updatedAt: toISO(task.updatedAt)
  }
}

export function migrateUserData(userId) {
  const currentVersion = Number(readStorage(versionKey(userId), 0))
  if (currentVersion >= CURRENT_SCHEMA_VERSION) return { migrated: false, pendingReminders: [] }

  const oldTasks = readStorage(`tasks:${userId}`, [])
  const oldAlarms = readStorage(`alarms:${userId}`, [])
  writeStorage(`backup:${userId}:v${currentVersion || 1}`, {
    tasks: oldTasks,
    alarms: oldAlarms,
    createdAt: new Date().toISOString()
  })

  const tasks = Array.isArray(oldTasks) ? oldTasks.map((task) => migrateTask(task, userId)) : []
  writeStorage(`tasks:${userId}`, tasks)

  const pendingReminders = Array.isArray(oldAlarms)
    ? oldAlarms.map((alarm) => ({
      ...alarm,
      id: alarm.id || createId('reminder'),
      userId,
      status: alarm.enabled === false ? 'cancelled' : 'scheduled',
      taskId: null,
      eventId: null,
      source: 'legacy-unbound'
    }))
    : []
  if (pendingReminders.length) writeStorage(`pending-reminders:${userId}`, pendingReminders)
  writeStorage(versionKey(userId), CURRENT_SCHEMA_VERSION)
  writeStorage('schemaVersion', CURRENT_SCHEMA_VERSION)
  return { migrated: true, pendingReminders }
}
