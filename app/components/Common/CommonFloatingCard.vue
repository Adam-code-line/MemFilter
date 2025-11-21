<template>
  <div
    class="universal-floating-card"
    :class="[
      `size-${size}`,
      `variant-${variant}`,
      `animation-${animationType}`,
      { 'is-hovered': isHovered },
    ]"
    :style="cardStyle"
    @mouseenter="handleMouseEnter"
    @mouseleave="handleMouseLeave"
  >
    <!-- 主要内容区域 -->
    <div class="card-content">
      <!-- 图标区域 -->
      <div v-if="icon || $slots.icon" class="card-icon-section">
        <slot name="icon">
          <UIcon v-if="isIconifyIcon" :name="icon as string" class="default-icon" />
          <div v-else-if="icon" class="default-icon" v-html="icon"></div>
        </slot>
      </div>

      <!-- 标题区域 -->
      <div v-if="title || $slots.title" class="card-title-section">
        <slot name="title">
          <h3 class="card-title">{{ title }}</h3>
        </slot>
      </div>

      <!-- 描述区域 -->
      <div v-if="description || $slots.description" class="card-description-section">
        <slot name="description">
          <p class="card-description">{{ description }}</p>
        </slot>
      </div>

      <!-- 自定义内容区域 -->
      <div v-if="$slots.default" class="card-custom-content">
        <slot />
      </div>

      <!-- 操作按钮区域 -->
      <div v-if="$slots.actions" class="card-actions">
        <slot name="actions" />
      </div>
    </div>

    <!-- 悬停效果覆盖层 -->
    <div class="hover-overlay"></div>
  </div>
</template>

<script setup lang="ts">
  type CardSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl' | 'auto'
  type CardVariant = 'default' | 'glass' | 'gradient' | 'minimal' | 'elevated'
  type AnimationType = 'float' | 'bounce' | 'pulse' | 'swing' | 'rotate' | 'none'

  interface Props {
    title?: string
    description?: string
    icon?: string
    size?: CardSize
    variant?: CardVariant
    animationType?: AnimationType
    animationDelay?: number
    hoverScale?: number
    hoverTranslateY?: number
    customColors?: {
      background?: string
      border?: string
      text?: string
      accent?: string
    }
    disabled?: boolean
  }

  const props = withDefaults(defineProps<Props>(), {
    size: 'md',
    variant: 'default',
    animationType: 'float',
    animationDelay: 0,
    hoverScale: 1.03,
    hoverTranslateY: -15,
    disabled: false,
  })

  const isIconifyIcon = computed(
    () => typeof props.icon === 'string' && props.icon.startsWith('i-')
  )

  const emit = defineEmits<{
    mouseenter: [event: MouseEvent]
    mouseleave: [event: MouseEvent]
    click: [event: MouseEvent]
  }>()

  const isHovered = ref(false)

  const cardStyle = computed(() => {
    const baseStyle = {
      '--animation-delay': `${props.animationDelay}s`,
      '--hover-scale': props.hoverScale,
      '--hover-translate-y': `${props.hoverTranslateY}px`,
    }

    if (props.customColors) {
      return {
        ...baseStyle,
        '--custom-bg': props.customColors.background,
        '--custom-border': props.customColors.border,
        '--custom-text': props.customColors.text,
        '--custom-accent': props.customColors.accent,
      }
    }

    return baseStyle
  })

  const handleMouseEnter = (event: MouseEvent) => {
    if (!props.disabled) {
      isHovered.value = true
      emit('mouseenter', event)
    }
  }

  const handleMouseLeave = (event: MouseEvent) => {
    if (!props.disabled) {
      isHovered.value = false
      emit('mouseleave', event)
    }
  }
</script>

