const samples = [
  { raw: "{\"id\":\"abc\",\"choices\":[{\"index\":0,\"delta\":{\"role\":\"assistant\",\"reasoning_content\":\"推理\"}}]}" },
  { raw: "{\"id\":\"abc\",\"choices\":[{\"index\":0,\"delta\":{\"role\":\"assistant\",\"content\":\"答复\"}}]}" },
  { raw: "{\"id\":\"abc\",\"choices\":[{\"index\":0,\"finish_reason\":\"stop\",\"delta\":{\"role\":\"assistant\",\"content\":\"\"}}]}" }
];

const extractTextSegments = (source) => {
  if (!source) return '';
  if (typeof source === 'string') return source;
  if (Array.isArray(source)) return source.map(extractTextSegments).join('');
  if (typeof source === 'object') {
    if (typeof source.text === 'string') return source.text;
    if (typeof source.content === 'string') return source.content;
    if (typeof source.value === 'string') return source.value;
    if (Array.isArray(source.content)) return extractTextSegments(source.content);
    if (typeof source.reasoning_content === 'string') return source.reasoning_content;
  }
  return '';
};

const normalize = (raw) => {
  const parsed = JSON.parse(raw);
  const core = parsed;
  const choices = Array.isArray(core.choices) ? core.choices : [];
  const choice = choices[0];
  const delta = choice?.delta ?? core.delta ?? {};
  const text =
    extractTextSegments(delta?.content) ||
    extractTextSegments(choice?.message?.content) ||
    extractTextSegments(core.content) ||
    extractTextSegments(delta?.reasoning_content) ||
    (typeof core.answer === 'string' ? core.answer : '');
  const finishReason = choice?.finish_reason ?? core.finish_reason ?? null;
  const doneCandidate = core.done ?? delta?.done;
  const hasStopEvent = false;
  const isDone = Boolean((doneCandidate ?? false) || finishReason != null || hasStopEvent);
  return { text, done: isDone, finishReason };
};

let aggregated = '';
for (const { raw } of samples) {
  const res = normalize(raw);
  if (res.text) {
    aggregated += res.text;
  }
  if (res.done) {
    console.log('done', res.finishReason, aggregated);
  }
}
