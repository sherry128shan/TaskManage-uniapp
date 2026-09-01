<script setup>
import { onMounted, reactive, ref } from 'vue'
import { useAuthStore } from '../../stores/auth'
import { useCalendarStore } from '../../stores/calendar'
import { useCourseStore } from '../../stores/courses'
import { COURSE_COLORS } from '../../data/courseRepository'
import { addDaysISO, isoDateAtTime, todayISO } from '../../utils/date'

const auth = useAuthStore()
const courseStore = useCourseStore()
const calendarStore = useCalendarStore()
const form = reactive({ name: '', teacher: '', location: '', weekday: 1, startTime: '08:00', endTime: '09:35', color: COURSE_COLORS[0] })
const error = ref('')
const busy = ref(false)
const weekdays = ['周一', '周二', '周三', '周四', '周五', '周六', '周日']
let baseDate = todayISO()

onMounted(() => {
  if (!auth.hydrated) auth.hydrate()
  courseStore.refresh()
  calendarStore.refresh()
  const pages = getCurrentPages()
  const options = pages[pages.length - 1]?.options || {}
  baseDate = options.date || todayISO()
  const day = new Date(`${baseDate}T00:00:00`).getDay()
  form.weekday = day === 0 ? 7 : day
})

function save() {
  error.value = ''
  if (!form.name.trim()) {
    error.value = '请填写课程名称。'
    return
  }
  if (form.startTime >= form.endTime) {
    error.value = '结束时间需要晚于开始时间。'
    return
  }
  if (busy.value) return
  busy.value = true
  const weekStart = new Date(`${baseDate}T00:00:00`)
  const day = weekStart.getDay() || 7
  weekStart.setDate(weekStart.getDate() - day + 1)
  const date = addDaysISO(todayISO(weekStart), form.weekday - 1)
  const startAt = isoDateAtTime(date, form.startTime)
  const endAt = isoDateAtTime(date, form.endTime)
  const conflict = calendarStore.events.find((event) => new Date(startAt).getTime() < new Date(event.endAt).getTime() && new Date(event.startAt).getTime() < new Date(endAt).getTime())
  const finish = () => {
    const course = courseStore.add({ name: form.name, teacher: form.teacher, location: form.location, color: form.color })
    calendarStore.add({ courseId: course.id, type: 'class', title: form.name, startAt, endAt, recurrenceRule: 'weekly', recurrenceGroupId: course.id, location: form.location, source: 'manual' })
    uni.showToast({ title: '课程已添加', icon: 'none' })
    setTimeout(() => uni.navigateBack(), 220)
  }
  if (conflict) {
    uni.showModal({ title: '发现时间冲突', content: `与「${conflict.title}」的时间重叠，仍要添加吗？`, confirmText: '继续添加', cancelText: '返回调整' }).then(({ confirm }) => { if (confirm) finish() }).catch(() => {})
    busy.value = false
    return
  }
  finish()
}
</script>

<template>
  <view class="course-page safe-bottom">
    <view class="course-intro"><text class="eyebrow">固定日程</text><text class="page-title">添加一门课程</text><text class="page-subtitle">先建立每周固定时间，之后安排任务时就能看见冲突。</text></view>
    <view class="form-card">
      <view class="field-group"><text class="field-label">课程名称 <text class="required">*</text></text><input v-model="form.name" class="field-input" maxlength="80" placeholder="例如：高等数学" placeholder-class="placeholder" /><text v-if="error" class="field-error">{{ error }}</text></view>
      <view class="field-group"><text class="field-label">教师 <text class="optional">可选</text></text><input v-model="form.teacher" class="field-input" maxlength="60" placeholder="教师姓名" placeholder-class="placeholder" /></view>
      <view class="field-group"><text class="field-label">地点 <text class="optional">可选</text></text><input v-model="form.location" class="field-input" maxlength="80" placeholder="例如：教学楼 A203" placeholder-class="placeholder" /></view>
      <view class="field-group"><text class="field-label">每周上课时间</text><picker mode="selector" :range="weekdays" :value="form.weekday - 1" @change="form.weekday = Number($event.detail.value) + 1"><view class="picker-field">{{ weekdays[form.weekday - 1] }}<text>⌄</text></view></picker><view class="split-fields"><picker mode="time" :value="form.startTime" @change="form.startTime = $event.detail.value"><view class="picker-field">{{ form.startTime }}</view></picker><picker mode="time" :value="form.endTime" @change="form.endTime = $event.detail.value"><view class="picker-field">{{ form.endTime }}</view></picker></view></view>
      <view class="field-group"><text class="field-label">课程颜色</text><view class="color-row"><button v-for="color in COURSE_COLORS" :key="color" :class="{ selected: form.color === color }" :style="{ background: color }" :aria-label="`选择课程颜色 ${color}`" @tap="form.color = color">{{ form.color === color ? '✓' : '' }}</button></view></view>
      <button class="save-button" :disabled="busy" @tap="save">{{ busy ? '保存中…' : '保存课程' }}</button><button class="cancel-button" @tap="uni.navigateBack()">取消</button>
    </view>
  </view>
</template>

<style lang="scss">
.course-page { min-height: 100vh; padding: 58rpx 40rpx 70rpx; background: #f6f4ee; }
.eyebrow { display: block; color: #477269; font-size: 20rpx; font-weight: 750; letter-spacing: 3rpx; }
.page-title { display: block; margin-top: 10rpx; color: #183b32; font-size: 48rpx; font-weight: 750; }
.page-subtitle { display: block; margin-top: 14rpx; color: #6c7d75; font-size: 24rpx; line-height: 1.5; }
.form-card { margin-top: 38rpx; padding: 30rpx 26rpx; border: 2rpx solid #e4e7dd; border-radius: 28rpx; background: rgba(255, 255, 255, .72); }
.field-group + .field-group { margin-top: 28rpx; }
.field-label { display: block; margin-bottom: 12rpx; color: #36564d; font-size: 24rpx; font-weight: 700; }
.required, .field-error { color: #a34c42; }.optional { margin-left: 8rpx; color: #8a9a92; font-size: 21rpx; font-weight: 400; }
.field-input, .picker-field { width: 100%; height: 84rpx; border: 2rpx solid #d9e0d8; border-radius: 18rpx; background: #fff; color: #183b32; font-size: 27rpx; }
.field-input { padding: 0 22rpx; }.placeholder { color: #8a9a92; }.field-error { display: block; margin-top: 8rpx; font-size: 22rpx; }
.picker-field { display: flex; align-items: center; justify-content: space-between; padding: 0 20rpx; }.picker-field text { color: #477269; }
.split-fields { display: flex; gap: 12rpx; margin-top: 12rpx; }.split-fields picker { min-width: 0; flex: 1; }
.color-row { display: flex; gap: 18rpx; }.color-row button { display: flex; width: 54rpx; height: 54rpx; align-items: center; justify-content: center; padding: 0; border: 5rpx solid #fff; border-radius: 50%; box-shadow: 0 0 0 2rpx #d9e0d8; color: #fff; font-size: 22rpx; line-height: 44rpx; }.color-row button.selected { box-shadow: 0 0 0 3rpx #183b32; }
.save-button, .cancel-button { width: 100%; height: 86rpx; border-radius: 20rpx; font-size: 26rpx; line-height: 86rpx; }.save-button { margin-top: 36rpx; background: #183b32; color: #fff; font-weight: 700; }.save-button[disabled] { opacity: .55; }.cancel-button { margin-top: 8rpx; background: transparent; color: #477269; }
</style>
