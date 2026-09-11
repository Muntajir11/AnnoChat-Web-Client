const DEFAULTS = [
  'onlyfans',
  'child porn',
  'preteen',
  'meet me at',
  'wire me',
];

export function filterText(text: string, enabled = true) {
  if (!enabled) return text;
  let out = text;
  for (const word of DEFAULTS) {
    const re = new RegExp(word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'ig');
    out = out.replace(re, '***');
  }
  return out;
}
