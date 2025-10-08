<template>
  <div 
    class="floating-card-container"
    :class="[
      `layout-${layout}`,
      `gap-${gap}`,
      { 'responsive': responsive }
    ]"
    :style="containerStyle"
  >
    <slot />
  </div>
</template>

<script setup lang="ts">
type LayoutType = 'grid' | 'flex' | 'masonry' | 'auto'
type GapSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl'

interface Props {
  layout?: LayoutType
  gap?: GapSize
  columns?: number | 'auto'
  responsive?: boolean
  maxWidth?: string
  customStyles?: Record<string, string>
}

const props = withDefaults(defineProps<Props>(), {
  layout: 'grid',
  gap: 'md',
  columns: 'auto',
  responsive: true
})

const containerStyle = computed(() => {
  const baseStyle: Record<string, string> = {}

  if (props.maxWidth) {
    baseStyle['--max-width'] = props.maxWidth
  }

  if (typeof props.columns === 'number') {
    baseStyle['--columns'] = props.columns.toString()
  }

  return {
    ...baseStyle,
    ...props.customStyles
  }
})
</script>

<style scoped>
.floating-card-container {
  width: 100%;
  max-width: var(--max-width, none);
  margin: 0 auto;
}

/* 布局类型 */
.layout-grid {
  display: grid;
  grid-template-columns: var(--columns, repeat(auto-fit, minmax(280px, 1fr)));
  align-items: start;
}

.layout-flex {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  align-items: stretch;
}

.layout-flex > :deep(*) {
  flex: 1 1 auto;
  min-width: 280px;
  max-width: 400px;
}

.layout-masonry {
  display: grid;
  grid-template-columns: var(--columns, repeat(auto-fit, minmax(280px, 1fr)));
  grid-auto-rows: max-content;
  align-items: start;
}

.layout-auto {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
}

.layout-auto > :deep(*) {
  flex: 0 0 auto;
}

/* 间距 */
.gap-xs { gap: 0.5rem; }
.gap-sm { gap: 1rem; }
.gap-md { gap: 1.5rem; }
.gap-lg { gap: 2rem; }
.gap-xl { gap: 2.5rem; }

/* 响应式 */
.responsive.layout-grid {
  grid-template-columns: repeat(auto-fit, minmax(min(280px, 100%), 1fr));
}

@media (max-width: 768px) {
  .responsive.layout-grid {
    grid-template-columns: 1fr;f
  }
  
  .responsive.layout-flex > :deep(*) {
    min-width: 100%;
    max-width: none;
  }
  
  .responsive .gap-lg { gap: 1.5rem; }
  .responsive .gap-xl { gap: 2rem; }
}

@media (max-width: 480px) {
  .responsive .gap-md { gap: 1rem; }
  .responsive .gap-lg { gap: 1rem; }
  .responsive .gap-xl { gap: 1.5rem; }
}
</style>