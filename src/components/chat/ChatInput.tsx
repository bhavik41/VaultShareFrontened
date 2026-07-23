// src/components/chat/ChatInput.tsx
import { useRef, useState, useCallback, useEffect } from "react";
import { Send } from "lucide-react";

interface ChatInputProps {
  onSend: (content: string) => void;
  onTyping: () => void;
  onStopTyping: () => void;
  disabled?: boolean;
}

const TYPING_DEBOUNCE_MS = 2000;

export default function ChatInput({
  onSend,
  onTyping,
  onStopTyping,
  disabled = false,
}: ChatInputProps) {
  const [value, setValue] = useState("");
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isTypingRef = useRef(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const stopTyping = useCallback(() => {
    if (isTypingRef.current) {
      isTypingRef.current = false;
      onStopTyping();
    }
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = null;
    }
  }, [onStopTyping]);

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      setValue(e.target.value);

      if (!isTypingRef.current) {
        isTypingRef.current = true;
        onTyping();
      }

      // Reset the debounce timer
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      typingTimeoutRef.current = setTimeout(() => {
        stopTyping();
      }, TYPING_DEBOUNCE_MS);
    },
    [onTyping, stopTyping]
  );

  const handleSend = useCallback(() => {
    const trimmed = value.trim();
    if (!trimmed) return;
    onSend(trimmed);
    setValue("");
    stopTyping();
    // Refocus textarea after send
    textareaRef.current?.focus();
  }, [value, onSend, stopTyping]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        handleSend();
      }
    },
    [handleSend]
  );

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      if (isTypingRef.current) onStopTyping();
    };
  }, [onStopTyping]);

  return (
    <div className="flex items-end gap-2 p-3 border-t border-vs-border/60">
      <textarea
        ref={textareaRef}
        value={value}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        disabled={disabled}
        placeholder={disabled ? "Connecting..." : "Message... (Enter to send)"}
        rows={1}
        className="flex-1 resize-none bg-vs-hover border border-vs-border rounded-xl px-3 py-2.5 text-base text-vs-heading placeholder:text-gray-400 focus:outline-none focus:border-violet-500/60 focus:ring-1 focus:ring-violet-500/30 transition-all duration-200 max-h-32 overflow-y-auto disabled:opacity-50 disabled:cursor-not-allowed"
        style={{ minHeight: "40px" }}
        onInput={(e) => {
          const target = e.currentTarget;
          target.style.height = "auto";
          target.style.height = `${Math.min(target.scrollHeight, 128)}px`;
        }}
      />
      <button
        onClick={handleSend}
        disabled={disabled || !value.trim()}
        className="flex-shrink-0 w-9 h-9 rounded-xl bg-violet-600 hover:bg-violet-500 disabled:bg-vs-surface disabled:text-vs-muted text-white flex items-center justify-center transition-all duration-150 cursor-pointer disabled:cursor-not-allowed active:scale-95"
        title="Send message"
      >
        <Send size={15} />
      </button>
    </div>
  );
}
