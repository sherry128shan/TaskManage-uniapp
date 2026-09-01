import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import { useAuthStore } from './auth'
import { createReminder, deleteReminder, listReminders, listTaskReminders, updateReminder } from '../data/reminderRepository'
import { scheduleReminder, cancelReminder } from '../native/alarm'
import { addStatusLog } from '../data/statusLogRepository'

export const useAlarmStore = defineStore('alarms', () => {
  const auth = useAuthStore()
  const alarms = ref([])
  const upcoming = computed(() => alarms.value.filter((alarm) => alarm.status === 'scheduled' && new Date(alarm.fireAt).getTime() >= Date.now()))

  function refresh() {
    alarms.value = auth.user ? listReminders(auth.user.id) : []
  }

  async function add(input) {
    const alarm = createReminder(auth.user.id, input)
    alarms.value = listReminders(auth.user.id)
    const result = await scheduleReminder(alarm)
    if (!result.supported && alarm.status === 'scheduled') updateReminder(auth.user.id, alarm.id, { status: 'failed' })
    return alarm
  }

  async function remove(id) {
    const alarm = alarms.value.find((item) => item.id === id)
    if (alarm) await cancelReminder(alarm.systemNotificationId)
    deleteReminder(auth.user.id, id)
    alarms.value = listReminders(auth.user.id)
  }

  async function cancelForTask(taskId) {
    const taskReminders = listTaskReminders(auth.user.id, taskId)
    for (const reminder of taskReminders) {
      await cancelReminder(reminder.systemNotificationId)
      updateReminder(auth.user.id, reminder.id, { status: 'cancelled' })
    }
    refresh()
  }

  async function setTaskReminder(task, preset) {
    const existing = listTaskReminders(auth.user.id, task.id)
    existing.forEach((reminder) => updateReminder(auth.user.id, reminder.id, { status: 'cancelled' }))
    if (!preset || !task.dueAt) {
      refresh()
      return null
    }
    const offsetMinutes = preset === 'day' ? 24 * 60 : 2 * 60
    const fireAt = new Date(new Date(task.dueAt).getTime() - offsetMinutes * 60 * 1000).toISOString()
    if (new Date(fireAt).getTime() <= Date.now()) {
      refresh()
      return null
    }
    const reminder = await add({ taskId: task.id, mode: 'relative', fireAt, offsetMinutes })
    addStatusLog(auth.user.id, { taskId: task.id, action: 'reminder_scheduled', toValue: { reminderId: reminder.id, offsetMinutes } })
    return reminder
  }

  return { alarms, upcoming, refresh, add, remove, cancelForTask, setTaskReminder }
})
