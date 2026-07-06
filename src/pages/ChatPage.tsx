// src/pages/ChatPage.tsx
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import ChatPanel from "@/components/chat/ChatPanel";

export default function ChatPage() {
  const { fileId } = useParams<{ fileId: string }>();
  const navigate = useNavigate();

  if (!fileId) {
    return (
      <div className="flex-1 flex items-center justify-center bg-[#f8f9ff] text-[#737784] text-base">
        No file specified.
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col bg-[#f8f9ff] text-[#0b1c30]">
      {/* Top bar */}
      <header className="h-14 border-b border-[#c3c6d5] px-4 flex items-center gap-3 bg-white flex-shrink-0">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-[#737784] hover:text-[#0b1c30] bg-transparent border-0 cursor-pointer text-sm font-medium transition-colors"
        >
          <ArrowLeft size={16} />
          <span>Back</span>
        </button>
        <div className="w-px h-5 bg-[#c3c6d5]" />
        <span className="text-base font-semibold text-[#0b1c30]">File Chat</span>
      </header>

      {/* Full-screen chat panel */}
      <div className="flex-1 overflow-hidden">
        <ChatPanel fileId={fileId} />
      </div>
    </div>
  );
}
