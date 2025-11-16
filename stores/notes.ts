import { acceptHMRUpdate, defineStore } from "pinia";
import { useNotificationCenter } from "~/composables/notifications/useNotificationCenter";
import { useNotesApi } from "~/composables/note/useNotesApi";
import { IMPORTANCE_METADATA } from "~/composables/note-memory/importanceMetadata";
import type {
  FadeLevel,
  ImportanceLevel,
  NoteAIEvaluation,
  NoteAICompression,
  NoteDashboardOptions,
  NoteRecord,
  NoteSavePayload,
} from "~/composables/note/types";

const MAX_FORGET_WINDOW = 999;
const BASE_FORGET_WINDOW = 14;
const DAY_IN_MS = 24 * 60 * 60 * 1000;

const importanceWeights: Record<ImportanceLevel, number> = {
  high: 1,
  medium: 0.7,
  low: 0.4,
  noise: 0.2,
};

const importancePriority: Record<ImportanceLevel, number> = {
  high: 0,
  medium: 1,
  low: 2,
  noise: 3,
};

const defaultDecayRates: Record<ImportanceLevel, number> = {
  high: 0,
  medium: 20,
  low: 35,
  noise: 50,
};

const defaultForgetWindows: Record<ImportanceLevel, number> = {
  high: MAX_FORGET_WINDOW,
  medium: BASE_FORGET_WINDOW,
  low: 7,
  noise: 3,
};

const baselineProgressMultipliers: Record<ImportanceLevel, number> = {
  high: 0,
  medium: 0.22,
  low: 0.28,
  noise: 0.35,
};

const fadeProgressThresholds: Record<
  ImportanceLevel,
  [number, number, number, number]
> = {
  high: [60, 78, 90, 100],
  medium: [22, 45, 70, 90],
  low: [18, 40, 65, 85],
  noise: [12, 35, 60, 80],
};

const formatDateLabel = (date: Date) =>
  new Intl.DateTimeFormat("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);

const formatLastAccessedLabel = (value?: string | Date | null) => {
  if (!value) {
    return "";
  }

  if (typeof value === "string") {
    const normalized = value.trim();
    if (!normalized) {
      return "";
    }

    if (
      normalized === "刚刚" ||
      normalized.includes("分钟") ||
      normalized.startsWith("今天 ")
    ) {
      return normalized;
    }
  }

  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "";
  }

  const diff = Date.now() - date.getTime();

  if (diff < 60_000) {
    return "刚刚";
  }

  if (diff < 3_600_000) {
    return `${Math.max(1, Math.round(diff / 60_000))} 分钟前`;
  }

  if (diff < 86_400_000) {
    return `今天 ${date.toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit" })}`;
  }

  return formatDateLabel(date);
};

const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value));

const computeNoteAgeInDays = (note: NoteRecord) => {
  if (note.restoredAt) {
    const restoredTimestamp = Date.parse(note.restoredAt);
    if (!Number.isNaN(restoredTimestamp)) {
      return Math.max(0, (Date.now() - restoredTimestamp) / DAY_IN_MS);
    }
  }

  if (note.createdAt) {
    const timestamp = Date.parse(note.createdAt);
    if (!Number.isNaN(timestamp)) {
      return Math.max(0, (Date.now() - timestamp) / DAY_IN_MS);
    }
  }

  if (note.date) {
    const parsed = Date.parse(note.date);
    if (!Number.isNaN(parsed)) {
      return Math.max(0, (Date.now() - parsed) / DAY_IN_MS);
    }
  }

  return 0;
};

const resolveNoteTimestamp = (note: NoteRecord) => {
  const parseDate = (value?: string) => {
    if (!value) {
      return null;
    }

    const parsed = Date.parse(value);
    return Number.isNaN(parsed) ? null : parsed;
  };

  const fromUpdated = parseDate(note.updatedAt);
  if (fromUpdated !== null) {
    return fromUpdated;
  }

  const fromCreated = parseDate(note.createdAt);
  if (fromCreated !== null) {
    return fromCreated;
  }

  if (typeof note.id === "number" && Number.isFinite(note.id)) {
    return note.id;
  }

  const numeric = Number(note.id);
  if (Number.isFinite(numeric)) {
    return numeric;
  }

  return Date.now();
};

