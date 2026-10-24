export type MathSegment = { type: 'text'; text: string } | { type: 'math'; html: string; display: boolean };
export function renderMathSegments(text: string, autoWrapMath?: boolean): MathSegment[];
