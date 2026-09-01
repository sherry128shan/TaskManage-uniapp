<script setup>
import { computed, onMounted, ref } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import AppNav from '../../components/AppNav.vue'
import { useAlarmStore } from '../../stores/alarms'
import { useAuthStore } from '../../stores/auth'
import { useCalendarStore } from '../../stores/calendar'
import { useFeedbackStore } from '../../stores/feedback'
import { useTaskStore } from '../../stores/tasks'
import { addDaysISO, datePart, formatDate, formatDateTime, formatTime, todayISO } from '../../utils/date'

const auth = useAuthStore()
const taskStore = useTaskStore()
const alarmStore = useAlarmStore()
const calendarStore = useCalendarStore()
const feedbackStore = useFeedbackStore()
const today = ref(todayISO())
const showCompleted = ref(false)

const todayLabel = computed(() => {
  const date = new Date(`${today.value}T00:00:00`)
  return new Intl.DateTimeFormat('zh-CN', { month: 'long', day: 'numeric', weekday: 'long' }).format(date)
})
const openTodayTasks = computed(() => taskStore.openTasks.filter((task) => {
  const dueToday = datePart(task.dueAt) === today.value
  const plannedToday = datePart(task.scheduledStartAt) === today.value
  const overdue = task.dueAt && new Date(task.dueAt).getTime() < new Date(`${today.value}T00:00:00`).getTime()
  return dueToday || plannedToday || overdue
}))
const overdueTasks = computed(() => openTodayTasks.value.filter((task) => task.dueAt && datePart(task.dueAt) < today.value))
const plannedTasks = computed(() => openTodayTasks.value.filter((task) => datePart(task.scheduledStartAt) === today.value && !overdueTasks.value.includes(task)).sort((a, b) => String(a.scheduledStartAt).localeCompare(String(b.scheduledStartAt))))
const dueTodayTasks = computed(() => openTodayTasks.value.filter((task) => datePart(task.dueAt) === today.value && datePart(task.scheduledStartAt) !== today.value).sort((a, b) => {
  const dueSort = String(a.dueAt).localeCompare(String(b.dueAt))
  return dueSort || (a.priority === 'high' ? -1 : 0)
}))
const completedToday = computed(() => taskStore.tasks.filter((task) => task.status === taskStore.STATUS.DONE && datePart(task.completedAt) === today.value))
const currentEvent = computed(() => {
  const now = Date.now()
  return calendarStore.events.find((event) => datePart(event.startAt) === today.value && new Date(event.startAt).getTime() <= now && new Date(event.endAt).getTime() > now)
})
const nextEvent = computed(() => calendarStore.upcomingEvents.find((event) => datePart(event.startAt) === today.value && new Date(event.startAt).getTime() > Date.now()))
const nextTask = computed(() => plannedTasks.value.find((task) => new Date(task.scheduledStartAt).getTime() >= Date.now()) || dueTodayTasks.value[0] || null)
const totalToday = computed(() => new Set([...openTodayTasks.value.map((task) => task.id), ...completedToday.value.map((task) => task.id)]).size)
const progressPercent = computed(() => totalToday.value ? Math.round((completedToday.value.length / totalToday.value) * 100) : 0)

onMounted(() => {
  if (!auth.hydrated) auth.hydrate()
  ensureSession()
})

onShow(() => {
  today.value = todayISO()
  if (auth.isLoggedIn) {
    taskStore.refresh()
    calendarStore.refresh()
    alarmStore.refresh()
  }
})

function ensureSession() {
  if (!auth.isLoggedIn) uni.reLaunch({ url: '/pages/login/login' })
}

function openEdit(task) {
  uni.navigateTo({ url: `/pages/tasks/edit?id=${encodeURIComponent(task.id)}` })
}

function startTask(task) {
  taskStore.start(task.id)
  uni.showToast({ title: '已开始，专注眼前这一步', icon: 'none' })
}

function completeTask(task) {
  taskStore.complete(task.id)
  alarmStore.cancelForTask(task.id)
  uni.showToast({ title: `${task.title} 已完成`, icon: 'none' })
}

function snoozeTask(task) {
  const fireAt = new Date(Date.now() + 15 * 60 * 1000).toISOString()
  alarmStore.add({ taskId: task.id, mode: 'absolute', fireAt, offsetMinutes: 15 })
  uni.showToast({ title: '15 分钟后再提醒你', icon: 'none' })
}