const resolveProgressThresholds = (importance: ImportanceLevel) =>
  fadeProgressThresholds[importance] ?? fadeProgressThresholds.medium;

const calculateFadeLevelFromProgress = (
  importance: ImportanceLevel,
  progress: number
): FadeLevel => {
  const thresholds = resolveProgressThresholds(importance);
  let level = 0;

  for (let index = 0; index < thresholds.length; index += 1) {
    if (progress >= thresholds[index]) {
      level = index + 1;
    } else {
      break;
    }
  }

  return Math.min(level, 4) as FadeLevel;
};

const computeBaselineProgress = (
  note: NoteRecord,
  importanceScore: number,
  forgettingWindow: number
) => {
  if (note.importance === "high") {
    return 0;
  }

  const multiplier = baselineProgressMultipliers[note.importance] ?? 0.3;
  const scoreDrag = clamp(
    Math.round((100 - importanceScore) * multiplier),
    0,
    92
  );
  const ageDays = computeNoteAgeInDays(note);
  const curveScale = 0.6 + importanceScore / 180;
  const effectiveWindow = Math.max(3, forgettingWindow * curveScale);
  const curveProgress = clamp(
    Math.round((1 - Math.exp(-ageDays / effectiveWindow)) * 100),
    0,
    97
  );

  return clamp(Math.max(scoreDrag, curveProgress), 0, 97);
};

const calculateAcceleratedProgress = (
  importance: ImportanceLevel,
  currentProgress: number,
  importanceScore: number
) => {
  const thresholds = resolveProgressThresholds(importance);
  const currentLevel = calculateFadeLevelFromProgress(
    importance,
    currentProgress
  );
  const nextIndex = Math.min(currentLevel, thresholds.length - 1);
  const baseTarget = thresholds[nextIndex];
  const bonus = Math.round((100 - importanceScore) * 0.12);
  return clamp(Math.max(currentProgress, baseTarget + bonus), baseTarget, 96);
};

const remainingDaysByStage = (
  importance: ImportanceLevel,
  forgettingWindow: number,
  fadeLevel: FadeLevel,
  progress: number
) => {
  if (importance === "high") {
    const highStageWindows = [
      MAX_FORGET_WINDOW,
      BASE_FORGET_WINDOW * 6,
      BASE_FORGET_WINDOW * 4,
      BASE_FORGET_WINDOW * 2,
      BASE_FORGET_WINDOW,
    ] as const;
    return highStageWindows[fadeLevel] ?? BASE_FORGET_WINDOW * 2;
  }

  const stageFactors = [1, 0.82, 0.58, 0.36, 0.18];
  const stageFactor = stageFactors[fadeLevel] ?? 0.18;
  const dynamicFactor = Math.max(0.35, 1 - progress / 130);
  const estimate = Math.round(forgettingWindow * stageFactor * dynamicFactor);
  return Math.max(1, estimate);
};

const cloneEvaluation = (
  value?: NoteAIEvaluation | null
): NoteAIEvaluation | null => {
  if (!value) {
    return null;
  }

  return {
    ...value,
    usage: value.usage ? { ...value.usage } : undefined,
  };
};

const cloneCompression = (
  value?: NoteAICompression | null
): NoteAICompression | null => {
  if (!value) {
    return null;
  }

  return {
    ...value,
    bullets: Array.isArray(value.bullets) ? [...value.bullets] : [],
    usage: value.usage ? { ...value.usage } : undefined,
  };
};

