<script setup lang="ts">
import { computed, ref } from 'vue'
import { useToast } from '#imports'
import { useNotesDashboard } from '~/composables/note'
import { useHistoryContent, useHistoryRecords } from '~/composables/history'
import type { HistoryRecord } from '~/composables/history/useHistoryRecords'

definePageMeta({
	layout: 'app'
})

useHead({
	title: '遗忘日志'
})

const toast = useToast()
const notesContext = useNotesDashboard()
const { content } = await useHistoryContent()

const historyRecords = useHistoryRecords({
	notes: notesContext.notes,
	restoreNote: notesContext.restoreNote
})

const groupedRecordsRef = historyRecords.groupedRecords
const historyStats = historyRecords.stats
const timelineEvents = historyRecords.timelineEvents
const restoreLogRef = historyRecords.restoreLog

const headerBadge = computed(() => content.value.badge ?? null)
const pageTitle = computed(() => content.value.title ?? '遗忘日志')
const pageSubtitle = computed(() => content.value.subtitle ?? '')
const heroSection = computed(() => content.value.hero ?? null)

const overviewStats = computed(() => {
	const statsConfig = content.value.overview?.stats ?? []
	const values = historyStats.value

	return statsConfig.map(stat => ({
		...stat,
		value: values[stat.key] ?? 0
	}))
})

const overviewTitle = computed(() => content.value.overview?.title ?? '遗忘概览')
const overviewDescription = computed(() => content.value.overview?.description ?? '')

const groupedSections = computed(() => {
	const sections = content.value.sections ?? []
	const groups = groupedRecordsRef.value

	return sections.map(section => ({
		...section,
		items: groups[section.key] ?? []
	}))
})

const timelineConfig = computed(() => content.value.timeline ?? null)

const restoreLogConfig = computed(() => content.value.restoreLog ?? null)
const restoreLogItems = restoreLogRef

const importanceLabels: Record<string, string> = {
	high: '核心',
	medium: '重要',
	low: '次要',
	noise: '噪声'
}

const inspectedRecord = ref<HistoryRecord | null>(null)
const isModalOpen = ref(false)

const openRecordDetail = (recordId: number) => {
	const allGroups = historyRecords.groupedRecords.value
	const record = [
		...allGroups.recoverable,
		...allGroups.archived,
		...allGroups.purged
	].find(item => item.id === recordId)

	inspectedRecord.value = record ?? null
	isModalOpen.value = !!record
}

const closeRecordDetail = () => {
	inspectedRecord.value = null
	isModalOpen.value = false
}

const handleRestore = (record: HistoryRecord) => {
	historyRecords.restoreRecord(record)
	toast.add({
		title: '记忆已恢复',
		description: `《${record.title}》已恢复至活跃状态。`,
		color: 'primary',
		icon: 'i-lucide-rotate-ccw'
	})

	if (inspectedRecord.value?.id === record.id) {
		closeRecordDetail()
	}
}

const heroAction = computed(() => heroSection.value?.action ?? null)
</script>

