<script setup>
import { computed, onMounted, ref } from 'vue'
import { useAuthStore } from '../../stores/auth'
import { useCalendarStore } from '../../stores/calendar'
import { useCourseStore } from '../../stores/courses'
import { addDaysISO, formatTime, isoDateAtTime, startOfWeekISO, todayISO } from '../../utils/date'

const auth = useAuthStore()
const courseStore = useCourseStore()
const calendarStore = useCalendarStore()
const busy = ref(false)
const csvText = ref('')
const weekdays = { '1': 1, '2': 2, '3': 3, '4': 4, '5': 5, '6': 6, '7': 7, '周一': 1, '周二': 2, '周三': 3, '周四': 4, '周五': 5, '周六': 6, '周日': 7 }

function normalizeTime(value) {
  const match = String(value || '').match(/^(\d{1,2}):(\d{2})$/)
  return match ? `${String(match[1]).padStart(2, '0')}:${match[2]}` : String(value || '')
}

const rows = computed(() => csvText.value.split(/\r?\n/).map((line) => line.trim()).filter(Boolean).map((line, index) => {
  const values = line.split(',').map((value) => value.trim())
  if (index === 0 && values[0] === '课程名称') return null
  const weekday = weekdays[values[1]]
  const row = { name: values[0], weekday, startTime: normalizeTime(values[2]), endTime: normalizeTime(values[3]), teacher: values[4] || '', location: values[5] || '' }
  return { ...row, valid: Boolean(row.name && row.weekday && /^\d{1,2}:\d{2}$/.test(row.startTime) && /^\d{1,2}:\d{2}$/.test(row.endTime) && row.startTime < row.endTime) }
}).filter(Boolean))
const validRows = computed(() => rows.value.filter((row) => row.valid))
const invalidRows = computed(() => rows.value.filter((row) => !row.valid))

onMounted(() => {
  if (!auth.hydrated) auth.hydrate()
  courseStore.refresh()
  calendarStore.refresh()
})

function useTemplate() {
  csvText.value = '课程名称,星期,开始时间,结束时间,教师,地点\n高等数学,周一,08:00,09:35,张老师,教学楼 A203\n大学英语,周三,10:00,11:35,李老师,教学楼 B101'
}

function importRows() {
  if (!validRows.value.length || busy.value) return
  busy.value = true
  const weekStart = startOfWeekISO(todayISO())
  let imported = 0
  let skipped = 0
  validRows.value.forEach((row) => {
    let course = courseStore.activeCourses.find((item) => item.name === row.name)
    if (!course) course = courseStore.add({ name: row.name, teacher: row.teacher, location: row.location })
    const date = addDaysISO(weekStart, row.weekday - 1)
    const exists = calendarStore.events.some((event) => event.courseId === course.id && event.recurrenceRule === 'weekly' && new Date(event.startAt).getDay() === new Date(`${date}T00:00:00`).getDay() && formatTime(event.startAt) === row.startTime)
    if (exists) {
      skipped += 1
      return
    }
    calendarStore.add({ courseId: course.id, type: 'class', title: row.name, startAt: isoDateAtTime(date, row.startTime), endAt: isoDateAtTime(date, row.endTime), recurrenceRule: 'weekly', recurrenceGroupId: course.id, location: row.location, source: 'csv' })
    imported += 1
  })
  busy.value = false
  uni.showModal({ title: '课表导入完成', content: `已导入 ${imported} 条，跳过重复 ${skipped} 条${invalidRows.value.length ? `，${invalidRows.value.length} 条格式有误未导入` : ''}。`, showCancel: false, confirmText: '返回日程' }).then(() => uni.navigateBack()).catch(() => {})
}
</script>

