<script lang="ts" setup>
const { data: index } = await useAsyncData('index', () => queryCollection('index').first())
import MemoryCard from '~/components/Memory/MemoryCard.vue'
import { useRouter } from '#app'

const router = useRouter()

const sampleMemories = [
	{ title: '学习: 算法笔记', snippet: '总结了排序、查找和图算法的要点', date: '2025-09-20', importance: 'high', icon: '📚' },
	{ title: '会议纪要: 产品评审', snippet: '整理了决策与行动项', date: '2025-09-18', importance: 'normal', icon: '📝' },
	{ title: '日常: 购物清单', snippet: '牛奶、鸡蛋、蔬菜', date: '2025-09-10', importance: 'low', icon: '🛒' },
]

function openNote() {
	router.push('/note')
}
</script>

<template>
	<UPageHero :title="index?.title" :subtitle="index?.hero?.subtitle">
		<template #actions>
			<UButton label="立即体验" icon="i-lucide-arrow-right" @click="() => $router.push(index?.hero?.card?.to || '/signup')" />
		</template>
	</UPageHero>

	<UMain>
		<UContainer size="lg" class="py-8">
			<div class="grid grid-cols-1 md:grid-cols-3 gap-6">
				<div class="md:col-span-2">
					<UCard>
						<template #header>
							<div class="flex items-center justify-between">
								<div>
									<h3 class="text-xl font-semibold">记忆回顾</h3>
									<p class="text-sm text-gray-500">近期的记忆和笔记摘要</p>
								</div>
								<div>
									<UButton label="记录新记忆" icon="i-lucide-plus" @click="openNote" />
								</div>
							</div>
						</template>

						<div class="p-6">
							<div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
								<MemoryCard v-for="(m, i) in sampleMemories" :key="i" v-bind="m" @open="openNote" />
							</div>
						</div>
					</UCard>
				</div>

				<div>
					<UCard>
						<template #header>
							<h4 class="font-semibold">快速链接</h4>
						</template>
						<div class="p-4 space-y-3">
							<UButton label="笔记列表" variant="ghost" @click="() => router.push('/note')" />
							<UButton label="设置" variant="ghost" @click="() => router.push('/settings')" />
						</div>
					</UCard>
				</div>
			</div>
		</UContainer>
	</UMain>
</template>

<style scoped>
</style>