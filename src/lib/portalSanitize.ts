const INTERNAL_START = /^(?:Source:|Gap:|Flag:|Facilitator notes\b|Handout:)/i;
const INTERNAL_SENTENCE = /\b(?:Chief|Counsel)\b|\bfor Voice\b|\bVoice (?:pass|writes)\b/;

export function portalDisplayName(text: string): string {
  return text.replace(/Scoots's/g, "Mathew's").replace(/Scoots/g, 'Mathew');
}

function cleanText(text: string): string {
  // Keep link destinations unchanged while cleaning only their visible labels.
  const destinations: string[] = [];
  const protectedText = text.replace(/\]\(([^\n]*?)\)/g, (_, href: string) => {
    destinations.push(href);
    return `](\u0000${destinations.length - 1}\u0000)`;
  });
  const sentences = protectedText.split(/(?<=[.!?])(?=\s)/);
  const fileReference = /^(?:[A-Za-z0-9_-]{20,}|(?:\/|\.{1,2}\/|[A-Za-z]:\\)[^\n]*|(?!(?:https?:\/\/|[\w.-]+\.[A-Za-z]{2,}\/))[^\s]*[/\\][^\n]*)$/;
  const cleaned = sentences.filter((sentence) => !INTERNAL_SENTENCE.test(sentence)).join('')
    .replace(/((?:(?:Google\s+)?Drive(?:\s+(?:file|doc|deck|id))?|file id)\s*)?`([^`\n]+)`/gi,
      (span, _label: string | undefined, value: string) => fileReference.test(value) ? '' : span)
    .replace(/\b[A-Za-z0-9_-]{25,}\b/g, '')
    .replace(/\bcontracts?\b/gi, (word) => word[0] === word[0].toUpperCase() ? 'Paperwork' : 'paperwork')
    .replace(/\u2014/g, ',');
  return portalDisplayName(cleaned).replace(/\]\(\u0000(\d+)\u0000\)/g, (_, index: string) => `](${destinations[Number(index)]})`);
}

export function sanitizePortalDoc(source: string): string {
  const lines = source.replace(/\r/g, '').split('\n');
  const output: string[] = [];
  let firstParagraph = true;
  let inFence = false;
  let i = 0;
  const structural = (line: string) => /^\s*(?:#{1,6}\s|>|```|\||[-*]\s|\d+\.\s|(?:-{3,}|\*{3,})\s*$)/.test(line);

  while (i < lines.length) {
    const line = lines[i];
    if (/^\s*```/.test(line)) {
      inFence = !inFence;
      output.push(line);
      i++;
      continue;
    }
    if (!line.trim() || /^\s*(?:#{1,6}\s|(?:-{3,}|\*{3,})\s*$)/.test(line)) {
      output.push(cleanText(line));
      i++;
      continue;
    }
    if (line.trim().startsWith('|')) {
      output.push(line.split('|').map((cell) => cleanText(cell)).join('|'));
      i++;
      continue;
    }
    const prefix = line.match(/^\s*(?:>\s*)?(?:[-*]\s+|\d+\.\s+)?/)?.[0] ?? '';
    const block = [line.slice(prefix.length)];
    i++;
    if (!inFence) {
      while (i < lines.length && lines[i].trim() && !structural(lines[i])) block.push(lines[i++]);
    }
    const text = block.join('\n');
    const paragraph = !inFence && !/^\s*(?:>|[-*]\s|\d+\.\s)/.test(line);
    const firstNotice = paragraph && firstParagraph && /^(?:DRAFT|Public-safe)\b/i.test(text);
    if (paragraph) firstParagraph = false;
    if (firstNotice || INTERNAL_START.test(text.replace(/^\*\*|^`/, '')) || text.includes('/workspace/')) continue;
    const cleaned = cleanText(text);
    if (cleaned.trim()) output.push(prefix + cleaned);
  }
  return output.join('\n');
}