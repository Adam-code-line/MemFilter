<script setup lang="ts">

const route = useRoute()

const items = computed(() => [
  {
    label: 'Home',
    icon: 'i-lucide-home',
    to: '/'
  },
  {
    label: 'About',
    icon: 'i-lucide-info',
    to: '/about'
  },
])

</script>

<template>

  <UHeader>
    <template #left>
      <NuxtLink to="/">
        <AppLogo class="w-auto h-15 shrink-0" />
      </NuxtLink>
    </template>

    <template #body>
      <UNavigationMenu
          :items="items"
          orientation="vertical"
          class="-mx-2.5"
      />
    </template>

    <template #right>

      <UColorModeButton/>

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
          variant="solid"
          to="/login"
          class="hidden lg:inline-flex"
      />

      <UButton
          label="注册"
          color="neutral"
          variant="solid"
          class="hidden lg:inline-flex"
          to="/signup"
      />
    </template>
    
  </UHeader>

</template>