<script setup>
import { computed, onMounted, ref } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import AppNav from '../../components/AppNav.vue'
import { useAuthStore } from '../../stores/auth'
import { useCalendarStore } from '../../stores/calendar'
import { useCourseStore } from '../../stores/courses'
import { useTaskStore } from '../../stores/tasks'
import { addDaysISO, datePart, formatDate, formatTime, isoDateAtTime, startOfWeekISO, todayISO } from '../../utils/date'

const auth = useAuthStore()
const taskStore = useTaskStore()
const calendarStore = useCalendarStore()
const courseStore = useCourseStore()
const selectedDate = ref(todayISO())
const viewMode = ref('week')
const weekdays = ['一', '二', '三', '四', '五', '六', '日']

const weekDates = computed(() => Array.from({ length: 7 }, (_, index) => addDaysISO(startOfWeekISO(selectedDate.value), index)))
const selectedLabel = computed(() => formatDate(selectedDate.value, { weekday: 'long' }))
const allDayDueTasks = computed(() => taskStore.openTasks.filter((task) => datePart(task.dueAt) === selectedDate.value && !task.scheduledStartAt))

onMounted(() => {
  if (!auth.hydrated) auth.hydrate()
  ensureSession()
})

onShow(() => {
  if (auth.isLoggedIn) {
    taskStore.refresh()
    calendarStore.refresh()
    courseStore.refresh()
  }
})

function ensureSession() {
  if (!auth.isLoggedIn) uni.reLaunch({ url: '/pages/login/login' })
}

function courseFor(event) {
  return courseStore.courses.find((course) => course.id === event.courseId)
}

function eventsForDate(date) {
  const eventItems = calendarStore.events.flatMap((event) => {
    if (datePart(event.startAt) === date) return [{ ...event, displayDate: date }]
    if (event.recurrenceRule === 'weekly' && new Date(event.startAt).getDay() === new Date(`${date}T00:00:00`).getDay()) {
      const startTime = formatTime(event.startAt)
      const endTime = formatTime(event.endAt)
      return [{ ...event, displayDate: date, startAt: isoDateAtTime(date, startTime), endAt: isoDateAtTime(date, endTime) }]
    }
    return []
  })
  const taskItems = taskStore.openTasks.filter((task) => datePart(task.scheduledStartAt) === date).map((task) => {
    const start = new Date(task.scheduledStartAt)
    const end = new Date(start.getTime() + (Number(task.estimatedMinutes) || 30) * 60 * 1000)
    return { id: task.id, taskId: task.id, type: 'task', title: task.title, startAt: task.scheduledStartAt, endAt: end.toISOString() }
  })
  return [...eventItems, ...taskItems].sort((a, b) => String(a.startAt).localeCompare(String(b.startAt)))
}

function eventTitle(item) {
  return item.type === 'task' ? item.title : (courseFor(item)?.name || item.title)
}

function eventMeta(item) {
  return `${formatTime(item.startAt)}–${formatTime(item.endAt)}${item.location ? ` · ${item.location}` : ''}`
}

function selectDate(date) {
  selectedDate.value = date
  if (viewMode.value === 'week') viewMode.value = 'day'
}

function moveWeek(amount) {
  selectedDate.value = addDaysISO(selectedDate.value, amount * 7)
}

function openCourseCreate() {
  uni.navigateTo({ url: `/pages/schedule/course-edit?date=${selectedDate.value}` })
}

function openTaskCreate(date = selectedDate.value) {
  uni.navigateTo({ url: `/pages/tasks/edit?scheduledDate=${date}` })
}

function openItem(item) {
  if (item.type === 'task') uni.navigateTo({ url: `/pages/tasks/edit?id=${encodeURIComponent(item.taskId)}` })
}
</script>

