<script setup>
import { computed, onMounted, ref } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import AppNav from '../../components/AppNav.vue'
import { useAlarmStore } from '../../stores/alarms'
import { useAuthStore } from '../../stores/auth'
import { useCourseStore } from '../../stores/courses'
import { useTaskStore } from '../../stores/tasks'
import { TASK_TYPE_LABELS } from '../../data/taskRepository'
import { addDaysISO, datePart, formatDate, formatDateTime, todayISO } from '../../utils/date'

const auth = useAuthStore()
const taskStore = useTaskStore()
const alarmStore = useAlarmStore()
const courseStore = useCourseStore()
const typeFilter = ref('all')
const selectedCourseId = ref('')
const tabs = [
  { key: 'active', label: '进行中' },
  { key: 'inbox', label: '收集箱' },
  { key: 'upcoming', label: '即将到期' },
  { key: 'done', label: '已完成' }
]
const typeOptions = [
  { label: '全部类型', value: 'all' },
  { label: '作业', value: 'assignment' },
  { label: '复习', value: 'review' },
  { label: '社团', value: 'club' },
  { label: '个人', value: 'personal' },
  { label: '其他', value: 'other' }
]

const currentTabLabel = computed(() => tabs.find((tab) => tab.key === taskStore.centerTab)?.label || '进行中')
const filteredTasks = computed(() => {
  const today = todayISO()
  const query = taskStore.centerQuery.trim().toLowerCase()
  const limit = addDaysISO(today, 7)
  let result = taskStore.centerTab === 'inbox'
    ? taskStore.tasks.filter((task) => task.status !== taskStore.STATUS.DONE && task.status !== taskStore.STATUS.CANCELLED && !task.dueAt && !task.scheduledStartAt)
    : taskStore.centerTab === 'upcoming'
      ? taskStore.tasks.filter((task) => task.status !== taskStore.STATUS.DONE && task.status !== taskStore.STATUS.CANCELLED && task.dueAt && datePart(task.dueAt) >= today && datePart(task.dueAt) <= limit)
      : taskStore.centerTab === 'done'
        ? taskStore.tasks.filter((task) => task.status === taskStore.STATUS.DONE && datePart(task.completedAt) >= addDaysISO(today, -30))
        : taskStore.openTasks
  return result.filter((task) => {
    const course = courseStore.courses.find((item) => item.id === task.courseId)
    const matchesQuery = !query || `${task.title} ${task.description} ${course?.name || ''}`.toLowerCase().includes(query)
    const matchesType = typeFilter.value === 'all' || task.type === typeFilter.value
    const matchesCourse = !selectedCourseId.value || task.courseId === selectedCourseId.value
    return matchesQuery && matchesType && matchesCourse
  }).sort((a, b) => String(a.dueAt || a.createdAt).localeCompare(String(b.dueAt || b.createdAt)))
})

onMounted(() => {
  const pages = getCurrentPages()
  const options = pages[pages.length - 1]?.options || {}
  if (options.tab && tabs.some((tab) => tab.key === options.tab)) taskStore.setCenterTab(options.tab)
  if (!auth.hydrated) auth.hydrate()
  ensureSession()
  taskStore.refresh()
  courseStore.refresh()
})

onShow(() => {
  if (auth.isLoggedIn) {
    taskStore.refresh()
    courseStore.refresh()
  }
})

function ensureSession() {
  if (!auth.isLoggedIn) uni.reLaunch({ url: '/pages/login/login' })
}

function openEdit(task) {
  uni.navigateTo({ url: `/pages/tasks/edit?id=${encodeURIComponent(task.id)}` })
}

function complete(task) {
  taskStore.complete(task.id)
  alarmStore.cancelForTask(task.id)
  uni.showToast({ title: '已完成', icon: 'none' })
}

function reopen(task) {
  taskStore.reopen(task.id)
}

function planTask(task, days) {
  taskStore.plan(task.id, addDaysISO(todayISO(), days))
  uni.showToast({ title: days === 0 ? '已安排到今天' : '已安排到明天', icon: 'none' })
}

function removeTask(task) {
  uni.showModal({ title: '删除这项任务？', content: '删除后无法在任务中心找回。', confirmText: '删除', cancelText: '保留', confirmColor: '#A34C42' }).then(({ confirm }) => {
    if (confirm) {
      taskStore.remove(task.id)
      alarmStore.cancelForTask(task.id)
      uni.showToast({ title: '已删除', icon: 'none' })
    }
  }).catch(() => {})
}

function showActions(task) {
  const actions = task.status === taskStore.STATUS.DONE ? ['恢复任务', '删除任务'] : ['完成任务', '删除任务']
  uni.showActionSheet({ itemList: actions }).then(({ tapIndex }) => {
    if (tapIndex === 0) task.status === taskStore.STATUS.DONE ? reopen(task) : complete(task)
    if (tapIndex === 1) removeTask(task)
  }).catch(() => {})
}

