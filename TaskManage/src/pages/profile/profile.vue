<script setup>
import { computed, onMounted } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import AppNav from '../../components/AppNav.vue'
import { useAuthStore } from '../../stores/auth'
import { useFeedbackStore } from '../../stores/feedback'
import { useTaskStore } from '../../stores/tasks'

const auth = useAuthStore()
const taskStore = useTaskStore()
const feedbackStore = useFeedbackStore()
const username = computed(() => auth.user?.username || '本地体验')

onMounted(() => {
  if (!auth.hydrated) auth.hydrate()
  ensureSession()
})

onShow(() => {
  if (auth.isLoggedIn) taskStore.refresh()
})

function ensureSession() {
  if (!auth.isLoggedIn) uni.reLaunch({ url: '/pages/login/login' })
}

function openWeekly() {
  uni.navigateTo({ url: '/pages/feedback/weekly' })
}

function openCourse() {
  uni.navigateTo({ url: '/pages/schedule/course-edit' })
}

function showNotice() {
  uni.showModal({ title: '提醒与免打扰', content: '当前版本会在任务详情里设置截止前提醒。系统通知权限将在首次设置提醒时申请。', confirmText: '知道了', showCancel: false })
}

function logout() {
  auth.logout()
  uni.reLaunch({ url: '/pages/login/login' })
}
</script>

<template>
  <view class="profile-page safe-bottom">
    <view class="profile-header"><view><text class="eyebrow">个人空间</text><text class="page-title">我的</text></view><view class="account-avatar">{{ username.slice(0, 1).toUpperCase() }}</view></view>

    <view class="account-line"><view><text class="account-name">{{ username }}</text><text class="account-note">{{ auth.user?.guest ? '本地体验空间' : '本地账号' }}</text></view><text class="local-badge">本地</text></view>

    <view class="feedback-card" @tap="openWeekly"><view class="card-top"><text class="card-title">本周进度</text><text class="card-arrow">→</text></view><text class="feedback-summary">{{ feedbackStore.week.denominator ? `按期完成 ${feedbackStore.week.onTime}/${feedbackStore.week.denominator} 项` : '完成有截止时间的任务后，这里会生成反馈' }}</text><view class="feedback-metrics"><view><text>{{ feedbackStore.week.onTimeRate }}%</text><small>按期完成</small></view><view><text>{{ feedbackStore.week.completed }}</text><small>完成任务</small></view><view><text>{{ feedbackStore.week.rescheduled }}</text><small>改期次数</small></view></view><text class="feedback-link">查看完整周反馈</text></view>

    <view class="settings-group"><text class="group-label">学习设置</text><view class="settings-row" @tap="openCourse"><view><text class="settings-title">学期与课程</text><text class="settings-meta">添加每周固定课程，安排任务更有上下文</text></view><text class="settings-arrow">→</text></view></view>
    <view class="settings-group"><text class="group-label">提醒</text><view class="settings-row" @tap="showNotice"><view><text class="settings-title">提醒与免打扰</text><text class="settings-meta">在任务详情设置截止前提醒</text></view><text class="settings-arrow">→</text></view></view>
    <view class="settings-group"><text class="group-label">数据</text><view class="settings-row"><view><text class="settings-title">数据与同步</text><text class="settings-meta">当前数据保存在本设备</text></view><text class="local-badge">本地</text></view></view>

    <button class="logout-button" @tap="logout">退出登录</button>
    <AppNav active="profile" />
  </view>
</template>

<style lang="scss">
.profile-page { min-height: 100vh; padding: 58rpx 40rpx 190rpx; background: #f6f4ee; }
.profile-header { display: flex; align-items: flex-start; justify-content: space-between; }.eyebrow { display: block; color: #477269; font-size: 20rpx; font-weight: 750; letter-spacing: 3rpx; }.page-title { display: block; margin-top: 10rpx; color: #183b32; font-size: 54rpx; font-weight: 750; }
.account-avatar { display: flex; width: 74rpx; height: 74rpx; align-items: center; justify-content: center; border-radius: 24rpx; background: #183b32; color: #fff; font-size: 29rpx; font-weight: 750; }.account-line { display: flex; align-items: center; justify-content: space-between; margin-top: 28rpx; padding-bottom: 26rpx; border-bottom: 2rpx solid #e4e7dd; }.account-name { display: block; color: #183b32; font-size: 27rpx; font-weight: 700; }.account-note { display: block; margin-top: 6rpx; color: #8a9a92; font-size: 21rpx; }.local-badge { padding: 6rpx 12rpx; border-radius: 14rpx; background: #e2ece1; color: #477269; font-size: 20rpx; }
.feedback-card { margin-top: 30rpx; padding: 26rpx; border-radius: 24rpx; background: #e4efe2; }.card-top { display: flex; justify-content: space-between; }.card-title { color: #36564d; font-size: 24rpx; font-weight: 750; }.card-arrow { color: #477269; font-size: 30rpx; }.feedback-summary { display: block; margin-top: 20rpx; color: #183b32; font-size: 28rpx; font-weight: 700; line-height: 1.4; }.feedback-metrics { display: flex; margin-top: 24rpx; }.feedback-metrics view { flex: 1; border-right: 2rpx solid #c9dccb; }.feedback-metrics view:last-child { border-right: 0; }.feedback-metrics text, .feedback-metrics small { display: block; }.feedback-metrics text { color: #183b32; font-size: 28rpx; font-weight: 750; }.feedback-metrics small { margin-top: 6rpx; color: #5e6e68; font-size: 19rpx; }.feedback-link { display: block; margin-top: 22rpx; color: #477269; font-size: 21rpx; font-weight: 700; }
.settings-group { margin-top: 30rpx; }.group-label { display: block; margin-bottom: 10rpx; color: #8a9a92; font-size: 20rpx; font-weight: 700; }.settings-row { display: flex; min-height: 88rpx; align-items: center; justify-content: space-between; padding: 0 4rpx; border-bottom: 2rpx solid #e4e7dd; }.settings-title, .settings-meta { display: block; }.settings-title { color: #36564d; font-size: 25rpx; font-weight: 650; }.settings-meta { margin-top: 6rpx; color: #8a9a92; font-size: 20rpx; }.settings-arrow { color: #477269; font-size: 30rpx; }
.logout-button { width: 100%; height: 80rpx; margin-top: 42rpx; border: 2rpx solid #e0bbb0; border-radius: 18rpx; background: transparent; color: #a34c42; font-size: 25rpx; line-height: 76rpx; }
</style>
