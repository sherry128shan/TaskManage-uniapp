<script setup>
import { computed, onMounted, reactive, ref } from 'vue'
import { useAlarmStore } from '../../stores/alarms'
import { useAuthStore } from '../../stores/auth'
import { useCalendarStore } from '../../stores/calendar'
import { useCourseStore } from '../../stores/courses'
import { useTaskStore } from '../../stores/tasks'
import { PRIORITY_LABELS, PRIORITIES, STATUS, TASK_TYPE_LABELS, TASK_TYPES } from '../../data/taskRepository'
import { findConflicts, hasInvalidTaskTime } from '../../domain/conflictService'
import { datePart, formatDateTime, isoDateAtTime, timePart, todayISO } from '../../utils/date'

const auth = useAuthStore()
const taskStore = useTaskStore()
const courseStore = useCourseStore()
const calendarStore = useCalendarStore()
const alarmStore = useAlarmStore()
const editingId = ref('')
const busy = ref(false)
const isQuickCapture = ref(false)
const errors = reactive({ title: '', description: '', time: '', estimatedMinutes: '' })
const form = reactive({
  title: '',
  description: '',
  type: TASK_TYPES.OTHER,
  courseId: '',
  dueDate: '',
  dueTime: '',
  scheduledDate: '',
  scheduledTime: '',
  estimatedMinutes: '',
  priority: PRIORITIES.NORMAL,
  status: STATUS.TODO,
  reminderPreset: 'none'
})
const typeOptions = Object.entries(TASK_TYPE_LABELS).map(([value, label]) => ({ value, label }))
const priorityOptions = Object.entries(PRIORITY_LABELS).map(([value, label]) => ({ value, label }))
const statusOptions = [
  { value: STATUS.TODO, label: '未开始' },
  { value: STATUS.DOING, label: '进行中' },
  { value: STATUS.DONE, label: '已完成' },
  { value: STATUS.CANCELLED, label: '已取消' }
]
const isEditing = computed(() => Boolean(editingId.value))
const dueAt = computed(() => form.dueDate ? isoDateAtTime(form.dueDate, form.dueTime || '23:59') : null)
const scheduledStartAt = computed(() => form.scheduledDate ? isoDateAtTime(form.scheduledDate, form.scheduledTime || '09:00') : null)
const previewTask = computed(() => ({ id: editingId.value, scheduledStartAt: scheduledStartAt.value, estimatedMinutes: Number(form.estimatedMinutes) || 30, dueAt: dueAt.value }))
const conflicts = computed(() => findConflicts(previewTask.value, taskStore.tasks, calendarStore.events))

onMounted(() => {
  if (!auth.hydrated) auth.hydrate()
  taskStore.refresh()
  courseStore.refresh()
  calendarStore.refresh()
  alarmStore.refresh()
  const pages = getCurrentPages()
  const options = pages[pages.length - 1]?.options || {}
  editingId.value = options.id || ''
  isQuickCapture.value = options.quick === '1' && !editingId.value
  if (editingId.value) loadTask(editingId.value)
  else {
    form.title = options.draftTitle || ''
    form.dueDate = options.draftDate || ''
    form.courseId = options.draftCourseId || ''
    form.scheduledDate = options.scheduledDate || ''
  }
  uni.setNavigationBarTitle({ title: editingId.value ? '任务详情' : '添加任务' })
})

function loadTask(id) {
  const task = taskStore.tasks.find((item) => item.id === id)
  if (!task) return
  form.title = task.title
  form.description = task.description
  form.type = task.type
  form.courseId = task.courseId || ''
  form.dueDate = datePart(task.dueAt)
  form.dueTime = timePart(task.dueAt)
  form.scheduledDate = datePart(task.scheduledStartAt)
  form.scheduledTime = timePart(task.scheduledStartAt)
  form.estimatedMinutes = task.estimatedMinutes || ''
  form.priority = task.priority
  form.status = task.status
  const reminder = alarmStore.alarms.find((item) => item.taskId === id && item.status === 'scheduled')
  form.reminderPreset = reminder?.offsetMinutes === 1440 ? 'day' : reminder ? 'twoHours' : 'none'
}

