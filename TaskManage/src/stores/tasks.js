import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import { useAuthStore } from './auth'
import {
  STATUS,
  STATUS_LABELS,
  createTask,
  deleteTask,
  listTasks,
  saveTasks,
  updateTask
} from '../data/taskRepository'
import { addStatusLog } from '../data/statusLogRepository'
import { migrateUserData } from '../data/migrations'
import { endOfDayISO } from '../utils/date'

export const useTaskStore = defineStore('tasks', () => {
  const auth = useAuthStore()
  const tasks = ref([])
  const isReady = ref(false)
  const centerTab = ref('active')
  const centerQuery = ref('')
  const openTasks = computed(() => tasks.value.filter((task) => ![STATUS.DONE, STATUS.CANCELLED].includes(task.status)))
  const doneCount = computed(() => tasks.value.filter((task) => task.status === STATUS.DONE).length)
  const unplannedCount = computed(() => openTasks.value.filter((task) => !task.dueAt && !task.scheduledStartAt).length)
  const completion = computed(() => (tasks.value.length ? Math.round((doneCount.value / tasks.value.length) * 100) : 0))

  function refresh() {
    if (!auth.user) {
      tasks.value = []
      isReady.value = true
      return
    }
    migrateUserData(auth.user.id)
    tasks.value = listTasks(auth.user.id).sort((a, b) => String(a.dueAt || '9999').localeCompare(String(b.dueAt || '9999')))
    isReady.value = true
  }

  function add(input) {
    const task = createTask(auth.user.id, input)
    tasks.value = [task, ...tasks.value]
    addStatusLog(auth.user.id, { taskId: task.id, action: 'created', toValue: task })
    return task
  }

  function update(id, input) {
    const result = updateTask(auth.user.id, id, input)
    if (!result) return null
    const { task, before } = result
    const index = tasks.value.findIndex((item) => item.id === id)
    if (index >= 0) tasks.value[index] = task
    if (before.status !== task.status) {
      const action = task.status === STATUS.DONE ? 'completed' : task.status === STATUS.DOING ? 'started' : task.status === STATUS.CANCELLED ? 'cancelled' : 'reopened'
      addStatusLog(auth.user.id, { taskId: id, action, fromValue: { status: before.status }, toValue: { status: task.status } })
    }
    if (before.scheduledStartAt !== task.scheduledStartAt || before.dueAt !== task.dueAt) {
      addStatusLog(auth.user.id, { taskId: id, action: 'rescheduled', fromValue: { dueAt: before.dueAt, scheduledStartAt: before.scheduledStartAt }, toValue: { dueAt: task.dueAt, scheduledStartAt: task.scheduledStartAt } })
    }
    return task
  }

  function start(id) {
    return update(id, { status: STATUS.DOING })
  }

  function complete(id) {
    return update(id, { status: STATUS.DONE, completedAt: new Date().toISOString() })
  }

  function reopen(id) {
    return update(id, { status: STATUS.TODO })
  }

  function cancel(id) {
    return update(id, { status: STATUS.CANCELLED })
  }

  function plan(id, date, options = {}) {
    return update(id, {
      dueAt: date ? (options.dueAt || endOfDayISO(date)) : null,
      scheduledStartAt: options.scheduledStartAt || null
    })
  }

  function toggle(id) {
    const task = tasks.value.find((item) => item.id === id)
    if (!task) return null
    return task.status === STATUS.DONE ? reopen(id) : complete(id)
  }

  function remove(id) {
    deleteTask(auth.user.id, id)
    tasks.value = tasks.value.filter((task) => task.id !== id)
  }

  function replace(nextTasks) {
    saveTasks(auth.user.id, nextTasks)
    tasks.value = nextTasks
  }

  function setCenterTab(tab) {
    centerTab.value = tab
  }

  return {
    tasks,
    openTasks,
    doneCount,
    unplannedCount,
    completion,
    isReady,
    centerTab,
    centerQuery,
    refresh,
    add,
    update,
    start,
    complete,
    reopen,
    cancel,
    plan,
    toggle,
    remove,
    replace,
    setCenterTab,
    STATUS,
    STATUS_LABELS
  }
})
