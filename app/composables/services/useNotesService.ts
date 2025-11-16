import type { RowDataPacket } from "mysql2";
import { createError, type H3Event } from "h3";
import { useRuntimeConfig } from "#imports";
import { getCookie } from "h3";
import { ensureAuthSchema, useMysql } from "~~/server/utils/db";
import type {
  NoteAIEvaluation,
  NoteAICompression,
} from "~/composables/note/types";
import { useAuthService } from "./useAuthService";

export interface NoteRow extends RowDataPacket {
  id: number;
  user_id: string;
  title: string;
  content: string;
  description: string | null;
  icon: string | null;
  importance: "high" | "medium" | "low" | "noise";
  fade_level: number;
  forgetting_progress: number;
  days_until_forgotten: number | null;
  importance_score: number | null;
  decay_rate: number | null;
  is_collapsed: number;
  last_accessed_at: Date | null;
  restored_at: Date | null;
  date_label: string | null;
  created_at: Date;
  updated_at: Date;
  ai_evaluation: string | null;
  ai_compression: string | null;
}

export interface PersistedNote {
  id: number;
  userId: string;
  title: string;
  content: string;
  description?: string;
  icon?: string;
  importance: "high" | "medium" | "low" | "noise";
  fadeLevel: number;
  forgettingProgress: number;
  daysUntilForgotten?: number;
  importanceScore?: number;
  decayRate?: number;
  isCollapsed: boolean;
  lastAccessed: string;
  date: string;
  restoredAt: string | null;
  createdAt: string;
  updatedAt: string;
  aiEvaluation?: NoteAIEvaluation | null;
  aiCompression?: NoteAICompression | null;
}

export interface NotePersistPayload {
  title: string;
  content: string;
  description?: string;
  icon?: string;
  importance: "high" | "medium" | "low" | "noise";
  fadeLevel: number;
  forgettingProgress: number;
  daysUntilForgotten?: number | null;
  importanceScore?: number | null;
  decayRate?: number | null;
  isCollapsed?: boolean;
  lastAccessed?: string | null;
  date?: string | null;
  restoredAt?: string | null;
  aiEvaluation?: NoteAIEvaluation | null;
  aiCompression?: NoteAICompression | null;
}

