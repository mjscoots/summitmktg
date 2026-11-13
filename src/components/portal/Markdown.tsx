import { ReactNode } from 'react';

function inline(text: string, key: string): ReactNode[] {
  const parts = text.split(/(\*\*[^*]+\*\*|`[^`]+`)/g);
  return parts.map((p, i) => {
    if (p.startsWith('**') && p.endsWith('**') && p.length > 4) return <strong key={key + i}>{p.slice(2, -2)}</strong>;
    if (p.startsWith('`') && p.endsWith('`') && p.length > 2) return <code key={key + i} className="rounded bg-muted px-1 text-[0.9em]">{p.slice(1, -1)}</code>;
    return p;
  });
}
const cells = (l: string) => l.trim().replace(/^\|/, '').replace(/\|$/, '').split('|').map((c) => c.trim());

/** Small local renderer: headings, paragraphs, lists, tables, rules, bold, code. */
export function Markdown({ source }: { source: string }) {
  const lines = source.replace(/\r/g, '').split('\n');
  const out: ReactNode[] = [];
  let i = 0;
  while (i < lines.length) {
    const line = lines[i]; const k = `b${i}`;
    if (!line.trim()) { i++; continue; }
    const h = line.match(/^(#{1,6})\s+(.*)$/);
    if (h) {
      const lvl = h[1].length;
      const cls = lvl === 1 ? 'text-2xl md:text-3xl font-bold mt-8 mb-3' : lvl === 2 ? 'text-xl font-bold mt-8 mb-3' : 'text-lg font-semibold mt-6 mb-2';
      const Tag = (`h${Math.min(lvl, 4)}`) as 'h1';
      out.push(<Tag key={k} className={cls}>{inline(h[2], k)}</Tag>); i++; continue;
    }
    if (/^(-{3,}|\*{3,})$/.test(line.trim())) { out.push(<hr key={k} className="my-6 border-border" />); i++; continue; }
    if (line.trim().startsWith('|')) {
      const rows: string[] = [];
      while (i < lines.length && lines[i].trim().startsWith('|')) rows.push(lines[i++]);
      const body = rows.filter((r) => !/^\s*\|?\s*:?-{2,}/.test(r));
      const [head, ...rest] = body;
      out.push(
        <div key={k} className="my-4 overflow-x-auto"><table className="w-full text-sm border-collapse">
          <thead><tr>{cells(head).map((c, j) => <th key={j} className="border border-border bg-muted px-2 py-1 text-left font-semibold">{inline(c, k + j)}</th>)}</tr></thead>
          <tbody>{rest.map((r, ri) => <tr key={ri}>{cells(r).map((c, j) => <td key={j} className="border border-border px-2 py-1 align-top">{inline(c, `${k}${ri}${j}`)}</td>)}</tr>)}</tbody>
        </table></div>);
      continue;
    }
    if (/^\s*([-*]|\d+\.)\s+/.test(line)) {
      const ordered = /^\s*\d+\./.test(line);
      const items: string[] = [];
      while (i < lines.length && /^\s*([-*]|\d+\.)\s+/.test(lines[i]) && /^\s*\d+\./.test(lines[i]) === ordered) items.push(lines[i++].replace(/^\s*([-*]|\d+\.)\s+/, ''));
      const L = ordered ? 'ol' : 'ul';
      out.push(<L key={k} className={`my-3 pl-6 space-y-1 ${ordered ? 'list-decimal' : 'list-disc'}`}>{items.map((t, j) => <li key={j}>{inline(t, k + j)}</li>)}</L>);
      continue;
    }
    const para: string[] = [];
    while (i < lines.length && lines[i].trim() && !/^(#{1,6}\s|\||\s*([-*]|\d+\.)\s+|-{3,}$)/.test(lines[i])) para.push(lines[i++]);
    if (!para.length) para.push(lines[i++]);
    out.push(<p key={k} className="my-3 leading-relaxed">{inline(para.join(' '), k)}</p>);
  }
  return <div className="text-foreground">{out}</div>;
}
