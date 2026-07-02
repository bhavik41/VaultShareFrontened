// src/components/chat/ChatSidebar.tsx
import { MessageSquare, ChevronRight } from "lucide-react";
import { useAppSelector } from "@/store/hooks";
import ChatPanel from "./ChatPanel";

interface ChatSidebarProps {
  fileId: string;
  fileName?: string;
  isOpen: boolean;
  onToggle: () => void;
}

export default function ChatSidebar({
  fileId,
  fileName,
  isOpen,
  onToggle,
}: ChatSidebarProps) {
  const unreadCount = useAppSelector(
    (s) => s.chat.unreadCountByFile[fileId] ?? 0
  );

  return (
    <>
      {/* Toggle button — visible when sidebar is closed */}
      {!isOpen && (
        <button
          onClick={onToggle}
          className="fixed right-0 top-1/2 -translate-y-1/2 z-40 flex flex-col items-center gap-1 bg-gray-100 border border-gray-200 border-r-0 rounded-l-xl px-2 py-3 text-slate-400 hover:text-violet-400 hover:bg-slate-850 cursor-pointer transition-all duration-200 shadow-lg"
          title="Open chat"
        >
          <MessageSquare size={16} />
          {unreadCount > 0 && (
            <span className="w-5 h-5 rounded-full bg-violet-600 text-slate-900 text-[9px] font-bold flex items-center justify-center">
              {unreadCount > 99 ? "99+" : unreadCount}
            </span>
          )}
          <ChevronRight size={12} />
        </button>
      )}

      {/* Sidebar panel */}
      <div
        className={`fixed right-0 top-0 h-full z-40 flex flex-col transition-all duration-300 ease-in-out ${
          isOpen ? "w-80 translate-x-0" : "w-80 translate-x-full"
        }`}
        style={{ boxShadow: isOpen ? "-8px 0 32px rgba(0,0,0,0.5)" : "none" }}
      >
        <ChatPanel
          fileId={fileId}
          fileName={fileName}
          onClose={onToggle}
        />
      </div>

      {/* Backdrop (mobile-friendly) */}
      {isOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/40 backdrop-blur-[1px] lg:hidden"
          onClick={onToggle}
        />
      )}
    </>
  );
}
