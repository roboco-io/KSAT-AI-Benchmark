import katex from 'katex';

const delimiters = [
  { left: '$$', right: '$$', display: true },
  { left: '\\[', right: '\\]', display: true },
  { left: '\\(', right: '\\)', display: false },
  { left: '$', right: '$', display: false },
];

function closingIndex(text, start, right) {
  let depth = 0;
  for (let i = start; i < text.length; i++) {
    if (depth === 0 && text.startsWith(right, i)) return i;
    if (text[i] === '\\') i++;
    else if (text[i] === '{') depth++;
    else if (text[i] === '}') depth = Math.max(0, depth - 1);
  }
  return -1;
}

/** Parse only explicit math; keep the stored explanation and all plain text intact. */
export function renderMathSegments(text, autoWrapMath = false) {
  if (autoWrapMath && !delimiters.some(({ left }) => text.includes(left)) && /\\[a-zA-Z]+|\^|_|\\\{/.test(text)) {
    const wrapped = renderMathSegments(`$${text}$`);
    return wrapped[0]?.type === 'math' ? wrapped : [{ type: 'text', text }];
  }
  const segments = [];
  let textStart = 0;
  for (let i = 0; i < text.length; i++) {
    const delimiter = delimiters.find(({ left }) => text.startsWith(left, i));
    if (!delimiter) {
      // An escaped opening delimiter belongs to the surrounding prose.
      if (text[i] === '\\') i++;
      continue;
    }
    const end = closingIndex(text, i + delimiter.left.length, delimiter.right);
    if (end === -1) break;
    const next = end + delimiter.right.length;
    try {
      const html = katex.renderToString(text.slice(i + delimiter.left.length, end), {
        displayMode: delimiter.display,
        output: 'htmlAndMathml',
        throwOnError: true,
        trust: false,
        strict: 'ignore',
        maxExpand: 1000,
        maxSize: 20,
      });
      if (i > textStart) segments.push({ type: 'text', text: text.slice(textStart, i) });
      segments.push({ type: 'math', html, display: delimiter.display });
      textStart = next;
    } catch {
      // Leave malformed/unsupported commands in the original text segment.
    }
    i = next - 1;
  }
  if (textStart < text.length || segments.length === 0) {
    segments.push({ type: 'text', text: text.slice(textStart) });
  }
  return segments;
}
