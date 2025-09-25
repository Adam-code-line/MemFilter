<template>
  <div class="min-h-screen">
    <!-- 应用内头部 -->
    <Header />
    
    <div class="flex">
      <!-- 侧边栏 -->
      <Sidebar />
      
      <!-- 主内容区域 -->
      <UMain class="flex-1 min-h-screen">
        <slot />
      </UMain>
    </div>
    
    <!-- 应用内底部 -->
    <Footer />
  </div>
</template>

<script lang="ts" setup>
// 设置页面标题
useHead({
  titleTemplate: '%s - 忆滤 MemFilter'
})
</script>

<style scoped>
/* 确保布局不会有滚动问题 */
.min-h-screen {
  min-height: 100vh;
}
</style>