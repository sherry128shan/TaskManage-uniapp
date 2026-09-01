import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import { useAuthStore } from './auth'
import { createCourse, listCourses, updateCourse } from '../data/courseRepository'

export const useCourseStore = defineStore('courses', () => {
  const auth = useAuthStore()
  const courses = ref([])
  const isReady = ref(false)
  const activeCourses = computed(() => courses.value.filter((course) => !course.archived))

  function refresh() {
    courses.value = auth.user ? listCourses(auth.user.id) : []
    isReady.value = true
  }

  function add(input) {
    const course = createCourse(auth.user.id, input)
    courses.value = [course, ...courses.value]
    return course
  }

  function update(id, input) {
    const course = updateCourse(auth.user.id, id, input)
    if (!course) return null
    const index = courses.value.findIndex((item) => item.id === id)
    if (index >= 0) courses.value[index] = course
    return course
  }

  return { courses, activeCourses, isReady, refresh, add, update }
})
