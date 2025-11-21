<template>
  <div class="min-h-screen flex flex-col">
    <LayoutIndexHeader />

    <UMain class="flex-1">
      <slot />
    </UMain>

    <CommonButton icon="rocket" />
    <LayoutIndexFooter />
  </div>
</template>

<script lang="ts" setup></script>

<style></style>
