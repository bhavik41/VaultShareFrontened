// src/components/chat/ChatMessage.tsx
import type { ChatMessage as ChatMessageType } from "@/types/chat";

interface ChatMessageProps {
  message: ChatMessageType;
  isSelf: boolean;
  isOnline?: boolean;
  showDateSeparator?: boolean;
  separatorDate?: string;
}

function formatTime(iso: string): string {
  try {
    return new Date(iso).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "";
  }
}

function getInitials(name: string): string {
  return (name || "")
    .split(" ")
    .filter(Boolean)
    .map((n) => n[0] ?? "")
    .join("")
    .toUpperCase()
    .slice(0, 2) || "?";
}

export default function ChatMessage({
  message,
  isSelf,
  isOnline = false,
  showDateSeparator = false,
  separatorDate = "",
}: ChatMessageProps) {
  return (
    <>
      {showDateSeparator && (
        <div className="flex items-center gap-3 my-3">
          <div className="flex-1 h-px bg-vs-surface" />
          <span className="text-[10px] font-semibold text-vs-muted px-2 py-0.5 rounded-full bg-vs-hover border border-vs-border">
            {separatorDate}
          </span>
          <div className="flex-1 h-px bg-vs-surface" />
        </div>
      )}

      <div className={`flex items-end gap-2 ${isSelf ? "flex-row-reverse" : "flex-row"}`}>
        {/* Avatar */}
        <div className="relative flex-shrink-0">
          <div
            className={`w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold text-vs-heading flex-shrink-0 ${
              isSelf
                ? "bg-gradient-to-br from-violet-600 to-indigo-600"
                : "bg-gradient-to-br from-slate-600 to-slate-700"
            } ${isOnline ? "ring-2 ring-emerald-400 ring-offset-1 ring-offset-vs-bg" : ""}`}
            title={message.userName}
          >
            {getInitials(message.userName)}
          </div>
          {isOnline && (
            <span className="absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full bg-emerald-400 border border-vs-bg" />
          )}
        </div>

        {/* Bubble */}
        <div className={`flex flex-col gap-0.5 max-w-[72%] ${isSelf ? "items-end" : "items-start"}`}>
          <span className={`text-[10px] font-semibold ${isSelf ? "text-violet-600" : "text-vs-muted"}`}>
            {isSelf ? "You" : message.userName}
          </span>
          <div
            className={`px-3 py-2 rounded-2xl text-base leading-relaxed break-words shadow-sm ${
              isSelf
                ? "bg-violet-600 text-white rounded-br-sm shadow-violet-900/30"
                : "bg-vs-surface text-vs-heading rounded-bl-sm shadow-black/30"
            }`}
          >
            {message.content}
          </div>
          <span className="text-[9px] text-vs-body">{formatTime(message.timestamp)}</span>
        </div>
      </div>
    </>
  );
}