function pickerValue(options, value) {
  return Math.max(0, options.findIndex((item) => item.value === value))
}

function validate() {
  errors.title = form.title.trim() ? (form.title.trim().length > 80 ? '标题最多 80 个字。' : '') : '请写下任务标题。'
  errors.description = form.description.length > 500 ? '描述最多 500 个字。' : ''
  errors.estimatedMinutes = form.estimatedMinutes && (!Number.isFinite(Number(form.estimatedMinutes)) || Number(form.estimatedMinutes) < 5 || Number(form.estimatedMinutes) > 480) ? '预计耗时需在 5–480 分钟之间。' : ''
  errors.time = hasInvalidTaskTime(previewTask.value) ? '计划开始时间不能晚于截止时间。' : ''
  return !errors.title && !errors.description && !errors.estimatedMinutes && !errors.time
}

function persist() {
  const payload = {
    title: form.title,
    description: form.description,
    type: form.type,
    courseId: form.courseId || null,
    dueAt: dueAt.value,
    scheduledStartAt: scheduledStartAt.value,
    estimatedMinutes: form.estimatedMinutes || null,
    priority: form.priority,
    status: form.status,
    source: isQuickCapture.value ? 'quick' : 'manual'
  }
  const task = isEditing.value ? taskStore.update(editingId.value, payload) : taskStore.add(payload)
  if (task && form.status !== STATUS.DONE && form.reminderPreset !== 'none') alarmStore.setTaskReminder(task, form.reminderPreset)
  else if (task) alarmStore.setTaskReminder(task, 'none')
  uni.showToast({ title: isEditing.value ? '任务已更新' : '任务已保存', icon: 'none' })
  setTimeout(() => uni.navigateBack(), 220)
}

function save() {
  if (busy.value || !validate()) return
  if (conflicts.value.length) {
    uni.showModal({ title: '发现时间冲突', content: `与「${conflicts.value[0].title}」的时间重叠，仍要保存吗？`, confirmText: '继续保存', cancelText: '返回调整' }).then(({ confirm }) => { if (confirm) persist() }).catch(() => {})
    return
  }
  busy.value = true
  persist()
}

function deleteCurrent() {
  uni.showModal({ title: '删除这项任务？', content: '删除后无法在任务中心找回。', confirmText: '删除', cancelText: '保留', confirmColor: '#A34C42' }).then(({ confirm }) => {
    if (confirm) {
      taskStore.remove(editingId.value)
      alarmStore.cancelForTask(editingId.value)
      uni.navigateBack()
    }
  }).catch(() => {})
}

function completeCurrent() {
  if (!editingId.value) return
  if (form.status === STATUS.DONE) taskStore.reopen(editingId.value)
  else taskStore.complete(editingId.value)
  uni.navigateBack()
}
</script>

