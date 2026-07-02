import { useEffect, useRef, useState } from "react"
import { Link, useParams, useNavigate } from "react-router-dom"
import { AtSign, ChevronRight, Download, Loader2, Lock, Minus, Plus, Reply, Send, ShieldCheck, X } from "lucide-react"
import { useAppSelector } from "@/store/hooks"
import { getFileSignedUrl, downloadFile } from "@/store/filesApi"
import api from "@/store/api"
import { useChat } from "@/hooks/useChat"
import { useAppDispatch } from "@/store/hooks"
import { listFilesThunk } from "@/store/filesSlice"
import AuditLogViewer from "@/components/ui/AuditLogViewer"
import VersionHistoryPanel from "@/components/versions/VersionHistoryPanel"

const TABS = ["Files", "Shared", "Activity", "Versions", "Audit Log"]

interface Comment {
  id: string
  label: string
  author: string
  time: string
  text: string
}


const INITIAL_COMMENTS: Comment[] = []

export default function FileViewerPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const dispatch = useAppDispatch()
  const { items: uploadedFilesRaw } = useAppSelector((s) => s.files)
  const authUser = useAppSelector((s) => s.auth.user)
  const myEmail = authUser?.email ?? localStorage.getItem("userEmail") ?? ""
  const uploadedFiles = uploadedFilesRaw ?? []

  const [activeTab, setActiveTab] = useState("Files")
  const [zoom, setZoom] = useState(100)
  const [page] = useState(2)
  const [fileUrl, setFileUrl] = useState<string | null>(null)
  const [comments] = useState<Comment[]>(INITIAL_COMMENTS)
  const [input, setInput] = useState("")
  const [replyTo, setReplyTo] = useState<{ id: string; userName: string; content: string } | null>(null)
  const [reactions, setReactions] = useState<Record<string, Record<string, string[]>>>({}) // msgId -> emoji -> userEmails
  const [emojiPickerFor, setEmojiPickerFor] = useState<string | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const EMOJI_OPTIONS = ["👍", "❤️", "😂", "😮", "😢", "🔥"]

  // Real-time, persisted chat for this file (socket-backed)
  const {
    messages: chatMessages,
    sendMessage: sendChatMessage,
    isConnected: chatConnected,
    adminOnlyChat,
    ownerId,
    setAdminOnly,
  } = useChat(id ?? "")

  const file = uploadedFiles.find((f) => f.id === id)

  // For collaborators the file won't be in uploadedFiles (that's owner-only).
  // Fetch the minimal details we need from the view endpoint instead.
  const [remoteFile, setRemoteFile] = useState<{
    userId: string;
    name: string;
    mimeType: string;
    versionPolicy: "admin_only" | "role_gated" | "open";
    role: "owner" | "editor" | "viewer";
  } | null>(null)

  useEffect(() => {
    if (!id || file) return
    api.get<{ file: { userId: string; originalName: string; mimeType: string; versionPolicy?: string }; role: string }>(`/files/${id}/view`)
      .then((res) => {
        const f = res.data.file
        setRemoteFile({
          userId: f.userId,
          name: f.originalName,
          mimeType: f.mimeType,
          versionPolicy: (f.versionPolicy as "admin_only" | "role_gated" | "open") ?? "admin_only",
          role: (res.data.role as "owner" | "editor" | "viewer") ?? "viewer",
        })
      })
      .catch(() => {})
  }, [id, file])

  const effectiveFile = file
    ? { userId: file.userId, name: file.name, mimeType: file.mimeType, versionPolicy: file.versionPolicy ?? "admin_only" }
    : remoteFile

  const mimeType = effectiveFile?.mimeType ?? ""
  const isImage = mimeType.startsWith("image/")
  const isPdf = mimeType === "application/pdf"
  const isText =
    mimeType.startsWith("text/") ||
    mimeType === "application/json" ||
    mimeType === "application/xml"
  // Only these render inline in the browser. Everything else (Word, Excel,
  // zip, etc.) would trigger a download if placed in an <iframe>, so we show
  // a "preview not available" panel instead.
  const isPreviewable = isImage || isPdf || isText
  const totalPages = 12
  // Owner (admin) is the file uploader. ownerId comes from the server via the
  // socket, so it is authoritative even for collaborators who don't have the
  // file in their own list.
  const isOwner = !!authUser && !!ownerId && ownerId === authUser.id
  const canSendMessage = !adminOnlyChat || isOwner

  useEffect(() => {
    dispatch(listFilesThunk())
  }, [dispatch])

  useEffect(() => {
    if (!id) return
    let objectUrl: string | null = null
    getFileSignedUrl(id)
      .then(({ url }) => {
        objectUrl = url
        setFileUrl(url)
      })
      .catch(() => {})
    return () => {
      if (objectUrl) window.URL.revokeObjectURL(objectUrl)
    }
  }, [id])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [chatMessages])

  useEffect(() => {
    if (!emojiPickerFor) return
    const close = () => setEmojiPickerFor(null)
    document.addEventListener("click", close)
    return () => document.removeEventListener("click", close)
  }, [emojiPickerFor])

  function sendMessage(e: React.FormEvent) {
    e.preventDefault()
    if (!input.trim() || !canSendMessage) return
    const content = replyTo
      ? `↩ ${replyTo.userName}: "${replyTo.content.slice(0, 40)}${replyTo.content.length > 40 ? "…" : ""}"\n${input.trim()}`
      : input.trim()
    sendChatMessage(content)
    setInput("")
    setReplyTo(null)
  }

  function toggleReaction(msgId: string, emoji: string) {
    setReactions((prev) => {
      const msgReactions = { ...(prev[msgId] ?? {}) }
      const users = msgReactions[emoji] ?? []
      if (users.includes(myEmail)) {
        msgReactions[emoji] = users.filter((e) => e !== myEmail)
        if (msgReactions[emoji].length === 0) delete msgReactions[emoji]
      } else {
        msgReactions[emoji] = [...users, myEmail]
      }
      return { ...prev, [msgId]: msgReactions }
    })
    setEmojiPickerFor(null)
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
                    if (tab === "Activity") navigate("/activity")
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
            {effectiveFile?.name ?? "Loading…"}
          </span>
          <span className="ml-2 rounded-md border border-blue-500/30 bg-blue-500/10 px-2 py-0.5 text-[10px] font-semibold text-blue-300">
            AES-256
          </span>
        </div>
      </header>

      {/* Body */}
      <div className="flex flex-1 overflow-hidden">
        {activeTab === "Audit Log" && id ? (
          <AuditLogViewer fileId={id} />
        ) : activeTab === "Versions" && id ? (
          <VersionHistoryPanel
            fileId={id}
            fileOwnerId={effectiveFile?.userId ?? ""}
            versionPolicy={effectiveFile?.versionPolicy ?? "admin_only"}
            fileName={effectiveFile?.name ?? "file"}
            myRole={file ? "owner" : remoteFile?.role ?? "viewer"}
          />
        ) : (
          <>
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
              ) : isPreviewable ? (
                <iframe
                  src={fileUrl}
                  title={file?.name ?? "File"}
                  className="border-0"
                  style={{ width: "100%", height: "100%", flex: 1 }}
                />
              ) : (
                <div className="flex flex-1 items-center justify-center p-8">
                  <div className="flex flex-col items-center gap-4 text-center text-slate-400">
                    <Download size={32} className="text-slate-500" />
                    <div>
                      <p className="text-sm font-semibold text-slate-200">Preview not available</p>
                      <p className="mt-1 text-xs text-slate-500">
                        This file type can't be displayed in the browser.
                      </p>
                    </div>
                    <button
                      onClick={() => file && downloadFile(file.id, file.name)}
                      className="inline-flex items-center gap-2 rounded-lg bg-violet-600 px-4 py-2 text-xs font-semibold text-white hover:bg-violet-500 transition-colors"
                    >
                      <Download size={14} /> Download file
                    </button>
                  </div>
                </div>
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
          <div className="flex shrink-0 flex-col border-b border-white/5 px-4 py-3 gap-2">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-white">Comments & Chat</h3>
              <div className="flex gap-1 text-slate-500">
                <span className="text-xs">· · ·</span>
              </div>
            </div>
            {/* Admin-only chat toggle — visible only to file owner */}
            {isOwner && (
              <div
                className={`flex items-center justify-between rounded-lg border px-3 py-2 transition-colors duration-200 ${
                  adminOnlyChat
                    ? "border-amber-500/60 bg-amber-500/15"
                    : "border-slate-700 bg-slate-800/50"
                }`}
              >
                <div className="flex items-center gap-2">
                  {adminOnlyChat ? (
                    <Lock size={13} className="text-amber-400" />
                  ) : (
                    <ShieldCheck size={13} className="text-slate-500" />
                  )}
                  <div className="flex flex-col leading-tight">
                    <span className={`text-[10px] font-bold uppercase tracking-wider ${adminOnlyChat ? "text-amber-300" : "text-slate-400"}`}>
                      Admin Only
                    </span>
                    <span className={`text-[10px] ${adminOnlyChat ? "text-amber-400/80" : "text-slate-500"}`}>
                      {adminOnlyChat ? "Active · only you can send" : "Off · everyone can chat"}
                    </span>
                  </div>
                </div>
                <button
                  onClick={() => setAdminOnly(!adminOnlyChat)}
                  role="switch"
                  aria-checked={adminOnlyChat}
                  className={`relative inline-flex h-5 w-10 shrink-0 items-center rounded-full transition-colors duration-200 focus:outline-none ${
                    adminOnlyChat ? "bg-amber-500" : "bg-slate-600"
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-sm transition-transform duration-200 ${
                      adminOnlyChat ? "translate-x-[22px]" : "translate-x-0.5"
                    }`}
                  />
                </button>
              </div>
            )}
            {/* Banner shown to non-owners when admin-only mode is active */}
            {adminOnlyChat && !isOwner && (
              <div className="flex items-center gap-2 rounded-lg border border-amber-500/50 bg-amber-500/15 px-3 py-2">
                <Lock size={13} className="shrink-0 text-amber-400" />
                <span className="text-[11px] font-medium text-amber-300">Admin-only mode · read only</span>
              </div>
            )}
          </div>

          {/* Scrollable content */}
          <div className="flex-1 overflow-y-auto">
            {/* Chat messages */}
            <div className="space-y-3 p-4">
              {chatMessages.length === 0 && (
                <p className="text-center text-[11px] text-slate-600 py-4">
                  No messages yet. Start the conversation.
                </p>
              )}
              {chatMessages.map((msg, idx) => {
                const isMe = !!myEmail && !!msg.userEmail && msg.userEmail === myEmail
                const initials = (msg.userName || "?")
                  .split(" ")
                  .map((n) => n[0])
                  .join("")
                  .toUpperCase()
                  .slice(0, 2)
                const msgDate = new Date(msg.timestamp)
                const time = msgDate.toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                })

                const prevMsg = idx > 0 ? chatMessages[idx - 1] : null
                const prevDate = prevMsg ? new Date(prevMsg.timestamp) : null
                const showDateSeparator = !prevDate ||
                  msgDate.toDateString() !== prevDate.toDateString()

                const formatDate = (date: Date) => {
                  const today = new Date()
                  const yesterday = new Date(today)
                  yesterday.setDate(yesterday.getDate() - 1)

                  if (date.toDateString() === today.toDateString()) {
                    return "Today"
                  } else if (date.toDateString() === yesterday.toDateString()) {
                    return "Yesterday"
                  } else {
                    return date.toLocaleDateString([], {
                      month: "short",
                      day: "numeric",
                    })
                  }
                }

                const msgReactions = reactions[msg.id] ?? {}
                const lines = msg.content.split("\n")
                const isReply = lines.length > 1 && lines[0].startsWith("↩ ")
                const replyPreview = isReply ? lines[0] : null
                const mainContent = isReply ? lines.slice(1).join("\n") : msg.content

                return (
                  <div key={msg.id}>
                    {showDateSeparator && (
                      <div className="flex items-center gap-3 my-3">
                        <div className="flex-1 h-px bg-slate-700" />
                        <span className="text-[10px] text-slate-500 font-medium">
                          {formatDate(msgDate)}
                        </span>
                        <div className="flex-1 h-px bg-slate-700" />
                      </div>
                    )}
                    <div className={`group flex items-end gap-1 mb-1 ${isMe ? "flex-row-reverse" : "flex-row"}`}>
                      {!isMe && (
                        <div className="h-7 w-7 shrink-0 rounded-full bg-slate-700 flex items-center justify-center text-[10px] font-bold text-white">
                          {initials}
                        </div>
                      )}
                      <div className={`flex flex-col max-w-[72%] ${isMe ? "items-end" : "items-start"}`}>
                        {!isMe && (
                          <span className="mb-0.5 text-[10px] font-semibold text-slate-300">
                            {msg.userName}
                          </span>
                        )}
                        <div
                          className={`rounded-xl px-3 py-2 text-xs leading-relaxed break-words ${
                            isMe
                              ? "rounded-tr-sm bg-blue-600 text-white"
                              : "rounded-tl-sm bg-slate-800 text-slate-200"
                          }`}
                        >
                          {replyPreview && (
                            <div className={`mb-1.5 rounded-lg px-2 py-1 text-[10px] border-l-2 ${isMe ? "border-blue-300 bg-blue-700/50 text-blue-100" : "border-slate-500 bg-slate-700/60 text-slate-400"}`}>
                              {replyPreview}
                            </div>
                          )}
                          {mainContent}
                        </div>
                        {/* Reactions */}
                        {Object.keys(msgReactions).length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-1">
                            {Object.entries(msgReactions).map(([emoji, users]) => (
                              <button
                                key={emoji}
                                onClick={() => toggleReaction(msg.id, emoji)}
                                className={`flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[10px] border transition-colors ${
                                  users.includes(myEmail)
                                    ? "border-blue-500 bg-blue-500/20 text-blue-300"
                                    : "border-slate-600 bg-slate-800 text-slate-300 hover:border-slate-500"
                                }`}
                              >
                                {emoji} <span>{users.length}</span>
                              </button>
                            ))}
                          </div>
                        )}
                        <span className="text-[9px] mt-0.5 text-slate-500">{time}</span>
                      </div>

                      {/* Hover action buttons */}
                      <div className={`relative flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity mb-5 ${isMe ? "flex-row-reverse" : "flex-row"}`}>
                        <button
                          onClick={() => setReplyTo({ id: msg.id, userName: msg.userName, content: mainContent })}
                          className="rounded p-1 text-slate-500 hover:bg-slate-700 hover:text-slate-200"
                          title="Reply"
                        >
                          <Reply size={12} />
                        </button>
                        <div className="relative">
                          <button
                            onClick={() => setEmojiPickerFor(emojiPickerFor === msg.id ? null : msg.id)}
                            className="rounded p-1 text-slate-500 hover:bg-slate-700 hover:text-slate-200 text-[11px]"
                            title="React"
                          >
                            😊
                          </button>
                          {emojiPickerFor === msg.id && (
                            <div className={`absolute bottom-7 z-20 flex gap-1 rounded-xl border border-slate-600 bg-slate-800 p-1.5 shadow-xl ${isMe ? "right-0" : "left-0"}`}>
                              {EMOJI_OPTIONS.map((emoji) => (
                                <button
                                  key={emoji}
                                  onClick={() => toggleReaction(msg.id, emoji)}
                                  className="rounded-lg p-1 text-base hover:bg-slate-700 transition-colors"
                                >
                                  {emoji}
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                )
              })}
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
            {/* Admin-only mode status shown right above the message box */}
            {adminOnlyChat && (
              <div
                className={`flex items-center gap-2 mb-2 rounded-lg border px-3 py-1.5 ${
                  isOwner
                    ? "border-amber-500/50 bg-amber-500/10"
                    : "border-amber-500/50 bg-amber-500/15"
                }`}
              >
                <Lock size={12} className="shrink-0 text-amber-400" />
                <span className="text-[11px] font-medium text-amber-300">
                  {isOwner
                    ? "Admin-only mode is ON — only you can send messages"
                    : "Admin-only mode is ON — only the owner can send messages"}
                </span>
              </div>
            )}
            {replyTo && (
              <div className="flex items-center justify-between mb-2 rounded-lg border border-slate-700 bg-slate-800/60 px-3 py-1.5">
                <div className="flex items-center gap-2 min-w-0">
                  <Reply size={11} className="shrink-0 text-blue-400" />
                  <span className="text-[10px] text-slate-400 truncate">
                    <span className="font-semibold text-slate-300">{replyTo.userName}</span>: {replyTo.content.slice(0, 50)}{replyTo.content.length > 50 ? "…" : ""}
                  </span>
                </div>
                <button onClick={() => setReplyTo(null)} className="ml-2 shrink-0 text-slate-500 hover:text-slate-300">
                  <X size={12} />
                </button>
              </div>
            )}
            <form onSubmit={sendMessage} className="flex items-center gap-2">
              <input
                type="text"
                placeholder={
                  !canSendMessage
                    ? "Admin-only mode — you cannot send messages"
                    : chatConnected
                    ? "Add a comment or message..."
                    : "Connecting…"
                }
                value={input}
                onChange={(e) => setInput(e.target.value)}
                disabled={!canSendMessage}
                className="flex-1 rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-xs text-white placeholder:text-slate-600 focus:border-blue-500 focus:outline-none disabled:cursor-not-allowed disabled:opacity-40"
              />
              <button type="button" disabled={!canSendMessage} className="text-slate-500 hover:text-slate-300 disabled:opacity-40">
                <AtSign size={15} />
              </button>
              <button
                type="submit"
                disabled={!canSendMessage}
                className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-600 text-white hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-40"
              >
                <Send size={12} />
              </button>
            </form>
          </div>
        </div>
          </>
        )}
      </div>
    </div>
  )
}
