<script setup lang="ts">
import type { NavigationMenuItem } from '@nuxt/ui'

const items: NavigationMenuItem[] = [
  {
    label: '关于',
    icon: 'i-lucide-box',
    to: '/about'
  },
  {
    label: '隐私政策',
    icon: 'i-lucide-shield-check',
    to: '/privacy'
  },
  {
    label: '服务条款',
    icon: 'i-lucide-file-text',
    to: '/terms'
  },
  {
    label: '帮助',
    icon: 'i-lucide-help-circle',
    to: '/help'
  }

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