<template>
  <view class="edit-page safe-bottom">
    <view class="edit-header"><view><text class="eyebrow">{{ isEditing ? '任务详情' : '快速记录' }}</text><text class="page-title">{{ isEditing ? '任务详情' : '添加任务' }}</text><text class="page-subtitle">标题是唯一必填项，其他信息之后再补也可以。</text></view><button v-if="isEditing" class="delete-button" aria-label="删除任务" @tap="deleteCurrent">删除</button></view>

    <view class="form-card">
      <view class="field-group"><text class="field-label">标题 <text class="required">*</text></text><input v-model="form.title" class="field-input" maxlength="80" placeholder="例如：完成第三章习题" placeholder-class="field-placeholder" /><text v-if="errors.title" class="field-error">{{ errors.title }}</text></view>
      <view class="field-group"><text class="field-label">描述 <text class="optional">可选</text></text><textarea v-model="form.description" class="field-textarea" maxlength="500" placeholder="做到什么程度算完成？" placeholder-class="field-placeholder" auto-height /><text v-if="errors.description" class="field-error">{{ errors.description }}</text></view>

      <view class="field-group"><text class="field-label">类型</text><picker mode="selector" :range="typeOptions" range-key="label" :value="pickerValue(typeOptions, form.type)" @change="form.type = typeOptions[$event.detail.value].value"><view class="picker-field">{{ TASK_TYPE_LABELS[form.type] }}<text>⌄</text></view></picker></view>
      <view class="field-group"><text class="field-label">关联课程 <text class="optional">可选</text></text><picker mode="selector" :range="[{ name: '不关联课程', id: '' }, ...courseStore.activeCourses]" range-key="name" :value="Math.max(0, [{ name: '不关联课程', id: '' }, ...courseStore.activeCourses].findIndex((item) => item.id === form.courseId))" @change="form.courseId = [{ name: '不关联课程', id: '' }, ...courseStore.activeCourses][$event.detail.value].id"><view class="picker-field">{{ courseStore.courses.find((item) => item.id === form.courseId)?.name || '不关联课程' }}<text>⌄</text></view></picker></view>

      <view class="field-group"><text class="field-label">截止时间 <text class="optional">可选</text></text><view class="split-fields"><picker mode="date" :value="form.dueDate || todayISO()" @change="form.dueDate = $event.detail.value"><view class="picker-field">{{ form.dueDate || '选择日期' }}</view></picker><picker mode="time" :value="form.dueTime || '23:59'" @change="form.dueTime = $event.detail.value"><view class="picker-field">{{ form.dueTime || '23:59' }}</view></picker></view></view>
      <view class="field-group"><text class="field-label">计划开始 <text class="optional">可选</text></text><view class="split-fields"><picker mode="date" :value="form.scheduledDate || todayISO()" @change="form.scheduledDate = $event.detail.value"><view class="picker-field">{{ form.scheduledDate || '选择日期' }}</view></picker><picker mode="time" :value="form.scheduledTime || '09:00'" @change="form.scheduledTime = $event.detail.value"><view class="picker-field">{{ form.scheduledTime || '09:00' }}</view></picker></view><text class="field-hint">计划时间用于安排执行，截止时间表示最晚完成。</text></view>
      <view class="field-group"><text class="field-label">预计耗时（分钟） <text class="optional">可选</text></text><input v-model="form.estimatedMinutes" class="field-input" type="number" placeholder="例如：60" placeholder-class="field-placeholder" /><text v-if="errors.estimatedMinutes" class="field-error">{{ errors.estimatedMinutes }}</text></view>

      <view class="field-group"><text class="field-label">优先级</text><view class="choice-row"><button v-for="item in priorityOptions" :key="item.value" :class="{ selected: form.priority === item.value }" @tap="form.priority = item.value">{{ item.label }}</button></view></view>
      <view class="field-group"><text class="field-label">截止前提醒</text><view class="choice-row"><button :class="{ selected: form.reminderPreset === 'none' }" @tap="form.reminderPreset = 'none'">不提醒</button><button :class="{ selected: form.reminderPreset === 'twoHours' }" @tap="form.reminderPreset = 'twoHours'">提前 2 小时</button><button :class="{ selected: form.reminderPreset === 'day' }" @tap="form.reminderPreset = 'day'">提前 1 天</button></view><text class="field-hint">首次开启提醒时，系统会再请求通知权限。</text></view>
      <text v-if="errors.time" class="field-error conflict-error">{{ errors.time }}</text>
      <view v-if="conflicts.length" class="conflict-box"><text class="conflict-title">时间有重叠</text><text>与「{{ conflicts[0].title }}」的时间冲突，保存前可以调整，也可以继续保存。</text></view>

      <button class="save-button" :disabled="busy" @tap="save">{{ busy ? '保存中…' : (isEditing ? '保存修改' : '保存任务') }}</button>
      <button v-if="isEditing" class="status-button" @tap="completeCurrent">{{ form.status === STATUS.DONE ? '撤销完成' : '标记为完成' }}</button>
      <button class="cancel-button" @tap="uni.navigateBack()">取消</button>
    </view>
  </view>
