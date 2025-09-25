
// 重要度级别：核心信息、次要信息、噪声信息
export type ImportanceLevel = 'core' | 'secondary' | 'noise'

// 笔记状态：活跃、淡化中、已遗忘
export type NoteStatus = 'active' | 'fading' | 'forgotten'

// 遗忘阶段：根据艾宾浩斯遗忘曲线设计
export type ForgettingStage = 'fresh' | 'dimming' | 'blurred' | 'collapsed' | 'vanished'

// 笔记接口定义
export interface Note {
  /** 唯一标识符 */
  id: string
  
  /** 笔记文本内容 */
  text: string
  
  /** AI 评估的重要度级别 */
  importance: ImportanceLevel
  
  /** 当前状态 */
  status: NoteStatus
  
  /** 创建时间 (ISO 字符串) */
  createdAt: string
  
  /** 最后更新时间 (ISO 字符串) */
  updatedAt?: string
  
  /** 遗忘开始时间 (ISO 字符串) */
  forgettingStartedAt?: string
  
  /** 预计完全遗忘时间 (ISO 字符串) */
  willForgetAt?: string
  
  /** 遗忘阶段 */
  forgettingStage?: ForgettingStage
  
  /** AI 评估分数 (0-100) */
  aiScore?: number
  
  /** 用户访问频率 */
  accessCount?: number
  
  /** 标签 */
  tags?: string[]
  
  /** 是否被用户标记为重要 */
  userMarkedImportant?: boolean
  
  /** 情感权重 (-1 到 1，负数表示负面情绪) */
  emotionalWeight?: number
}

// 遗忘日志接口
export interface ForgettingLog {
  /** 日志ID */
  id: string
  
  /** 关联的笔记ID */
  noteId: string
  
  /** 遗忘动作类型 */
  action: 'dimmed' | 'blurred' | 'collapsed' | 'forgotten' | 'restored'
  
  /** 动作发生时间 (ISO 字符串) */
  timestamp: string
  
  /** 遗忘原因 */
  reason: string
  
  /** 可恢复的快照数据 */
  snapshot?: Partial<Note>
}

// 批量笔记操作结果
export interface NoteBatchResult {
  /** 成功处理的笔记数量 */
  successCount: number
  
  /** 失败的笔记数量 */
  failureCount: number
  
  /** 处理的笔记ID列表 */
  processedIds: string[]
  
  /** 错误信息 */
  errors?: string[]
}

// 笔记查询过滤器
export interface NoteFilter {
  /** 重要度过滤 */
  importance?: ImportanceLevel[]
  
  /** 状态过滤 */
  status?: NoteStatus[]
  
  /** 标签过滤 */
  tags?: string[]
  
  /** 创建时间范围 */
  createdAfter?: string
  createdBefore?: string
  
  /** 文本搜索 */
  searchText?: string
  
  /** 是否包含已遗忘的笔记 */
  includeForgotten?: boolean
}