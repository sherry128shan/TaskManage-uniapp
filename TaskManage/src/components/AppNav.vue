<script setup>
import { computed, onMounted, reactive, ref } from 'vue'
import { useCourseStore } from '../stores/courses'
import { useTaskStore } from '../stores/tasks'
import { addDaysISO, endOfDayISO, todayISO } from '../utils/date'

defineProps({ active: { type: String, default: 'today' } })

const taskStore = useTaskStore()
const courseStore = useCourseStore()
const showQuickCreate = ref(false)
const saving = ref(false)
const quickError = ref('')
const quickForm = reactive({ title: '', courseId: '', dueDate: '' })

const selectedCourse = computed(() => courseStore.activeCourses.find((course) => course.id === quickForm.courseId))
const isDirty = computed(() => Boolean(quickForm.title.trim() || quickForm.courseId || quickForm.dueDate))

onMounted(() => courseStore.refresh())

function resetQuickForm() {
  quickForm.title = ''
  quickForm.courseId = ''
  quickForm.dueDate = ''
  quickError.value = ''
}

function go(path) {
  if (path === 'add') {
    resetQuickForm()
    showQuickCreate.value = true
    return
  }
  const routes = {
    today: '/pages/tasks/tasks',
    schedule: '/pages/schedule/schedule',
    tasks: '/pages/tasks/center',
    profile: '/pages/profile/profile'
  }
  if (routes[path]) uni.reLaunch({ url: routes[path] })
}

function closeQuick() {
  if (!isDirty.value) {
    showQuickCreate.value = false
    return
  }
  uni.showModal({ title: '放弃这条记录？', content: '已输入的内容不会保存。', confirmText: '放弃', cancelText: '继续编辑', confirmColor: '#A34C42' }).then(({ confirm }) => {
    if (confirm) showQuickCreate.value = false
  }).catch(() => {})
}

function openFullEditor() {
  const query = [`draftTitle=${encodeURIComponent(quickForm.title)}`, `draftDate=${encodeURIComponent(quickForm.dueDate)}`, `draftCourseId=${encodeURIComponent(quickForm.courseId)}`].join('&')
  showQuickCreate.value = false
  uni.navigateTo({ url: `/pages/tasks/edit?${query}` })
}

function saveQuick() {
  quickError.value = ''
  const title = quickForm.title.trim()
  if (!title) {
    quickError.value = '请先写下要记住的事情。'
    return
  }
  if (title.length > 80) {
    quickError.value = '标题最多 80 个字。'
    return
  }
  if (saving.value) return
  saving.value = true
  try {
    const task = taskStore.add({
      title,
      dueAt: quickForm.dueDate ? endOfDayISO(quickForm.dueDate) : null,
      courseId: quickForm.courseId || null,
      source: 'quick'
    })
    showQuickCreate.value = false
    resetQuickForm()
    uni.showToast({ title: task.dueAt ? '已加入任务' : '已保存到收集箱', icon: 'none' })
  } finally {
    saving.value = false
  }
}

function setQuickDate(days) {
  quickForm.dueDate = addDaysISO(todayISO(), days)
}
</script>

