import { readStorage, writeStorage } from '../utils/storage'
import { createId } from '../utils/ids'

function storageKey(userId) {
  return `reminders:${userId}`
}

function normalizeReminder(reminder = {}) {
  return {
    id: reminder.id || createId('reminder'),
    taskId: reminder.taskId || null,
    eventId: reminder.eventId || null,
    mode: reminder.mode || 'absolute',
    fireAt: reminder.fireAt || null,
    offsetMinutes: Number.isFinite(Number(reminder.offsetMinutes)) ? Number(reminder.offsetMinutes) : null,
    systemNotificationId: reminder.systemNotificationId || null,
    status: reminder.status || 'scheduled',
    createdAt: reminder.createdAt || new Date().toISOString()
  }
}

export function listReminders(userId) {
  return readStorage(storageKey(userId), []).map(normalizeReminder).sort((a, b) => String(a.fireAt).localeCompare(String(b.fireAt)))
}

export function saveReminders(userId, reminders) {
  writeStorage(storageKey(userId), reminders.map(normalizeReminder))
}

export function createReminder(userId, input) {
  const reminder = normalizeReminder({ ...input, id: createId('reminder') })
  saveReminders(userId, [reminder, ...listReminders(userId)])
  return reminder
}

export function updateReminder(userId, id, input) {
  const reminders = listReminders(userId)
  const index = reminders.findIndex((item) => item.id === id)
  if (index < 0) return null
  reminders[index] = normalizeReminder({ ...reminders[index], ...input, id })
  saveReminders(userId, reminders)
  return reminders[index]
}

export function deleteReminder(userId, id) {
  saveReminders(userId, listReminders(userId).filter((item) => item.id !== id))
}

export function listTaskReminders(userId, taskId) {
  return listReminders(userId).filter((item) => item.taskId === taskId)
}
