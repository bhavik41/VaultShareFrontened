import { useRef, useState } from "react";
import { Bot, Send, Loader2, FileQuestion, AlertCircle, ChevronDown, ChevronUp, Copy, Check, Trash2 } from "lucide-react";
import { askDocumentQuestion } from "@/store/documentQAApi";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  meta?: { chunksUsed: number; totalChunks: number };
  error?: boolean;
}

interface DocumentQAProps {
  fileId: string;
  fileName: string;
}

export default function DocumentQA({ fileId, fileName }: DocumentQAProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [expandedMeta, setExpandedMeta] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const q = input.trim();
    if (!q || loading) return;

    const userMsg: Message = { id: crypto.randomUUID(), role: "user", content: q };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setLoading(true);

    try {
      const result = await askDocumentQuestion(fileId, q);
      const aiMsg: Message = {
        id: crypto.randomUUID(),
        role: "assistant",
        content: result.answer,
        meta: { chunksUsed: result.chunksUsed, totalChunks: result.totalChunks },
      };
      setMessages((prev) => [...prev, aiMsg]);
    } catch (err: any) {
      const errText = err?.response?.data?.message ?? "Something went wrong. Please try again.";
      setMessages((prev) => [
        ...prev,
        { id: crypto.randomUUID(), role: "assistant", content: errText, error: true },
      ]);
    } finally {
      setLoading(false);
      setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }), 50);
    }
  }

  async function handleCopy(msgId: string, text: string) {
    await navigator.clipboard.writeText(text);
    setCopiedId(msgId);
    setTimeout(() => setCopiedId(null), 2000);
  }

  const ext = fileName.split(".").pop()?.toLowerCase() ?? "";
  const supported = ["pdf", "docx", "doc", "txt", "json", "md", "csv"].includes(ext);

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="shrink-0 px-4 py-3 border-b border-vs-border bg-vs-bg">
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-vs-brand">
            <Bot size={14} className="text-white" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-semibold text-vs-heading">Ask AI</p>
            <p className="text-[10px] text-vs-muted">Questions answered from document content</p>
          </div>
          {messages.length > 0 && (
            <button
              onClick={() => setMessages([])}
              title="Clear conversation"
              className="flex h-7 w-7 items-center justify-center rounded-lg text-vs-muted hover:text-vs-error hover:bg-vs-error-surface transition-colors cursor-pointer bg-transparent border-0"
            >
              <Trash2 size={13} />
            </button>
          )}
        </div>
      </div>

      {/* Unsupported file warning */}
      {!supported && (
        <div className="m-4 rounded-xl border border-amber-200 bg-amber-50 p-3 flex gap-2">
          <AlertCircle size={15} className="shrink-0 text-amber-600 mt-0.5" />
          <p className="text-[11px] text-amber-700 font-medium leading-relaxed">
            Q&A works best with PDF, Word (.docx), or text files. This file type ({ext || "unknown"}) may not be readable.
          </p>
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 min-h-0 overflow-y-auto p-4 space-y-3">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full gap-4 text-center py-8">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-vs-active">
              <FileQuestion size={28} className="text-vs-brand" />
            </div>
            <div>
              <p className="text-sm font-semibold text-vs-heading mb-1">Ask anything about this file</p>
              <p className="text-[11px] text-vs-muted leading-relaxed max-w-[200px]">
                AI reads the document and answers your questions. Works on 1000+ page files.
              </p>
            </div>
            <div className="flex flex-col gap-2 w-full">
              {["Summarize this document", "What are the key findings?", "List the main points", "What steps or procedures are described?"].map((s) => (
                <button key={s} onClick={() => setInput(s)}
                  className="text-left text-[11px] text-vs-brand bg-vs-hover hover:bg-vs-active border border-vs-border rounded-lg px-3 py-2 transition-colors cursor-pointer border-0 font-medium">
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((msg) => (
          <div key={msg.id} className={`flex gap-2 ${msg.role === "user" ? "flex-row-reverse" : "flex-row"}`}>
            {msg.role === "assistant" && (
              <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-vs-brand mt-0.5">
                <Bot size={11} className="text-white" />
              </div>
            )}
            <div className={`flex flex-col max-w-[85%] ${msg.role === "user" ? "items-end" : "items-start"}`}>
              <div className={`rounded-xl px-3 py-2 text-sm leading-relaxed whitespace-pre-wrap break-words ${
                msg.role === "user"
                  ? "bg-vs-brand text-white rounded-tr-sm"
                  : msg.error
                  ? "bg-vs-error-surface text-vs-error border border-vs-error/20 rounded-tl-sm"
                  : "bg-vs-hover text-vs-heading rounded-tl-sm"
              }`}>
                {msg.content}
              </div>

              <div className="flex items-center gap-2 mt-1">
                {/* Copy button for AI answers */}
                {msg.role === "assistant" && !msg.error && (
                  <button
                    onClick={() => handleCopy(msg.id, msg.content)}
                    className="flex items-center gap-1 text-[9px] text-vs-muted hover:text-vs-body cursor-pointer bg-transparent border-0 p-0"
                    title="Copy answer"
                  >
                    {copiedId === msg.id ? <Check size={9} /> : <Copy size={9} />}
                    {copiedId === msg.id ? "Copied!" : "Copy"}
                  </button>
                )}

                {/* Meta (sections scanned) */}
                {msg.meta && (
                  <button
                    onClick={() => setExpandedMeta(expandedMeta === msg.id ? null : msg.id)}
                    className="flex items-center gap-1 text-[9px] text-vs-muted hover:text-vs-body cursor-pointer bg-transparent border-0 p-0"
                  >
                    {expandedMeta === msg.id ? <ChevronUp size={9} /> : <ChevronDown size={9} />}
                    Scanned {msg.meta.chunksUsed} of {msg.meta.totalChunks} sections
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex gap-2">
            <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-vs-brand mt-0.5">
              <Bot size={11} className="text-white" />
            </div>
            <div className="rounded-xl rounded-tl-sm bg-vs-hover px-3 py-2">
              <Loader2 size={14} className="animate-spin text-vs-brand" />
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="shrink-0 border-t border-vs-border p-3">
        <form onSubmit={handleSubmit} className="flex gap-2 items-end">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSubmit(e as any); } }}
            placeholder="Ask a question about this document…"
            rows={2}
            disabled={loading}
            className="flex-1 resize-none rounded-lg border border-vs-border bg-vs-bg px-3 py-2 text-sm text-vs-heading placeholder:text-vs-muted focus:border-vs-brand focus:outline-none disabled:opacity-50"
          />
          <button type="submit" disabled={loading || !input.trim()}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-vs-brand text-white hover:opacity-90 disabled:opacity-40 cursor-pointer border-0 transition-opacity">
            <Send size={14} />
          </button>
        </form>
        <p className="text-[9px] text-vs-muted mt-1 text-center">Enter to send · Shift+Enter for new line</p>
      </div>
    </div>
  );
}
