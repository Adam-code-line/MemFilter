<template>
  <div class="meta-card" :class="{ 'meta-card--faded': fadeLevel > 0 }">
    <div v-if="headingTitle || headingSubtext || hasContextMeta" class="meta-header">
      <div class="meta-heading">
        <h2 v-if="headingTitle" class="meta-heading__title">
          {{ headingTitle }}
        </h2>
        <UButton
          v-if="showActionButton"
          :icon="actionIcon"
          size="sm"
          variant="soft"
          color="primary"
          class="meta-heading__action"
          @click="emit('action')"
        >
          {{ actionLabel }}
        </UButton>
      </div>
      <p v-if="headingSubtext" class="meta-heading__subtext">
        {{ headingSubtext }}
      </p>
      <div v-if="hasContextMeta" class="meta-heading__meta">
        <div v-if="contextBadges?.length" class="meta-heading__badges">
          <UBadge
            v-for="badge in contextBadges"
            :key="badge.label"
            :label="badge.label"
            :color="badge.color ?? 'neutral'"
            :variant="badge.variant ?? 'soft'"
            :icon="badge.icon"
          />
        </div>
        <div v-if="contextInfo?.length" class="meta-heading__info">
          <span v-for="info in contextInfo" :key="info">{{ info }}</span>
        </div>
      </div>
    </div>

    <div class="meta-top">
      <UInput
        v-model="titleModel"
        :placeholder="titlePlaceholder"
        variant="none"
        class="meta-title"
      />
      <div class="meta-controls">
        <USelectMenu
          v-model="importanceModel"
          :items="importanceOptions"
          label-key="label"
          value-key="value"
          size="sm"
          class="min-w-[160px]"
          :ui="{ menu: 'min-w-[160px]' }"
        />
        <UBadge
          v-if="statusLabel"
          :label="statusLabel"
          :color="statusColor"
          variant="outline"
        />
      </div>
    </div>

    <div class="meta-description">
      <label class="meta-label">记忆描述</label>
      <UTextarea
        v-model="descriptionModel"
        :placeholder="descriptionPlaceholder"
        :rows="3"
        class="meta-textarea"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
const props = withDefaults(defineProps<{
  title: string
  description: string
  importance: ImportanceLevel
  importanceOptions: Array<{ label: string; value: ImportanceLevel }>
  statusLabel?: string
  statusColor?: string
  titlePlaceholder?: string
  descriptionPlaceholder?: string
  fadeLevel?: number
  headingTitle?: string
  headingSubtext?: string
  contextBadges?: Array<{ label: string; color?: string; variant?: 'solid' | 'soft' | 'subtle' | 'outline'; icon?: string }>
  contextInfo?: string[]
  showAction?: boolean
  actionLabel?: string
  actionIcon?: string
}>(), {
  title: '',
  description: '',
  importance: 'medium',
  importanceOptions: () => [],
  statusLabel: '',
  statusColor: 'neutral',
  titlePlaceholder: '笔记标题...',
  descriptionPlaceholder: '补充上下文或灵感片段',
  fadeLevel: 0,
  headingTitle: '',
  headingSubtext: '',
  contextBadges: () => [],
  contextInfo: () => [],
  showAction: true,
  actionLabel: '新建笔记',
  actionIcon: 'i-lucide-plus'
})

const emit = defineEmits<{
  (event: 'update:title', value: string): void
  (event: 'update:description', value: string): void
  (event: 'update:importance', value: ImportanceLevel): void
  (event: 'action'): void
}>()

const titleModel = computed({
  get: () => props.title,
  set: value => emit('update:title', value)
})

const descriptionModel = computed({
  get: () => props.description,
  set: value => emit('update:description', value)
})

const importanceModel = computed<ImportanceLevel>({
  get: () => props.importance,
  set: value => emit('update:importance', value)
})

const showActionButton = computed(() => props.showAction && !!props.actionLabel)
const hasContextMeta = computed(() => (props.contextBadges?.length ?? 0) > 0 || (props.contextInfo?.length ?? 0) > 0)
</script>

<style scoped>
.meta-card {
  display: flex;
  flex-direction: column;
  gap: 1.35rem;
  padding: 1.4rem 1.6rem;
  border-radius: 1.5rem;
  background: linear-gradient(150deg, rgba(248, 250, 252, 0.9), rgba(219, 234, 254, 0.5));
  border: 1px solid rgba(148, 163, 184, 0.2);
}

.dark .meta-card {
  background: linear-gradient(150deg, rgba(15, 23, 42, 0.82), rgba(30, 41, 59, 0.72));
  border-color: rgba(71, 85, 105, 0.35);
}

.meta-card--faded {
  opacity: 0.85;
  filter: blur(0.35px);
}

.meta-header {
  display: flex;
  flex-direction: column;
  gap: 0.85rem;
}

.meta-heading {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
}

.meta-heading__title {
  flex: 1;
  min-width: 0;
  font-size: 1.65rem;
  font-weight: 700;
  color: rgb(15, 23, 42);
  word-break: break-word;
  white-space: normal;
}

.dark .meta-heading__title {
  color: rgb(226, 232, 240);
}

.meta-heading__action {
  border-radius: 999px;
}

.meta-heading__subtext {
  font-size: 0.92rem;
  color: rgba(71, 85, 105, 0.82);
  line-height: 1.6;
}

.dark .meta-heading__subtext {
  color: rgba(148, 163, 184, 0.75);
}

.meta-heading__meta {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  font-size: 0.78rem;
  color: rgba(71, 85, 105, 0.78);
}

.dark .meta-heading__meta {
  color: rgba(148, 163, 184, 0.72);
}

.meta-heading__badges {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.meta-heading__info {
  display: flex;
  flex-wrap: wrap;
  gap: 0.6rem;
}

.meta-top {
  display: flex;
  flex-direction: column;
  gap: 0.8rem;
}

@media (min-width: 768px) {
  .meta-top {
    flex-direction: row;
    align-items: center;
    justify-content: space-between;
  }
}

.meta-title {
  flex: 1;
  font-size: 1.25rem;
  font-weight: 600;
  height: 3.1rem;
  padding: 0;
}

.meta-title :deep(input) {
  width: 100%;
  padding: 0;
}

.meta-controls {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.6rem;
}

.meta-description {
  display: flex;
  flex-direction: column;
  gap: 0.55rem;
}

.meta-label {
  font-size: 0.875rem;
  font-weight: 500;
  color: rgba(71, 85, 105, 0.85);
}

.dark .meta-label {
  color: rgba(148, 163, 184, 0.85);
}

.meta-textarea {
  min-height: 6.5rem;
  border-radius: 1rem;
}

@media (max-width: 640px) {
  .meta-card {
    padding: 1.1rem 1.2rem;
  }

  .meta-heading__title {
    font-size: 1.4rem;
  }
}
</style>