function clearFilters() {
  taskStore.centerQuery = ''
  typeFilter.value = 'all'
  selectedCourseId.value = ''
}

function taskTime(task) {
  if (task.scheduledStartAt) return `计划 ${formatDateTime(task.scheduledStartAt)}`
  if (task.dueAt) return `截止 ${formatDateTime(task.dueAt)}`
  return '还没有安排时间'
}

function courseName(task) {
  return courseStore.courses.find((course) => course.id === task.courseId)?.name || ''
}
</script>

<template>
  <view class="center-page safe-bottom">
    <view class="center-header">
      <view><text class="eyebrow">任务清单</text><text class="page-title">任务</text><text class="page-subtitle">把所有需要处理的事放在这里。</text></view>
      <text class="task-count">{{ taskStore.openTasks.length }} 件进行中</text>
    </view>

    <view class="search-box"><text class="search-icon">⌕</text><input v-model="taskStore.centerQuery" placeholder="搜索任务、描述或课程" placeholder-class="field-placeholder" confirm-type="search" /><button v-if="taskStore.centerQuery" aria-label="清除搜索" @tap="taskStore.centerQuery = ''">×</button></view>
    <scroll-view class="tab-scroll" scroll-x>
      <view class="tabs">
        <button v-for="tab in tabs" :key="tab.key" class="tab-button" :class="{ active: taskStore.centerTab === tab.key }" @tap="taskStore.setCenterTab(tab.key)">{{ tab.label }}<text v-if="tab.key === 'inbox' && taskStore.unplannedCount" class="tab-count">{{ taskStore.unplannedCount }}</text></button>
      </view>
    </scroll-view>

    <view class="filters">
      <picker mode="selector" :range="typeOptions" range-key="label" @change="typeFilter = typeOptions[$event.detail.value].value"><view class="filter-chip">{{ typeOptions.find((item) => item.value === typeFilter)?.label }}⌄</view></picker>
      <picker v-if="courseStore.activeCourses.length" mode="selector" :range="[{ name: '全部课程', id: '' }, ...courseStore.activeCourses]" range-key="name" @change="selectedCourseId = [{ name: '全部课程', id: '' }, ...courseStore.activeCourses][$event.detail.value].id"><view class="filter-chip">{{ courseStore.courses.find((item) => item.id === selectedCourseId)?.name || '全部课程' }}⌄</view></picker>
      <button v-if="typeFilter !== 'all' || selectedCourseId" class="clear-filter" @tap="clearFilters">清除筛选</button>
    </view>

    <view class="list-heading"><text>{{ currentTabLabel }}</text><text>{{ filteredTasks.length }}</text></view>
    <view v-if="!taskStore.isReady" class="state-card"><text class="state-title">正在加载任务…</text></view>
    <view v-else-if="!filteredTasks.length" class="empty-state">
      <view class="empty-symbol">○</view>
      <text class="state-title">{{ taskStore.centerTab === 'inbox' ? '收集箱是空的' : `暂无${currentTabLabel}任务` }}</text>
      <text class="state-copy">{{ taskStore.centerTab === 'inbox' ? '先完成记录，等有空时再安排时间。' : '点击底部的＋，记录下一件要做的事。' }}</text>
      <button v-if="taskStore.centerQuery || typeFilter !== 'all' || selectedCourseId" class="secondary-button" @tap="clearFilters">清除搜索和筛选</button>
    </view>
    <view v-else class="task-list">
      <view v-for="task in filteredTasks" :key="task.id" class="task-row" @tap="openEdit(task)">
        <view class="task-status" :class="[`status-${task.status}`, { overdue: task.dueAt && datePart(task.dueAt) < todayISO() }]" aria-hidden="true">{{ task.status === taskStore.STATUS.DONE ? '✓' : '' }}</view>
        <view class="task-copy"><text class="task-title">{{ task.title }}</text><text class="task-meta">{{ courseName(task) || TASK_TYPE_LABELS[task.type] }} · {{ taskTime(task) }}</text></view>
        <button class="more-button" aria-label="任务操作" @tap.stop="showActions(task)">···</button>
        <view v-if="taskStore.centerTab === 'inbox'" class="quick-plan" @tap.stop><text>快速安排</text><button @tap="planTask(task, 0)">今天</button><button @tap="planTask(task, 1)">明天</button></view>
      </view>
    </view>
    <AppNav active="tasks" />
  </view>
</template>