const normalizeRecord = (
  record: Partial<NoteRecord> & { id?: number }
): NoteRecord => {
  const now = new Date();
  const importance = record.importance ?? "medium";
  const defaultWindow =
    importance === "high"
      ? MAX_FORGET_WINDOW
      : (defaultForgetWindows[importance] ?? BASE_FORGET_WINDOW);

  const resolvedIdCandidate =
    typeof record.id === "number" && Number.isFinite(record.id)
      ? record.id
      : Number.parseInt(String(record.id ?? ""), 10);
  const resolvedId = Number.isFinite(resolvedIdCandidate)
    ? resolvedIdCandidate
    : now.getTime();
  const createdAt = record.createdAt ?? now.toISOString();
  const lastAccessLabel = record.lastAccessed
    ? formatLastAccessedLabel(record.lastAccessed)
    : "刚刚";

  return {
    id: resolvedId,
    title: record.title ?? "未命名笔记",
    content: record.content ?? "",
    description: record.description ?? "",
    date: record.date ?? formatDateLabel(now),
    lastAccessed: lastAccessLabel,
    icon: record.icon ?? "📝",
    importance,
    fadeLevel: (record.fadeLevel ?? 0) as FadeLevel,
    forgettingProgress: record.forgettingProgress ?? 0,
    daysUntilForgotten: record.daysUntilForgotten ?? defaultWindow,
    isCollapsed: record.isCollapsed ?? false,
    importanceScore: record.importanceScore ?? 0,
    decayRate: record.decayRate ?? undefined,
    aiEvaluation: cloneEvaluation(record.aiEvaluation ?? null),
    aiCompression: cloneCompression(record.aiCompression ?? null),
    createdAt,
    restoredAt: record.restoredAt ?? null,
    updatedAt: record.updatedAt ?? createdAt,
  };
};

const createInitialState = (initialNotes?: NoteRecord[]) =>
  initialNotes ? initialNotes.map(normalizeRecord) : [];

const computeEvaluation = (
  note: NoteRecord,
  options: NoteDashboardOptions = {}
) => {
  if (note.aiEvaluation) {
    const evaluation = note.aiEvaluation;
    const importance = evaluation.importance ?? note.importance ?? "medium";
    const action = evaluation.suggestedAction;
    const importanceScoreFromAI =
      IMPORTANCE_METADATA[importance]?.defaultScore ?? 60;

    const baseWindow =
      importance === "high"
        ? MAX_FORGET_WINDOW
        : (defaultForgetWindows[importance] ?? BASE_FORGET_WINDOW);

    const windowMultiplier =
      action === "retain" ? 1.6 : action === "discard" ? 0.6 : 1;

    const forgettingWindow =
      importance === "high"
        ? MAX_FORGET_WINDOW
        : clamp(
            Math.round(baseWindow * windowMultiplier),
            3,
            MAX_FORGET_WINDOW
          );

    const baseDecay = defaultDecayRates[importance] ?? defaultDecayRates.medium;
    const decayAdjust =
      action === "retain" ? -8 : action === "discard" ? 12 : 0;
    const decayRate = clamp(Math.round(baseDecay + decayAdjust), 0, 100);

    return {
      importanceScore: importanceScoreFromAI,
      decayRate,
      forgettingWindow,
    };
  }

  if (options.evaluateNote) {
    const evaluation = options.evaluateNote(note) ?? {};
    const importance = note.importance ?? "medium";
    const fallbackWindow =
      importance === "high"
        ? MAX_FORGET_WINDOW
        : (defaultForgetWindows[importance] ?? BASE_FORGET_WINDOW);

    return {
      importanceScore: clamp(
        Math.round(evaluation.importanceScore ?? 0),
        0,
        100
      ),
      decayRate: evaluation.decayRate ?? defaultDecayRates[importance],
      forgettingWindow: Math.max(
        1,
        Math.round(evaluation.forgettingWindow ?? fallbackWindow)
      ),
    };
  }

  const importance = note.importance;
  const weight = importanceWeights[importance] ?? 0.7;
  const contentBoost = Math.min(
    25,
    Math.round((note.content?.length ?? 0) / 80)
  );
  const structureBonus = Math.min(
    12,
    Math.round((note.content?.match(/\n/g)?.length ?? 0) * 3.2)
  );
  const titleBonus = Math.min(10, Math.round(note.title.length / 12));
  const agePenalty = Math.min(30, Math.round(computeNoteAgeInDays(note) * 1.6));
  const collapsePenalty = note.isCollapsed ? 6 : 0;

  const rawScore =
    weight * 55 +
    contentBoost +
    structureBonus +
    titleBonus -
    agePenalty -
    collapsePenalty;
  const importanceScore = clamp(Math.round(rawScore), 10, 100);

  const decayRate = defaultDecayRates[importance] ?? defaultDecayRates.medium;
  if (importance === "high") {
    return {
      importanceScore,
      decayRate,
      forgettingWindow: MAX_FORGET_WINDOW,
    };
  }

  const baseWindow = defaultForgetWindows[importance] ?? BASE_FORGET_WINDOW;
  const windowScale = 1 + importanceScore / 140;
  const forgettingWindow = Math.max(3, Math.round(baseWindow * windowScale));

  return {
    importanceScore,
    decayRate,
    forgettingWindow,
  };
};

