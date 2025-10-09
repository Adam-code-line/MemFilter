<script setup lang="ts">
import { computed } from 'vue'
import type { ProfileContentStat } from '~/composables/profile/useProfileContent'
import { usePageMeta } from '~/composables/ui/usePageMeta'
import { useProfileContent } from '~/composables/profile/useProfileContent'
import { useProfileMetrics } from '~/composables/profile/useProfileMetrics'

definePageMeta({
	layout: 'app'
})

const router = useRouter()

const { content } = await useProfileContent()
const {
	summaryMetrics,
	importanceDistribution,
	recentNotes,
	hasNotes
} = useProfileMetrics()

const { headerTitle, headerSubtitle, headerBadge } = usePageMeta(
	{
		title: computed(() => content.value.title),
		subtitle: computed(() => content.value.subtitle ?? ''),
		badge: computed(() => content.value.badge ?? null)
	},
	{
		title: '个人档案',
		subtitle: '了解你的记忆画像与近期的遗忘行为。',
		badge: null
	}
)

useHead(() => ({
	title: headerTitle.value
}))

const profileSummary = computed(() => content.value.summary ?? null)

const dynamicSummaryStats = computed<ProfileContentStat[]>(() => {
	const metrics = summaryMetrics.value

	return [
		{
			key: 'total',
			label: '记忆总量',
			value: String(metrics.total ?? 0),
			icon: 'i-lucide-layers',
			color: 'primary'
		},
		{
			key: 'core',
			label: '核心记忆',
			value: String(metrics.core ?? 0),
			icon: 'i-lucide-flame',
			color: 'success'
		},
		{
			key: 'fading',
			label: '淡化中',
			value: String(metrics.fading ?? 0),
			icon: 'i-lucide-timer',
			color: 'warning'
		},
		{
			key: 'forgotten',
			label: '已遗忘',
			value: String(metrics.forgotten ?? 0),
			icon: 'i-lucide-moon-star',
			color: 'neutral'
		}
	]
})

const profileStats = computed(() => {
	const configuredStats = profileSummary.value?.stats
	if (configuredStats?.length) {
		return configuredStats
	}

	return dynamicSummaryStats.value
})

const summaryStatOverrides = computed<Record<string, string>>(() => {
	const overrides: Record<string, string> = {}
	const metrics = summaryMetrics.value

	overrides.total = String(metrics.total ?? 0)
	overrides.core = String(metrics.core ?? 0)
	overrides.fading = String(metrics.fading ?? 0)
	overrides.forgotten = String(metrics.forgotten ?? 0)

	const retained = Math.max((metrics.total ?? 0) - (metrics.forgotten ?? 0), 0)
	overrides.retained = String(retained)

	const total = metrics.total ?? 0
	const forgotten = metrics.forgotten ?? 0
	const forgettingPercent = total > 0 ? Math.round((forgotten / total) * 100) : 0
	overrides.forgetting = `${forgettingPercent}%`

	return overrides
})

const insightSection = computed(() => content.value.insights ?? null)
const hasInsightItems = computed(() => (insightSection.value?.items?.length ?? 0) > 0)
const timelineSection = computed(() => content.value.timeline ?? null)
const resourceSection = computed(() => content.value.resources ?? null)

const showRecentNotes = computed(() => hasNotes.value && (recentNotes.value?.length ?? 0) > 0)

const handleSummaryAction = (action: { action?: string; to?: string }) => {
	if (action?.action === 'open-settings') {
		router.push('/settings')
		return
	}

	if (action?.action === 'open-history') {
		router.push('/history')
	}
}

const handleResourceOpen = async (link: { action?: string; value?: string }) => {
	if (process.client && link.action === 'copy-email' && link.value && navigator?.clipboard?.writeText) {
		try {
			await navigator.clipboard.writeText(link.value)
		} catch {
			// noop — clipboard support is optional
		}
	}
}
</script>

<template>
	<div class="max-w-7xl mx-auto space-y-12 px-4 pb-20 pt-10 sm:px-6 lg:px-8">
		<section class="space-y-4">
			<div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
				<div class="space-y-2">
					<div class="flex flex-wrap items-center gap-3">
						<UBadge
							v-if="headerBadge"
							:label="headerBadge.label"
							:color="headerBadge.color ?? 'primary'"
							:icon="headerBadge.icon"
							variant="soft"
						/>
						<h1 class="text-3xl font-bold text-gray-900 dark:text-white">
							{{ headerTitle }}
						</h1>
					</div>
					<p v-if="headerSubtitle" class="text-sm text-gray-500 dark:text-gray-400 max-w-3xl">
						{{ headerSubtitle }}
					</p>
				</div>
			</div>

			<ProfileSummaryCard
				:summary="profileSummary"
				:stats="profileStats"
				:metrics="summaryStatOverrides"
				@action="handleSummaryAction"
			/>
		</section>

		<section
			class="grid gap-6"
			:class="{ 'lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]': hasInsightItems }"
		>
			<ProfileInsightGrid
				v-if="hasInsightItems"
				:title="insightSection?.title"
				:subtitle="insightSection?.subtitle"
				:items="insightSection?.items"
			/>

			<div class="space-y-6">
				<ProfileImportanceChart :distribution="importanceDistribution" />
				<ProfileRecentNotes
					:notes="recentNotes"
					:class="{ 'opacity-70': !showRecentNotes }"
					:empty-label="showRecentNotes ? undefined : '暂无最近访问记录'"
				/>
			</div>
		</section>

		<section class="grid gap-6 xl:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]">
			<ProfileTimeline
				:title="timelineSection?.title"
				:description="timelineSection?.description"
				:items="timelineSection?.items"
				:empty="timelineSection?.empty"
			/>

			<ProfileResourceList
				:title="resourceSection?.title"
				:description="resourceSection?.description"
				:links="resourceSection?.links"
				@open="handleResourceOpen"
			/>
		</section>
	</div>
</template>
