import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import { useAuthStore } from './auth'
import { createEvent, deleteEvent, listEvents } from '../data/eventRepository'

export const useCalendarStore = defineStore('calendar', () => {
  const auth = useAuthStore()
  const events = ref([])
  const isReady = ref(false)
  const upcomingEvents = computed(() => [...events.value].sort((a, b) => String(a.startAt).localeCompare(String(b.startAt))))

  function refresh() {
    events.value = auth.user ? listEvents(auth.user.id) : []
    isReady.value = true
  }

  function add(input) {
    const event = createEvent(auth.user.id, input)
    events.value = [event, ...events.value]
    return event
  }

  function remove(id) {
    deleteEvent(auth.user.id, id)
    events.value = events.value.filter((event) => event.id !== id)
  }

  return { events, upcomingEvents, isReady, refresh, add, remove }
})
