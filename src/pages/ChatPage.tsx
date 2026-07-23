// src/pages/ChatPage.tsx
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import ChatPanel from "@/components/chat/ChatPanel";

export default function ChatPage() {
  const { fileId } = useParams<{ fileId: string }>();
  const navigate = useNavigate();

  if (!fileId) {
    return (
      <div className="flex-1 flex items-center justify-center bg-vs-bg text-vs-muted text-base">
        No file specified.
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col bg-vs-bg text-vs-heading">
      {/* Top bar */}
      <header className="h-14 border-b border-vs-border px-4 flex items-center gap-3 bg-vs-card flex-shrink-0">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-vs-muted hover:text-vs-heading bg-transparent border-0 cursor-pointer text-sm font-medium transition-colors"
        >
          <ArrowLeft size={16} />
          <span>Back</span>
        </button>
        <div className="w-px h-5 bg-vs-border" />
        <span className="text-base font-semibold text-vs-heading">File Chat</span>
      </header>

      {/* Full-screen chat panel */}
      <div className="flex-1 overflow-hidden">
        <ChatPanel fileId={fileId} />
      </div>
    </div>
  );
}