<template>
  <view class="schedule-page safe-bottom">
    <view class="schedule-header"><view><text class="eyebrow">时间安排</text><text class="page-title">日程</text><text class="page-subtitle">课程和计划任务，放在同一条时间线上。</text></view><view class="header-actions"><button class="import-button" aria-label="导入课表" @tap="uni.navigateTo({ url: '/pages/schedule/import' })">导入</button><button class="add-course" aria-label="添加课程" @tap="openCourseCreate">＋课程</button></view></view>

    <view class="toolbar"><view class="view-toggle"><button :class="{ active: viewMode === 'week' }" @tap="viewMode = 'week'">周</button><button :class="{ active: viewMode === 'day' }" @tap="viewMode = 'day'">日</button></view><view class="week-nav"><button aria-label="上一周" @tap="moveWeek(-1)">‹</button><text>{{ viewMode === 'week' ? `${formatDate(weekDates[0])}–${formatDate(weekDates[6])}` : selectedLabel }}</text><button aria-label="下一周" @tap="moveWeek(1)">›</button></view></view>
    <view class="date-strip"><button v-for="(date, index) in weekDates" :key="date" :class="{ selected: date === selectedDate, today: date === todayISO() }" @tap="selectDate(date)"><text>{{ weekdays[index] }}</text><text>{{ date.slice(8) }}</text><view v-if="eventsForDate(date).length" class="date-dot" /></button></view>

    <view v-if="viewMode === 'week'" class="week-grid">
      <view v-for="(date, index) in weekDates" :key="date" class="day-column" :class="{ selected: date === selectedDate }" @tap="selectDate(date)">
        <view class="day-heading"><text>{{ weekdays[index] }}</text><text>{{ date.slice(8) }}</text></view>
        <view v-if="!eventsForDate(date).length" class="day-empty">—</view>
        <view v-for="item in eventsForDate(date).slice(0, 4)" :key="item.id + date" class="mini-event" :class="{ task: item.type === 'task' }" @tap.stop="openItem(item)"><text>{{ eventTitle(item) }}</text><text>{{ formatTime(item.startAt) }}</text></view>
      </view>
    </view>

    <view v-else class="day-view">
      <view class="day-view-title"><text>{{ selectedLabel }}</text><button @tap="openTaskCreate()">在这里安排任务</button></view>
      <view v-if="!eventsForDate(selectedDate).length" class="day-empty-card"><text class="state-title">这一天还没有时间安排</text><text class="state-copy">可以添加课程，或给一项任务安排计划开始时间。</text><button class="secondary-button" @tap="openCourseCreate">添加固定课程</button></view>
      <view v-else class="timeline"><view v-for="item in eventsForDate(selectedDate)" :key="item.id" class="timeline-row" @tap="openItem(item)"><text class="timeline-time">{{ formatTime(item.startAt) }}</text><view class="timeline-line" /><view class="timeline-card" :class="{ task: item.type === 'task' }"><text class="timeline-title">{{ eventTitle(item) }}</text><text class="timeline-meta">{{ eventMeta(item) }} · {{ item.type === 'task' ? '计划任务' : '固定日程' }}</text></view></view></view>
      <view v-if="allDayDueTasks.length" class="due-list"><text class="section-title">当天截止但未安排</text><view v-for="task in allDayDueTasks" :key="task.id" class="due-row" @tap="openItem({ type: 'task', taskId: task.id })"><text class="due-marker">!</text><text>{{ task.title }}</text><text>截止 {{ formatTime(task.dueAt) }}</text></view></view>
    </view>

    <view v-if="viewMode === 'week' && !calendarStore.events.length && !taskStore.tasks.some((task) => task.scheduledStartAt)" class="empty-hint"><text class="state-title">先建立你的第一门课程</text><text class="state-copy">固定日程是安排任务和发现时间冲突的基础。</text><button class="primary-button" @tap="openCourseCreate">添加课程</button><button class="secondary-button" @tap="openTaskCreate()">先安排一个任务</button></view>
    <AppNav active="schedule" />
  </view>
</template>

