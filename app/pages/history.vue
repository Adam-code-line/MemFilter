<script setup lang="ts">
import { computed, nextTick, ref, watch } from 'vue'
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
const detailSectionRef = ref<HTMLElement | null>(null)

const detailStatusMap: Record<HistoryRecord['status'], { label: string; color: string }> = {
	recoverable: { label: '等待决策', color: 'warning' },
	archived: { label: '已折叠', color: 'neutral' },
	purged: { label: '已清理', color: 'error' }
}

const detailStatus = computed(() => {
	const record = inspectedRecord.value
	return record ? detailStatusMap[record.status] : null
})

const detailActions = computed(() => {
	const record = inspectedRecord.value
	if (!record) {
		return []
	}

	if (record.status === 'purged') {
		return [
			{
				key: 'purged',
				label: '记录已清理',
				icon: 'i-lucide-shield-off',
				color: 'neutral',
				variant: 'soft' as const,
				disabled: true,
				tooltip: '该条目已永久清理，无法恢复。'
			}
		]
	}

	return [
		{
			key: 'restore',
			label: '恢复记忆',
			icon: 'i-lucide-rotate-ccw',
			color: 'primary',
			variant: 'solid' as const
		}
	]
})

const openRecordDetail = (recordId: number) => {
	const allGroups = historyRecords.groupedRecords.value
	const record = [
		...allGroups.recoverable,
		...allGroups.archived,
		...allGroups.purged
	].find(item => item.id === recordId)

	inspectedRecord.value = record ?? null

	if (record) {
		nextTick(() => {
			detailSectionRef.value?.scrollIntoView({ behavior: 'smooth', block: 'start' })
		})
	}
}

const closeRecordDetail = () => {
	inspectedRecord.value = null
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

const handleDetailAction = (key: string) => {
	const record = inspectedRecord.value
	if (!record) {
		return
	}

	if (key === 'restore' && record.status !== 'purged') {
		handleRestore(record)
	}
}

const heroAction = computed(() => heroSection.value?.action ?? null)

const allRecords = computed(() => {
	const groups = historyRecords.groupedRecords.value
	return [
		...groups.recoverable,
		...groups.archived,
		...groups.purged
	]
})

watch(allRecords, records => {
	if (!records.length) {
		inspectedRecord.value = null
		return
	}

	if (inspectedRecord.value) {
		const refreshed = records.find(entry => entry.id === inspectedRecord.value?.id)
		if (refreshed) {
			inspectedRecord.value = refreshed
			return
		}
	}

	inspectedRecord.value = records[0]
}, { immediate: true })
</script>

<template>
	<div class="max-w-6xl mx-auto space-y-12 pb-20">
		<section ref="detailSectionRef" class="space-y-4">
			<div class="rounded-3xl border border-gray-200/70 dark:border-white/10 bg-white/90 dark:bg-slate-900/70 backdrop-blur p-5 shadow-lg">
				<div class="flex items-center justify-between gap-3 mb-4">
					<div>
						<p class="text-xs uppercase tracking-[0.4em] text-primary-500/70 dark:text-primary-300/70">History Focus</p>
						<h2 class="text-xl font-semibold text-gray-900 dark:text-white">记忆日志详情</h2>
					</div>
					<UButton v-if="inspectedRecord" variant="ghost" size="xs" icon="i-lucide-x" @click="closeRecordDetail">
						清除选择
					</UButton>
				</div>
				<MemoryDetailPanel
					:note="inspectedRecord"
					:actions="detailActions"
					:status-label="detailStatus?.label"
					:status-color="detailStatus?.color"
					@action="handleDetailAction"
				/>
			</div>
		</section>

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

	</div>
</template>
