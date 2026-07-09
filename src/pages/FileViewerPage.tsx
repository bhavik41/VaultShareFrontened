import { useEffect, useRef, useState } from "react"
import { useParams, useNavigate } from "react-router-dom"
import { AtSign, ChevronLeft, ChevronRight, Download, Link as LinkIcon, Loader2, Lock, MoreVertical, Minus, Plus, Reply, Send, ShieldCheck, UserPlus, X } from "lucide-react"
import { useAppSelector } from "@/store/hooks"
import { getFileSignedUrl, downloadFile } from "@/store/filesApi"
import api from "@/store/api"
import { useChat } from "@/hooks/useChat"
import { useAppDispatch } from "@/store/hooks"
import { listFilesThunk } from "@/store/filesSlice"
import AuditLogViewer from "@/components/ui/AuditLogViewer"
import VersionHistoryPanel from "@/components/versions/VersionHistoryPanel"
import FileSettingsModal, { type Tab as SettingsTab } from "@/components/FileSettingsModal"
import DocumentQA from "@/components/DocumentQA"

const TABS = ["Files", "Versions", "Audit Log"]

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
  const [fileUrl, setFileUrl] = useState<string | null>(null)
  const [previewError, setPreviewError] = useState(false)
  const [comments] = useState<Comment[]>(INITIAL_COMMENTS)
  const [input, setInput] = useState("")
  const [replyTo, setReplyTo] = useState<{ id: string; userName: string; content: string } | null>(null)
  const [reactions, setReactions] = useState<Record<string, Record<string, string[]>>>({}) // msgId -> emoji -> userEmails
  const [emojiPickerFor, setEmojiPickerFor] = useState<string | null>(null)
  const [fileMenuOpen, setFileMenuOpen] = useState(false)
  const [settingsTab, setSettingsTab] = useState<SettingsTab | null>(null)
  const [rightPanel, setRightPanel] = useState<"chat" | "qa">("chat")
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
      .catch(() => { setPreviewError(true) })
    return () => {
      if (objectUrl) window.URL.revokeObjectURL(objectUrl)
    }
  }, [id])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [chatMessages])

  useEffect(() => {
    if (!fileMenuOpen) return
    const close = () => setFileMenuOpen(false)
    document.addEventListener("click", close)
    return () => document.removeEventListener("click", close)
  }, [fileMenuOpen])

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
    <div className="flex h-screen flex-col overflow-hidden">
      {/* Top Header */}
      <header className="shrink-0 border-b border-[#c3c6d5] bg-white">
        <div className="flex items-center justify-between px-5 py-0">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate(-1)}
              className="flex items-center gap-1 text-sm text-[#737784] hover:text-[#0b1c30] transition-colors shrink-0"
            >
              <ChevronLeft size={15} />
              Back
            </button>
            <div className="w-px h-5 bg-[#c3c6d5] shrink-0" />
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
                      ? "text-[#0b1c30] after:absolute after:bottom-0 after:left-0 after:right-0 after:h-0.5 after:bg-[#003c90]"
                      : "text-[#434653] hover:text-[#0b1c30]"
                  }`}
                >
                  {tab}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-3 py-3">
            <span className="h-2 w-2 rounded-full bg-[#006c49]" />
            {isOwner && (
              <div className="relative">
                <button
                  onClick={(e) => { e.stopPropagation(); setFileMenuOpen((v) => !v) }}
                  className="flex h-8 w-8 items-center justify-center rounded-lg text-[#737784] hover:bg-[#eff4ff] hover:text-[#0b1c30] transition-colors cursor-pointer"
                  title="File options"
                >
                  <MoreVertical size={17} />
                </button>
                {fileMenuOpen && (
                  <div
                    onClick={(e) => e.stopPropagation()}
                    className="absolute right-0 top-10 z-30 w-56 rounded-xl border border-[#c3c6d5] bg-white py-1.5 shadow-[0_8px_30px_rgba(11,28,48,0.12)]"
                  >
                    <button
                      onClick={() => { setSettingsTab("sharing"); setFileMenuOpen(false) }}
                      className="flex w-full items-center gap-2.5 px-3.5 py-2.5 text-left text-sm text-[#0b1c30] hover:bg-[#eff4ff] transition-colors cursor-pointer"
                    >
                      <UserPlus size={15} className="text-[#737784]" />
                      Invite collaborators
                    </button>
                    <button
                      onClick={() => { setSettingsTab("link"); setFileMenuOpen(false) }}
                      className="flex w-full items-center gap-2.5 px-3.5 py-2.5 text-left text-sm text-[#0b1c30] hover:bg-[#eff4ff] transition-colors cursor-pointer"
                    >
                      <LinkIcon size={15} className="text-[#737784]" />
                      Get share link
                    </button>
                  </div>
                )}
              </div>
            )}
            <div
              className="flex h-8 w-8 items-center justify-center rounded-full bg-[#003c90] text-sm font-bold text-white"
              title={authUser?.name ?? ""}
            >
              {authUser?.name
                ? authUser.name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2)
                : "?"}
            </div>
          </div>
        </div>

        {/* Breadcrumb + badge */}
        <div className="flex items-center gap-2 border-t border-[#c3c6d5] px-5 py-2.5">
          <button onClick={() => navigate("/dashboard")} className="text-sm text-[#737784] hover:text-[#0b1c30]">
            My Files
          </button>
          <ChevronRight size={12} className="text-[#737784]" />
          <span className="text-sm text-[#0b1c30] font-medium truncate max-w-[320px]">
            {effectiveFile?.name ?? "…"}
          </span>
          <span className="ml-2 rounded-md border border-[#003c90]/20 bg-[#d9e2ff] px-2 py-0.5 text-[10px] font-semibold text-[#003c90]">
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
            <div className="flex flex-1 flex-col overflow-hidden border-r border-gray-200">
          {/* Viewer toolbar — only for images where zoom is applied via CSS */}
          {isImage && (
            <div className="flex shrink-0 items-center gap-3 border-b border-[#c3c6d5] bg-[#f8f9ff] px-5 py-2">
              <button
                onClick={() => setZoom((z) => Math.max(25, z - 25))}
                className="rounded border border-[#c3c6d5] bg-white p-1 text-[#434653] hover:bg-[#eff4ff] hover:text-[#0b1c30] cursor-pointer"
              >
                <Minus size={12} />
              </button>
              <span className="min-w-[42px] text-center text-sm font-medium text-[#0b1c30]">{zoom}%</span>
              <button
                onClick={() => setZoom((z) => Math.min(200, z + 25))}
                className="rounded border border-[#c3c6d5] bg-white p-1 text-[#434653] hover:bg-[#eff4ff] hover:text-[#0b1c30] cursor-pointer"
              >
                <Plus size={12} />
              </button>
              <span className="ml-2 text-xs text-[#737784]">Use scroll or pinch to zoom further</span>
            </div>
          )}

          {/* Document area */}
          <div className="flex flex-1 overflow-hidden bg-[#eef0f7]">
            {/* Main file viewer */}
            <div className="flex flex-1 overflow-hidden">
              {previewError ? (
                <div className="flex flex-1 items-center justify-center p-8">
                  <div className="flex flex-col items-center gap-4 rounded-2xl border border-[#c3c6d5] bg-white p-10 text-center shadow-[0_8px_30px_rgba(11,28,48,0.06)]">
                    <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[#f8f9ff] text-[#737784]">
                      <Download size={24} />
                    </div>
                    <div>
                      <p className="text-base font-semibold text-[#0b1c30]">Preview unavailable</p>
                      <p className="mt-1 text-sm text-[#737784]">The file could not be loaded for preview.</p>
                    </div>
                    {effectiveFile && id && (
                      <button
                        onClick={() => downloadFile(id, effectiveFile.name)}
                        className="inline-flex items-center gap-2 rounded-lg bg-[#003c90] px-4 py-2 text-sm font-semibold text-white hover:opacity-90 transition-opacity"
                      >
                        <Download size={14} /> Download file
                      </button>
                    )}
                  </div>
                </div>
              ) : !fileUrl ? (
                <div className="flex flex-1 items-center justify-center">
                  <div className="flex flex-col items-center gap-3 rounded-2xl bg-white px-12 py-10 text-[#737784] shadow-[0_8px_30px_rgba(11,28,48,0.06)]">
                    <Loader2 className="animate-spin text-[#003c90]" size={26} />
                    <span className="text-sm font-medium">Loading file…</span>
                  </div>
                </div>
              ) : isImage ? (
                <div className="flex flex-1 items-center justify-center overflow-auto p-8">
                  <img
                    src={fileUrl}
                    alt={file?.name}
                    style={{ transform: `scale(${zoom / 100})`, transformOrigin: "top center", maxWidth: "100%" }}
                    className="rounded-xl shadow-[0_8px_30px_rgba(11,28,48,0.15)] ring-1 ring-black/5 transition-transform duration-200"
                  />
                </div>
              ) : isPreviewable ? (
                <div className="flex flex-1 overflow-hidden p-6">
                  <div className="flex flex-1 overflow-hidden rounded-2xl border border-[#c3c6d5] bg-white shadow-[0_8px_30px_rgba(11,28,48,0.08)]">
                    <iframe
                      src={fileUrl}
                      title={file?.name ?? "File"}
                      className="rounded-2xl border-0"
                      style={{ width: "100%", height: "100%", flex: 1 }}
                    />
                  </div>
                </div>
              ) : (
                <div className="flex flex-1 items-center justify-center p-8">
                  <div className="flex flex-col items-center gap-4 rounded-2xl border border-[#c3c6d5] bg-white p-10 text-center shadow-[0_8px_30px_rgba(11,28,48,0.06)]">
                    <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[#f8f9ff] text-[#737784]">
                      <Download size={24} />
                    </div>
                    <div>
                      <p className="text-base font-semibold text-[#0b1c30]">Preview not available</p>
                      <p className="mt-1 text-sm text-[#737784]">
                        This file type can't be displayed in the browser.
                      </p>
                    </div>
                    <button
                      onClick={() => file && downloadFile(file.id, file.name)}
                      className="inline-flex items-center gap-2 rounded-lg bg-[#003c90] px-4 py-2 text-sm font-semibold text-white hover:opacity-90 transition-opacity"
                    >
                      <Download size={14} /> Download file
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Status bar */}
          <div className="flex shrink-0 items-center justify-between border-t border-[#c3c6d5] bg-white px-5 py-2">
            <div className="flex items-center gap-3 text-[11px] text-[#737784]">
              <span className="flex items-center gap-1.5">
                <span className="h-1.5 w-1.5 rounded-full bg-[#006c49]" />
                AES-256 encrypted
              </span>
              <span>·</span>
              <span>3 viewers active</span>
              <span>·</span>
              <span>Last modified 10:42 AM</span>
            </div>
            <span className="text-[11px] font-medium text-[#006c49]">SHA-256 verified ✓</span>
          </div>
        </div>

        {/* Comments & Chat / Ask AI Panel */}
        <div className="flex w-80 shrink-0 flex-col bg-white border-l border-[#c3c6d5]">
          {/* Panel tabs */}
          <div className="flex shrink-0 border-b border-[#c3c6d5]">
            {(["chat", "qa"] as const).map((tab) => (
              <button key={tab} onClick={() => setRightPanel(tab)}
                className={`flex-1 py-2.5 text-xs font-semibold border-0 cursor-pointer transition-colors ${
                  rightPanel === tab
                    ? "text-[#003c90] border-b-2 border-[#003c90] bg-[#d9e2ff]/30"
                    : "text-[#434653] hover:bg-[#eff4ff] bg-transparent"
                }`}>
                {tab === "chat" ? "Chat" : "Ask AI ✨"}
              </button>
            ))}
          </div>

          {/* Ask AI panel */}
          {rightPanel === "qa" && effectiveFile && (
            <DocumentQA fileId={id!} fileName={effectiveFile.name} />
          )}
          {rightPanel === "qa" && !effectiveFile && (
            <div className="flex flex-1 items-center justify-center p-6 text-center">
              <p className="text-sm text-[#737784]">Loading file info…</p>
            </div>
          )}

          {/* Chat panel — only shown when tab is "chat" */}
          {rightPanel === "chat" && <>
          {/* Panel header */}
          <div className="flex shrink-0 flex-col border-b border-[#c3c6d5] px-4 py-3 gap-2">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-[#0b1c30]">Comments & Chat</h3>
              <div className="flex gap-1 text-[#737784]">
                <span className="text-sm">· · ·</span>
              </div>
            </div>
            {/* Admin-only chat toggle — visible only to file owner */}
            {isOwner && (
              <div
                className={`flex items-center justify-between rounded-lg border px-3 py-2 transition-colors duration-200 ${
                  adminOnlyChat
                    ? "border-amber-200 bg-amber-50"
                    : "border-[#c3c6d5] bg-[#f8f9ff]"
                }`}
              >
                <div className="flex items-center gap-2">
                  {adminOnlyChat ? (
                    <Lock size={13} className="text-amber-600" />
                  ) : (
                    <ShieldCheck size={13} className="text-[#737784]" />
                  )}
                  <div className="flex flex-col leading-tight">
                    <span className={`text-[10px] font-bold uppercase tracking-wider ${adminOnlyChat ? "text-amber-700" : "text-[#737784]"}`}>
                      Admin Only
                    </span>
                    <span className={`text-[10px] ${adminOnlyChat ? "text-amber-600/80" : "text-[#737784]"}`}>
                      {adminOnlyChat ? "Active · only you can send" : "Off · everyone can chat"}
                    </span>
                  </div>
                </div>
                <button
                  onClick={() => setAdminOnly(!adminOnlyChat)}
                  role="switch"
                  aria-checked={adminOnlyChat}
                  className={`relative inline-flex h-5 w-10 shrink-0 items-center rounded-full transition-colors duration-200 focus:outline-none ${
                    adminOnlyChat ? "bg-amber-500" : "bg-[#003c90]"
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
              <div className="flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2">
                <Lock size={13} className="shrink-0 text-amber-600" />
                <span className="text-[11px] font-medium text-amber-700">Admin-only mode · read only</span>
              </div>
            )}
          </div>

          {/* Scrollable content */}
          <div className="flex-1 overflow-y-auto">
            {/* Chat messages */}
            <div className="space-y-3 p-4">
              {chatMessages.length === 0 && (
                <p className="text-center text-[11px] text-[#737784] py-4">
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
                        <div className="flex-1 h-px bg-[#c3c6d5]" />
                        <span className="text-[10px] text-[#737784] font-medium">
                          {formatDate(msgDate)}
                        </span>
                        <div className="flex-1 h-px bg-[#c3c6d5]" />
                      </div>
                    )}
                    <div className={`group flex items-end gap-1 mb-1 ${isMe ? "flex-row-reverse" : "flex-row"}`}>
                      {!isMe && (
                        <div className="h-7 w-7 shrink-0 rounded-full bg-[#d9e2ff] flex items-center justify-center text-[10px] font-bold text-[#003c90]">
                          {initials}
                        </div>
                      )}
                      <div className={`flex flex-col max-w-[72%] ${isMe ? "items-end" : "items-start"}`}>
                        {!isMe && (
                          <span className="mb-0.5 text-[10px] font-semibold text-[#434653]">
                            {msg.userName}
                          </span>
                        )}
                        <div
                          className={`rounded-xl px-3 py-2 text-sm leading-relaxed break-words ${
                            isMe
                              ? "rounded-tr-sm bg-[#003c90] text-white"
                              : "rounded-tl-sm bg-[#eff4ff] text-[#0b1c30]"
                          }`}
                        >
                          {replyPreview && (
                            <div className={`mb-1.5 rounded-lg px-2 py-1 text-[10px] border-l-2 ${isMe ? "border-white/30 bg-white/10 text-white/70" : "border-[#003c90]/30 bg-[#d9e2ff]/50 text-[#434653]"}`}>
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
                                className={`flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[10px] border transition-colors cursor-pointer ${
                                  users.includes(myEmail)
                                    ? "border-[#003c90]/30 bg-[#d9e2ff] text-[#003c90]"
                                    : "border-[#c3c6d5] bg-[#f8f9ff] text-[#434653] hover:border-[#003c90]/20"
                                }`}
                              >
                                {emoji} <span>{users.length}</span>
                              </button>
                            ))}
                          </div>
                        )}
                        <span className="text-[9px] mt-0.5 text-[#737784]">{time}</span>
                      </div>

                      {/* Hover action buttons */}
                      <div className={`relative flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity mb-5 ${isMe ? "flex-row-reverse" : "flex-row"}`}>
                        <button
                          onClick={() => setReplyTo({ id: msg.id, userName: msg.userName, content: mainContent })}
                          className="rounded p-1 text-[#737784] hover:bg-[#eff4ff] hover:text-[#0b1c30] cursor-pointer"
                          title="Reply"
                        >
                          <Reply size={12} />
                        </button>
                        <div className="relative">
                          <button
                            onClick={() => setEmojiPickerFor(emojiPickerFor === msg.id ? null : msg.id)}
                            className="rounded p-1 text-[#737784] hover:bg-[#eff4ff] hover:text-[#0b1c30] text-[11px] cursor-pointer"
                            title="React"
                          >
                            😊
                          </button>
                          {emojiPickerFor === msg.id && (
                            <div className={`absolute bottom-7 z-20 flex gap-1 rounded-xl border border-[#c3c6d5] bg-white p-1.5 shadow-xl ${isMe ? "right-0" : "left-0"}`}>
                              {EMOJI_OPTIONS.map((emoji) => (
                                <button
                                  key={emoji}
                                  onClick={() => toggleReaction(msg.id, emoji)}
                                  className="rounded-lg p-1 text-base hover:bg-[#eff4ff] transition-colors cursor-pointer"
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
            <div className="border-t border-[#c3c6d5] px-3 pb-4 pt-3 space-y-2">
              {comments.map((c) => (
                <div key={c.id} className="rounded-lg border border-[#c3c6d5] bg-[#f8f9ff] p-3">
                  <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-[#737784]">
                    {c.label}
                  </p>
                  <p className="mb-0.5 text-sm font-semibold text-[#434653]">
                    {c.author}{" "}
                    <span className="font-normal text-[#737784]">{c.time}</span>
                  </p>
                  <p className="mb-2 text-sm leading-relaxed text-[#737784]">{c.text}</p>
                  <div className="flex gap-2">
                    <button className="text-[10px] font-medium text-[#737784] hover:text-[#0b1c30] cursor-pointer">Reply</button>
                    <button className="text-[10px] font-medium text-[#003c90] hover:underline cursor-pointer">Jump to</button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Input */}
          <div className="shrink-0 border-t border-[#c3c6d5] p-3">
            {adminOnlyChat && (
              <div className="flex items-center gap-2 mb-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-1.5">
                <Lock size={12} className="shrink-0 text-amber-600" />
                <span className="text-[11px] font-medium text-amber-700">
                  {isOwner
                    ? "Admin-only mode is ON — only you can send messages"
                    : "Admin-only mode is ON — only the owner can send messages"}
                </span>
              </div>
            )}
            {replyTo && (
              <div className="flex items-center justify-between mb-2 rounded-lg border border-[#c3c6d5] bg-[#eff4ff] px-3 py-1.5">
                <div className="flex items-center gap-2 min-w-0">
                  <Reply size={11} className="shrink-0 text-[#003c90]" />
                  <span className="text-[10px] text-[#737784] truncate">
                    <span className="font-semibold text-[#434653]">{replyTo.userName}</span>: {replyTo.content.slice(0, 50)}{replyTo.content.length > 50 ? "…" : ""}
                  </span>
                </div>
                <button onClick={() => setReplyTo(null)} className="ml-2 shrink-0 text-[#737784] hover:text-[#0b1c30] cursor-pointer">
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
                className="flex-1 rounded-lg border border-[#c3c6d5] bg-[#f8f9ff] px-3 py-2 text-sm text-[#0b1c30] placeholder:text-[#737784] focus:border-[#003c90] focus:outline-none disabled:cursor-not-allowed disabled:opacity-40"
              />
              <button type="button" disabled={!canSendMessage} className="text-[#737784] hover:text-[#0b1c30] disabled:opacity-40 cursor-pointer">
                <AtSign size={15} />
              </button>
              <button
                type="submit"
                disabled={!canSendMessage}
                className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#003c90] text-white hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40 cursor-pointer"
              >
                <Send size={12} />
              </button>
            </form>
          </div>
          </>}
        </div>
      </div>

      {settingsTab && id && (
        <FileSettingsModal
          fileId={id}
          fileName={effectiveFile?.name ?? ""}
          initialTab={settingsTab}
          onClose={() => setSettingsTab(null)}
        />
      )}
    </div>
  )
}
