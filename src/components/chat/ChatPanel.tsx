// src/components/chat/ChatPanel.tsx
import { useEffect, useRef } from "react";
import { MessageSquare, X, Wifi, WifiOff } from "lucide-react";
import { useChat } from "@/hooks/useChat";
import ChatMessage from "./ChatMessage";
import OnlineUserBadge from "./OnlineUserBadge";
import TypingIndicator from "./TypingIndicator";
import ChatInput from "./ChatInput";
import { useAppSelector } from "@/store/hooks";

interface ChatPanelProps {
  fileId: string;
  fileName?: string;
  onClose?: () => void;
}

function formatDateSeparator(iso: string): string {
  try {
    const date = new Date(iso);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) return "Today";
    if (date.toDateString() === yesterday.toDateString()) return "Yesterday";
    const sameYear = date.getFullYear() === today.getFullYear();
    return date.toLocaleDateString([], {
      weekday: "long",
      month: "long",
      day: "numeric",
      ...(sameYear ? {} : { year: "numeric" }),
    });
  } catch {
    return "";
  }
}

function getDayKey(iso: string): string {
  try {
    return new Date(iso).toDateString();
  } catch {
    return iso;
  }
}

export default function ChatPanel({ fileId, fileName, onClose }: ChatPanelProps) {
  const {
    messages,
    onlineUsers,
    typingUsers,
    isConnected,
    sendMessage,
    emitTyping,
    emitStopTyping,
    currentUserId,
  } = useChat(fileId);

  const error = useAppSelector((s) => s.chat.error);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const onlineUserIds = new Set<string>(onlineUsers.map((u) => u.userId));

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, typingUsers]);

  const isEmpty = messages.length === 0;

  return (
    <div className="flex flex-col h-full bg-[#09090f] border-l border-slate-900">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-800/60 bg-[#0b0b14] flex-shrink-0">
        <div className="flex items-center gap-2.5 min-w-0">
          <MessageSquare size={16} className="text-violet-400 flex-shrink-0" />
          <div className="min-w-0">
            <span className="text-sm font-semibold text-slate-200 truncate block">
              {fileName ? `Chat — ${fileName}` : "Chat"}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          {onlineUsers.length > 0 && <OnlineUserBadge users={onlineUsers} />}
          <div title={isConnected ? "Connected" : "Disconnected"}>
            {isConnected ? (
              <Wifi size={14} className="text-emerald-400" />
            ) : (
              <WifiOff size={14} className="text-slate-600" />
            )}
          </div>
          {onClose && (
            <button
              onClick={onClose}
              className="bg-transparent border-0 p-1 rounded-lg text-slate-500 hover:text-slate-300 hover:bg-slate-800/60 cursor-pointer transition-colors"
              title="Close chat"
            >
              <X size={15} />
            </button>
          )}
        </div>
      </div>

      {/* Error banner */}
      {error && (
        <div className="flex items-center gap-2 px-4 py-2.5 bg-rose-950/30 border-b border-rose-900/40 flex-shrink-0">
          <span className="w-2 h-2 rounded-full bg-rose-500 flex-shrink-0" />
          <span className="text-xs text-rose-400 font-medium">{error}</span>
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-3 py-4 flex flex-col gap-3">
        {isEmpty ? (
          <div className="flex flex-col items-center justify-center h-full gap-4 text-center py-12">
            <div className="w-12 h-12 rounded-2xl bg-slate-900/60 border border-slate-800 flex items-center justify-center">
              <MessageSquare size={22} className="text-slate-600" />
            </div>
            <div className="flex flex-col gap-1 max-w-[200px]">
              <span className="text-sm font-semibold text-slate-400">No messages yet</span>
              <span className="text-xs text-slate-600 leading-relaxed">
                Start the conversation!
              </span>
            </div>
          </div>
        ) : (
          (() => {
            let lastDayKey = "";
            return messages.map((msg) => {
              const dayKey = getDayKey(msg.timestamp);
              const showSeparator = dayKey !== lastDayKey;
              if (showSeparator) lastDayKey = dayKey;
              return (
                <ChatMessage
                  key={msg.id}
                  message={msg}
                  isSelf={msg.userId === currentUserId}
                  isOnline={onlineUserIds.has(msg.userId)}
                  showDateSeparator={showSeparator}
                  separatorDate={formatDateSeparator(msg.timestamp)}
                />
              );
            });
          })()
        )}

        <TypingIndicator typingUsers={typingUsers} />
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="flex-shrink-0">
        <ChatInput
          onSend={sendMessage}
          onTyping={emitTyping}
          onStopTyping={emitStopTyping}
          disabled={!isConnected}
        />
      </div>
    </div>
  );
}
