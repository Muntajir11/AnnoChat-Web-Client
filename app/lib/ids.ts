let n = 0;

export function nextMsgId(prefix: string) {
  n += 1;
  return `${prefix}-${Date.now()}-${n}`;
}
