import { cn, formatFullTime } from "@/lib/utils";
import type { MessageWithSender } from "@/lib/types";

interface MessageBubbleProps {
  message: MessageWithSender;
  isOwn: boolean;
  isDecrypted?: boolean;
  isEncryptedFailed?: boolean;
}

export function MessageBubble({
  message,
  isOwn,
  isDecrypted,
  isEncryptedFailed,
}: MessageBubbleProps) {
  return (
    <div
      className={cn(
        "flex animate-slide-up",
        isOwn ? "justify-end" : "justify-start"
      )}
    >
      <div
        className={cn(
          "max-w-[80%] rounded-2xl px-4 py-2.5 shadow-sm flex flex-col",
          isOwn
            ? "rounded-br-md bg-gradient-to-br from-indigo-500 to-violet-600 text-white"
            : "rounded-bl-md bg-chat-received text-zinc-100",
          isEncryptedFailed && "border border-red-500/20 bg-red-950/20"
        )}
      >
        <p
          className={cn(
            "whitespace-pre-wrap break-words text-[15px] leading-relaxed",
            isEncryptedFailed && "text-zinc-500 italic font-mono text-xs select-none"
          )}
        >
          {isEncryptedFailed ? "🔒 Encrypted content. Enter key in header to view." : message.content}
        </p>
        <div className="mt-1 flex items-center justify-between gap-3 select-none">
          <div className="flex items-center gap-1">
            {isDecrypted && (
              <span
                className={cn(
                  "text-[9px] font-medium flex items-center gap-0.5",
                  isOwn ? "text-indigo-200/80" : "text-emerald-400"
                )}
                title="End-to-End Encrypted"
              >
                <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
                E2EE
              </span>
            )}
            {isEncryptedFailed && (
              <span className="text-[9px] font-medium text-rose-400/80 flex items-center gap-0.5" title="Encrypted (Locked)">
                <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
                Locked
              </span>
            )}
          </div>
          <div className="flex items-center gap-1 select-none shrink-0 ml-auto">
            <span
              className={cn(
                "text-[10px]",
                isOwn ? "text-indigo-200/70" : "text-zinc-500"
              )}
            >
              {formatFullTime(message.createdAt)}
            </span>
            {isOwn && (
              <span className="flex items-center shrink-0" title={message.read ? "Seen" : "Sent"}>
                {message.read ? (
                  <svg className="h-3.5 w-3.5 text-sky-300 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M2 13l3.5 3.5L11 11" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M8 13l3.5 3.5L18 8" />
                  </svg>
                ) : (
                  <svg className="h-3.5 w-3.5 text-indigo-200/40 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                )}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
