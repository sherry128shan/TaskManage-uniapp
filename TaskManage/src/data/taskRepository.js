import { readStorage, writeStorage } from '../utils/storage'
import { createId } from '../utils/ids'

function storageKey(userId) {
  return `tasks:${userId}`
}

export const STATUS = Object.freeze({
  TODO: 'todo',
  DOING: 'doing',
  DONE: 'done',
  CANCELLED: 'cancelled'
})

export const STATUS_LABELS = Object.freeze({
  [STATUS.TODO]: '未开始',
  [STATUS.DOING]: '进行中',
  [STATUS.DONE]: '已完成',
  [STATUS.CANCELLED]: '已取消'
})

export const TASK_TYPES = Object.freeze({
  ASSIGNMENT: 'assignment',
  REVIEW: 'review',
  CLUB: 'club',
  PERSONAL: 'personal',
  OTHER: 'other'
})

export const TASK_TYPE_LABELS = Object.freeze({
  [TASK_TYPES.ASSIGNMENT]: '作业',
  [TASK_TYPES.REVIEW]: '复习',
  [TASK_TYPES.CLUB]: '社团',
  [TASK_TYPES.PERSONAL]: '个人',
  [TASK_TYPES.OTHER]: '其他'
})

export const PRIORITIES = Object.freeze({ HIGH: 'high', NORMAL: 'normal', LOW: 'low' })
export const PRIORITY_LABELS = Object.freeze({ high: '高', normal: '普通', low: '低' })

function nowISO() {
  return new Date().toISOString()
}

function validMinutes(value) {
  const minutes = Number(value)
  return Number.isFinite(minutes) && minutes >= 5 && minutes <= 480 ? Math.round(minutes) : null
}

export function normalizeTask(task = {}) {
  const status = Object.values(STATUS).includes(task.status) ? task.status : STATUS.TODO
  return {
    id: task.id || createId('task'),
    userId: task.userId || null,
    title: String(task.title || '').trim().slice(0, 80),
    description: String(task.description || '').trim().slice(0, 500),
    type: Object.values(TASK_TYPES).includes(task.type) ? task.type : TASK_TYPES.OTHER,
    courseId: task.courseId || null,
    eventId: task.eventId || null,
    dueAt: task.dueAt || null,
    scheduledStartAt: task.scheduledStartAt || null,
    estimatedMinutes: validMinutes(task.estimatedMinutes),
    priority: Object.values(PRIORITIES).includes(task.priority) ? task.priority : PRIORITIES.NORMAL,
    status,
    startedAt: task.startedAt || null,
    completedAt: task.completedAt || null,
    completionTimeUnknown: Boolean(task.completionTimeUnknown),
    source: task.source || 'manual',
    createdAt: task.createdAt || nowISO(),
    updatedAt: task.updatedAt || nowISO()
  }
}

export function listTasks(userId) {
  return readStorage(storageKey(userId), []).map((task) => normalizeTask({ ...task, userId }))
}

export function saveTasks(userId, tasks) {
  writeStorage(storageKey(userId), tasks.map((task) => normalizeTask({ ...task, userId })))
}

export function createTask(userId, input = {}) {
  const task = normalizeTask({
    ...input,
    id: createId('task'),
    userId,
    createdAt: nowISO(),
    updatedAt: nowISO()
  })
  const tasks = listTasks(userId)
  saveTasks(userId, [task, ...tasks])
  return task
}

export function updateTask(userId, id, input = {}) {
  const tasks = listTasks(userId)
  const index = tasks.findIndex((task) => task.id === id)
  if (index < 0) return null
  const before = tasks[index]
  const nextStatus = input.status || before.status
  const updated = normalizeTask({
    ...before,
    ...input,
    id,
    userId,
    status: nextStatus,
    startedAt: nextStatus === STATUS.DOING ? (input.startedAt || before.startedAt || nowISO()) : before.startedAt,
    completedAt: nextStatus === STATUS.DONE ? (input.completedAt || before.completedAt || nowISO()) : (input.status && nextStatus !== STATUS.DONE ? null : before.completedAt),
    updatedAt: nowISO()
  })
  tasks[index] = updated
  saveTasks(userId, tasks)
  return { task: updated, before }
}

export function deleteTask(userId, id) {
  const tasks = listTasks(userId)
  saveTasks(userId, tasks.filter((task) => task.id !== id))
}
