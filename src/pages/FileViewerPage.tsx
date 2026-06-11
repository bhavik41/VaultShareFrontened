import { useEffect, useRef, useState } from "react"
import { Link, useParams, useNavigate } from "react-router-dom"
import { AtSign, ChevronRight, Loader2, Minus, Plus, Send } from "lucide-react"
import { useAppSelector } from "@/store/hooks"
import { getFileSignedUrl } from "@/store/filesApi"
import { useAppDispatch } from "@/store/hooks"
import { listFilesThunk } from "@/store/filesSlice"

const TABS = ["Files", "Shared", "Activity", "Audit Log"]

interface ChatMessage {
  id: string
  sender: string
  initials: string
  time: string
  text: string
  isMe: boolean
}

interface Comment {
  id: string
  label: string
  author: string
  time: string
  text: string
}

const INITIAL_MESSAGES: ChatMessage[] = [
  { id: "1", sender: "Sarah Chen", initials: "SC", time: "10:30 AM", text: "Added comments on the exec summary. Let's review the financial projections.", isMe: false },
  { id: "2", sender: "Me", initials: "Me", time: "10:32 AM", text: "Sure, I'll go through them now.", isMe: true },
  { id: "3", sender: "David Kim", initials: "DK", time: "10:35 AM", text: "Agree — market analysis needs more data points.", isMe: false },
]

const INITIAL_COMMENTS: Comment[] = [
  { id: "1", label: "Comment #1 — Financial Performance", author: "Sarah Chen", time: "10:38 AM", text: "Revenue figures on page 2 look off. Can we cross-check with the Q2 baseline?" },
  { id: "2", label: "Comment #2 — Market Analysis", author: "David Kim", time: "10:38 AM", text: "Competitor section needs citations. I'll pull from the Q3 research doc." },
  { id: "3", label: "Comment #3 — Action Items", author: "You", time: "10:40 AM", text: "I'll compile all revision notes by EOD." },
  { id: "4", label: "Comment #4 — Encryption", author: "Alex M.", time: "10:41 AM", text: "Confirmed AES-256 is applied to all attachments." },
]