<style scoped>
  .universal-floating-card {
    position: relative;
    border-radius: 16px;
    padding: 1.5rem;
    transition: all 0.6s cubic-bezier(0.4, 0, 0.2, 1);
    cursor: pointer;
    overflow: hidden;
    will-change: transform;
    transform-origin: center center;
    animation-delay: var(--animation-delay, 0s);
    animation-duration: 8s;
    animation-iteration-count: infinite;
    animation-timing-function: ease-in-out;
    min-height: fit-content;
    width: 100%;
    height: auto;
  }

  /* 卡片内容 */
  .card-content {
    position: relative;
    z-index: 3;
    height: 100%;
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }

  .card-icon-section {
    display: flex;
    justify-content: center;
    align-items: center;
    margin-bottom: 0.5rem;
  }

  .default-icon {
    font-size: 2.5rem;
    color: var(--custom-accent, rgba(59, 130, 246, 0.8));
    transition: all 0.3s ease;
  }

  .card-title-section {
    text-align: center;
  }

  .card-title {
    font-size: 1.25rem;
    font-weight: 600;
    color: var(--custom-text, rgba(255, 255, 255, 0.95));
    margin: 0;
    line-height: 1.4;
    transition: all 0.3s ease;
  }

  .card-description-section {
    text-align: center;
    flex: 1;
  }

  .card-description {
    color: var(--custom-text, rgba(255, 255, 255, 0.8));
    line-height: 1.6;
    margin: 0;
    font-size: 0.9rem;
    transition: all 0.3s ease;
  }

  .card-custom-content {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
  }

  .card-actions {
    margin-top: auto;
    padding-top: 1rem;
    display: flex;
    gap: 0.5rem;
    justify-content: center;
    flex-wrap: wrap;
  }

  /* 尺寸变体 */
  .size-xs {
    padding: 0.75rem;
    min-width: 120px;
    max-width: 200px;
  }

  .size-sm {
    padding: 1rem;
    min-width: 180px;
    max-width: 280px;
  }

  .size-md {
    padding: 1.5rem;
    min-width: 250px;
    max-width: 350px;
  }

  .size-lg {
    padding: 2rem;
    min-width: 320px;
    max-width: 450px;
  }

  .size-xl {
    padding: 2.5rem;
    min-width: 400px;
    max-width: 600px;
  }

  .size-auto {
    padding: 1.5rem;
    min-width: 200px;
    max-width: none;
    width: fit-content;
  }

  /* 样式变体 */
  .variant-default {
    background: var(--custom-bg, rgba(255, 255, 255, 0.1));
    backdrop-filter: blur(10px);
    border: 1px solid var(--custom-border, rgba(255, 255, 255, 0.2));
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
  }

  .variant-glass {
    background: var(--custom-bg, rgba(255, 255, 255, 0.05));
    backdrop-filter: blur(20px);
    border: 1px solid var(--custom-border, rgba(255, 255, 255, 0.1));
    box-shadow:
      0 8px 32px rgba(0, 0, 0, 0.1),
      inset 0 1px 0 rgba(255, 255, 255, 0.1);
  }

  .variant-gradient {
    background: var(
      --custom-bg,
      linear-gradient(
        135deg,
        rgba(59, 130, 246, 0.1) 0%,
        rgba(147, 51, 234, 0.1) 50%,
        rgba(239, 68, 68, 0.1) 100%
      )
    );
    backdrop-filter: blur(15px);
    border: 1px solid var(--custom-border, rgba(255, 255, 255, 0.2));
    box-shadow: 0 15px 35px rgba(0, 0, 0, 0.15);
  }

  .variant-minimal {
    background: var(--custom-bg, rgba(255, 255, 255, 0.02));
    border: 1px solid var(--custom-border, rgba(255, 255, 255, 0.05));
    box-shadow: 0 4px 16px rgba(0, 0, 0, 0.05);
  }

  .variant-elevated {
    background: var(--custom-bg, rgba(255, 255, 255, 0.15));
    backdrop-filter: blur(25px);
    border: 1px solid var(--custom-border, rgba(255, 255, 255, 0.25));
    box-shadow:
      0 25px 50px rgba(0, 0, 0, 0.2),
      0 0 0 1px rgba(255, 255, 255, 0.05);
  }

  /* 悬停覆盖层 */
  .hover-overlay {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: linear-gradient(
      45deg,
      rgba(59, 130, 246, 0.1) 0%,
      rgba(147, 51, 234, 0.1) 50%,
      rgba(239, 68, 68, 0.1) 100%
    );
    opacity: 0;
    transition: opacity 0.4s ease;
    pointer-events: none;
    border-radius: 16px;
  }

  /* 悬停效果 */
  .universal-floating-card:hover {
    transform: translateY(var(--hover-translate-y, -15px)) scale(var(--hover-scale, 1.03));
    animation-play-state: paused;
  }

  .universal-floating-card:hover .hover-overlay {
    opacity: 1;
  }

  .universal-floating-card:hover .default-icon {
    transform: scale(1.1) rotate(5deg);
    filter: brightness(1.2);
  }

  .universal-floating-card:hover .card-title {
    color: var(--custom-accent, rgba(59, 130, 246, 1));
    text-shadow: 0 0 10px var(--custom-accent, rgba(59, 130, 246, 0.3));
  }

  .universal-floating-card:hover {
    transform: scale(1.3);
    animation-play-state: paused;
  }

  /* 动画类型 */
  .animation-float {
    animation-name: float-animation;
  }

  .animation-bounce {
    animation-name: bounce-animation;
  }

  .animation-pulse {
    animation-name: pulse-animation;
  }

  .animation-swing {
    animation-name: swing-animation;
  }

  .animation-rotate {
    animation-name: rotate-animation;
  }

  .animation-none {
    animation: none;
  }

  /* 动画关键帧 */
  @keyframes float-animation {
    0%,
    100% {
      transform: translateY(0px) rotate(0deg);
    }
    25% {
      transform: translateY(-8px) rotate(0.5deg);
    }
    50% {
      transform: translateY(0px) rotate(0deg);
    }
    75% {
      transform: translateY(-4px) rotate(-0.3deg);
    }
  }

  @keyframes bounce-animation {
    0%,
    100% {
      transform: translateY(0px);
    }
    50% {
      transform: translateY(-12px);
    }
  }

  @keyframes pulse-animation {
    0%,
    100% {
      transform: scale(1);
    }
    50% {
      transform: scale(1.02);
    }
  }

  @keyframes swing-animation {
    0%,
    100% {
      transform: rotate(0deg);
    }
    25% {
      transform: rotate(1deg);
    }
    75% {
      transform: rotate(-1deg);
    }
  }

  @keyframes rotate-animation {
    0% {
      transform: rotate(0deg);
    }
    100% {
      transform: rotate(360deg);
    }
  }
  /* 禁用状态 */
  .universal-floating-card[disabled] {
    opacity: 0.6;
    cursor: not-allowed;
    pointer-events: none;
  }

  /* 响应式设计 */
  @media (max-width: 768px) {
    .universal-floating-card {
      padding: 1rem;
    }

    .size-lg,
    .size-xl {
      max-width: 300px;
    }

    .universal-floating-card:hover {
      transform: translateY(calc(var(--hover-translate-y, -15px) * 0.7))
        scale(calc(var(--hover-scale, 1.03) * 0.98));
    }
  }

  @media (max-width: 480px) {
    .size-md,
    .size-lg,
    .size-xl {
      max-width: 280px;
      min-width: 200px;
    }

    .card-title {
      font-size: 1.1rem;
    }

    .card-description {
      font-size: 0.85rem;
    }
  }

  /* 减少动画（用户偏好） */
  @media (prefers-reduced-motion: reduce) {
    .universal-floating-card {
      animation: none;
    }

    .decoration {
      animation: none;
      opacity: 0.3;
    }

    .universal-floating-card:hover {
      transform: translateY(-8px);
    }
  }

  /* 高对比度模式 */
  @media (prefers-contrast: high) {
    .universal-floating-card {
      border: 2px solid rgba(255, 255, 255, 0.5);
    }
  }
</style>