<style lang="scss">
.center-page { min-height: 100vh; padding: 62rpx 40rpx 190rpx; background: #f6f4ee; }
.center-header { display: flex; align-items: flex-end; justify-content: space-between; }
.eyebrow { display: block; color: #477269; font-size: 20rpx; font-weight: 750; letter-spacing: 3rpx; }
.page-title { display: block; margin-top: 10rpx; color: #183b32; font-size: 54rpx; font-weight: 750; line-height: 1.1; }
.page-subtitle { display: block; margin-top: 12rpx; color: #6c7d75; font-size: 24rpx; }
.task-count { margin-bottom: 6rpx; color: #8a9a92; font-size: 21rpx; }
.search-box { display: flex; height: 84rpx; align-items: center; margin-top: 32rpx; padding: 0 18rpx; border: 2rpx solid #d9e0d8; border-radius: 20rpx; background: #fff; }
.search-icon { margin-right: 12rpx; color: #477269; font-size: 38rpx; line-height: 1; }
.search-box input { min-width: 0; flex: 1; height: 80rpx; color: #183b32; font-size: 25rpx; }
.search-box button { width: 56rpx; height: 56rpx; padding: 0; background: transparent; color: #8a9a92; font-size: 38rpx; line-height: 52rpx; }
.field-placeholder { color: #8a9a92; }
.tab-scroll { margin: 24rpx -40rpx 0; white-space: nowrap; }
.tabs { display: inline-flex; gap: 28rpx; padding: 0 40rpx; }
.tab-button { position: relative; min-height: 70rpx; padding: 0; background: transparent; color: #8a9a92; font-size: 25rpx; line-height: 66rpx; }
.tab-button.active { color: #183b32; font-weight: 750; }
.tab-button.active::after { position: absolute; right: 0; bottom: 0; left: 0; height: 6rpx; border-radius: 6rpx; background: #477269; content: ''; }
.tab-count { margin-left: 8rpx; padding: 3rpx 8rpx; border-radius: 14rpx; background: #f1dfd4; color: #a34c42; font-size: 18rpx; }
.filters { display: flex; gap: 12rpx; align-items: center; margin-top: 18rpx; overflow: hidden; }
.filter-chip, .clear-filter { height: 56rpx; padding: 0 16rpx; border: 2rpx solid #d9e0d8; border-radius: 16rpx; background: #fff; color: #5e6e68; font-size: 21rpx; line-height: 52rpx; white-space: nowrap; }
.clear-filter { border: 0; background: transparent; color: #a34c42; }
.list-heading { display: flex; justify-content: space-between; margin-top: 38rpx; margin-bottom: 4rpx; color: #36564d; font-size: 24rpx; font-weight: 750; }
.list-heading text:last-child { color: #8a9a92; font-weight: 400; }
.state-card, .empty-state { margin-top: 52rpx; padding: 52rpx 30rpx; border: 2rpx solid #e4e7dd; border-radius: 26rpx; background: rgba(255, 255, 255, .58); text-align: center; }
.empty-symbol { width: 70rpx; height: 70rpx; margin: 0 auto 24rpx; border: 5rpx solid #477269; border-radius: 50%; color: #477269; font-size: 0; }
.state-title { display: block; color: #183b32; font-size: 30rpx; font-weight: 700; }
.state-copy { display: block; margin-top: 14rpx; color: #6c7d75; font-size: 24rpx; line-height: 1.55; }
.secondary-button { width: 100%; height: 78rpx; margin-top: 28rpx; border: 2rpx solid #b8d1be; border-radius: 18rpx; background: transparent; color: #36564d; font-size: 24rpx; line-height: 74rpx; }
.task-row { position: relative; display: flex; flex-wrap: wrap; align-items: flex-start; min-height: 112rpx; padding: 24rpx 0; border-bottom: 2rpx solid #e4e7dd; }
.task-status { display: flex; width: 42rpx; height: 42rpx; flex: none; align-items: center; justify-content: center; margin: 4rpx 18rpx 0 2rpx; border: 3rpx solid #9bb5a6; border-radius: 50%; color: #fff; font-size: 22rpx; font-weight: 750; }
.task-status.status-done { border-color: #477269; background: #477269; }
.task-status.overdue { border-color: #a34c42; }
.task-copy { min-width: 0; flex: 1; }
.task-title { display: block; overflow: hidden; color: #183b32; font-size: 28rpx; font-weight: 650; text-overflow: ellipsis; white-space: nowrap; }
.task-meta { display: block; margin-top: 8rpx; color: #6c7d75; font-size: 21rpx; }
.more-button { width: 64rpx; height: 62rpx; flex: none; margin: -6rpx -8rpx 0 8rpx; padding: 0; background: transparent; color: #8a9a92; font-size: 26rpx; line-height: 56rpx; }
.quick-plan { display: flex; width: 100%; align-items: center; gap: 10rpx; margin: 18rpx 0 0 60rpx; }
.quick-plan text { margin-right: auto; color: #8a9a92; font-size: 21rpx; }
.quick-plan button { min-width: 72rpx; height: 52rpx; padding: 0 12rpx; border: 2rpx solid #b8d1be; border-radius: 14rpx; background: transparent; color: #477269; font-size: 21rpx; line-height: 48rpx; }
</style>