<template>
	<div class="max-w-6xl mx-auto space-y-12 pb-20">
		<section class="space-y-6">
			<div class="flex flex-col gap-3">
				<div class="flex items-center gap-3">
					<UBadge
						v-if="headerBadge"
						:label="headerBadge.label"
						:color="headerBadge.color ?? 'neutral'"
						variant="soft"
						:icon="headerBadge.icon"
					/>
					<h1 class="text-3xl font-bold text-gray-900 dark:text-white">{{ pageTitle }}</h1>
				</div>
				<p v-if="pageSubtitle" class="text-sm text-gray-500 dark:text-gray-400 max-w-3xl">{{ pageSubtitle }}</p>
			</div>

			<UCard class="border border-gray-200/70 dark:border-white/10">
				<div class="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
					<div class="space-y-2">
						<p class="text-base text-gray-600 dark:text-gray-300">{{ heroSection?.description }}</p>
						<p v-if="heroSection?.helper" class="text-sm text-gray-500 dark:text-gray-400">{{ heroSection.helper }}</p>
					</div>
					<UButton
						v-if="heroAction"
						:to="heroAction.to"
						:icon="heroAction.icon"
						:variant="heroAction.variant ?? 'soft'"
						:color="heroAction.color ?? 'primary'"
					>
						{{ heroAction.label }}
					</UButton>
				</div>
			</UCard>
		</section>

		<section class="space-y-6">
			<div class="space-y-2">
				<h2 class="text-xl font-semibold text-gray-900 dark:text-white">{{ overviewTitle }}</h2>
				<p v-if="overviewDescription" class="text-sm text-gray-500 dark:text-gray-400">{{ overviewDescription }}</p>
			</div>
			<div class="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
				<HistorySummaryCard
					v-for="stat in overviewStats"
					:key="stat.key"
					:label="stat.label"
					:description="stat.description"
					:value="stat.value ?? 0"
					:icon="stat.icon"
					:color="stat.color ?? 'neutral'"
				/>
			</div>
		</section>

		<section class="grid gap-6 lg:grid-cols-[2fr_1fr]">
			<HistoryTimeline
				:title="timelineConfig?.title"
				:description="timelineConfig?.description"
				:empty-title="timelineConfig?.empty?.title"
				:empty-description="timelineConfig?.empty?.description"
				:events="timelineEvents"
				@inspect="openRecordDetail"
			/>
			<HistoryRestoreLog
				:title="restoreLogConfig?.title"
				:description="restoreLogConfig?.description"
				:empty-title="restoreLogConfig?.empty?.title"
				:empty-description="restoreLogConfig?.empty?.description"
				:items="restoreLogItems"
			/>
		</section>

		<section v-for="section in groupedSections" :key="section.key" class="space-y-4">
			<div class="flex items-start gap-3">
				<UIcon v-if="section.icon" :name="section.icon" class="mt-1 text-lg text-primary" />
				<div class="space-y-1">
					<h3 class="text-lg font-semibold text-gray-900 dark:text-white">{{ section.title }}</h3>
					<p v-if="section.description" class="text-sm text-gray-500 dark:text-gray-400 max-w-3xl">
						{{ section.description }}
					</p>
				</div>
			</div>

			<div v-if="section.items.length" class="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
				<HistoryRecordCard
					v-for="record in section.items"
					:key="record.id"
					:title="record.title"
					:snippet="record.content"
					:icon="record.icon"
					:status="record.status"
					:importance-label="importanceLabels[record.importance] ?? '普通'"
					:importance-score="record.importanceScore"
					:forgetting-progress="record.forgettingProgress"
					:days-until-forgotten="record.daysUntilForgotten ?? 0"
					:last-accessed="record.lastAccessed"
					:restorable="record.status !== 'purged'"
					@restore="handleRestore(record)"
					@inspect="openRecordDetail(record.id)"
				/>
			</div>
			<UAlert
				v-else
				icon="i-lucide-check-circle-2"
				:title="section.empty?.title || '暂无记录'"
				:description="section.empty?.description || '遗忘引擎近期未产生此类条目。'"
				color="neutral"
				variant="soft"
				class="border border-dashed border-gray-300/60 dark:border-white/20"
			/>
		</section>

		<UModal v-model="isModalOpen" :ui="{ width: 'max-w-2xl' }" @close="closeRecordDetail">
			<UCard>
				<template #header>
					<div class="space-y-1">
						<h3 class="text-xl font-semibold text-gray-900 dark:text-white">{{ inspectedRecord?.title }}</h3>
						<p class="text-xs text-gray-500 dark:text-gray-400">
							最后访问 {{ inspectedRecord?.lastAccessed }} · 重要度 {{ importanceLabels[inspectedRecord?.importance || 'medium'] ?? '普通' }}
						</p>
					</div>
				</template>

				<div class="space-y-4">
					<p class="text-sm leading-relaxed text-gray-700 dark:text-gray-200 whitespace-pre-wrap">
						{{ inspectedRecord?.content }}
					</p>
					<div class="grid gap-3 text-xs text-gray-500 dark:text-gray-400 sm:grid-cols-2">
						<div>淡化进度：<span class="font-medium text-amber-600 dark:text-amber-300">{{ inspectedRecord?.forgettingProgress }}%</span></div>
						<div>折叠状态：<span class="font-medium text-gray-700 dark:text-gray-200">{{ inspectedRecord?.isCollapsed ? '已折叠' : '可展开' }}</span></div>
					</div>
				</div>

				<template #footer>
					<div class="flex items-center justify-end gap-2">
						<UButton variant="ghost" @click="closeRecordDetail">关闭</UButton>
						<UButton
							v-if="inspectedRecord && inspectedRecord.status !== 'purged'"
							color="primary"
							icon="i-lucide-rotate-ccw"
							@click="handleRestore(inspectedRecord)"
						>
							恢复这条记忆
						</UButton>
					</div>
				</template>
			</UCard>
		</UModal>
	</div>
</template>