</template>

<style lang="scss">
.edit-page { min-height: 100vh; padding: 58rpx 40rpx 70rpx; background: #f6f4ee; }
.edit-header { display: flex; align-items: flex-start; justify-content: space-between; }
.eyebrow { display: block; color: #477269; font-size: 20rpx; font-weight: 750; letter-spacing: 3rpx; }
.page-title { display: block; margin-top: 10rpx; color: #183b32; font-size: 50rpx; font-weight: 750; line-height: 1.1; }
.page-subtitle { display: block; max-width: 570rpx; margin-top: 14rpx; color: #6c7d75; font-size: 24rpx; line-height: 1.5; }
.delete-button { min-width: 84rpx; height: 62rpx; padding: 0; border: 2rpx solid #e0bbb0; border-radius: 16rpx; background: transparent; color: #a34c42; font-size: 22rpx; line-height: 58rpx; }
.form-card { margin-top: 38rpx; padding: 30rpx 26rpx 28rpx; border: 2rpx solid #e4e7dd; border-radius: 28rpx; background: rgba(255, 255, 255, .72); }
.field-group + .field-group { margin-top: 28rpx; }
.field-label { display: block; margin-bottom: 12rpx; color: #36564d; font-size: 24rpx; font-weight: 700; }
.required, .field-error { color: #a34c42; }
.optional { margin-left: 8rpx; color: #8a9a92; font-size: 21rpx; font-weight: 400; }
.field-input, .field-textarea, .picker-field { width: 100%; border: 2rpx solid #d9e0d8; border-radius: 18rpx; background: #fff; color: #183b32; font-size: 27rpx; }
.field-input { height: 88rpx; padding: 0 22rpx; }
.field-textarea { min-height: 138rpx; padding: 18rpx 22rpx; line-height: 1.5; }
.field-placeholder { color: #8a9a92; }
.field-error { display: block; margin-top: 8rpx; font-size: 22rpx; }
.field-hint { display: block; margin-top: 9rpx; color: #8a9a92; font-size: 20rpx; line-height: 1.4; }
.picker-field { display: flex; height: 84rpx; align-items: center; justify-content: space-between; padding: 0 20rpx; }
.picker-field text { color: #477269; font-size: 28rpx; }
.split-fields { display: flex; gap: 12rpx; }
.split-fields picker { min-width: 0; flex: 1; }
.choice-row { display: flex; gap: 10rpx; }
.choice-row button { flex: 1; height: 68rpx; padding: 0 8rpx; border: 2rpx solid #d9e0d8; border-radius: 16rpx; background: #fff; color: #6c7d75; font-size: 22rpx; line-height: 64rpx; }
.choice-row button.selected { border-color: #477269; background: #e4efe2; color: #183b32; font-weight: 700; }
.conflict-error { margin-top: 22rpx; }
.conflict-box { margin-top: 22rpx; padding: 18rpx 20rpx; border-radius: 18rpx; background: #fbebe5; color: #8f5148; font-size: 21rpx; line-height: 1.45; }
.conflict-title { display: block; margin-bottom: 4rpx; color: #a34c42; font-weight: 750; }
.save-button, .status-button, .cancel-button { width: 100%; height: 86rpx; border-radius: 20rpx; font-size: 26rpx; line-height: 86rpx; }
.save-button { margin-top: 34rpx; background: #183b32; color: #fff; font-weight: 700; }
.save-button[disabled] { opacity: .55; }
.status-button { margin-top: 12rpx; border: 2rpx solid #b8d1be; background: transparent; color: #36564d; }
.cancel-button { margin-top: 6rpx; background: transparent; color: #477269; }
</style>
