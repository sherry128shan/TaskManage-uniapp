import { readStorage, writeStorage } from '../utils/storage'
import { createId } from '../utils/ids'

function storageKey(userId) {
  return `calendar-events:${userId}`
}

function normalizeEvent(event = {}) {
  return {
    id: event.id || createId('event'),
    userId: event.userId || null,
    courseId: event.courseId || null,
    type: event.type || 'personal',
    title: String(event.title || '').trim().slice(0, 80),
    startAt: event.startAt || null,
    endAt: event.endAt || null,
    recurrenceRule: event.recurrenceRule || null,
    recurrenceGroupId: event.recurrenceGroupId || null,
    location: String(event.location || '').trim().slice(0, 80),
    source: event.source || 'manual',
    createdAt: event.createdAt || new Date().toISOString()
  }
}

export function listEvents(userId) {
  return readStorage(storageKey(userId), []).map((event) => normalizeEvent({ ...event, userId }))
}

export function createEvent(userId, input) {
  const event = normalizeEvent({ ...input, id: createId('event'), userId })
  writeStorage(storageKey(userId), [event, ...listEvents(userId)])
  return event
}

export function saveEvents(userId, events) {
  writeStorage(storageKey(userId), events.map((event) => normalizeEvent({ ...event, userId })))
}

export function deleteEvent(userId, id) {
  saveEvents(userId, listEvents(userId).filter((event) => event.id !== id))
}
