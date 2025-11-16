<script setup lang="ts">
import { useRouter } from "#imports";
import { clearError } from "#app";
import { useAuthStore } from "~~/stores/auth";
// SEO
useHead({
  title: "忆滤 MemFilter - AI 遗忘引擎",
  meta: [
    {
      name: "description",
      content:
        "用 AI 主动帮助用户遗忘不重要的信息，保留关键内容。信息去噪，智能保留。",
    },
  ],
});

// fetch page data
const { data: page, refresh: refreshIndex } = await useAsyncData("index", () =>
  queryCollection("index").first()
);

const router = useRouter();
const authStore = useAuthStore();

const sanitizeIcon = (icon?: string | null) => {
  if (!icon) return undefined;
  const trimmedIcon = icon.trim();
  if (!trimmedIcon) return undefined;
  if (/^i-[\w-]+$/i.test(trimmedIcon)) return undefined;
  return trimmedIcon;
};

const sanitizeLink = (link: Record<string, unknown>) => {
  if (!link) {
    return { label: "", to: "" };
  }
  const { icon, action, to, label, ...rest } = link;
  const sanitizedIcon =
    typeof icon === "string" ? sanitizeIcon(icon) : undefined;
  return {
    ...rest,
    label: typeof label === "string" && label.length > 0 ? label : "",
    to:
      typeof to === "string" && to.length > 0
        ? to
        : typeof action === "string"
          ? action
          : "",
    ...(sanitizedIcon ? { icon: sanitizedIcon } : {}),
  };
};

// computed helpers and safe defaults
const sections = computed(() => {
  const secs = page.value?.sections ?? [];
  return secs.map((section) => {
    const features = (section.features || []).map((feature) => ({
      ...feature,
      title: feature.title || "",
      description: feature.description || "",
      icon: sanitizeIcon(feature.icon) ?? "",
    }));

    return {
      ...section,
      title: section.title || "",
      description: section.description || "",
      icon: sanitizeIcon(section.icon),
      features,
    };
  });
});

const features = computed(() => {
  const feat = page.value?.features;
  return {
    title: feat?.title || "",
    description: feat?.description || "",
    items: (feat?.items || []).map((item) => ({
      ...item,
      title: item.title || "",
      description: item.description || "",
      icon: sanitizeIcon(item.icon) ?? "",
    })),
  };
});

// safe CTA data
const safeCTA = computed(() => {
  const cta = page.value?.cta as { links?: unknown } | undefined;
  return {
    title: cta?.title || "",
    description: cta?.description || "",
    action: cta?.action || "",
    links: toLinkArray(cta?.links).map((link) => sanitizeLink(link)),
  };
});

// hero link helpers: normalize to array
const toLinkArray = (links: unknown): Record<string, unknown>[] => {
  if (Array.isArray(links)) {
    return links.filter(
      (link): link is Record<string, unknown> =>
        typeof link === "object" && link !== null
    );
  }
  if (typeof links === "object" && links !== null) {
    return [links as Record<string, unknown>];
  }
  return [];
};

const heroLinks = computed(() => {
  const hero = page.value?.hero as { links?: unknown } | undefined;
  if (!hero) return [];

  return toLinkArray(hero.links)
    .map((link) => sanitizeLink(link))
    .filter((link) => typeof link.to === "string" && link.to.length > 0);
});

const handleLandingCtaClick = () => {
  const destination = authStore.isAuthenticated ? "/home" : "/auth/login";
  router.push(destination);
};

const isRefreshing = ref(false);

watch(
  () => page.value,
  async (value) => {
    if (value || isRefreshing.value) return;
    isRefreshing.value = true;
    try {
      await refreshIndex();
    } finally {
      isRefreshing.value = false;
    }
  }
);

onMounted(() => {
  clearError();
  if (!page.value) {
    refreshIndex();
  }
});
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
      <CommonImagePlaceholder />
    </FloatingSection>

    <FloatingSection
      :title="features.title"
      :description="features.description"
      :delay="2"
    >
      <FloatingCardGrid :items="features.items" />
    </FloatingSection>

    <USeparator />

    <div class="landing-cta" @click="handleLandingCtaClick">
      <FloatingCTA
        :title="safeCTA.title"
        :description="safeCTA.description"
        :links="safeCTA.links"
        variant="naked"
      />
    </div>

    <!-- 浮动回到顶部按钮 -->
    <CommonButton icon="rocket" />
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

.hero-section-wrapper :deep(.hero-floating-container) {
  position: relative;
  z-index: 2;
  width: 100%;
}

.landing-cta {
  cursor: pointer;
}
</style>