const applyEvaluation = (
  note: NoteRecord,
  options: NoteDashboardOptions = {},
  context: {
    accelerated?: boolean;
    preserveProgress?: boolean;
    forceProgressReset?: boolean;
  } = {}
): NoteRecord => {
  const importanceFromEvaluation =
    note.aiEvaluation?.importance ?? note.importance;
  const resolvedImportance = importanceFromEvaluation ?? "medium";
  const evaluation = computeEvaluation(
    { ...note, importance: resolvedImportance },
    options
  );
  const importanceScore = evaluation.importanceScore;
  const decayRate = evaluation.decayRate;
  const forgettingWindow = evaluation.forgettingWindow;

  const accelerated = context.accelerated ?? false;
  const preserveProgress = context.preserveProgress ?? false;
  const forceProgressReset = context.forceProgressReset ?? false;

  let fadeLevel = (note.fadeLevel ?? 0) as FadeLevel;
  let progress = clamp(Math.round(note.forgettingProgress ?? 0), 0, 100);
  let daysUntilForgotten =
    resolvedImportance === "high"
      ? MAX_FORGET_WINDOW
      : (note.daysUntilForgotten ?? forgettingWindow);

  if (forceProgressReset) {
    fadeLevel = 0 as FadeLevel;
    progress = 0;
    daysUntilForgotten =
      resolvedImportance === "high" ? MAX_FORGET_WINDOW : forgettingWindow;
  } else {
    const baselineProgress = computeBaselineProgress(
      { ...note, importance: resolvedImportance },
      importanceScore,
      forgettingWindow
    );
    const mergedProgress = preserveProgress
      ? Math.max(progress, baselineProgress)
      : baselineProgress;

    if (accelerated) {
      progress = calculateAcceleratedProgress(
        resolvedImportance,
        mergedProgress,
        importanceScore
      );
    } else {
      progress = mergedProgress;
    }

    fadeLevel = calculateFadeLevelFromProgress(resolvedImportance, progress);

    if (resolvedImportance === "high" && !accelerated) {
      fadeLevel = Math.min(fadeLevel, 1) as FadeLevel;
      progress = 0;
      daysUntilForgotten = MAX_FORGET_WINDOW;
    } else {
      if (accelerated && resolvedImportance === "high") {
        fadeLevel = Math.min(fadeLevel, 2) as FadeLevel;
      }

      daysUntilForgotten = remainingDaysByStage(
        resolvedImportance,
        forgettingWindow,
        fadeLevel,
        progress
      );
    }
  }

  return {
    ...note,
    importance: resolvedImportance,
    fadeLevel,
    forgettingProgress: clamp(Math.round(progress), 0, 100),
    daysUntilForgotten,
    importanceScore,
    decayRate,
  };
};

const rehydrateNotes = (
  collection: NoteRecord[],
  options?: NoteDashboardOptions,
  preserveProgress = false
) =>
  collection.map((item) =>
    applyEvaluation(item, options, { preserveProgress })
  );

const toPersistPayload = (note: NoteRecord) => {
  const normalizeTimestamp = (value?: string) => {
    if (!value) {
      return null;
    }

    const parsed = Date.parse(value);
    if (!Number.isNaN(parsed)) {
      return new Date(parsed).toISOString();
    }

    return new Date().toISOString();
  };

  return {
    title: note.title,
    content: note.content,
    description: note.description ?? "",
    icon: note.icon,
    importance: note.importance,
    fadeLevel: note.fadeLevel,
    forgettingProgress: note.forgettingProgress,
    daysUntilForgotten: note.daysUntilForgotten ?? null,
    importanceScore: note.importanceScore ?? null,
    decayRate: note.decayRate ?? null,
    isCollapsed: note.isCollapsed,
    lastAccessed: normalizeTimestamp(note.lastAccessed),
    date: note.date,
    restoredAt: note.restoredAt ?? null,
    aiEvaluation: note.aiEvaluation ?? null,
    aiCompression: note.aiCompression ?? null,
  };
};

