<template>
  <div v-if="page" class="py-12 px-4 sm:px-6 lg:px-12 space-y-16">
    <!-- HERO: 左文本 右浮动卡片 -->
    <UPageHero :title="page.title ?? ''" :description="page.description ?? ''" :links="heroLinks">
      <template #top>
        <div class="absolute inset-0 -z-10 bg-gradient-to-br from-sky-50/60 to-white dark:from-slate-900/40" />
      </template>

      <template #default>
        <div class="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
          <div class="lg:col-span-7">
            <h1 class="text-3xl sm:text-4xl lg:text-5xl font-extrabold leading-tight">{{ page.title }}</h1>
            <p class="mt-4 text-lg text-slate-600 dark:text-slate-300">{{ page.description }}</p>

            <div class="mt-6 flex items-center space-x-3">
              <NuxtLink
                v-if="heroPrimaryLink && heroPrimaryLink.to && heroPrimaryLink.to.startsWith('/')"
                :to="heroPrimaryLink.to"
                class="inline-flex items-center gap-2 px-4 py-2 rounded-md bg-sky-600 text-white hover:bg-sky-700"
              >
                <span>{{ heroPrimaryLink.label }}</span>
                <i v-if="heroPrimaryLink.icon" :class="heroPrimaryLink.icon"></i>
              </NuxtLink>

              <a
                v-else-if="heroPrimaryLink"
                :href="heroPrimaryLink.to"
                target="_blank"
                rel="noopener noreferrer"
                class="inline-flex items-center gap-2 px-4 py-2 rounded-md bg-sky-600 text-white hover:bg-sky-700"
              >
                <span>{{ heroPrimaryLink.label }}</span>
                <i v-if="heroPrimaryLink.icon" :class="heroPrimaryLink.icon"></i>
              </a>
            </div>
          </div>

          <div class="lg:col-span-5 flex justify-center lg:justify-end">
            <CommonFloatingContainer :layout="'auto'" :gap="'md'">
              <CommonFloatingCard
                :title="page.title"
                :description="page.description"
                icon="logo"
                size="lg"
                variant="glass"
              />
            </CommonFloatingContainer>
          </div>
        </div>
      </template>
    </UPageHero>

    <div class="space-y-12">
      <section
        v-for="(section, i) in sections"
        :key="i"
        class="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center"
        :class="{ 'lg:flex-row-reverse': section.reverse }">

        <div class="lg:col-span-7">
          <h3 class="text-2xl font-semibold">{{ section.title }}</h3>
          <p class="mt-3 text-slate-600 dark:text-slate-300 whitespace-pre-line">{{ section.body }}</p>
        </div>

        <div class="lg:col-span-5">
          <CommonFloatingContainer :layout="'auto'" :gap="'sm'">
            <CommonFloatingCard
              :title="section.title"
              :description="section.body"
              size="md"
              variant="minimal"
            />
          </CommonFloatingContainer>
        </div>
      </section>
    </div>

    <!-- Features: 使用 CommonFloatingContainer 渲染 items -->
    <div v-if="features.items && features.items.length">
      <UPageSection :title="features.title ?? ''" :description="features.description ?? ''">
        <CommonFloatingContainer :layout="'grid'" :gap="'lg'">
          <template v-for="(it, idx) in features.items" :key="idx">
            <CommonFloatingCard v-bind="it" />
          </template>
        </CommonFloatingContainer>
      </UPageSection>
    </div>

    <USeparator />

    <UPageCTA v-if="page.cta" v-bind="page.cta" class="overflow-hidden">
      <div class="w-full h-28 flex items-center justify-center">
        <div class="text-center">
          <p class="text-lg font-medium">{{ page.cta.title }}</p>
        </div>
      </div>
    </UPageCTA>
  </div>
  <div v-else class="py-12 px-4">
    <div class="animate-pulse max-w-3xl mx-auto space-y-4">
      <div class="h-10 bg-gray-200 dark:bg-slate-700 rounded w-3/4"></div>
      <div class="h-5 bg-gray-200 dark:bg-slate-700 rounded w-1/2"></div>
      <div class="h-40 bg-gray-100 dark:bg-slate-800 rounded"></div>
    </div>
  </div>
</template>

<script lang="ts" setup>
import { computed } from 'vue'
useHead({ title: '忆滤 MemFilter' })

// fetch page
const { data: page } = await useAsyncData('index', () => queryCollection('index').first())

// computed helpers and safe defaults
const sections = computed(() => (page.value?.sections ?? []))
const features = computed(() => (page.value?.features ?? { title: '', description: '', items: [] }))

// hero link helpers: some content used `hero.link` singular in your YAML — normalize to array
const heroLinks = computed(() => {
  const h = page.value?.hero
  if (!h) return []
  if (Array.isArray(h.links)) return h.links
  if (h.link) return [h.link]
  return []
})

const heroPrimaryLink = computed(() => heroLinks.value[0] ?? null)
</script>

<style scoped>
/* small style to ensure hero top slot background sits behind content */
.u-page-hero > *:first-child {
  position: relative;
}
</style>