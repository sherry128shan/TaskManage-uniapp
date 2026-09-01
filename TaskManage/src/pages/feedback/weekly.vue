<script setup>
import { computed, onMounted } from 'vue'
import { useAuthStore } from '../../stores/auth'
import { useFeedbackStore } from '../../stores/feedback'
import { useTaskStore } from '../../stores/tasks'
import { TASK_TYPE_LABELS } from '../../data/taskRepository'

const auth = useAuthStore()
const taskStore = useTaskStore()
const feedbackStore = useFeedbackStore()
const typeRows = computed(() => Object.entries(feedbackStore.week.byType).map(([type, count]) => ({ label: TASK_TYPE_LABELS[type] || '其他', count })))
const maxDaily = computed(() => Math.max(...feedbackStore.week.daily.map((item) => item.count), 1))

onMounted(() => {
  if (!auth.hydrated) auth.hydrate()
  if (!auth.isLoggedIn) {
    uni.reLaunch({ url: '/pages/login/login' })
    return
  }
  taskStore.refresh()
})

function planNextWeek() {
  uni.navigateTo({ url: '/pages/tasks/center?tab=upcoming' })
}
</script>

<template>
  <view class="weekly-page safe-bottom"><view class="weekly-header"><text class="eyebrow">一周回顾</text><text class="page-title">本周反馈</text><text class="page-subtitle">看看计划是否适合真实的节奏。</text></view>
    <view class="summary-card"><text class="summary-title">{{ feedbackStore.week.completed ? `你完成了 ${feedbackStore.week.completed} 项任务` : '这周还没有完成记录' }}</text><text class="summary-copy">{{ feedbackStore.week.denominator ? `其中 ${feedbackStore.week.onTime} 项按期完成。` : '完成 3 个有截止时间的任务后，这里会生成按期趋势。' }}</text><view class="rate-line"><text>按期完成率</text><text>{{ feedbackStore.week.onTimeRate }}%</text></view><view class="rate-track"><view :style="{ width: `${feedbackStore.week.onTimeRate}%` }" /></view></view>
    <view class="section"><text class="section-title">每天完成了多少</text><view class="chart-card"><view v-for="item in feedbackStore.week.daily" :key="item.date" class="bar-column"><text class="bar-value">{{ item.count || '' }}</text><view class="bar-track"><view class="bar" :style="{ height: `${(item.count / maxDaily) * 100}%` }" /></view><text class="bar-label">{{ item.label }}</text></view></view></view>
    <view class="section"><text class="section-title">任务类型</text><view v-if="typeRows.length" class="type-card"><view v-for="item in typeRows" :key="item.label" class="type-row"><text>{{ item.label }}</text><view class="type-track"><view :style="{ width: `${(item.count / Math.max(feedbackStore.week.planned, 1)) * 100}%` }" /></view><text>{{ item.count }}</text></view></view><view v-else class="muted-card">本周还没有足够数据。</view></view>
    <view class="insight-card"><text class="insight-label">本周观察</text><text class="insight-title">{{ feedbackStore.week.peakDay?.count ? `${feedbackStore.week.peakDay.label}完成最多，共 ${feedbackStore.week.peakDay.count} 项。` : '先完成一项任务，给下一周留下可以调整的依据。' }}</text><text class="insight-copy">{{ feedbackStore.week.denominator ? '如果某一天安排太满，可以尝试把任务提前分散。' : '不用一次安排完整，先从一个真实的下一步开始。' }}</text></view>
    <button class="primary-button" @tap="planNextWeek">规划下一步</button>
  </view>
</template>

<style lang="scss">
.weekly-page { min-height: 100vh; padding: 58rpx 40rpx 70rpx; background: #f6f4ee; }.eyebrow { display: block; color: #477269; font-size: 20rpx; font-weight: 750; letter-spacing: 3rpx; }.page-title { display: block; margin-top: 10rpx; color: #183b32; font-size: 50rpx; font-weight: 750; }.page-subtitle { display: block; margin-top: 12rpx; color: #6c7d75; font-size: 24rpx; }
.summary-card { margin-top: 34rpx; padding: 28rpx; border-radius: 24rpx; background: #e4efe2; }.summary-title { display: block; color: #183b32; font-size: 29rpx; font-weight: 750; }.summary-copy { display: block; margin-top: 10rpx; color: #5e6e68; font-size: 22rpx; line-height: 1.45; }.rate-line { display: flex; justify-content: space-between; margin-top: 26rpx; color: #477269; font-size: 22rpx; }.rate-line text:last-child { color: #183b32; font-size: 28rpx; font-weight: 750; }.rate-track { height: 10rpx; margin-top: 10rpx; border-radius: 10rpx; background: #c9dccb; }.rate-track view { height: 100%; border-radius: 10rpx; background: #477269; }
.section { margin-top: 34rpx; }.section-title { display: block; margin-bottom: 12rpx; color: #36564d; font-size: 24rpx; font-weight: 750; }.chart-card, .type-card, .muted-card { padding: 22rpx; border: 2rpx solid #e4e7dd; border-radius: 22rpx; background: rgba(255, 255, 255, .7); }.chart-card { display: flex; height: 230rpx; align-items: flex-end; justify-content: space-around; }.bar-column { display: flex; height: 100%; flex-direction: column; align-items: center; justify-content: flex-end; }.bar-value { height: 28rpx; color: #477269; font-size: 19rpx; }.bar-track { display: flex; width: 28rpx; height: 140rpx; align-items: flex-end; border-radius: 8rpx; background: #edf0e9; }.bar { width: 100%; min-height: 4rpx; border-radius: 8rpx; background: #477269; }.bar-label { margin-top: 10rpx; color: #8a9a92; font-size: 19rpx; }.type-row { display: flex; min-height: 52rpx; align-items: center; gap: 12rpx; color: #5e6e68; font-size: 22rpx; }.type-row > text:first-child { width: 64rpx; }.type-row > text:last-child { width: 28rpx; color: #477269; text-align: right; }.type-track { height: 10rpx; flex: 1; border-radius: 8rpx; background: #edf0e9; }.type-track view { height: 100%; border-radius: 8rpx; background: #8c6a4a; }.muted-card { color: #8a9a92; font-size: 22rpx; }.insight-card { margin-top: 34rpx; padding: 24rpx; border-left: 8rpx solid #8c6a4a; border-radius: 20rpx; background: #f6eadf; }.insight-label { display: block; color: #8c6a4a; font-size: 21rpx; font-weight: 750; }.insight-title { display: block; margin-top: 10rpx; color: #5e4634; font-size: 26rpx; font-weight: 700; line-height: 1.4; }.insight-copy { display: block; margin-top: 8rpx; color: #806e5c; font-size: 21rpx; line-height: 1.45; }.primary-button { width: 100%; height: 86rpx; margin-top: 34rpx; border-radius: 20rpx; background: #183b32; color: #fff; font-size: 26rpx; font-weight: 700; line-height: 86rpx; }
</style>
