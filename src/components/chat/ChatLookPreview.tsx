import { useChatSkin } from '@/hooks/useChatSkin';
import { MountainRange } from '@/components/brand/MountainRange';

/** A small sample room so a choice can be judged before leaving the screen. */
export function ChatLookPreview() {
  const { className, style } = useChatSkin(null);

  return (
    <div
      className={`${className} relative isolate overflow-hidden rounded`}
      style={style}
    >
      <MountainRange className="chat-range" />
      <div className="relative space-y-2 p-4">
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
