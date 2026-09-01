<script setup>
import { computed, ref } from 'vue'
import { onMounted } from 'vue'
import { useAuthStore } from '../../stores/auth'

const auth = useAuthStore()
const mode = ref('login')
const username = ref('')
const password = ref('')
const confirmPassword = ref('')
const error = ref('')
const busy = ref(false)
const isRegister = computed(() => mode.value === 'register')

onMounted(() => {
  if (!auth.hydrated) auth.hydrate()
  if (auth.isLoggedIn) uni.reLaunch({ url: '/pages/tasks/tasks' })
})

function validate() {
  error.value = ''
  if (!username.value.trim() || !password.value) {
    error.value = '请输入用户名和密码。'
    return false
  }
  if (password.value.length < 6) {
    error.value = '密码至少需要 6 个字符。'
    return false
  }
  if (isRegister.value && password.value !== confirmPassword.value) {
    error.value = '两次输入的密码不一致。'
    return false
  }
  return true
}

function enterGuest() {
  auth.continueAsGuest()
  uni.reLaunch({ url: '/pages/tasks/tasks' })
}

async function submit() {
  if (!validate() || busy.value) return
  busy.value = true
  const result = isRegister.value
    ? auth.register(username.value, password.value)
    : auth.login(username.value, password.value)
  busy.value = false
  if (!result.ok) {
    error.value = result.message
    return
  }
  if (isRegister.value) {
    mode.value = 'login'
    password.value = ''
    confirmPassword.value = ''
    error.value = '账号已创建，请登录继续。'
    return
  }
  uni.reLaunch({ url: '/pages/tasks/tasks' })
}
</script>

<template>
  <view class="auth-page">
    <view class="auth-orbit orbit-one" />
    <view class="auth-orbit orbit-two" />
    <view class="auth-content">
      <view class="brand-mark">TM</view>
      <text class="eyebrow">TASKMANAGE · 学生任务执行中心</text>
      <text class="auth-title">{{ isRegister ? '为重要的事留出空间。' : '先记住，再一步步完成。' }}</text>
      <text class="auth-subtitle">把课程、作业和个人计划放在一个安静清楚的入口里。</text>

      <view class="auth-form">
        <view class="field-group">
          <text class="field-label">用户名</text>
          <input v-model="username" class="field-input" placeholder="输入用户名或邮箱" placeholder-class="field-placeholder" maxlength="80" />
        </view>
        <view class="field-group">
          <text class="field-label">密码</text>
          <input v-model="password" class="field-input" password placeholder="至少 6 个字符" placeholder-class="field-placeholder" maxlength="64" @confirm="submit" />
        </view>
        <view v-if="isRegister" class="field-group">
          <text class="field-label">确认密码</text>
          <input v-model="confirmPassword" class="field-input" password placeholder="再输入一次密码" placeholder-class="field-placeholder" @confirm="submit" />
        </view>
        <text v-if="error" class="form-message" :class="{ success: error.startsWith('账号') }">{{ error }}</text>
        <button class="primary-button" :disabled="busy" @tap="submit">{{ busy ? '处理中…' : (isRegister ? '创建本地账号' : '登录') }}</button>
      </view>

      <button class="text-button" @tap="mode = isRegister ? 'login' : 'register'">
        {{ isRegister ? '已有账号？返回登录' : '已有账号之外，创建本地账号' }}
      </button>
      <button class="guest-button" @tap="enterGuest">直接体验，不必先登录</button>
      <text class="prototype-note">本地体验 · 数据保存在此设备</text>
    </view>
  </view>
</template>

<style lang="scss">
.auth-page {
  position: relative;
  min-height: 100vh;
  overflow: hidden;
  background: #f6f4ee;
}

.auth-content {
  position: relative;
  z-index: 1;
  padding: 18vh 48rpx 64rpx;
}

.brand-mark {
  width: 88rpx;
  height: 88rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 28rpx;
  background: #183b32;
  color: #f6f4ee;
  font-size: 28rpx;
  font-weight: 800;
  letter-spacing: 2rpx;
  box-shadow: 0 18rpx 34rpx rgba(24, 59, 50, .2);
}

.eyebrow {
  display: block;
  margin-top: 56rpx;
  color: #477269;
  font-size: 24rpx;
  letter-spacing: 2rpx;
}

.auth-title {
  display: block;
  max-width: 620rpx;
  margin-top: 18rpx;
  color: #183b32;
  font-size: 68rpx;
  line-height: 1.1;
  font-weight: 750;
  letter-spacing: -2rpx;
}

.auth-subtitle {
  display: block;
  max-width: 600rpx;
  margin-top: 24rpx;
  color: #5e6e68;
  font-size: 28rpx;
  line-height: 1.55;
}

.auth-form {
  margin-top: 72rpx;
}

.field-group + .field-group {
  margin-top: 28rpx;
}

.field-label {
  display: block;
  margin-bottom: 12rpx;
  color: #36564d;
  font-size: 24rpx;
  font-weight: 650;
}

.field-input {
  width: 100%;
  height: 104rpx;
  padding: 0 28rpx;
  border: 2rpx solid #d9e0d8;
  border-radius: 24rpx;
  background: rgba(255, 255, 255, .72);
  color: #183b32;
  font-size: 30rpx;
}

.field-placeholder {
  color: #8a9a92;
}

.form-message {
  display: block;
  margin-top: 24rpx;
  color: #a34c42;
  font-size: 25rpx;
  line-height: 1.4;
}

.form-message.success {
  color: #2d725d;
}

.primary-button {
  height: 104rpx;
  margin-top: 34rpx;
  border-radius: 24rpx;
  background: #183b32;
  color: #fff;
  font-size: 30rpx;
  font-weight: 700;
  line-height: 104rpx;
}

.primary-button[disabled] {
  opacity: .55;
}

.text-button {
  margin-top: 28rpx;
  padding: 0;
  background: transparent;
  color: #477269;
  font-size: 26rpx;
  line-height: 1.5;
}

.guest-button {
  width: 100%;
  height: 84rpx;
  margin-top: 14rpx;
  padding: 0;
  border: 2rpx solid #b8d1be;
  border-radius: 22rpx;
  background: transparent;
  color: #36564d;
  font-size: 27rpx;
  line-height: 80rpx;
}

.prototype-note {
  display: block;
  margin-top: 64rpx;
  color: #8a9a92;
  font-size: 22rpx;
  text-align: center;
}

.auth-orbit {
  position: absolute;
  border-radius: 50%;
  opacity: .65;
}

.orbit-one {
  width: 560rpx;
  height: 560rpx;
  top: -230rpx;
  right: -160rpx;
  background: #dbe9db;
}

.orbit-two {
  width: 340rpx;
  height: 340rpx;
  bottom: -130rpx;
  left: -170rpx;
  background: #e8dcc6;
}
</style>
