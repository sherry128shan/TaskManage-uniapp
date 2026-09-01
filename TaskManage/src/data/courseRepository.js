import { readStorage, writeStorage } from '../utils/storage'
import { createId } from '../utils/ids'

function storageKey(userId) {
  return `courses:${userId}`
}

export const COURSE_COLORS = ['#477269', '#8C6A4A', '#4D7194', '#8C5971', '#6A6D43']

function normalizeCourse(course = {}) {
  return {
    id: course.id || createId('course'),
    userId: course.userId || null,
    termId: course.termId || 'current',
    name: String(course.name || '').trim().slice(0, 80),
    teacher: String(course.teacher || '').trim().slice(0, 60),
    location: String(course.location || '').trim().slice(0, 80),
    color: course.color || COURSE_COLORS[0],
    archived: Boolean(course.archived),
    createdAt: course.createdAt || new Date().toISOString()
  }
}

export function listCourses(userId) {
  return readStorage(storageKey(userId), []).map((course) => normalizeCourse({ ...course, userId }))
}

export function createCourse(userId, input) {
  const course = normalizeCourse({ ...input, id: createId('course'), userId })
  writeStorage(storageKey(userId), [course, ...listCourses(userId)])
  return course
}

export function updateCourse(userId, id, input) {
  const courses = listCourses(userId)
  const index = courses.findIndex((course) => course.id === id)
  if (index < 0) return null
  courses[index] = normalizeCourse({ ...courses[index], ...input, id, userId })
  writeStorage(storageKey(userId), courses)
  return courses[index]
}

export function deleteCourse(userId, id) {
  writeStorage(storageKey(userId), listCourses(userId).filter((course) => course.id !== id))
}
