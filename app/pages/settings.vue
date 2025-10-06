<script setup lang="ts">
import { computed } from 'vue'
import { useSettingsContent } from '~/composables/settings/useSettingsContent'
import { useSettingsForm } from '~/composables/settings/useSettingsForm'

definePageMeta({
  layout: 'app'
})

useHead({
  title: '设置中心'
})

const { content } = await useSettingsContent()

const {
  sections,
  profile,
  security,
  preferences,
  notifications,
  updateField,
  updateToggle,
  selectOption,
  persist,
  isSavingProfile,
  isSavingSecurity,
  isSavingPreferences,
  isSavingNotifications
} = useSettingsForm(content)

type SaveTarget = 'profile' | 'security' | 'preferences' | 'notifications'

const badge = computed(() => content.value.badge ?? null)
const pageTitle = computed(() => content.value.title ?? '设置中心')
const pageSubtitle = computed(() => content.value.subtitle ?? '')
const allSections = computed(() => sections.value ?? [])

const flattenCards = computed(() => allSections.value.flatMap(section => section.cards ?? []))

const cardSaveTargetMap: Record<string, SaveTarget> = {
  profile: 'profile',
  security: 'security',
  memoryEngine: 'preferences',
  aiAssist: 'preferences',
  digest: 'notifications',
  alerts: 'notifications'
}

const cardButtonLabelMap: Record<string, string> = {
  profile: '保存资料',
  security: '保存安全策略',
  memoryEngine: '保存遗忘节奏',
  aiAssist: '保存 AI 偏好',
  digest: '保存每日 Digest',
  alerts: '保存提醒策略'
}

const cardFooterHintMap: Record<string, string> = {
  profile: '信息将用于记忆摘要署名与协作标签。',
  security: '调整后将同步更新账号的安全校验流程。',
  memoryEngine: '遗忘节奏会影响默认淡化曲线，可随时调整。',
  aiAssist: 'AI 辅助的触发策略会影响整理与总结的体验。',
  digest: 'Digest 会在选定时间推送，你可随时修改窗口。',
  alerts: '提醒策略用于系统事件推送，可按需开启或关闭。'
}

const resolveSaveTarget = (cardKey: string): SaveTarget => cardSaveTargetMap[cardKey] ?? 'preferences'

const isSavingCard = (cardKey: string) => {
  const target = resolveSaveTarget(cardKey)
  if (target === 'profile') return isSavingProfile.value
  if (target === 'security') return isSavingSecurity.value
  if (target === 'preferences') return isSavingPreferences.value
  return isSavingNotifications.value
}

const resolveButtonLabel = (cardKey: string) => cardButtonLabelMap[cardKey] ?? '保存设置'

const resolveFooterHint = (cardKey: string) => cardFooterHintMap[cardKey] ?? '更改后记得保存设置。'

const hasSaveAction = (cardKey: string) => Boolean(cardSaveTargetMap[cardKey])

const handlePersist = async (cardKey: string) => {
  await persist(resolveSaveTarget(cardKey))
}

const memoryModeLabel = computed(() => {
  const card = flattenCards.value.find(cardItem => cardItem.key === 'memoryEngine')
  return card?.options?.find(option => option.selected)?.label ?? '均衡模式'
})

const digestWindowLabel = computed(() => {
  const card = flattenCards.value.find(cardItem => cardItem.key === 'digest')
  return card?.options?.find(option => option.selected)?.label ?? '08:00 晨间回顾'
})

const securityStatus = computed(() => {
  const total = Object.keys(security.value).length
  const enabled = Object.values(security.value).filter(Boolean).length
  if (enabled === total) return '全部安全策略已启用'
  if (enabled === 0) return '暂未启用额外安全策略'
  return `${enabled} / ${total} 个安全策略已启用`
})

const aiAssistStatus = computed(() => {
  const toggles = preferences.value.aiAssist
  const total = Object.keys(toggles).length
  const enabled = Object.values(toggles).filter(Boolean).length
  if (enabled === total) return '所有 AI 辅助已开启'
  if (enabled === 0) return 'AI 辅助暂未开启'
  return `${enabled} / ${total} 项 AI 辅助已开启`
})
</script>

