// src/components/chat/OnlineUserBadge.tsx
import type { OnlineUser } from "@/types/chat";

interface OnlineUserBadgeProps {
  users: OnlineUser[];
}

export default function OnlineUserBadge({ users }: OnlineUserBadgeProps) {
  const count = users.length;

  return (
    <div
      className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20"
      title={users.map((u) => u.userName).join(", ")}
    >
      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
      <span className="text-[11px] font-semibold text-emerald-400">
        {count} online
      </span>
    </div>
  );
}