export default function FileViewerPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const dispatch = useAppDispatch()
  const { items: uploadedFilesRaw } = useAppSelector((s) => s.files)
  const uploadedFiles = uploadedFilesRaw ?? []

  const [activeTab, setActiveTab] = useState("Files")
  const [zoom, setZoom] = useState(100)
  const [page] = useState(2)
  const [fileUrl, setFileUrl] = useState<string | null>(null)
  const [messages, setMessages] = useState<ChatMessage[]>(INITIAL_MESSAGES)
  const [comments] = useState<Comment[]>(INITIAL_COMMENTS)
  const [input, setInput] = useState("")
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const file = uploadedFiles.find((f) => f.id === id)
  const mimeType = file?.mimeType ?? ""
  const isImage = mimeType.startsWith("image/")
  const isPdf = mimeType === "application/pdf"
  const isText = mimeType.startsWith("text/")
  const totalPages = 12

  useEffect(() => {
    dispatch(listFilesThunk())
  }, [dispatch])

  useEffect(() => {
    if (!id) return
    getFileSignedUrl(id)
      .then(({ url }) => setFileUrl(url))
      .catch(() => {})
  }, [id])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  function sendMessage(e: React.FormEvent) {
    e.preventDefault()
    if (!input.trim()) return
    setMessages((prev) => [
      ...prev,
      {
        id: String(Date.now()),
        sender: "Me",
        initials: "Me",
        time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        text: input.trim(),
        isMe: true,
      },
    ])
    setInput("")
  }

  return (
    <div className="flex h-screen flex-col bg-[#080810] text-white overflow-hidden">
      {/* Top Header */}
      <header className="shrink-0 border-b border-white/5 bg-[#0a0a18]">
        <div className="flex items-center justify-between px-5 py-0">
          <div className="flex items-center gap-6">
            <Link to="/dashboard" className="flex items-center gap-2 py-4">
              <div className="flex h-6 w-6 items-center justify-center rounded-md bg-gradient-to-br from-violet-600 to-indigo-600 text-xs font-extrabold text-white">
                V
              </div>
              <span className="text-sm font-bold text-white">VaultShare</span>
            </Link>

            <div className="flex items-center">
              {TABS.map((tab) => (
                <button
                  key={tab}
                  onClick={() => {
                    setActiveTab(tab)
                    if (tab === "Files") navigate("/dashboard")
                  }}
                  className={`relative px-4 py-4 text-sm font-medium transition-colors ${
                    activeTab === tab
                      ? "text-white after:absolute after:bottom-0 after:left-0 after:right-0 after:h-0.5 after:bg-blue-500"
                      : "text-slate-400 hover:text-slate-200"
                  }`}
                >
                  {tab}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-3 py-3">
            <span className="h-2 w-2 rounded-full bg-yellow-400" />
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-700 text-xs font-bold text-white">
              AC
            </div>
          </div>
        </div>

        {/* Breadcrumb + badge */}
        <div className="flex items-center gap-2 border-t border-white/5 px-5 py-2.5">
          <button onClick={() => navigate("/dashboard")} className="text-xs text-slate-400 hover:text-white">
            My Files
          </button>
          <ChevronRight size={12} className="text-slate-600" />
          <span className="text-xs text-slate-400">Project Alpha</span>
          <ChevronRight size={12} className="text-slate-600" />
          <span className="text-xs text-white font-medium">
            {file?.name ?? "Q3 Report - Draft v2.pdf"}
          </span>
          <span className="ml-2 rounded-md border border-blue-500/30 bg-blue-500/10 px-2 py-0.5 text-[10px] font-semibold text-blue-300">
            AES-256
          </span>
        </div>
      </header>

      {/* Body */}
      <div className="flex flex-1 overflow-hidden">
        {/* File Viewer */}
        <div className="flex flex-1 flex-col overflow-hidden border-r border-white/5">
          {/* Viewer toolbar */}
          <div className="flex shrink-0 items-center gap-3 border-b border-white/5 bg-[#0a0a18] px-5 py-2">
            <span className="text-xs text-slate-400">Page</span>
            <span className="rounded border border-slate-700 bg-slate-900 px-2 py-0.5 text-xs text-white">
              {page}
            </span>
            <span className="text-xs text-slate-500">of {totalPages}</span>

            <div className="mx-2 h-4 w-px bg-slate-700" />

            <button
              onClick={() => setZoom((z) => Math.max(25, z - 25))}
              className="rounded border border-slate-700 bg-slate-900 p-1 text-slate-400 hover:text-white"
            >
              <Minus size={12} />
            </button>
            <span className="min-w-[42px] text-center text-xs text-white">{zoom}%</span>
            <button
              onClick={() => setZoom((z) => Math.min(200, z + 25))}
              className="rounded border border-slate-700 bg-slate-900 p-1 text-slate-400 hover:text-white"
            >
              <Plus size={12} />
            </button>
          </div>

          {/* Document area */}
          <div className="flex flex-1 overflow-hidden bg-[#0d0d1a]">
            {/* Main file viewer */}
            <div className="flex flex-1 overflow-hidden">
              {!fileUrl ? (
                <div className="flex flex-1 items-center justify-center">
                  <div className="flex flex-col items-center gap-3 text-slate-500">
                    <Loader2 className="animate-spin" size={24} />
                    <span className="text-sm">Loading file…</span>
                  </div>
                </div>
              ) : isImage ? (
                <div className="flex flex-1 items-center justify-center overflow-auto p-8">
                  <img
                    src={fileUrl}
                    alt={file?.name}
                    style={{ transform: `scale(${zoom / 100})`, transformOrigin: "top center", maxWidth: "100%" }}
                    className="rounded-lg shadow-2xl transition-transform duration-200"
                  />
                </div>
              ) : (
                <iframe
                  src={fileUrl}
                  title={file?.name ?? "File"}
                  className="border-0"
                  style={{ width: "100%", height: "100%", flex: 1 }}
                />
              )}
            </div>
          </div>

          {/* Status bar */}
          <div className="flex shrink-0 items-center justify-between border-t border-white/5 bg-[#0a0a14] px-5 py-2">
            <div className="flex items-center gap-3 text-[11px] text-slate-500">
              <span className="flex items-center gap-1.5">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                AES-256 encrypted
              </span>
              <span>·</span>
              <span>3 viewers active</span>
              <span>·</span>
              <span>Last modified 10:42 AM</span>
            </div>
            <span className="text-[11px] font-medium text-emerald-400">SHA-256 verified ✓</span>
          </div>
        </div>

        {/* Comments & Chat Panel */}
        <div className="flex w-80 shrink-0 flex-col bg-[#0a0a18]">
          {/* Panel header */}
          <div className="flex shrink-0 items-center justify-between border-b border-white/5 px-4 py-3">
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-semibold text-white">Comments & Chat</h3>
              <span className="rounded-full bg-blue-600 px-1.5 py-0.5 text-[10px] font-bold text-white">
                4 new
              </span>
            </div>
            <div className="flex gap-1 text-slate-500">
              <span className="text-xs">· · ·</span>
            </div>
          </div>

          {/* Scrollable content */}
          <div className="flex-1 overflow-y-auto">
            {/* Chat messages */}
            <div className="space-y-3 p-4">
              {messages.map((msg) => (
                <div key={msg.id} className={`flex gap-2 ${msg.isMe ? "flex-row-reverse" : ""}`}>
                  {!msg.isMe && (
                    <div className="h-7 w-7 shrink-0 rounded-full bg-slate-700 flex items-center justify-center text-[10px] font-bold text-white">
                      {msg.initials}
                    </div>
                  )}
                  <div className={`max-w-[85%] ${msg.isMe ? "items-end" : "items-start"} flex flex-col`}>
                    {!msg.isMe && (
                      <span className="mb-0.5 text-[10px] font-semibold text-slate-300">
                        {msg.sender}{" "}
                        <span className="font-normal text-slate-500">{msg.time}</span>
                      </span>
                    )}
                    <div
                      className={`rounded-xl px-3 py-2 text-xs leading-relaxed ${
                        msg.isMe
                          ? "rounded-tr-sm bg-blue-600 text-white"
                          : "rounded-tl-sm bg-slate-800 text-slate-200"
                      }`}
                    >
                      {msg.text}
                    </div>
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>

            {/* Comment threads */}
            <div className="border-t border-white/5 px-3 pb-4 pt-3 space-y-2">
              {comments.map((c) => (
                <div key={c.id} className="rounded-lg border border-white/5 bg-white/3 p-3">
                  <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                    {c.label}
                  </p>
                  <p className="mb-0.5 text-xs font-semibold text-slate-300">
                    {c.author}{" "}
                    <span className="font-normal text-slate-500">{c.time}</span>
                  </p>
                  <p className="mb-2 text-xs leading-relaxed text-slate-400">{c.text}</p>
                  <div className="flex gap-2">
                    <button className="text-[10px] font-medium text-slate-400 hover:text-white">Reply</button>
                    <button className="text-[10px] font-medium text-blue-400 hover:text-blue-300">Jump to</button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Input */}
          <div className="shrink-0 border-t border-white/5 p-3">
            <form onSubmit={sendMessage} className="flex items-center gap-2">
              <input
                type="text"
                placeholder="Add a comment or message..."
                value={input}
                onChange={(e) => setInput(e.target.value)}
                className="flex-1 rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-xs text-white placeholder:text-slate-600 focus:border-blue-500 focus:outline-none"
              />
              <button type="button" className="text-slate-500 hover:text-slate-300">
                <AtSign size={15} />
              </button>
              <button
                type="submit"
                className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-600 text-white hover:bg-blue-500"
              >
                <Send size={12} />
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  )
}
