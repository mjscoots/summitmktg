/**
 * A message that is only emoji, one to three of them, with no words. Those
 * render large and without a bubble, the way phone chats do.
 */
export function isEmojiOnly(content: string): boolean {
  const text = (content || '').trim();
  if (!text) return false;
  if (/[A-Za-z0-9]/.test(text)) return false;
  const bare = text.replace(/[\s\uFE0F\u200D]/g, '');
  if (!bare) return false;
  const matches = Array.from(bare.matchAll(/\p{Extended_Pictographic}/gu));
  if (matches.length < 1 || matches.length > 3) return false;
  // Nothing but the emoji themselves, once joiners and spaces are stripped.
  const stripped = bare.replace(/\p{Extended_Pictographic}/gu, '');
  return stripped.length === 0;
}
