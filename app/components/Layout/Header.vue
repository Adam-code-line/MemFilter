<script setup lang="ts">
import type { NavigationMenuItem } from '@nuxt/ui'

const route = useRoute()

const items = computed<NavigationMenuItem[]>(() => [{
  label: 'Home',
  to: '/',
  icon: 'i-lucide-book-open',
}, {
  label: 'About',
  icon: 'i-lucide-box',
}, {
  label: 'Log',
  icon: 'i-simple-icons-bookstack',
  to: '/',
  target: '_blank'
}, {
  label: 'Review',
  icon: 'i-lucide-bookmark',
  to: '/',
  target: '_blank'
}])
</script>

<template>
  <UHeader>
    <template #title>
      <AppLogo class="h-15 w-auto" />
    </template>

    <UNavigationMenu :items="items" />

    <template #right>
      <UColorModeButton />

      <UButton
          icon="i-lucide-log-in"
          color="neutral"
          variant="ghost"
          to="/login"
          class="lg:hidden"
      />

      <UButton
          label="登录"
          color="neutral"
          variant="outline"
          to="/login"
          class="hidden lg:inline-flex"
      />

      <UButton
          label="注册"
          color="neutral"
          trailing-icon="i-lucide-arrow-right"
          class="hidden lg:inline-flex"
          to="/signup"
      />
    </template>

    <template #body>
      <UNavigationMenu :items="items" orientation="vertical" class="-mx-2.5" />

      <USeparator class="my-6"/>

      <UButton
          label="Sign in"
          color="neutral"
          variant="subtle"
          to="/login"
          block
          class="mb-3"
      />
      <UButton
          label="Sign up"
          color="neutral"
          to="/signup"
          block
      />
    </template>
  </UHeader>
</template>

