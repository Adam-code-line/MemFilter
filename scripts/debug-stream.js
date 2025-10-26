const apiKey = process.env.AI_API_KEY || 'e128af75aa474f1a8ccace9d3bf038f3.omXS4KHZhMvIsTRV';

const response = await fetch('https://open.bigmodel.cn/api/paas/v4/chat/completions', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${apiKey}`
  },
  body: JSON.stringify({
    model: 'glm-4.5-flash',
    stream: true,
    messages: [
      { role: 'user', content: '请用一句话介绍一下MemFilter项目。' }
    ]
  })
});

console.log('status', response.status);

if (!response.body) {
  console.error('No body received');
  process.exit(1);
}

const extractTextSegments = (source) => {
  if (!source) {
    return '';
  }
  if (typeof source === 'string') {
    return source;
  }
  if (Array.isArray(source)) {
    return source.map(extractTextSegments).join('');
  }
  if (typeof source === 'object') {
    if (typeof source.text === 'string') {
      return source.text;
    }
    if (typeof source.content === 'string') {
      return source.content;
    }
    if (typeof source.value === 'string') {
      return source.value;
    }
    if (typeof source.reasoning_content === 'string') {
      return source.reasoning_content;
    }
    if (Array.isArray(source.content)) {
      return extractTextSegments(source.content);
    }
  }
  return '';
};

const normalize = (raw) => {
  if (!raw || raw === '[DONE]') {
    return { done: true };
  }

  const parsed = JSON.parse(raw);
  const choices = Array.isArray(parsed.choices) ? parsed.choices : [];
  const choice = choices[0];
  const delta = choice?.delta ?? parsed.delta ?? {};
  const text =
    extractTextSegments(delta?.content) ||
    extractTextSegments(choice?.message?.content) ||
    extractTextSegments(parsed.content) ||
    extractTextSegments(delta?.reasoning_content) ||
    (typeof parsed.answer === 'string' ? parsed.answer : '');
  const finishReason = choice?.finish_reason ?? parsed.finish_reason ?? null;
  const doneCandidate = parsed.done ?? delta?.done;
  const isDone = Boolean((doneCandidate ?? false) || finishReason != null);
  return {
    id: parsed.id ?? null,
    delta: text,
    done: isDone,
    finishReason
  };
};

const reader = response.body.getReader();
const decoder = new TextDecoder();
let idx = 0;
let aggregated = '';

while (true) {
  const { value, done } = await reader.read();
  if (done) {
    break;
  }

  const chunk = decoder.decode(value, { stream: true });
  console.log('raw chunk', ++idx, chunk);
  for (const line of chunk.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed.startsWith('data:')) {
      continue;
    }
    const payload = trimmed.slice(5).trim();
    const normalized = normalize(payload);
    if (normalized.delta) {
      aggregated += normalized.delta;
    }
    if (normalized.done) {
      console.log('--- DONE ---', normalized.finishReason, aggregated);
    }
  }
}
