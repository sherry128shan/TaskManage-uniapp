import { computed } from 'vue'
import { defineStore } from 'pinia'
import { useTaskStore } from './tasks'
import { useAuthStore } from './auth'
import { getTodayFeedback, getWeeklyFeedback } from '../domain/feedbackService'
import { listStatusLogs } from '../data/statusLogRepository'
import { todayISO, startOfWeekISO } from '../utils/date'

export const useFeedbackStore = defineStore('feedback', () => {
  const taskStore = useTaskStore()
  const auth = useAuthStore()
  const today = computed(() => getTodayFeedback(taskStore.tasks, todayISO()))
  const week = computed(() => getWeeklyFeedback(taskStore.tasks, startOfWeekISO(), auth.user ? listStatusLogs(auth.user.id) : []))
  return { today, week }
})
