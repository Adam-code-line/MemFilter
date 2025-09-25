<script setup lang="ts">
import type { NavigationMenuItem } from '@nuxt/ui'

const items: NavigationMenuItem[] = [

]
</script>

<template>
  <UFooter>
    <template #left>
      
    </template>

    <UNavigationMenu :items="items" variant="link" />

    <template #right>
      <UButton
        icon="i-simple-icons-github"
        color="neutral"
        variant="ghost"
        to="https://github.com/Adam-code-line"
        target="_blank"
        aria-label="GitHub"
      />
    </template>
  </UFooter>
</template>
