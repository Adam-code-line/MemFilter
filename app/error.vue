<script setup lang="ts">
  import { clearError } from '#app'
  import { onBeforeRouteLeave } from '#imports'
  import type { NuxtError } from '#app'

  defineProps({
    error: {
      type: Object as PropType<NuxtError>,
      required: true,
    },
  })

  const handleClear = () => {
    clearError({ redirect: '/' })
  }

  onBeforeRouteLeave(() => {
    clearError()
  })
</script>

<template>
  <div>
    <LayoutHeader />
    <UMain>
      <UContainer>
        <UPage>
          <UError
            :error="error"
            :clear="{
              label: '回到首页',
              icon: 'i-lucide-arrow-left',
              class: 'rounded-full',
              click: handleClear,
            }"
          />
        </UPage>
      </UContainer>
    </UMain>
    <LayoutFooter />
    <UToaster />
  </div>
</template>
