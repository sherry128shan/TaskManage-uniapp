import { readStorage, writeStorage } from '../utils/storage'
import { createId } from '../utils/ids'

function storageKey(userId) {
  return `status-logs:${userId}`
}

export function listStatusLogs(userId) {
  return readStorage(storageKey(userId), [])
}

export function addStatusLog(userId, input) {
  const log = {
    id: createId('status'),
    taskId: input.taskId,
    action: input.action,
    fromValue: input.fromValue || null,
    toValue: input.toValue || null,
    occurredAt: new Date().toISOString()
  }
  writeStorage(storageKey(userId), [log, ...listStatusLogs(userId)])
  return log
}
