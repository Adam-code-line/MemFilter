import { nanoid } from "nanoid";
import type {
  AIChatMessage,
  SendAIChatPayload,
} from "~/composables/chat/types";
import { useAIChatStreamController } from "~/composables/chat/useAIChatStreamController";

interface UseAIChatOptions {
  systemPrompt?: string;
  defaultModel?: string;
  apiPath?: string;
  temperature?: number;
}

interface StreamEventState {
  id?: string | null;
  delta?: string;
  content?: string;
  done?: boolean;
  finishReason?: string | null;
  error?: string;
  message?: string;
}

type JsonValue = string | number | boolean | null | JsonArray | JsonObject;
type JsonArray = JsonValue[];
interface JsonObject {
  [key: string]: JsonValue;
}

const isJsonObject = (value: unknown): value is JsonObject =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const getString = (value: JsonValue | undefined): string | undefined =>
  typeof value === "string" ? value : undefined;

const getBoolean = (value: JsonValue | undefined): boolean | undefined =>
  typeof value === "boolean" ? value : undefined;

const extractSseEvents = (buffer: string) => {
  const events: string[] = [];
  let remaining = buffer;

  while (true) {
    const boundary = remaining.indexOf("\n\n");
    if (boundary === -1) {
      break;
    }

    const chunk = remaining.slice(0, boundary);
    remaining = remaining.slice(boundary + 2);

    const dataLines = chunk
      .split(/\r?\n/)
      .filter((line) => line.startsWith("data:"));

    if (!dataLines.length) {
      continue;
    }

    const payload = dataLines.map((line) => line.slice(5).trim()).join("\n");

    if (payload.length) {
      events.push(payload);
    }
  }

  return { events, buffer: remaining };
};

const unwrapStreamPayload = (
  raw: JsonObject
): { core: JsonObject; eventType: string | null } => {
  let eventType: string | null =
    typeof raw?.event === "string" ? raw.event.toLowerCase() : null;
  let core: JsonObject = raw;

  const visit = (node: unknown): boolean => {
    if (Array.isArray(node)) {
      return node.some(visit);
    }

    if (!isJsonObject(node)) {
      return false;
    }

    const candidate = node;

    if (typeof candidate.event === "string" && !eventType) {
      eventType = candidate.event.toLowerCase();
    }

    if (
      candidate.choices ||
      candidate.delta ||
      candidate.content ||
      candidate.answer
    ) {
      core = candidate;
      return true;
    }

    if (candidate.data !== undefined && visit(candidate.data)) {
      return true;
    }

    if (candidate.result !== undefined && visit(candidate.result)) {
      return true;
    }

    if (candidate.message !== undefined && visit(candidate.message)) {
      return true;
    }

    return false;
  };

  visit(raw);

  return { core, eventType };
};

const extractTextSegments = (source: unknown): string => {
  if (!source) {
    return "";
  }
  if (typeof source === "string") {
    return source;
  }
  if (Array.isArray(source)) {
    return source.map((item) => extractTextSegments(item)).join("");
  }
  if (isJsonObject(source)) {
    const text = getString(source.text);
    if (text) {
      return text;
    }
    const content = source.content;
    const contentString = getString(content);
    if (contentString) {
      return contentString;
    }
    const valueString = getString(source.value);
    if (valueString) {
      return valueString;
    }
    if (Array.isArray(content)) {
      return extractTextSegments(content);
    }
  }
  return "";
};

