// src/pages/ChatPage.tsx
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import ChatPanel from "@/components/chat/ChatPanel";

export default function ChatPage() {
  const { fileId } = useParams<{ fileId: string }>();
  const navigate = useNavigate();

  if (!fileId) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 text-slate-400 text-sm">
        No file specified.
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-800">
      {/* Top bar */}
      <header className="h-14 border-b border-gray-200 px-4 flex items-center gap-3 bg-[#09090f] flex-shrink-0">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-slate-600 hover:text-slate-800 bg-transparent border-0 cursor-pointer text-sm font-medium transition-colors"
        >
          <ArrowLeft size={16} />
          <span>Back</span>
        </button>
        <div className="w-px h-5 bg-gray-200" />
        <span className="text-sm font-semibold text-slate-600">File Chat</span>
      </header>

      {/* Full-screen chat panel */}
      <div className="flex-1 overflow-hidden">
        <ChatPanel fileId={fileId} />
      </div>
    </div>
  );
}
