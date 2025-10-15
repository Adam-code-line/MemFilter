<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useToast } from '#imports'

definePageMeta({
	layout: 'app'
})

const toast = useToast()
const notesContext = useNotesDashboard()
const { content } = await useHistoryContent()

const historyRecords = useHistoryRecords({
	notes: notesContext.notes,
	restoreNote: notesContext.restoreNote,
	purgeNote: notesContext.purgeNote
})

const groupedRecordsRef = historyRecords.groupedRecords
const historyStats = historyRecords.stats
const timelineEvents = historyRecords.timelineEvents
const restoreLogRef = historyRecords.restoreLog

const { headerTitle, headerSubtitle, headerBadge } = usePageMeta(
	{
		title: computed(() => content.value.title ?? null),
		subtitle: computed(() => content.value.subtitle ?? null),
		badge: computed(() => content.value.badge ?? null)
	},
	{
		title: '遗忘日志',
		subtitle: '',
		badge: null
	}
)

useHead(() => ({
	title: headerTitle.value
}))
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

const purgeConfirm = ref<{
	open: boolean
	record: HistoryRecord | null
	title: string
	description: string
	confirmLabel: string
	confirmColor: 'primary' | 'secondary' | 'neutral' | 'error' | 'warning' | 'success' | 'info'
	confirmVariant: 'solid' | 'soft' | 'subtle' | 'outline' | 'ghost'
	icon: string
}>(
	{
		open: false,
		record: null,
		title: '',
		description: '',
		confirmLabel: '彻底遗忘',
		confirmColor: 'error',
		confirmVariant: 'solid',
		icon: 'i-lucide-trash-2'
	}
)

const importanceLabels: Record<string, string> = {
	high: '核心',
	medium: '重要',
	low: '次要',
	noise: '噪声'
}

const router = useRouter()

const openRecordDetail = (recordId: number) => {
	router.push({ path: `/memory/${recordId}` })
}

const handleRestore = async (record: HistoryRecord) => {
	try {
		await historyRecords.restoreRecord(record)
		toast.add({
			title: '记忆已恢复',
			description: `《${record.title}》已恢复至活跃状态。`,
			color: 'primary',
			icon: 'i-lucide-rotate-ccw'
		})
	} catch (error) {
		console.error('[history] 恢复操作失败', error)
	}
}

const openPurgeConfirm = (record: HistoryRecord) => {
	const displayTitle = record.title || '未命名记忆'
	purgeConfirm.value.open = true
	purgeConfirm.value.record = record
	purgeConfirm.value.title = '彻底遗忘这段记忆？'
	purgeConfirm.value.description = `确认后《${displayTitle}》将被永久删除且无法恢复。`
}

const resetPurgeConfirm = () => {
	purgeConfirm.value.open = false
	purgeConfirm.value.record = null
	purgeConfirm.value.title = ''
	purgeConfirm.value.description = ''
}

const executePurge = async () => {
	const record = purgeConfirm.value.record
	if (!record) {
		return
	}

	const purged = await historyRecords.purgeRecord(record)
	if (purged) {
		const displayTitle = record.title || '未命名记忆'
		toast.add({
			title: '记忆已彻底遗忘',
			description: `《${displayTitle}》已从历史记录中清理。`,
			icon: 'i-lucide-trash-2',
			color: 'error'
		})
	}

	resetPurgeConfirm()
}

const heroAction = computed(() => heroSection.value?.action ?? null)

watch(() => purgeConfirm.value.open, open => {
	if (!open) {
		purgeConfirm.value.record = null
		purgeConfirm.value.title = ''
		purgeConfirm.value.description = ''
	}
})
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
					<h1 class="text-3xl font-bold text-gray-900 dark:text-white">{{ headerTitle }}</h1>
				</div>
				<p v-if="headerSubtitle" class="text-sm text-gray-500 dark:text-gray-400 max-w-3xl">{{ headerSubtitle }}</p>
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
					:description="record.description || ''"
					:icon="record.icon"
					:status="record.status"
					:importance-label="importanceLabels[record.importance] ?? '普通'"
					:importance-score="record.importanceScore"
					:forgetting-progress="record.forgettingProgress"
					:days-until-forgotten="record.daysUntilForgotten ?? 0"
					:last-accessed="record.lastAccessed"
					:restorable="record.status !== 'purged'"
					:purgeable="record.status === 'archived'"
					@restore="handleRestore(record)"
					@inspect="openRecordDetail(record.id)"
					@purge="openPurgeConfirm(record)"
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

	    <CommonConfirmDialog
	      v-model="purgeConfirm.open"
	      :title="purgeConfirm.title"
	      :description="purgeConfirm.description"
	      :icon="purgeConfirm.icon"
	      :confirm-label="purgeConfirm.confirmLabel"
	      :confirm-color="purgeConfirm.confirmColor"
	      :confirm-variant="purgeConfirm.confirmVariant"
	      @confirm="executePurge"
	      @cancel="resetPurgeConfirm"
	    />

	</div>
</template>