<template>
  <view class="import-page safe-bottom"><view class="import-header"><text class="eyebrow">课表导入</text><text class="page-title">先预览，再写入</text><text class="page-subtitle">支持粘贴 CSV 文本。默认跳过已存在的同一课程和时间，不覆盖已有安排。</text></view>
    <view class="step-line"><view class="step active"><text>1</text><small>粘贴</small></view><view class="step-line-fill" /><view class="step"><text>2</text><small>检查</small></view><view class="step-line-fill" /><view class="step"><text>3</text><small>确认</small></view></view>
    <view class="input-card"><view class="card-label"><text>CSV 内容</text><button @tap="useTemplate">填入模板</button></view><textarea v-model="csvText" class="csv-input" maxlength="10000" placeholder="课程名称,星期,开始时间,结束时间,教师,地点" placeholder-class="placeholder" auto-height /><text class="helper">每行一节固定课程，星期填写 1–7 或“周一”至“周日”。</text></view>
    <view v-if="rows.length" class="preview-card"><view class="preview-heading"><text>预览</text><text>{{ validRows.length }} 条可导入</text></view><view v-for="(row, index) in rows" :key="`${row.name}-${index}`" class="preview-row" :class="{ invalid: !row.valid }"><view class="preview-mark">{{ row.valid ? '✓' : '!' }}</view><view class="preview-copy"><text>{{ row.name || '未填写课程名' }}</text><small>{{ row.weekday ? `周${['一', '二', '三', '四', '五', '六', '日'][row.weekday - 1]}` : '星期无效' }} · {{ row.startTime || '--:--' }}–{{ row.endTime || '--:--' }}<text v-if="row.location"> · {{ row.location }}</text></small></view><text v-if="!row.valid" class="invalid-label">请修正</text></view></view>
    <view v-else class="empty-preview"><text class="state-title">还没有导入内容</text><text class="state-copy">可以先填入模板，确认字段格式后再粘贴自己的课表。</text></view>
    <button class="primary-button" :disabled="!validRows.length || busy" @tap="importRows">{{ busy ? '导入中…' : `确认导入 ${validRows.length} 条` }}</button><button class="cancel-button" @tap="uni.navigateBack()">取消</button>
  </view>
</template>

<style lang="scss">
.import-page { min-height: 100vh; padding: 58rpx 40rpx 70rpx; background: #f6f4ee; }.eyebrow { display: block; color: #477269; font-size: 20rpx; font-weight: 750; letter-spacing: 3rpx; }.page-title { display: block; margin-top: 10rpx; color: #183b32; font-size: 48rpx; font-weight: 750; }.page-subtitle { display: block; margin-top: 14rpx; color: #6c7d75; font-size: 23rpx; line-height: 1.5; }.step-line { display: flex; align-items: center; margin-top: 32rpx; }.step { display: flex; flex-direction: column; align-items: center; gap: 5rpx; color: #8a9a92; font-size: 20rpx; }.step text { display: flex; width: 42rpx; height: 42rpx; align-items: center; justify-content: center; border: 2rpx solid #d9e0d8; border-radius: 50%; background: #fff; }.step small { font-size: 20rpx; }.step.active { color: #477269; font-weight: 700; }.step.active text { border-color: #477269; background: #477269; color: #fff; }.step-line-fill { height: 2rpx; flex: 1; margin: 0 12rpx; background: #d9e0d8; }.input-card, .preview-card, .empty-preview { margin-top: 30rpx; padding: 24rpx; border: 2rpx solid #e4e7dd; border-radius: 22rpx; background: rgba(255, 255, 255, .72); }.card-label, .preview-heading { display: flex; align-items: center; justify-content: space-between; color: #36564d; font-size: 24rpx; font-weight: 700; }.card-label button { padding: 0; background: transparent; color: #477269; font-size: 21rpx; }.csv-input { width: 100%; min-height: 190rpx; margin-top: 16rpx; padding: 16rpx; border: 2rpx solid #d9e0d8; border-radius: 16rpx; background: #fff; color: #183b32; font-size: 22rpx; line-height: 1.5; }.placeholder, .helper { color: #8a9a92; }.helper { display: block; margin-top: 12rpx; font-size: 20rpx; }.preview-heading text:last-child { color: #477269; font-size: 20rpx; font-weight: 400; }.preview-row { display: flex; min-height: 78rpx; align-items: center; gap: 12rpx; border-bottom: 2rpx solid #edf0e9; }.preview-row:last-child { border-bottom: 0; }.preview-mark { display: flex; width: 32rpx; height: 32rpx; align-items: center; justify-content: center; border-radius: 50%; background: #e2ece1; color: #477269; font-size: 19rpx; }.preview-row.invalid .preview-mark { background: #f1d8cf; color: #a34c42; }.preview-copy { min-width: 0; flex: 1; color: #36564d; font-size: 23rpx; }.preview-copy text, .preview-copy small { display: block; }.preview-copy small { margin-top: 5rpx; overflow: hidden; color: #8a9a92; font-size: 20rpx; text-overflow: ellipsis; white-space: nowrap; }.invalid-label { color: #a34c42; font-size: 20rpx; }.state-title { display: block; color: #183b32; font-size: 27rpx; font-weight: 700; }.state-copy { display: block; margin-top: 10rpx; color: #6c7d75; font-size: 22rpx; line-height: 1.5; }.primary-button, .cancel-button { width: 100%; height: 84rpx; border-radius: 20rpx; font-size: 25rpx; line-height: 84rpx; }.primary-button { margin-top: 32rpx; background: #183b32; color: #fff; }.primary-button[disabled] { opacity: .45; }.cancel-button { margin-top: 8rpx; background: transparent; color: #477269; }
</style>