export const useNotesStore = defineStore("notes", () => {
  const notesApi = useNotesApi();
  const notes = ref<NoteRecord[]>([]);
  const isHydrated = ref(false);
  const initialized = ref(false);
  const dashboardOptions = ref<NoteDashboardOptions | undefined>(undefined);
  let isFetching = false;
  const notificationCenter = useNotificationCenter();

  const handleNotificationTransition = (
    previous: NoteRecord | null | undefined,
    next: NoteRecord | null | undefined
  ) => {
    if (!next) {
      return;
    }
    notificationCenter.handleNoteTransition(previous, next);
  };

  const loadFromServer = async (force = false) => {
    if ((isHydrated.value && !force) || isFetching) {
      return;
    }

    isFetching = true;

    try {
      const remoteNotes = await notesApi.list();
      console.info(
        "[notes] loadFromServer fetched",
        remoteNotes.length,
        "notes"
      );
      const normalized = remoteNotes.map((record) =>
        normalizeRecord({
          ...record,
          id:
            typeof record.id === "number"
              ? record.id
              : Number.parseInt(String(record.id), 10),
          lastAccessed: record.lastAccessed,
          createdAt: record.createdAt,
          updatedAt: record.updatedAt,
        })
      );

      notes.value = rehydrateNotes(normalized, dashboardOptions.value, true);
    } catch (error) {
      console.error("[notes] 远程加载笔记失败", error);
    } finally {
      isHydrated.value = true;
      isFetching = false;
    }
  };

  const ensureInitialized = async (
    initialNotes?: NoteRecord[],
    options?: NoteDashboardOptions
  ) => {
    if (options) {
      dashboardOptions.value = options;
    }

    if (!initialized.value && initialNotes?.length) {
      notes.value = rehydrateNotes(
        createInitialState(initialNotes),
        dashboardOptions.value
      );
    }

    initialized.value = true;
    await loadFromServer();
  };
  const refreshFromServer = async () => {
    await loadFromServer(true);
  };

  const noteStats = computed(() => ({
    total: notes.value.length,
    core: notes.value.filter((note) => note.importance === "high").length,
    fading: notes.value.filter(
      (note) => note.fadeLevel >= 2 && note.fadeLevel <= 3
    ).length,
    forgotten: notes.value.filter((note) => note.fadeLevel >= 4).length,
  }));

  const importanceCounts = computed(() => ({
    high: notes.value.filter((note) => note.importance === "high").length,
    medium: notes.value.filter((note) => note.importance === "medium").length,
    low: notes.value.filter((note) => note.importance === "low").length,
    noise: notes.value.filter((note) => note.importance === "noise").length,
  }));

  const sortedByRecency = computed(() =>
    notes.value
      .slice()
      .sort((a, b) => resolveNoteTimestamp(b) - resolveNoteTimestamp(a))
  );

  const sortedByImportance = computed(() =>
    notes.value.slice().sort((a, b) => {
      const importanceDelta =
        (importancePriority[a.importance] ?? 99) -
        (importancePriority[b.importance] ?? 99);
      if (importanceDelta !== 0) {
        return importanceDelta;
      }
      const scoreDelta = (b.importanceScore ?? 0) - (a.importanceScore ?? 0);
      if (scoreDelta !== 0) {
        return scoreDelta;
      }
      return (a.fadeLevel ?? 0) - (b.fadeLevel ?? 0);
    })
  );

  const getRecentNotes = (limit = 6) => sortedByRecency.value.slice(0, limit);

  const upsertNote = async (
    payload: NoteSavePayload,
    existing?: NoteRecord | null
  ) => {
    if (!payload.title || !payload.content) {
      return null;
    }

    if (existing) {
      const index = notes.value.findIndex((note) => note.id === existing.id);
      if (index === -1) {
        return null;
      }

      const previous = notes.value[index];

      const nextEvaluation =
        payload.aiEvaluation === undefined
          ? (previous.aiEvaluation ?? null)
          : payload.aiEvaluation;
      const nextCompression =
        payload.aiCompression === undefined
          ? (previous.aiCompression ?? null)
          : payload.aiCompression;

      const draft = {
        ...previous,
        title: payload.title,
        content: payload.content,
        description: payload.description ?? "",
        importance: payload.importance,
        lastAccessed: "刚刚",
        aiEvaluation: cloneEvaluation(nextEvaluation),
        aiCompression: cloneCompression(nextCompression),
      };

      const evaluated = applyEvaluation(draft, dashboardOptions.value, {
        forceProgressReset: true,
      });
      const persisted = await notesApi.update(
        Number(existing.id),
        toPersistPayload(evaluated)
      );
      const normalized = normalizeRecord({
        ...persisted,
        lastAccessed: persisted.lastAccessed,
        createdAt: persisted.createdAt,
        updatedAt: persisted.updatedAt,
      });
      const finalNote = applyEvaluation(normalized, dashboardOptions.value, {
        preserveProgress: true,
      });
      notes.value.splice(index, 1, finalNote);
      handleNotificationTransition(previous, finalNote);
      return finalNote;
    }

    const now = new Date();
    const base = normalizeRecord({
      title: payload.title,
      content: payload.content,
      description: payload.description ?? "",
      date: formatDateLabel(now),
      lastAccessed: now.toISOString(),
      icon: "📝",
      importance: payload.importance,
      fadeLevel: 0 as FadeLevel,
      forgettingProgress: 0,
      daysUntilForgotten: BASE_FORGET_WINDOW,
      isCollapsed: false,
      restoredAt: now.toISOString(),
      aiEvaluation: cloneEvaluation(payload.aiEvaluation ?? null),
      aiCompression: cloneCompression(payload.aiCompression ?? null),
    });

    const evaluated = applyEvaluation(base, dashboardOptions.value, {
      forceProgressReset: true,
    });
    const persisted = await notesApi.create(toPersistPayload(evaluated));
    const normalized = normalizeRecord({
      ...persisted,
      lastAccessed: persisted.lastAccessed,
      createdAt: persisted.createdAt,
      updatedAt: persisted.updatedAt,
    });
    const finalNote = applyEvaluation(normalized, dashboardOptions.value, {
      forceProgressReset: true,
    });
    notes.value = [finalNote, ...notes.value];
    return finalNote;
  };

  const restoreNote = async (target: NoteRecord) => {
    const index = notes.value.findIndex((item) => item.id === target.id);
    if (index === -1) {
      return;
    }

    const previous = notes.value[index];

    const draft = {
      ...previous,
      fadeLevel: 0 as FadeLevel,
      forgettingProgress: 0,
      isCollapsed: false,
      lastAccessed: "刚刚",
      restoredAt: new Date().toISOString(),
    };

    const evaluated = applyEvaluation(draft, dashboardOptions.value, {
      forceProgressReset: true,
    });
    const persisted = await notesApi.update(
      Number(target.id),
      toPersistPayload(evaluated)
    );
    const normalized = normalizeRecord({
      ...persisted,
      lastAccessed: persisted.lastAccessed,
      createdAt: persisted.createdAt,
      updatedAt: persisted.updatedAt,
    });
    const finalNote = applyEvaluation(normalized, dashboardOptions.value, {
      forceProgressReset: true,
    });
    notes.value.splice(index, 1, finalNote);
    notificationCenter.resetNoteDeliveryState(String(target.id));
    handleNotificationTransition(previous, finalNote);
  };

  const accelerateForgetting = async (target: NoteRecord) => {
    const index = notes.value.findIndex((item) => item.id === target.id);
    if (index === -1) {
      return;
    }

    const previous = notes.value[index];

    const draft = {
      ...previous,
      lastAccessed: "刚刚",
    };

    const accelerated = applyEvaluation(draft, dashboardOptions.value, {
      accelerated: true,
      preserveProgress: true,
    });
    const persisted = await notesApi.update(
      Number(target.id),
      toPersistPayload(accelerated)
    );
    const normalized = normalizeRecord({
      ...persisted,
      lastAccessed: persisted.lastAccessed,
      createdAt: persisted.createdAt,
      updatedAt: persisted.updatedAt,
    });
    const finalNote = applyEvaluation(normalized, dashboardOptions.value, {
      preserveProgress: true,
    });
    notes.value.splice(index, 1, finalNote);
    handleNotificationTransition(previous, finalNote);
  };

  const setNoteAIEvaluation = async (
    noteId: number,
    evaluation: NoteAIEvaluation | null
  ) => {
    const index = notes.value.findIndex((item) => item.id === noteId);
    if (index === -1) {
      return null;
    }

    const draft = {
      ...notes.value[index],
      aiEvaluation: cloneEvaluation(evaluation),
    };

    const persisted = await notesApi.update(noteId, toPersistPayload(draft));
    const normalized = normalizeRecord({
      ...persisted,
      lastAccessed: persisted.lastAccessed,
      createdAt: persisted.createdAt,
      updatedAt: persisted.updatedAt,
    });
    const finalNote = applyEvaluation(normalized, dashboardOptions.value, {
      preserveProgress: true,
    });
    notes.value.splice(index, 1, finalNote);
    return finalNote;
  };

  const setNoteAICompression = async (
    noteId: number,
    compression: NoteAICompression | null
  ) => {
    const index = notes.value.findIndex((item) => item.id === noteId);
    if (index === -1) {
      return null;
    }

    const draft = {
      ...notes.value[index],
      aiCompression: cloneCompression(compression),
    };

    const persisted = await notesApi.update(noteId, toPersistPayload(draft));
    const normalized = normalizeRecord({
      ...persisted,
      lastAccessed: persisted.lastAccessed,
      createdAt: persisted.createdAt,
      updatedAt: persisted.updatedAt,
    });
    const finalNote = applyEvaluation(normalized, dashboardOptions.value, {
      preserveProgress: true,
    });
    notes.value.splice(index, 1, finalNote);
    return finalNote;
  };

  const directForget = async (target: NoteRecord) => {
    const index = notes.value.findIndex((item) => item.id === target.id);
    if (index === -1) {
      return;
    }

    const current = notes.value[index];
    const evaluation = computeEvaluation(current, dashboardOptions.value);

    const draft: NoteRecord = {
      ...current,
      fadeLevel: 4 as FadeLevel,
      forgettingProgress: 100,
      daysUntilForgotten: 0,
      isCollapsed: true,
      lastAccessed: "刚刚",
      importanceScore: evaluation.importanceScore,
      decayRate: evaluation.decayRate,
      description: current.description,
    };

    const persisted = await notesApi.update(
      Number(target.id),
      toPersistPayload(draft)
    );
    const normalized = normalizeRecord({
      ...persisted,
      lastAccessed: persisted.lastAccessed,
      createdAt: persisted.createdAt,
      updatedAt: persisted.updatedAt,
    });
    const finalNote = applyEvaluation(normalized, dashboardOptions.value, {
      preserveProgress: true,
    });
    notes.value.splice(index, 1, finalNote);
    handleNotificationTransition(current, finalNote);
  };

  const purgeNote = async (target: NoteRecord) => {
    const index = notes.value.findIndex((item) => item.id === target.id);
    if (index === -1) {
      return null;
    }

    await notesApi.remove(Number(target.id));
    const [removed] = notes.value.splice(index, 1);
    notificationCenter.resetNoteDeliveryState(String(removed.id));
    return removed;
  };

  const resetState = () => {
    notes.value = [];
    isHydrated.value = false;
    initialized.value = false;
    dashboardOptions.value = undefined;
    isFetching = false;
  };

  return {
    notes,
    isHydrated,
    noteStats,
    importanceCounts,
    sortedByRecency,
    sortedByImportance,
    ensureInitialized,
    refreshFromServer,
    getRecentNotes,
    upsertNote,
    restoreNote,
    accelerateForgetting,
    setNoteAIEvaluation,
    setNoteAICompression,
    directForget,
    purgeNote,
    resetState,
  };
});

if (import.meta.hot) {
  import.meta.hot.accept(acceptHMRUpdate(useNotesStore, import.meta.hot));
}
