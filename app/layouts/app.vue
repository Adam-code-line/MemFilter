<template>
  <div class="flex flex-col min-h-screen">
    <!-- 应用内头部 -->
    <LayoutHeader />
    
    <div class="flex flex-1">
      <!-- 侧边栏 -->
      <LayoutSidebar />
      
      <!-- 主内容区域 -->
      <UMain class="flex-1 bg-gray-50 dark:bg-gray-900 p-8">
        <slot />
      </UMain>
    </div>
    <CommonButton icon='rocket' />
    <!-- 应用内底部 -->
    <LayoutFooter />
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