const normalizeStreamDelta = (raw: string): StreamEventState | null => {
  if (!raw || raw === "[DONE]") {
    return { done: true };
  }

  try {
    const parsedValue = JSON.parse(raw) as unknown;

    if (!isJsonObject(parsedValue)) {
      return null;
    }

    const parsed = parsedValue;
    const parsedError = getString(parsed.error);
    const parsedCode = getString(parsed.code);

    if (parsedError || parsedCode) {
      return {
        error: parsedError ?? parsedCode ?? "upstream_error",
        message:
          getString(parsed.message) ??
          getString(parsed.msg) ??
          "AI provider returned an error.",
      };
    }

    const { core, eventType } = unwrapStreamPayload(parsed);

    const coreError = getString(core.error);
    const coreCode = getString(core.code);

    if (coreError || coreCode) {
      return {
        error: coreError ?? coreCode ?? "upstream_error",
        message:
          getString(core.message) ??
          getString(core.msg) ??
          "AI provider returned an error.",
      };
    }

    const choicesValue = core.choices;
    const choices = Array.isArray(choicesValue) ? choicesValue : [];
    const choice =
      choices.length > 0 && isJsonObject(choices[0]) ? choices[0] : null;

    const deltaSource = (choice ? choice.delta : undefined) ?? core.delta;
    const deltaText = extractTextSegments(deltaSource);

    const choiceMessage = choice?.message;
    const choiceContent = isJsonObject(choiceMessage)
      ? (choiceMessage.content ?? choiceMessage)
      : choiceMessage;
    const messageText =
      extractTextSegments(choiceContent) ||
      extractTextSegments(core.content) ||
      extractTextSegments(core.answer);

    const finishReason =
      getString(choice?.finish_reason) ?? getString(core.finish_reason) ?? null;
    const deltaObject = isJsonObject(deltaSource) ? deltaSource : null;
    const doneCandidate =
      getBoolean(core.done) ??
      (deltaObject ? getBoolean(deltaObject.done) : undefined);
    const hasStopEvent = eventType
      ? ["stop", "end", "finish"].includes(eventType)
      : false;
    const isDone = Boolean(
      (doneCandidate ?? false) || finishReason != null || hasStopEvent
    );

    const coreIdValue = core.id;
    const parsedIdValue = parsed.id;
    const resolvedId =
      typeof coreIdValue === "string"
        ? coreIdValue
        : typeof coreIdValue === "number"
          ? String(coreIdValue)
          : typeof parsedIdValue === "string"
            ? parsedIdValue
            : typeof parsedIdValue === "number"
              ? String(parsedIdValue)
              : null;

    return {
      id: resolvedId,
      delta: deltaText.length ? deltaText : undefined,
      done: isDone,
      finishReason,
      content: messageText || undefined,
    };
  } catch (error) {
    console.warn("[useAIChat] 无法解析 AI 流式片段", error, raw);
    return null;
  }
};