function rescheduleTask(task) {
  uni.showActionSheet({ itemList: ['安排到今天', '安排到明天', '放回收集箱'] }).then(({ tapIndex }) => {
    if (tapIndex === 0) taskStore.plan(task.id, today.value)
    if (tapIndex === 1) taskStore.plan(task.id, addDaysISO(today.value, 1))
    if (tapIndex === 2) taskStore.plan(task.id, '')
    if (tapIndex >= 0) uni.showToast({ title: tapIndex === 2 ? '已放回收集箱' : '已重新安排', icon: 'none' })
  }).catch(() => {})
}

function showTaskActions(task) {
  uni.showActionSheet({ itemList: ['稍后 15 分钟提醒', '重新安排', '打开任务详情'] }).then(({ tapIndex }) => {
    if (tapIndex === 0) snoozeTask(task)
    if (tapIndex === 1) rescheduleTask(task)
    if (tapIndex === 2) openEdit(task)
  }).catch(() => {})
}

function openInbox() {
  uni.reLaunch({ url: '/pages/tasks/center?tab=inbox' })
}

function eventTime(event) {
  return `${formatTime(event.startAt)}–${formatTime(event.endAt)}`
}
</script>

<template>
  <view class="today-page safe-bottom">
    <view class="topbar">
      <view>
        <text class="eyebrow">TASKMANAGE</text>
        <text class="page-title">今天</text>
        <text class="date-label">{{ todayLabel }}</text>
      </view>
      <view class="progress-card" aria-label="今日完成进度">
        <text class="progress-value">{{ completedToday.length }}/{{ totalToday }}</text>
        <text class="progress-label">今日完成</text>
      </view>
    </view>

    <view class="progress-track"><view class="progress-fill" :style="{ width: `${progressPercent}%` }" /></view>

    <view v-if="!taskStore.isReady" class="state-card"><text class="state-title">正在整理今天的安排…</text></view>

    <template v-else>
      <view v-if="currentEvent" class="focus-block">
        <view class="section-heading"><text>正在进行</text><text class="section-caption">固定日程</text></view>
        <view class="event-card">
          <view class="event-color" />
          <view class="event-copy"><text class="event-title">{{ currentEvent.title }}</text><text class="event-meta">{{ eventTime(currentEvent) }}<text v-if="currentEvent.location"> · {{ currentEvent.location }}</text></text></view>
          <text class="event-status">现在</text>
        </view>
      </view>

      <view v-if="nextTask || nextEvent" class="next-block">
        <view class="section-heading"><text>下一项</text><text class="section-caption">先处理最靠近的一步</text></view>
        <view v-if="nextTask" class="next-card" @tap="openEdit(nextTask)">
          <view class="next-time">{{ nextTask.scheduledStartAt ? formatTime(nextTask.scheduledStartAt) : '今天' }}</view>
          <view class="next-copy"><text class="next-title">{{ nextTask.title }}</text><text class="next-meta">{{ nextTask.dueAt ? `截止 ${formatDateTime(nextTask.dueAt)}` : '今天需要处理' }}</text></view>
          <button class="small-action" @tap.stop="completeTask(nextTask)">完成</button>
        </view>
        <view v-else class="next-card">
          <view class="next-time">{{ formatTime(nextEvent.startAt) }}</view>
          <view class="next-copy"><text class="next-title">{{ nextEvent.title }}</text><text class="next-meta">{{ eventTime(nextEvent) }} · 固定日程</text></view>
        </view>
      </view>

      <view v-if="overdueTasks.length" class="queue-section attention-section">
        <view class="section-heading"><text>需要关注</text><text class="section-count warm">{{ overdueTasks.length }}</text></view>
        <view v-for="task in overdueTasks" :key="task.id" class="task-row" @tap="openEdit(task)">
          <view class="task-marker overdue-marker">!</view>
          <view class="task-copy"><text class="task-title">{{ task.title }}</text><text class="task-meta">{{ formatDate(task.dueAt) }}已逾期 · {{ taskStore.STATUS_LABELS[task.status] }}</text></view>
          <button class="text-action" @tap.stop="rescheduleTask(task)">改期</button>
          <button class="more-button" aria-label="更多任务操作" @tap.stop="showTaskActions(task)">···</button>
        </view>
      </view>

      <view v-if="plannedTasks.length" class="queue-section">
        <view class="section-heading"><text>今日计划</text><text class="section-count">{{ plannedTasks.length }}</text></view>
        <view v-for="task in plannedTasks" :key="task.id" class="task-row" @tap="openEdit(task)">
          <view class="task-marker plan-marker" />
          <view class="task-copy"><text class="task-title">{{ task.title }}</text><text class="task-meta">{{ formatTime(task.scheduledStartAt) }} · {{ task.estimatedMinutes ? `${task.estimatedMinutes} 分钟` : '待安排时长' }}</text></view>
          <button v-if="task.status === taskStore.STATUS.TODO" class="text-action" @tap.stop="startTask(task)">开始</button>
          <button v-else class="text-action" @tap.stop="completeTask(task)">完成</button>
          <button class="more-button" aria-label="更多任务操作" @tap.stop="showTaskActions(task)">···</button>
        </view>
      </view>

      <view v-if="dueTodayTasks.length" class="queue-section">
        <view class="section-heading"><text>今天截止</text><text class="section-count">{{ dueTodayTasks.length }}</text></view>
        <view v-for="task in dueTodayTasks" :key="task.id" class="task-row" @tap="openEdit(task)">
          <view class="task-marker due-marker" />
          <view class="task-copy"><text class="task-title">{{ task.title }}</text><text class="task-meta">截止 {{ formatDateTime(task.dueAt) }} · {{ taskStore.STATUS_LABELS[task.status] }}</text></view>
          <button v-if="task.status === taskStore.STATUS.TODO" class="text-action" @tap.stop="startTask(task)">开始</button>
          <button v-else class="text-action" @tap.stop="completeTask(task)">完成</button>
          <button class="more-button" aria-label="更多任务操作" @tap.stop="showTaskActions(task)">···</button>
        </view>
      </view>

      <view v-if="!openTodayTasks.length && !currentEvent && !nextEvent" class="empty-state">
        <view class="empty-symbol">○</view>
        <text class="state-title">今天暂无安排</text>
        <text class="state-copy">先记录一件事，之后再决定什么时候完成。</text>
      </view>

      <view v-if="completedToday.length" class="completed-block">
        <button class="completed-toggle" @tap="showCompleted = !showCompleted">已完成 {{ completedToday.length }} 项 <text>{{ showCompleted ? '收起' : '展开' }}</text></button>
        <view v-if="showCompleted" class="completed-list">
          <view v-for="task in completedToday" :key="task.id" class="completed-row"><text class="completed-mark">✓</text><text class="completed-title">{{ task.title }}</text><text class="completed-time">{{ formatTime(task.completedAt) }}</text></view>
        </view>
      </view>

      <view v-if="taskStore.unplannedCount" class="inbox-hint" @tap="openInbox">
        <view><text class="hint-title">收集箱里还有 {{ taskStore.unplannedCount }} 件未安排</text><text class="hint-copy">找个空档统一整理，不急着现在决定。</text></view><text class="hint-arrow">→</text>
      </view>

      <view v-if="totalToday" class="feedback-strip"><text>今日已完成 {{ feedbackStore.today.completed }} 项</text><text>{{ progressPercent }}%</text></view>
    </template>

    <AppNav active="today" />
  </view>