<template>
  <view>
    <view class="app-nav safe-bottom">
      <button class="nav-item" :class="{ active: active === 'today' }" aria-label="今天" @tap="go('today')">
        <view class="nav-icon icon-today" aria-hidden="true"><view /><view /><view /></view>
        <text>今天</text>
      </button>
      <button class="nav-item" :class="{ active: active === 'schedule' }" aria-label="日程" @tap="go('schedule')">
        <view class="nav-icon icon-calendar" aria-hidden="true"><view /><view /></view>
        <text>日程</text>
      </button>
      <button class="nav-add" aria-label="记录任务" @tap="go('add')">
        <view class="nav-add-icon" aria-hidden="true">＋</view>
        <text>记录</text>
      </button>
      <button class="nav-item" :class="{ active: active === 'tasks' }" aria-label="任务" @tap="go('tasks')">
        <view class="nav-icon icon-list" aria-hidden="true"><view /><view /><view /></view>
        <text>任务</text>
        <text v-if="taskStore.unplannedCount" class="nav-badge">{{ taskStore.unplannedCount > 9 ? '9+' : taskStore.unplannedCount }}</text>
      </button>
      <button class="nav-item" :class="{ active: active === 'profile' }" aria-label="我的" @tap="go('profile')">
        <view class="nav-icon icon-profile" aria-hidden="true"><view /></view>
        <text>我的</text>
      </button>
    </view>

    <view v-if="showQuickCreate" class="quick-layer" @tap.self="closeQuick">
      <view class="quick-sheet safe-bottom">
        <view class="sheet-handle" />
        <view class="sheet-header">
          <text class="sheet-title">记录一件事</text>
          <button class="close-button" aria-label="关闭快速记录" @tap="closeQuick">×</button>
        </view>
        <text class="field-label">标题 <text class="required">*</text></text>
        <input v-model="quickForm.title" class="quick-input" maxlength="80" focus placeholder="例如：周五前提交英语作文" placeholder-class="field-placeholder" @confirm="saveQuick" />
        <text v-if="quickError" class="field-error">{{ quickError }}</text>

        <view class="quick-fields">
          <picker mode="selector" :range="courseStore.activeCourses" range-key="name" @change="quickForm.courseId = courseStore.activeCourses[$event.detail.value]?.id || ''">
            <view class="quick-chip"><text>{{ selectedCourse?.name || '课程' }}</text><text>＋</text></view>
          </picker>
          <picker mode="date" :value="quickForm.dueDate || todayISO()" @change="quickForm.dueDate = $event.detail.value">
            <view class="quick-chip"><text>{{ quickForm.dueDate || '截止日期' }}</text><text>＋</text></view>
          </picker>
        </view>
        <view class="quick-date-options">
          <button @tap="quickForm.dueDate = ''">先不安排</button>
          <button @tap="setQuickDate(0)">今天</button>
          <button @tap="setQuickDate(1)">明天</button>
          <button @tap="setQuickDate(6)">本周</button>
        </view>
        <button class="more-settings" @tap="openFullEditor">更多设置 →</button>
        <button class="save-button" :disabled="saving" @tap="saveQuick">{{ saving ? '保存中…' : '保存' }}</button>
      </view>
    </view>
  </view>
</template>

