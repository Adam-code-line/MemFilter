

const defaultPageTitle = '笔记管理'
const defaultPageSubtitle = '智能整理与主动遗忘，聚焦真正重要的内容。'

const defaultImportanceOptions = [
	{ label: '全部', value: 'all', icon: 'i-lucide-layers' },
	{ label: '核心笔记', value: 'high', icon: 'i-lucide-rocket' },
	{ label: '重要笔记', value: 'medium', icon: 'i-lucide-target' },
	{ label: '次要笔记', value: 'low', icon: 'i-lucide-sparkles' },
	{ label: '噪声信息', value: 'noise', icon: 'i-lucide-waves' }
] as const

const defaultFilters = {
	searchPlaceholder: '搜索笔记内容...',
	summaryLabel: '找到 {count} 条笔记',
	selectedLabel: '已选择 {count} 条',
	viewToggle: {
		card: '卡片视图',
		list: '列表视图'
	},
	importance: defaultImportanceOptions
}

const defaultSearchConfig = {
	placeholder: '搜索笔记或内容……',
	importanceLabel: '重要度',
	timeLabel: '时间范围',
	timeOptions: [
		{ label: '全部时间', value: 'all', icon: 'i-lucide-infinity' },
		{ label: '最近 7 天', value: 'last7', icon: 'i-lucide-calendar' },
		{ label: '最近 30 天', value: 'last30', icon: 'i-lucide-calendar-clock' },
		{ label: '最近 90 天', value: 'last90', icon: 'i-lucide-calendar-range' }
	]
} as const

const defaultList = {
	title: '笔记列表',
	createLabel: '新建笔记',
	totalLabel: '全部笔记',
	icon: 'i-lucide-notebook-pen',
	empty: {
		title: '暂无笔记',
		description: '开始创建您的第一条笔记。',
		action: {
			label: '新建笔记',
			icon: 'i-lucide-plus'
		}
	}
}

const defaultEmptyState = {
	title: '没有找到匹配的笔记',
	description: '尝试调整搜索条件，或立即创建一条新笔记。',
	action: {
		label: '新建笔记',
		icon: 'i-lucide-plus',
		variant: 'solid' as const,
		color: 'primary' as const
	}
}

const defaultEditor = {
	titlePlaceholder: '笔记标题...',
	contentPlaceholders: {
		default: '在这里记录您的想法与灵感……',
		fading: '输入笔记内容，此笔记可能会被遗忘……',
		strongFading: '内容正在淡化中……'
	},
	actions: {
		save: '保存笔记',
		cancel: '取消'
	},
	status: {
		saved: '已保存',
		unsaved: '未保存'
	},
	metaLabels: {
		wordCount: '字数',
		readTime: '预计阅读',
		lastEdited: '修改'
	},
	aiBadgePrefix: 'AI 评分'
}

const defaultActions = [
	{ key: 'create', label: '新建笔记', icon: 'i-lucide-plus', variant: 'solid' as const, color: 'primary' as const },
	{ key: 'import', label: '导入笔记', icon: 'i-lucide-upload', variant: 'outline' as const, color: 'neutral' as const },
	{ key: 'tidy', label: 'AI 整理', icon: 'i-lucide-wand-2', variant: 'outline' as const, color: 'primary' as const, to: '/memory' },
	{ key: 'history', label: '遗忘日志', icon: 'i-lucide-history', variant: 'outline' as const, color: 'warning' as const, to: '/history' }
] as const

export const useNoteContent = async () => {
	const { data } = await useAsyncData('note-config', () => queryCollection('note').first())

	const noteConfig = computed(() => data.value ?? null)

	const badge = computed(() => noteConfig.value?.badge ?? null)
	const pageTitle = computed(() => noteConfig.value?.title ?? defaultPageTitle)
	const pageSubtitle = computed(() => noteConfig.value?.subtitle ?? defaultPageSubtitle)
	const search = computed(() => {
		const config = noteConfig.value?.search
		return {
			...defaultSearchConfig,
			...(config ?? {}),
			timeOptions: config?.timeOptions ?? defaultSearchConfig.timeOptions
		}
	})

	const actions = computed(() => noteConfig.value?.actions ?? defaultActions)

	const filters = computed(() => {
		const config = noteConfig.value?.filters
		return {
			...defaultFilters,
			...(config ?? {}),
			viewToggle: {
				...defaultFilters.viewToggle,
				...(config?.viewToggle ?? {})
			},
			importance: config?.importance ?? defaultImportanceOptions
		}
	})

	const list = computed(() => {
		const config = noteConfig.value?.list
		const emptyConfig = config?.empty
		return {
			...defaultList,
			...(config ?? {}),
			empty: {
				...defaultList.empty,
				...(emptyConfig ?? {}),
				action: {
					...defaultList.empty.action,
					...(emptyConfig?.action ?? {})
				}
			}
		}
	})

	const emptyState = computed(() => {
		const config = noteConfig.value?.emptyState
		if (!config) {
			return defaultEmptyState
		}
		return {
			...defaultEmptyState,
			...config,
			action: {
				...defaultEmptyState.action,
				...(config.action ?? {})
			}
		}
	})

	const editor = computed(() => {
		const config = noteConfig.value?.editor
		return {
			...defaultEditor,
			...(config ?? {}),
			contentPlaceholders: {
				...defaultEditor.contentPlaceholders,
				...(config?.contentPlaceholders ?? {})
			},
			actions: {
				...defaultEditor.actions,
				...(config?.actions ?? {})
			},
			status: {
				...defaultEditor.status,
				...(config?.status ?? {})
			},
			metaLabels: {
				...defaultEditor.metaLabels,
				...(config?.metaLabels ?? {})
			}
		}
	})

	return {
		badge,
		pageTitle,
		pageSubtitle,
		search,
		actions,
		filters,
		list,
		emptyState,
		editor,
		defaults: {
			pageTitle: defaultPageTitle,
			pageSubtitle: defaultPageSubtitle,
			importanceOptions: defaultImportanceOptions,
			filters: defaultFilters,
			search: defaultSearchConfig,
			list: defaultList,
			emptyState: defaultEmptyState,
			editor: defaultEditor,
			actions: defaultActions
		}
	}
}

export type NoteImportanceOptions = typeof defaultImportanceOptions
export type NoteFiltersConfig = typeof defaultFilters
export type NoteListConfig = typeof defaultList
export type NoteEmptyState = typeof defaultEmptyState
export type NoteEditorConfig = typeof defaultEditor
