<script setup lang="ts">
import { link } from '#build/ui'
import { computed } from 'vue'
// SEO
useHead({ 
  title: '忆滤 MemFilter - AI 遗忘引擎',
  meta: [
    { name: 'description', content: '用 AI 主动帮助用户遗忘不重要的信息，保留关键内容。信息去噪，智能保留。' }
  ]
})

// fetch page data
const { data: page } = await useAsyncData('index', () => queryCollection('index').first())

// computed helpers and safe defaults
const sections = computed(() => {
  const secs = page.value?.sections ?? []
  return secs.map(section => ({
    ...section,
    title: section.title || '',
    description: section.description || '',
    features: (section.features || []).map(feature => ({
      ...feature,
      title: feature.title || '',
      description: feature.description || '',
      icon: feature.icon || '📄'
    }))
  }))
})

const features = computed(() => {
  const feat = page.value?.features
  return {
    title: feat?.title || '',
    description: feat?.description || '',
    items: (feat?.items || []).map(item => ({
      ...item,
      title: item.title || '',
      description: item.description || '',
      icon: item.icon || '✨'
    }))
  }
})

// safe CTA data
const safeCTA = computed(() => {
  const cta = page.value?.cta
  return {
    title: cta?.title || '',
    description: cta?.description || '',
    action: cta?.action || '',
    links: (cta?.links || []).map(link => ({
      ...link,
      to: link.to || link.action || '',
      label: link.label || ''
    }))
  }
})

// hero link helpers: normalize to array
const heroLinks = computed(() => {
  const h = page.value?.hero
  if (!h) return []
  if (Array.isArray((h as any).links)) return (h as any).links
  if ((h as any).links) return [(h as any).links]
  return []
})

const heroPrimaryLink = computed(() => heroLinks.value[0] ?? null)

// hero card from content
const heroCard = computed(() => {
  const hero = page.value?.hero as any
  return hero?.card || null
})

// cta button from content  
const ctaButton = computed(() => {
  const cta = page.value?.cta as any
  return cta?.button || null
})
</script>

<template>
  <div v-if="page">
    <!-- 浮动英雄区域 -->
    <div class="hero-section-wrapper">
      <FloatingHeroSection
        :title="page.title || ''"
        :description="page.description || ''"
        :links="heroLinks"
      />
    </div>

    <FloatingSection
        v-for="(section, index) in sections"
        :key="index"
        :title="section.title"
        :description="section.description"
        :orientation="section.orientation"
        :reverse="section.reverse"
        :features="section.features"
        :delay="index * 0.5"
    >
    <CommonImagePlaceholder/>
    </FloatingSection>

    <FloatingSection
        :title="features.title"
        :description="features.description"
        :delay="2"
    >
      <FloatingCardGrid :items="features.items" />
    </FloatingSection>
    
    <USeparator/>

    <FloatingCTA
        :title="safeCTA.title"
        :description="safeCTA.description"
        :links="safeCTA.links"
        variant="naked"
    >
    <NuxtLink :link="heroPrimaryLink">

    </NuxtLink>

    </FloatingCTA>
    
    <!-- 浮动回到顶部按钮 -->
    <CommonButton/>
  </div>
</template>

<style scoped>
.hero-section-wrapper {
  position: relative;
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
}

.hero-section-wrapper :deep(.index-hero-background) {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  z-index: 1;
}

.hero-section-wrapper :deep(.hero-floating-section) {
  position: relative;
  z-index: 2;
}
</style>