<style lang="scss">
.app-nav { position: fixed; z-index: 20; right: 0; bottom: 0; left: 0; display: flex; align-items: flex-end; justify-content: space-around; padding-top: 12rpx; background: rgba(246, 244, 238, .97); border-top: 2rpx solid #e5e5dc; backdrop-filter: blur(14px); }
.nav-item, .nav-add { position: relative; display: flex; flex-direction: column; align-items: center; gap: 4rpx; min-height: 92rpx; padding: 0; background: transparent; color: #71827a; font-size: 21rpx; line-height: 1.2; }
.nav-item { width: 20%; }
.nav-item.active { color: #183b32; font-weight: 700; }
.nav-item:active, .nav-add:active, .close-button:active, .quick-chip:active, .quick-date-options button:active { opacity: .68; }
.nav-icon { position: relative; display: flex; width: 34rpx; height: 34rpx; align-items: center; justify-content: center; color: currentColor; }
.icon-today { flex-direction: column; gap: 4rpx; padding: 4rpx 2rpx; }
.icon-today view { width: 27rpx; height: 4rpx; border-radius: 4rpx; background: currentColor; }
.icon-calendar { border: 3rpx solid currentColor; border-radius: 7rpx; }
.icon-calendar::before { position: absolute; top: 7rpx; right: -3rpx; left: -3rpx; height: 3rpx; background: currentColor; content: ''; }
.icon-calendar view { position: absolute; top: -7rpx; width: 3rpx; height: 10rpx; border-radius: 2rpx; background: currentColor; }
.icon-calendar view:first-child { left: 7rpx; }
.icon-calendar view:last-child { right: 7rpx; }
.icon-list { flex-direction: column; gap: 5rpx; }
.icon-list view { width: 26rpx; height: 4rpx; border-radius: 3rpx; background: currentColor; }
.icon-profile { border: 3rpx solid currentColor; border-radius: 50%; }
.icon-profile::after { position: absolute; bottom: 4rpx; width: 17rpx; height: 8rpx; border: 3rpx solid currentColor; border-radius: 50% 50% 45% 45%; content: ''; }
.icon-profile view { position: absolute; top: 5rpx; width: 8rpx; height: 8rpx; border-radius: 50%; background: currentColor; }
.nav-add { width: 20%; color: #183b32; }
.nav-add-icon { display: flex; width: 74rpx; height: 74rpx; align-items: center; justify-content: center; margin-top: -28rpx; border: 6rpx solid #f6f4ee; border-radius: 50%; background: #183b32; box-shadow: 0 10rpx 22rpx rgba(24, 59, 50, .2); color: #fff; font-size: 48rpx; font-weight: 300; line-height: 62rpx; }
.nav-badge { position: absolute; top: -2rpx; right: 20rpx; min-width: 28rpx; padding: 2rpx 6rpx; border-radius: 14rpx; background: #a34c42; color: #fff; font-size: 17rpx; line-height: 24rpx; }
.quick-layer { position: fixed; z-index: 30; inset: 0; display: flex; align-items: flex-end; background: rgba(24, 59, 50, .28); }
.quick-sheet { width: 100%; padding: 16rpx 40rpx 26rpx; border-radius: 32rpx 32rpx 0 0; background: #fbfaf5; box-shadow: 0 -18rpx 48rpx rgba(24, 59, 50, .16); }
.sheet-handle { width: 72rpx; height: 8rpx; margin: 0 auto 24rpx; border-radius: 8rpx; background: #c4cec6; }
.sheet-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 28rpx; }
.sheet-title { color: #183b32; font-size: 38rpx; font-weight: 750; }
.close-button { width: 64rpx; height: 64rpx; padding: 0; background: transparent; color: #477269; font-size: 48rpx; font-weight: 300; line-height: 58rpx; }
.field-label { display: block; margin-bottom: 12rpx; color: #36564d; font-size: 24rpx; font-weight: 700; }
.required, .field-error { color: #a34c42; }
.quick-input { width: 100%; height: 96rpx; padding: 0 24rpx; border: 2rpx solid #b8d1be; border-radius: 20rpx; background: #fff; color: #183b32; font-size: 29rpx; }
.field-placeholder { color: #8a9a92; }
.field-error { display: block; margin-top: 10rpx; font-size: 23rpx; }
.quick-fields { display: flex; gap: 16rpx; margin-top: 24rpx; }
.quick-fields picker { flex: 1; }
.quick-chip { display: flex; height: 78rpx; align-items: center; justify-content: space-between; padding: 0 20rpx; border: 2rpx solid #d9e0d8; border-radius: 18rpx; background: #fff; color: #477269; font-size: 23rpx; }
.quick-date-options { display: flex; gap: 12rpx; margin-top: 16rpx; }
.quick-date-options button { flex: 1; height: 58rpx; padding: 0 8rpx; border: 2rpx solid #e4e7dd; border-radius: 16rpx; background: transparent; color: #6c7d75; font-size: 21rpx; line-height: 54rpx; }
.more-settings { margin: 24rpx 0 0; padding: 0; background: transparent; color: #477269; font-size: 24rpx; text-align: left; }
.save-button { width: 100%; height: 92rpx; margin-top: 24rpx; border-radius: 22rpx; background: #183b32; color: #fff; font-size: 28rpx; font-weight: 700; line-height: 92rpx; }
.save-button[disabled] { opacity: .55; }
</style>
