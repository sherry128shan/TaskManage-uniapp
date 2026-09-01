<script setup>
import { onMounted } from 'vue'

onMounted(() => uni.reLaunch({ url: '/pages/tasks/center?tab=inbox' }))
</script>

<template><view /></template>