<template>
  <div class="max-w-6xl mx-auto space-y-12 pb-20">
    <section class="space-y-6">
      <div class="flex flex-col gap-3">
        <div class="flex items-center gap-3">
          <UBadge
            v-if="badge"
            :label="badge.label"
            :color="badge.color ?? 'primary'"
            variant="soft"
            :icon="badge.icon"
          />
          <h1 class="text-3xl font-bold text-gray-900 dark:text-white">{{ pageTitle }}</h1>
        </div>
        <p v-if="pageSubtitle" class="text-sm text-gray-500 dark:text-gray-400 max-w-3xl">{{ pageSubtitle }}</p>
      </div>

      <UCard class="border border-gray-200/70 dark:border-white/10 bg-white/80 dark:bg-slate-900/60 backdrop-blur">
        <div class="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
          <div class="space-y-1">
            <p class="text-sm text-gray-500 dark:text-gray-400">当前昵称</p>
            <p class="text-xl font-semibold text-gray-900 dark:text-white">{{ profile.displayName }}</p>
            <p class="text-xs text-gray-400 dark:text-gray-500">{{ profile.email }}</p>
          </div>
          <div class="space-y-1">
            <p class="text-sm text-gray-500 dark:text-gray-400">遗忘节奏</p>
            <p class="text-xl font-semibold text-primary-600 dark:text-primary-400">{{ memoryModeLabel }}</p>
            <p class="text-xs text-gray-400 dark:text-gray-500">{{ aiAssistStatus }}</p>
          </div>
          <div class="space-y-1">
            <p class="text-sm text-gray-500 dark:text-gray-400">通知安排</p>
            <p class="text-xl font-semibold text-emerald-600 dark:text-emerald-400">{{ digestWindowLabel }}</p>
            <p class="text-xs text-gray-400 dark:text-gray-500">{{ securityStatus }}</p>
          </div>
        </div>
      </UCard>
    </section>

    <section
      v-for="section in allSections"
      :key="section.key"
      class="space-y-6"
    >
      <div class="flex items-start justify-between gap-3">
        <div class="space-y-1">
          <div class="flex items-center gap-2">
            <UIcon v-if="section.icon" :name="section.icon" class="text-lg text-primary" />
            <h2 class="text-xl font-semibold text-gray-900 dark:text-white">{{ section.title }}</h2>
          </div>
          <p v-if="section.description" class="text-sm text-gray-500 dark:text-gray-400 max-w-3xl">
            {{ section.description }}
          </p>
        </div>
      </div>

      <div class="grid gap-6 md:grid-cols-2">
        <SettingsSectionCard
          v-for="card in section.cards"
          :key="card.key"
          :title="card.title"
          :description="card.description"
          :icon="card.icon"
        >
          <div v-if="card.type === 'profile' && card.fields" class="grid gap-4">
            <SettingsFieldRow
              v-for="field in card.fields"
              :key="field.key"
              :label="field.label"
              :placeholder="field.placeholder"
              :helper="field.helper"
              :type="field.type ?? 'text'"
              :model-value="field.value ?? ''"
              @update:model-value="value => updateField(card.key, field.key, value)"
            />
          </div>

          <div v-else-if="card.type === 'security' && card.toggles" class="space-y-4">
            <SettingsToggleRow
              v-for="toggle in card.toggles"
              :key="toggle.key"
              :label="toggle.label"
              :description="toggle.description"
              :icon="toggle.icon"
              :model-value="Boolean(toggle.value)"
              @update:model-value="value => updateToggle(card.key, toggle.key, value)"
            />
          </div>

          <div v-else-if="card.type === 'toggle-group' && card.toggles" class="space-y-4">
            <SettingsToggleRow
              v-for="toggle in card.toggles"
              :key="toggle.key"
              :label="toggle.label"
              :description="toggle.description"
              :icon="toggle.icon"
              :model-value="Boolean(toggle.value)"
              @update:model-value="value => updateToggle(card.key, toggle.key, value)"
            />
          </div>

          <div v-else-if="card.type === 'select-group' && card.options" class="grid gap-4">
            <SettingsOptionCard
              v-for="option in card.options"
              :key="option.key"
              :label="option.label"
              :description="option.description"
              :selected="Boolean(option.selected)"
              @select="selectOption(card.key, option.key)"
            />
          </div>

          <template v-if="hasSaveAction(card.key)" #footer>
            <div class="flex items-center justify-between w-full gap-3">
              <p class="text-xs text-gray-400 dark:text-gray-500">
                {{ resolveFooterHint(card.key) }}
              </p>
              <UButton
                color="primary"
                variant="solid"
                :loading="isSavingCard(card.key)"
                @click="handlePersist(card.key)"
              >
                {{ resolveButtonLabel(card.key) }}
              </UButton>
            </div>
          </template>
        </SettingsSectionCard>
      </div>
    </section>
  </div>
</template>