</template>

<style lang="scss">
.today-page { min-height: 100vh; padding: 62rpx 40rpx 190rpx; background: #f6f4ee; }
.topbar { display: flex; align-items: flex-start; justify-content: space-between; }
.eyebrow { display: block; color: #477269; font-size: 20rpx; font-weight: 750; letter-spacing: 3rpx; }
.page-title { display: block; margin-top: 10rpx; color: #183b32; font-size: 54rpx; font-weight: 750; line-height: 1.1; }
.date-label { display: block; margin-top: 12rpx; color: #6c7d75; font-size: 25rpx; }
.progress-card { display: flex; min-width: 132rpx; flex-direction: column; align-items: center; padding: 20rpx 14rpx; border: 2rpx solid #b8d1be; border-radius: 24rpx; background: #e4efe2; }
.progress-value { color: #183b32; font-size: 30rpx; font-weight: 800; }
.progress-label { margin-top: 5rpx; color: #477269; font-size: 20rpx; }
.progress-track { height: 10rpx; margin-top: 30rpx; overflow: hidden; border-radius: 10rpx; background: #e2e8df; }
.progress-fill { height: 100%; border-radius: 10rpx; background: #477269; transition: width .2s ease; }
.state-card, .empty-state { margin-top: 72rpx; padding: 54rpx 32rpx; border: 2rpx solid #e4e7dd; border-radius: 28rpx; background: rgba(255, 255, 255, .58); text-align: center; }
.state-title { display: block; color: #183b32; font-size: 31rpx; font-weight: 700; }
.state-copy { display: block; margin-top: 16rpx; color: #6c7d75; font-size: 24rpx; line-height: 1.55; }
.empty-symbol { width: 72rpx; height: 72rpx; margin: 0 auto 24rpx; border: 5rpx solid #477269; border-radius: 50%; color: #477269; font-size: 0; }
.focus-block, .next-block { margin-top: 42rpx; }
.section-heading { display: flex; align-items: center; gap: 14rpx; margin-bottom: 14rpx; color: #36564d; font-size: 25rpx; font-weight: 750; }
.section-caption { color: #8a9a92; font-size: 21rpx; font-weight: 400; }
.event-card, .next-card { display: flex; align-items: center; min-height: 116rpx; padding: 24rpx; border-radius: 22rpx; background: #e4efe2; }
.event-color { width: 10rpx; height: 68rpx; margin-right: 18rpx; border-radius: 8rpx; background: #477269; }
.event-copy, .next-copy { min-width: 0; flex: 1; }
.event-title, .next-title { display: block; overflow: hidden; color: #183b32; font-size: 29rpx; font-weight: 700; text-overflow: ellipsis; white-space: nowrap; }
.event-meta, .next-meta { display: block; margin-top: 8rpx; color: #5e6e68; font-size: 22rpx; }
.event-status { margin-left: 14rpx; color: #477269; font-size: 21rpx; font-weight: 700; }
.next-card { border: 2rpx solid #d9e0d8; background: #fff; }
.next-time { width: 82rpx; color: #477269; font-size: 24rpx; font-weight: 750; }
.small-action, .text-action { flex: none; min-width: 88rpx; min-height: 62rpx; padding: 0 14rpx; border-radius: 16rpx; background: #183b32; color: #fff; font-size: 22rpx; line-height: 62rpx; }
.queue-section { margin-top: 38rpx; }
.attention-section { padding: 24rpx; border-radius: 24rpx; background: #fbebe5; }
.section-count { min-width: 34rpx; padding: 4rpx 10rpx; border-radius: 20rpx; background: #e2ece1; color: #477269; font-size: 20rpx; text-align: center; }
.section-count.warm { background: #f1d8cf; color: #a34c42; }
.task-row { display: flex; align-items: flex-start; min-height: 100rpx; padding: 22rpx 0; border-bottom: 2rpx solid #e4e7dd; }
.attention-section .task-row { border-bottom-color: #efd2c9; }
.task-marker { width: 22rpx; height: 22rpx; flex: none; margin: 6rpx 18rpx 0 4rpx; border: 3rpx solid #477269; border-radius: 50%; }
.task-marker.overdue-marker { display: flex; border: 0; background: #a34c42; color: #fff; font-size: 18rpx; align-items: center; justify-content: center; font-weight: 750; }
.due-marker { border-color: #8c6a4a; }
.task-copy { min-width: 0; flex: 1; }
.task-title { display: block; overflow: hidden; color: #183b32; font-size: 28rpx; font-weight: 650; text-overflow: ellipsis; white-space: nowrap; }
.task-meta { display: block; margin-top: 7rpx; color: #6c7d75; font-size: 21rpx; }
.text-action { min-width: 72rpx; min-height: 54rpx; margin: 0 0 0 12rpx; background: transparent; color: #477269; font-size: 22rpx; font-weight: 700; line-height: 54rpx; }
.attention-section .text-action { color: #a34c42; }
.more-button { width: 54rpx; height: 54rpx; flex: none; margin: 0 -10rpx 0 4rpx; padding: 0; background: transparent; color: #8a9a92; font-size: 24rpx; line-height: 48rpx; }
.completed-block { margin-top: 34rpx; border-top: 2rpx solid #e4e7dd; }
.completed-toggle { width: 100%; padding: 22rpx 0; background: transparent; color: #477269; font-size: 24rpx; text-align: left; }
.completed-toggle text { float: right; color: #8a9a92; }
.completed-row { display: flex; min-height: 70rpx; align-items: center; }
.completed-mark { display: flex; width: 34rpx; height: 34rpx; align-items: center; justify-content: center; margin-right: 14rpx; border-radius: 50%; background: #477269; color: #fff; font-size: 20rpx; }
.completed-title { flex: 1; color: #7b8b84; font-size: 24rpx; text-decoration: line-through; }
.completed-time { color: #8a9a92; font-size: 21rpx; }
.inbox-hint { display: flex; align-items: center; justify-content: space-between; margin-top: 34rpx; padding: 22rpx 24rpx; border: 2rpx solid #d9e0d8; border-radius: 22rpx; background: #fff; }
.hint-title, .hint-copy { display: block; }
.hint-title { color: #36564d; font-size: 24rpx; font-weight: 700; }
.hint-copy { margin-top: 6rpx; color: #8a9a92; font-size: 21rpx; }
.hint-arrow { color: #477269; font-size: 32rpx; }
.feedback-strip { display: flex; justify-content: space-between; margin-top: 34rpx; padding: 20rpx 0 4rpx; color: #6c7d75; font-size: 22rpx; }
.feedback-strip text:last-child { color: #477269; font-weight: 750; }
</style>