<style lang="scss">
.schedule-page { min-height: 100vh; padding: 58rpx 32rpx 190rpx; background: #f6f4ee; }
.schedule-header { display: flex; align-items: flex-start; justify-content: space-between; }
.eyebrow { display: block; color: #477269; font-size: 20rpx; font-weight: 750; letter-spacing: 3rpx; }
.page-title { display: block; margin-top: 10rpx; color: #183b32; font-size: 54rpx; font-weight: 750; line-height: 1.1; }
.page-subtitle { display: block; max-width: 540rpx; margin-top: 12rpx; color: #6c7d75; font-size: 23rpx; line-height: 1.45; }
.add-course { min-width: 112rpx; height: 62rpx; padding: 0 14rpx; border: 2rpx solid #b8d1be; border-radius: 16rpx; background: transparent; color: #477269; font-size: 21rpx; line-height: 58rpx; }
.header-actions { display: flex; gap: 10rpx; align-items: center; }.import-button { min-width: 72rpx; height: 62rpx; padding: 0 12rpx; border: 0; border-radius: 16rpx; background: transparent; color: #477269; font-size: 21rpx; line-height: 62rpx; }
.toolbar { display: flex; align-items: center; justify-content: space-between; margin-top: 34rpx; }
.view-toggle { display: flex; padding: 4rpx; border-radius: 14rpx; background: #e4e7dd; }
.view-toggle button { width: 62rpx; height: 50rpx; padding: 0; border-radius: 11rpx; background: transparent; color: #71827a; font-size: 21rpx; line-height: 50rpx; }
.view-toggle button.active { background: #fff; color: #183b32; font-weight: 700; }
.week-nav { display: flex; align-items: center; gap: 10rpx; color: #5e6e68; font-size: 21rpx; }
.week-nav button { width: 48rpx; height: 48rpx; padding: 0; background: transparent; color: #477269; font-size: 38rpx; line-height: 42rpx; }
.date-strip { display: flex; gap: 8rpx; margin-top: 22rpx; }
.date-strip button { position: relative; display: flex; width: calc((100% - 48rpx) / 7); height: 82rpx; flex-direction: column; align-items: center; justify-content: center; padding: 0; border-radius: 16rpx; background: transparent; color: #8a9a92; font-size: 20rpx; line-height: 1.5; }
.date-strip button text:last-of-type { color: #36564d; font-size: 25rpx; font-weight: 650; }
.date-strip button.selected { background: #183b32; color: #dbe9db; }
.date-strip button.selected text:last-of-type { color: #fff; }
.date-strip button.today:not(.selected)::before { position: absolute; top: 5rpx; width: 7rpx; height: 7rpx; border-radius: 50%; background: #477269; content: ''; }
.date-dot { position: absolute; right: 10rpx; bottom: 8rpx; width: 6rpx; height: 6rpx; border-radius: 50%; background: #8c6a4a; }
.date-strip button.selected .date-dot { background: #dbe9db; }
.week-grid { display: flex; gap: 6rpx; min-height: 500rpx; margin-top: 24rpx; padding: 10rpx 6rpx; border-top: 2rpx solid #e4e7dd; border-bottom: 2rpx solid #e4e7dd; }
.day-column { min-width: 0; flex: 1; padding: 0 4rpx; border-right: 2rpx solid #edf0e9; }
.day-column:last-child { border-right: 0; }
.day-column.selected { background: rgba(228, 239, 226, .44); }
.day-heading { display: flex; flex-direction: column; align-items: center; gap: 4rpx; padding: 8rpx 0 14rpx; color: #36564d; font-size: 19rpx; font-weight: 700; }
.day-heading text:last-child { color: #8a9a92; font-size: 21rpx; }
.mini-event { margin-bottom: 7rpx; padding: 8rpx 6rpx; border-radius: 9rpx; background: #dbe9db; color: #36564d; }
.mini-event.task { border: 2rpx solid #b8d1be; background: #fff; }
.mini-event text { display: block; overflow: hidden; font-size: 17rpx; line-height: 1.3; text-overflow: ellipsis; white-space: nowrap; }
.mini-event text:last-child { margin-top: 4rpx; color: #71827a; font-size: 16rpx; }
.day-empty { padding-top: 80rpx; color: #c2ccc4; text-align: center; }
.day-view { margin-top: 30rpx; }
.day-view-title { display: flex; align-items: center; justify-content: space-between; color: #36564d; font-size: 27rpx; font-weight: 700; }
.day-view-title button { min-height: 54rpx; padding: 0 12rpx; border: 2rpx solid #b8d1be; border-radius: 14rpx; background: transparent; color: #477269; font-size: 21rpx; line-height: 50rpx; }
.day-empty-card, .empty-hint { margin-top: 28rpx; padding: 46rpx 30rpx; border: 2rpx solid #e4e7dd; border-radius: 24rpx; background: rgba(255, 255, 255, .6); text-align: center; }
.state-title { display: block; color: #183b32; font-size: 29rpx; font-weight: 700; }
.state-copy { display: block; margin-top: 12rpx; color: #6c7d75; font-size: 23rpx; line-height: 1.5; }
.timeline { margin-top: 22rpx; }
.timeline-row { display: flex; min-height: 112rpx; align-items: flex-start; }
.timeline-time { width: 78rpx; padding-top: 24rpx; color: #477269; font-size: 22rpx; }
.timeline-line { position: relative; width: 22rpx; margin: 21rpx 16rpx 0 0; border-top: 3rpx solid #b8d1be; }
.timeline-line::before { position: absolute; top: -8rpx; left: -4rpx; width: 13rpx; height: 13rpx; border-radius: 50%; background: #477269; content: ''; }
.timeline-card { min-width: 0; flex: 1; padding: 18rpx 20rpx; border-left: 8rpx solid #477269; border-radius: 17rpx; background: #e4efe2; }
.timeline-card.task { border: 2rpx solid #b8d1be; border-left: 8rpx solid #8c6a4a; background: #fff; }
.timeline-title { display: block; overflow: hidden; color: #183b32; font-size: 26rpx; font-weight: 700; text-overflow: ellipsis; white-space: nowrap; }
.timeline-meta { display: block; margin-top: 7rpx; color: #6c7d75; font-size: 20rpx; }
.section-title { display: block; margin: 24rpx 0 12rpx; color: #36564d; font-size: 23rpx; font-weight: 750; }
.due-row { display: flex; min-height: 68rpx; align-items: center; gap: 12rpx; border-bottom: 2rpx solid #e4e7dd; color: #36564d; font-size: 23rpx; }
.due-row text:nth-child(2) { flex: 1; }
.due-row text:last-child { color: #8a9a92; font-size: 20rpx; }
.due-marker { display: flex; width: 30rpx; height: 30rpx; align-items: center; justify-content: center; border-radius: 50%; background: #a34c42; color: #fff; font-size: 18rpx; font-weight: 750; }
.primary-button, .secondary-button { width: 100%; height: 78rpx; margin-top: 26rpx; border-radius: 18rpx; font-size: 24rpx; line-height: 78rpx; }
.primary-button { background: #183b32; color: #fff; }
.secondary-button { border: 2rpx solid #b8d1be; background: transparent; color: #36564d; line-height: 74rpx; }
.empty-hint { margin-top: 28rpx; }
</style>
