import { useChatSkin } from '@/hooks/useChatSkin';

/** A small sample room so a choice can be judged before leaving the screen. */
export function ChatLookPreview() {
  const { className, style } = useChatSkin(null);

  return (
    <div
      className={`${className} overflow-hidden rounded-[var(--radius)] border border-border`}
      style={style}
    >
      <div className="space-y-2 p-4">
        <div className="flex">
          <span className="bubble-other chat-text max-w-[75%] rounded-[18px] rounded-tl-[5px] px-3 py-[7px] leading-relaxed">
            This is how other people look.
          </span>
        </div>
        <div className="flex justify-end">
          <span className="bubble-own chat-text max-w-[75%] rounded-[18px] rounded-tr-[5px] px-3 py-[7px] leading-relaxed">
            And this is you.
          </span>
        </div>
      </div>
    </div>
  );
}
