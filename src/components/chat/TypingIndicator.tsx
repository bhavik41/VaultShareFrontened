// src/components/chat/TypingIndicator.tsx

interface TypingIndicatorProps {
  typingUsers: string[];
}

export default function TypingIndicator({ typingUsers }: TypingIndicatorProps) {
  if (typingUsers.length === 0) return null;

  const text =
    typingUsers.length === 1
      ? `${typingUsers[0]} is typing`
      : typingUsers.length === 2
        ? `${typingUsers[0]} and ${typingUsers[1]} are typing`
        : "Several people are typing";

  return (
    <div className="flex items-center gap-2 px-3 py-1.5">
      {/* Animated dots */}
      <div className="flex items-center gap-0.5">
        <span
          className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-bounce"
          style={{ animationDelay: "0ms", animationDuration: "1s" }}
        />
        <span
          className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-bounce"
          style={{ animationDelay: "150ms", animationDuration: "1s" }}
        />
        <span
          className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-bounce"
          style={{ animationDelay: "300ms", animationDuration: "1s" }}
        />
      </div>
      <span className="text-[11px] text-slate-500 italic">{text}...</span>
    </div>
  );
}
