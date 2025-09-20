<template>
  <div class="min-h-screen flex flex-col">
    <LayoutHeader />
    
    <UMain class="flex-1">
      <slot />
    </UMain>
      
    <CommonButton icon="rocket" />
    <LayoutFooter />
  </div>
</template>

<script lang="ts" setup>


</script>

<style>

</style>