export const useAIChat = (options: UseAIChatOptions = {}) => {
  const {
    systemPrompt,
    defaultModel = "glm-4.5",
    apiPath = "/api/chat/complete",
    temperature = 0.6,
  } = options;

  const streamController = useAIChatStreamController();

  const createSystemMessage = (): AIChatMessage | null => {
    if (!systemPrompt) {
      return null;
    }
    return {
      id: nanoid(),
      role: "system",
      content: systemPrompt,
      createdAt: new Date().toISOString(),
      status: "complete",
    };
  };

  const buildInitialMessages = () => {
    const systemMessage = createSystemMessage();
    return systemMessage ? [systemMessage] : [];
  };

  const input = ref("");
  const activeModel = ref<string | null>(defaultModel);
  const messages = ref<AIChatMessage[]>(buildInitialMessages());
  const isWaiting = ref(false);
  const errorMessage = ref<string | null>(null);

  const trimmedInput = computed(() => input.value.trim());

  const formattedPayload = computed<SendAIChatPayload>(() => ({
    messages: messages.value
      .filter(
        (message) =>
          message.role !== "assistant" || message.content.trim().length
      )
      .map(({ id: _id, streamingContent: _streaming, ...entry }) => entry),
    model: activeModel.value ?? undefined,
    temperature,
  }));

  const appendMessage = (message: AIChatMessage) => {
    messages.value = [...messages.value, message];
  };

  const updateMessage = (id: string, patch: Partial<AIChatMessage>) => {
    messages.value = messages.value.map((message) =>
      message.id === id ? { ...message, ...patch } : message
    );
  };

  const replaceMessages = (nextMessages: AIChatMessage[]) => {
    messages.value = nextMessages.map((entry) => ({ ...entry }));
  };

  const getInitialMessages = () =>
    buildInitialMessages().map((entry) => ({ ...entry }));

  const streamCompletion = async (
    payload: SendAIChatPayload,
    placeholderId: string,
    signal?: AbortSignal
  ) => {
    const response = await fetch(apiPath, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
      signal,
    });

    if (!response.ok) {
      const text = await response.text().catch(() => "");
      throw new Error(text || "AI 服务请求失败");
    }

    if (!response.body) {
      throw new Error("AI 流式输出不可用");
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder("utf-8");
    let buffer = "";
    let aggregated = "";
    let responseId: string | null = null;
    let finishReason: string | null = null;
    let latestContent: string | null = null;

    while (true) {
      const { value, done } = await reader.read();
      if (done) {
        break;
      }

      if (signal?.aborted) {
        throw new DOMException("Aborted", "AbortError");
      }

      buffer += decoder.decode(value, { stream: true });
      const { events, buffer: rest } = extractSseEvents(buffer);
      buffer = rest;

      for (const event of events) {
        const normalized = normalizeStreamDelta(event);
        if (!normalized) {
          continue;
        }

        if (normalized.error) {
          throw new Error(normalized.message ?? "AI provider error");
        }

        if (normalized.id) {
          responseId = normalized.id;
        }

        let nextSnapshot: string | null = null;

        if (typeof normalized.delta === "string" && normalized.delta.length) {
          aggregated += normalized.delta;
          nextSnapshot = aggregated;
        }

        if (
          typeof normalized.content === "string" &&
          normalized.content.length
        ) {
          latestContent = normalized.content;
          if (
            !nextSnapshot ||
            normalized.content.length >= nextSnapshot.length
          ) {
            aggregated = normalized.content;
            nextSnapshot = normalized.content;
          }
        }

        if (normalized.done) {
          finishReason = normalized.finishReason ?? finishReason;
        }

        if (nextSnapshot && nextSnapshot.length) {
          updateMessage(placeholderId, {
            content: nextSnapshot,
            streamingContent: normalized.done ? null : nextSnapshot,
            status: normalized.done ? "complete" : "streaming",
          });
        }

        if (
          normalized.done &&
          !nextSnapshot &&
          latestContent &&
          latestContent.length
        ) {
          aggregated = latestContent;
          updateMessage(placeholderId, {
            content: latestContent,
            streamingContent: null,
            status: "complete",
          });
        }
      }
    }

    if (!aggregated.length && latestContent) {
      aggregated = latestContent;
      updateMessage(placeholderId, {
        content: latestContent,
        streamingContent: null,
        status: "complete",
      });
    }

    return {
      id: responseId,
      content: aggregated,
      finishReason,
    };
  };

  const sendMessage = async () => {
    if (!trimmedInput.value || isWaiting.value) {
      return;
    }

    errorMessage.value = null;

    const history = formattedPayload.value.messages.slice();

    const userMessage: AIChatMessage = {
      id: nanoid(),
      role: "user",
      content: trimmedInput.value,
      createdAt: new Date().toISOString(),
      status: "complete",
    };

    appendMessage(userMessage);
    input.value = "";

    const placeholderId = nanoid();
    appendMessage({
      id: placeholderId,
      role: "assistant",
      content: "",
      streamingContent: "",
      createdAt: new Date().toISOString(),
      status: "streaming",
    });

    isWaiting.value = true;

    const controller = streamController.begin();

    try {
      const payload: SendAIChatPayload = {
        ...formattedPayload.value,
        messages: [...history, { role: "user", content: userMessage.content }],
      };

      const { id: responseId, content } = await streamCompletion(
        payload,
        placeholderId,
        controller.signal
      );

      updateMessage(placeholderId, {
        id: responseId ?? placeholderId,
        content,
        streamingContent: null,
        status: "complete",
        createdAt: new Date().toISOString(),
      });
    } catch (error) {
      const err = error as Error;
      if (err.name === "AbortError") {
        updateMessage(placeholderId, {
          status: "complete",
          streamingContent: null,
          createdAt: new Date().toISOString(),
        });
      } else {
        console.error("[useAIChat] 请求失败", error);
        errorMessage.value = err.message ?? "AI 服务暂时不可用";
        updateMessage(placeholderId, {
          status: "error",
          streamingContent: null,
          content: "请求失败，请稍后再试。",
        });
      }
    } finally {
      streamController.clear();
      isWaiting.value = false;
    }
  };

  const stopGenerating = () => {
    if (!isWaiting.value) {
      return;
    }
    streamController.abort();
  };

  const resetConversation = () => {
    messages.value = buildInitialMessages();
    input.value = "";
  };

  return {
    input,
    messages,
    isWaiting,
    activeModel,
    errorMessage,
    formattedPayload,
    appendMessage,
    updateMessage,
    replaceMessages,
    getInitialMessages,
    sendMessage,
    resetConversation,
    stopGenerating,
  };
};
