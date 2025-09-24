<template>
  <Teleport to="body">
    <div 
      class="fixed bottom-6 right-6 z-50"
      :class="{ 'hidden': !visible }"
    >
      <UButton
        :icon="icon"
        :label="label"
        :to="to"
        :size="size"
        :color=""
        :variant="variant"
        class="shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105"
        :class="[
          'rounded-full',
          pulse && 'animate-pulse'
        ]"
        @click="handleClick"
      />
    </div>
  </Teleport>
</template>

<script setup lang="ts">
interface Props {
  icon?: string
  label?: string
  to?: string
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl'
  color?: string
  variant?: 'solid' | 'outline' | 'soft' | 'ghost' | 'link'
  visible?: boolean
  pulse?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  icon: 'i-lucide-plus',
  size: 'lg',
  color: 'primary',
  variant: 'solid',
  visible: true,
  pulse: false
})

const emit = defineEmits<{
  click: [event: MouseEvent]
}>()

const handleClick = (event: MouseEvent) => {
  emit('click', event)
}
</script>

<style scoped>
@keyframes float {
  0%, 100% {
    transform: translateY(0px);
  }
  50% {
    transform: translateY(-10px);
  }
}

.animate-float {
  animation: float 3s ease-in-out infinite;
}
</style>