const formatDateLabel = (input: Date | null) => {
  if (!input) {
    return "";
  }

  return input.toLocaleDateString("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
};

const parseJsonColumn = <T>(value: unknown): T | undefined => {
  if (value === null || value === undefined) {
    return undefined;
  }

  try {
    if (typeof value === "string") {
      return JSON.parse(value) as T;
    }

    if (value instanceof Buffer) {
      return JSON.parse(value.toString("utf-8")) as T;
    }

    if (typeof value === "object") {
      return value as T;
    }
  } catch (error) {
    console.warn("[notes] Failed to parse JSON column", error);
  }

  return undefined;
};

const mapRowToNote = (row: NoteRow): PersistedNote => {
  const createdAt = row.created_at;
  const lastAccessedDate =
    row.last_accessed_at ?? row.updated_at ?? row.created_at;

  return {
    id: row.id,
    userId: row.user_id,
    title: row.title,
    content: row.content,
    description: row.description ?? undefined,
    icon: row.icon ?? undefined,
    importance: row.importance,
    fadeLevel: row.fade_level,
    forgettingProgress: row.forgetting_progress,
    daysUntilForgotten: row.days_until_forgotten ?? undefined,
    importanceScore: row.importance_score ?? undefined,
    decayRate: row.decay_rate ?? undefined,
    isCollapsed: !!row.is_collapsed,
    lastAccessed: (lastAccessedDate ?? createdAt).toISOString(),
    restoredAt: row.restored_at ? row.restored_at.toISOString() : null,
    date: row.date_label ?? formatDateLabel(createdAt),
    createdAt: createdAt.toISOString(),
    updatedAt: row.updated_at.toISOString(),
    aiEvaluation: parseJsonColumn<NoteAIEvaluation>(row.ai_evaluation) ?? null,
    aiCompression:
      parseJsonColumn<NoteAICompression>(row.ai_compression) ?? null,
  };
};

const resolveUserSession = async (event: H3Event) => {
  const config = useRuntimeConfig();
  const token = getCookie(event, config.session.cookieName) ?? null;
  const authService = await useAuthService();
  const session = await authService.findSession(token);

  if (!session) {
    throw createError({ statusCode: 401, statusMessage: "未登录或会话已过期" });
  }

  return session;
};

export const useNotesService = async (event: H3Event) => {
  await ensureAuthSchema();
  const session = await resolveUserSession(event);
  const db = useMysql();

  const list = async () => {
    const [rows] = await db.execute<NoteRow[]>(
      "SELECT * FROM notes WHERE user_id = ? ORDER BY created_at DESC",
      [session.user.id]
    );

    return rows.map(mapRowToNote);
  };

  const create = async (payload: NotePersistPayload) => {
    const now = new Date();
    const lastAccessed = payload.lastAccessed
      ? new Date(payload.lastAccessed)
      : now;
    const [result] = await db.execute(
      `INSERT INTO notes (
        user_id, title, content, description, icon, importance, fade_level,
        forgetting_progress, days_until_forgotten, importance_score, decay_rate,
        ai_evaluation, ai_compression, is_collapsed, last_accessed_at, restored_at, date_label
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        session.user.id,
        payload.title,
        payload.content,
        payload.description ?? null,
        payload.icon ?? null,
        payload.importance,
        payload.fadeLevel,
        payload.forgettingProgress,
        payload.daysUntilForgotten ?? null,
        payload.importanceScore ?? null,
        payload.decayRate ?? null,
        payload.aiEvaluation ? JSON.stringify(payload.aiEvaluation) : null,
        payload.aiCompression ? JSON.stringify(payload.aiCompression) : null,
        payload.isCollapsed ? 1 : 0,
        lastAccessed,
        payload.restoredAt ? new Date(payload.restoredAt) : lastAccessed,
        payload.date ?? formatDateLabel(now),
      ]
    );

    const insertId = (result as { insertId: number }).insertId;
    const [rows] = await db.execute<NoteRow[]>(
      "SELECT * FROM notes WHERE id = ? AND user_id = ? LIMIT 1",
      [insertId, session.user.id]
    );

    if (!rows.length) {
      throw createError({ statusCode: 500, statusMessage: "创建笔记失败" });
    }

    return mapRowToNote(rows[0]);
  };

  const update = async (noteId: number, payload: NotePersistPayload) => {
    const lastAccessed = payload.lastAccessed
      ? new Date(payload.lastAccessed)
      : null;
    const [result] = await db.execute(
      `UPDATE notes
         SET title = ?, content = ?, description = ?, icon = ?, importance = ?,
           fade_level = ?, forgetting_progress = ?, days_until_forgotten = ?,
           importance_score = ?, decay_rate = ?, ai_evaluation = ?, ai_compression = ?, is_collapsed = ?,
           last_accessed_at = COALESCE(?, last_accessed_at),
           restored_at = COALESCE(?, restored_at),
           date_label = COALESCE(?, date_label)
         WHERE id = ? AND user_id = ?`,
      [
        payload.title,
        payload.content,
        payload.description ?? null,
        payload.icon ?? null,
        payload.importance,
        payload.fadeLevel,
        payload.forgettingProgress,
        payload.daysUntilForgotten ?? null,
        payload.importanceScore ?? null,
        payload.decayRate ?? null,
        payload.aiEvaluation ? JSON.stringify(payload.aiEvaluation) : null,
        payload.aiCompression ? JSON.stringify(payload.aiCompression) : null,
        payload.isCollapsed ? 1 : 0,
        lastAccessed,
        payload.restoredAt ? new Date(payload.restoredAt) : null,
        payload.date ?? null,
        noteId,
        session.user.id,
      ]
    );

    if ((result as { affectedRows: number }).affectedRows === 0) {
      throw createError({ statusCode: 404, statusMessage: "笔记不存在" });
    }

    const [rows] = await db.execute<NoteRow[]>(
      "SELECT * FROM notes WHERE id = ? AND user_id = ? LIMIT 1",
      [noteId, session.user.id]
    );

    if (!rows.length) {
      throw createError({ statusCode: 404, statusMessage: "笔记不存在" });
    }

    return mapRowToNote(rows[0]);
  };

  const remove = async (noteId: number) => {
    const [result] = await db.execute(
      "DELETE FROM notes WHERE id = ? AND user_id = ? LIMIT 1",
      [noteId, session.user.id]
    );

    if ((result as { affectedRows: number }).affectedRows === 0) {
      throw createError({ statusCode: 404, statusMessage: "笔记不存在" });
    }
  };

  return {
    session,
    list,
    create,
    update,
    remove,
  };
};
