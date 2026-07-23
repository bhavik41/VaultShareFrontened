import { useEffect, useRef, useState } from "react"
import { useParams, useNavigate } from "react-router-dom"
import { AtSign, ChevronLeft, ChevronRight, Download, Link as LinkIcon, Loader2, Lock, MoreVertical, Minus, Plus, Reply, Send, ShieldCheck, UserPlus, X } from "lucide-react"
import { useAppSelector } from "@/store/hooks"
import { getFileSignedUrl, downloadFile, downloadFileWithKey, KEY_NOT_FOUND_MESSAGE } from "@/store/filesApi"
import KeyRecoveryModal from "@/components/KeyRecoveryModal"
import api from "@/store/api"
import { useChat } from "@/hooks/useChat"
import { useAppDispatch } from "@/store/hooks"
import { listFilesThunk } from "@/store/filesSlice"
import AuditLogViewer from "@/components/ui/AuditLogViewer"
import VersionHistoryPanel from "@/components/versions/VersionHistoryPanel"
import FileSettingsModal, { type Tab as SettingsTab } from "@/components/FileSettingsModal"
import DocumentQA from "@/components/DocumentQA"

const TABS = ["Files", "Versions", "Audit Log"]

interface PptxRun { text: string; bold?: boolean; italic?: boolean; sizePx?: number; color?: string }
interface PptxPara { runs: PptxRun[] }
interface PptxShape { id: string; xPx: number; yPx: number; wPx: number; hPx: number; paras: PptxPara[] }
interface PptxImage { id: string; xPx: number; yPx: number; wPx: number; hPx: number; src: string }
interface PptxSlideData { index: number; shapes: PptxShape[]; images: PptxImage[]; bgColor: string }

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
  const [docxHtml, setDocxHtml] = useState<string | null>(null)
  const [xlsxHtml, setXlsxHtml] = useState<string | null>(null)
  const [pptxSlides, setPptxSlides] = useState<PptxSlideData[] | null>(null)
  const [pptxScale, setPptxScale] = useState(1)
  const [pptxPdfUrl, setPptxPdfUrl] = useState<string | null>(null)
  const [panelWidth, setPanelWidth] = useState(320)
  const [keyRecovery, setKeyRecovery] = useState<{ fileId: string; fileName: string } | null>(null)
  const [recoverySubmitting, setRecoverySubmitting] = useState(false)
  const [recoveryError, setRecoveryError] = useState("")
  const isDragging = useRef(false)
  const dragStartX = useRef(0)
  const dragStartWidth = useRef(0)
  const docxContainerRef = useRef<HTMLDivElement>(null)
  const pptxViewportRef = useRef<HTMLDivElement>(null)
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
  const isVideo = mimeType.startsWith("video/")
  const isAudio = mimeType.startsWith("audio/")
  const isText =
    mimeType.startsWith("text/") ||
    mimeType === "application/json" ||
    mimeType === "application/xml"
  const isDocx = mimeType === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" || mimeType === "application/msword"
  const isXlsx = mimeType === "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" || mimeType === "application/vnd.ms-excel"
  const isPptx = mimeType === "application/vnd.openxmlformats-officedocument.presentationml.presentation" || mimeType === "application/vnd.ms-powerpoint"
  const isPreviewable = isImage || isPdf || isText || isVideo || isAudio || isDocx || isXlsx
  const isEncrypted = file?.isEncrypted ?? false

  // Decrypts in-browser when the file is encrypted; routes to the key
  // recovery modal instead of silently saving raw ciphertext if the local
  // decryption key is missing.
  function handleDownloadClick(fileId: string, fileName: string) {
    downloadFile(fileId, fileName, { isEncrypted, mimeType }).catch((err: Error) => {
      if (err.message === KEY_NOT_FOUND_MESSAGE) {
        setRecoveryError("")
        setKeyRecovery({ fileId, fileName })
      }
    })
  }

  async function handleRecoverySubmit(key: string) {
    if (!keyRecovery) return
    setRecoverySubmitting(true)
    setRecoveryError("")
    try {
      await downloadFileWithKey(keyRecovery.fileId, keyRecovery.fileName, key, mimeType)
      setKeyRecovery(null)
    } catch (err: any) {
      setRecoveryError(err?.message ?? "Failed to decrypt with this key.")
    } finally {
      setRecoverySubmitting(false)
    }
  }
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
    if (!fileUrl) return
    if (isDocx) {
      fetch(fileUrl)
        .then((r) => r.arrayBuffer())
        .then(async (buf) => {
          const { renderAsync } = await import("docx-preview")
          const container = document.createElement("div")
          await renderAsync(buf, container, undefined, { className: "docx-preview" })
          setDocxHtml(container.innerHTML)
        })
        .catch(() => setPreviewError(true))
    } else if (isXlsx) {
      fetch(fileUrl)
        .then((r) => r.arrayBuffer())
        .then(async (buf) => {
          const XLSX = await import("xlsx")
          const wb = XLSX.read(buf, { type: "array" })
          const ws = wb.Sheets[wb.SheetNames[0]]
          const html = XLSX.utils.sheet_to_html(ws, { id: "xlsx-table" })
          setXlsxHtml(html)
        })
        .catch(() => setPreviewError(true))
    } else if (isPptx) {
      // Try backend PDF conversion first (requires LibreOffice on server)
      api.get(`/files/${id}/preview-pdf`, { responseType: "arraybuffer" })
        .then((res) => {
          const blob = new Blob([res.data], { type: "application/pdf" })
          setPptxPdfUrl(URL.createObjectURL(blob))
        })
        .catch(() => {
          // LibreOffice not installed — fall back to client-side renderer
        })

      fetch(fileUrl)
        .then((r) => r.arrayBuffer())
        .then(async (buf) => {
          const { unzipSync, strFromU8 } = await import("fflate")
          const files = unzipSync(new Uint8Array(buf))

          const domParse = (data: Uint8Array) => {
            // Strip namespace prefixes so querySelector works without NS-aware APIs
            const clean = strFromU8(data)
              .replace(/ xmlns:\w+="[^"]*"/g, "")
              .replace(/<(\/?)\w+:/g, "<$1")
            return new DOMParser().parseFromString(clean, "text/xml")
          }

          // Actual slide dimensions
          let EMU_W = 9144000, EMU_H = 5143500
          if (files["ppt/presentation.xml"]) {
            const pres = domParse(files["ppt/presentation.xml"])
            const sz = pres.querySelector("sldSz")
            if (sz) {
              EMU_W = parseInt(sz.getAttribute("cx") ?? "9144000")
              EMU_H = parseInt(sz.getAttribute("cy") ?? "5143500")
            }
          }
          const VW = 960, VH = 540
          const toX = (v: number) => Math.round(v / EMU_W * VW)
          const toY = (v: number) => Math.round(v / EMU_H * VH)
          const szPx = (sz: number) => Math.round(sz / 100 * 96 / 72)

          const slideNames = Object.keys(files)
            .filter((n) => /^ppt\/slides\/slide\d+\.xml$/.test(n))
            .sort((a, b) => parseInt(a.match(/(\d+)/)![1]) - parseInt(b.match(/(\d+)/)![1]))

          const parsed: PptxSlideData[] = []

          for (let i = 0; i < slideNames.length; i++) {
            const name = slideNames[i]
            const num = name.match(/(\d+)/)![1]
            const xml = domParse(files[name])

            // Build rId → blob URL map for images on this slide
            const imgMap: Record<string, string> = {}
            const relsKey = `ppt/slides/_rels/slide${num}.xml.rels`
            if (files[relsKey]) {
              domParse(files[relsKey]).querySelectorAll("Relationship").forEach((rel) => {
                const type = rel.getAttribute("Type") ?? ""
                const target = rel.getAttribute("Target") ?? ""
                const rId = rel.getAttribute("Id") ?? ""
                if (!type.includes("image")) return
                const imgPath = target.startsWith("../") ? `ppt/${target.slice(3)}` : `ppt/slides/${target}`
                const imgData = files[imgPath]
                if (!imgData) return
                const ext = imgPath.split(".").pop()?.toLowerCase()
                const mime = ext === "png" ? "image/png" : ext === "gif" ? "image/gif" : ext === "svg" ? "image/svg+xml" : "image/jpeg"
                imgMap[rId] = URL.createObjectURL(new Blob([imgData], { type: mime }))
              })
            }

            // Background
            let bgColor = "#ffffff"
            const bgEl = xml.querySelector("bg solidFill srgbClr")
            if (bgEl) bgColor = `#${bgEl.getAttribute("val") ?? "ffffff"}`

            // Text shapes
            const shapes: PptxShape[] = []
            xml.querySelectorAll("sp").forEach((sp) => {
              const off = sp.querySelector("spPr xfrm off")
              const ext = sp.querySelector("spPr xfrm ext")
              if (!off || !ext) return
              const xPx = toX(parseInt(off.getAttribute("x") ?? "0"))
              const yPx = toY(parseInt(off.getAttribute("y") ?? "0"))
              const wPx = toX(parseInt(ext.getAttribute("cx") ?? "0"))
              const hPx = toY(parseInt(ext.getAttribute("cy") ?? "0"))
              const txBody = sp.querySelector("txBody")
              if (!txBody) return
              const paras: PptxPara[] = []
              txBody.querySelectorAll("p").forEach((p) => {
                const runs: PptxRun[] = []
                p.querySelectorAll("r").forEach((r) => {
                  const text = r.querySelector("t")?.textContent ?? ""
                  if (!text) return
                  const rPr = r.querySelector("rPr")
                  const bold = rPr?.getAttribute("b") === "1"
                  const italic = rPr?.getAttribute("i") === "1"
                  const szAttr = rPr?.getAttribute("sz")
                  const sizePx = szAttr ? szPx(parseInt(szAttr)) : undefined
                  const clr = rPr?.querySelector("solidFill srgbClr")
                  const color = clr ? `#${clr.getAttribute("val")}` : undefined
                  runs.push({ text, bold, italic, sizePx, color })
                })
                if (runs.length) paras.push({ runs })
              })
              if (paras.length) shapes.push({ id: `t${i}-${xPx}-${yPx}`, xPx, yPx, wPx, hPx, paras })
            })

            // Images (pic elements)
            const images: PptxImage[] = []
            xml.querySelectorAll("pic").forEach((pic) => {
              const rId = pic.querySelector("blipFill blip")?.getAttribute("embed") ?? ""
              const src = imgMap[rId]
              if (!src) return
              const off = pic.querySelector("spPr xfrm off")
              const ext = pic.querySelector("spPr xfrm ext")
              if (!off || !ext) return
              const xPx = toX(parseInt(off.getAttribute("x") ?? "0"))
              const yPx = toY(parseInt(off.getAttribute("y") ?? "0"))
              const wPx = toX(parseInt(ext.getAttribute("cx") ?? "0"))
              const hPx = toY(parseInt(ext.getAttribute("cy") ?? "0"))
              images.push({ id: `p${i}-${xPx}-${yPx}`, xPx, yPx, wPx, hPx, src })
            })

            parsed.push({ index: i + 1, shapes, images, bgColor })
          }

          setPptxSlides(parsed)
        })
        .catch(() => setPreviewError(true))
    }
  }, [fileUrl, isDocx, isXlsx, isPptx])

  useEffect(() => {
    const el = pptxViewportRef.current
    if (!el || !pptxSlides) return
    const obs = new ResizeObserver(([entry]) => setPptxScale(entry.contentRect.width / 960))
    obs.observe(el)
    return () => obs.disconnect()
  }, [pptxSlides])

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
    const close = (e: MouseEvent) => {
      const target = e.target as HTMLElement
      if (target.closest("[data-emoji-picker]")) return
      setEmojiPickerFor(null)
    }
    document.addEventListener("click", close)
    return () => document.removeEventListener("click", close)
  }, [emojiPickerFor])

  function onDragStart(e: React.MouseEvent) {
    isDragging.current = true
    dragStartX.current = e.clientX
    dragStartWidth.current = panelWidth
    document.body.style.cursor = "col-resize"
    document.body.style.userSelect = "none"

    const onMove = (ev: MouseEvent) => {
      if (!isDragging.current) return
      const delta = dragStartX.current - ev.clientX
      const next = Math.min(700, Math.max(280, dragStartWidth.current + delta))
      setPanelWidth(next)
    }
    const onUp = () => {
      isDragging.current = false
      document.body.style.cursor = ""
      document.body.style.userSelect = ""
      window.removeEventListener("mousemove", onMove)
      window.removeEventListener("mouseup", onUp)
    }
    window.addEventListener("mousemove", onMove)
    window.addEventListener("mouseup", onUp)
  }

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
      <header className="shrink-0 border-b border-vs-border bg-vs-card">
        <div className="flex items-center justify-between px-5 py-0">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate(-1)}
              className="flex items-center gap-1 text-sm text-vs-muted hover:text-vs-heading transition-colors shrink-0"
            >
              <ChevronLeft size={15} />
              Back
            </button>
            <div className="w-px h-5 bg-vs-border shrink-0" />
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
                      ? "text-vs-heading after:absolute after:bottom-0 after:left-0 after:right-0 after:h-0.5 after:bg-vs-brand"
                      : "text-vs-body hover:text-vs-heading"
                  }`}
                >
                  {tab}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-3 py-3">
            <span className="h-2 w-2 rounded-full bg-vs-success" />
            {isOwner && (
              <div className="relative">
                <button
                  onClick={(e) => { e.stopPropagation(); setFileMenuOpen((v) => !v) }}
                  className="flex h-8 w-8 items-center justify-center rounded-lg text-vs-muted hover:bg-vs-hover hover:text-vs-heading transition-colors cursor-pointer"
                  title="File options"
                >
                  <MoreVertical size={17} />
                </button>
                {fileMenuOpen && (
                  <div
                    onClick={(e) => e.stopPropagation()}
                    className="absolute right-0 top-10 z-30 w-56 rounded-xl border border-vs-border bg-vs-card py-1.5 shadow-[0_8px_30px_rgba(11,28,48,0.12)]"
                  >
                    <button
                      onClick={() => { setSettingsTab("sharing"); setFileMenuOpen(false) }}
                      className="flex w-full items-center gap-2.5 px-3.5 py-2.5 text-left text-sm text-vs-heading hover:bg-vs-hover transition-colors cursor-pointer"
                    >
                      <UserPlus size={15} className="text-vs-muted" />
                      Invite collaborators
                    </button>
                    <button
                      onClick={() => { setSettingsTab("link"); setFileMenuOpen(false) }}
                      className="flex w-full items-center gap-2.5 px-3.5 py-2.5 text-left text-sm text-vs-heading hover:bg-vs-hover transition-colors cursor-pointer"
                    >
                      <LinkIcon size={15} className="text-vs-muted" />
                      Get share link
                    </button>
                  </div>
                )}
              </div>
            )}
            <div
              className="flex h-8 w-8 items-center justify-center rounded-full bg-vs-brand text-sm font-bold text-white"
              title={authUser?.name ?? ""}
            >
              {authUser?.name
                ? (authUser.name || "").split(" ").filter(Boolean).map((n) => n[0] ?? "").join("").toUpperCase().slice(0, 2) || "?"
                : "?"}
            </div>
          </div>
        </div>

        {/* Breadcrumb + badge */}
        <div className="flex items-center gap-2 border-t border-vs-border px-5 py-2.5">
          <button onClick={() => navigate("/dashboard")} className="text-sm text-vs-muted hover:text-vs-heading">
            My Files
          </button>
          <ChevronRight size={12} className="text-vs-muted" />
          <span className="text-sm text-vs-heading font-medium truncate max-w-[320px]">
            {effectiveFile?.name ?? "…"}
          </span>
          <span className="ml-2 rounded-md border border-vs-brand/20 bg-vs-active px-2 py-0.5 text-[10px] font-semibold text-vs-brand">
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
            <div className="flex flex-1 flex-col overflow-hidden border-r border-vs-border">
          {/* Viewer toolbar — only for images where zoom is applied via CSS */}
          {isImage && (
            <div className="flex shrink-0 items-center gap-3 border-b border-vs-border bg-vs-bg px-5 py-2">
              <button
                onClick={() => setZoom((z) => Math.max(25, z - 25))}
                className="rounded border border-vs-border bg-vs-card p-1 text-vs-body hover:bg-vs-hover hover:text-vs-heading cursor-pointer"
              >
                <Minus size={12} />
              </button>
              <span className="min-w-[42px] text-center text-sm font-medium text-vs-heading">{zoom}%</span>
              <button
                onClick={() => setZoom((z) => Math.min(200, z + 25))}
                className="rounded border border-vs-border bg-vs-card p-1 text-vs-body hover:bg-vs-hover hover:text-vs-heading cursor-pointer"
              >
                <Plus size={12} />
              </button>
              <span className="ml-2 text-xs text-vs-muted">Use scroll or pinch to zoom further</span>
            </div>
          )}

          {/* Document area */}
          <div className="flex flex-1 overflow-hidden bg-vs-hover">
            {/* Main file viewer */}
            <div className="flex flex-1 overflow-hidden">
              {previewError ? (
                <div className="flex flex-1 items-center justify-center p-8">
                  <div className="flex flex-col items-center gap-4 rounded-2xl border border-vs-border bg-vs-card p-10 text-center shadow-[0_8px_30px_rgba(11,28,48,0.06)]">
                    <div className="flex h-14 w-14 items-center justify-center rounded-full bg-vs-bg text-vs-muted">
                      <Download size={24} />
                    </div>
                    <div>
                      <p className="text-base font-semibold text-vs-heading">Preview unavailable</p>
                      <p className="mt-1 text-sm text-vs-muted">The file could not be loaded for preview.</p>
                    </div>
                    {effectiveFile && id && (
                      <button
                        onClick={() => handleDownloadClick(id, effectiveFile.name)}
                        className="inline-flex items-center gap-2 rounded-lg bg-vs-brand px-4 py-2 text-sm font-semibold text-white hover:opacity-90 transition-opacity"
                      >
                        <Download size={14} /> Download file
                      </button>
                    )}
                  </div>
                </div>
              ) : !fileUrl ? (
                <div className="flex flex-1 items-center justify-center">
                  <div className="flex flex-col items-center gap-3 rounded-2xl bg-vs-card px-12 py-10 text-vs-muted shadow-[0_8px_30px_rgba(11,28,48,0.06)]">
                    <Loader2 className="animate-spin text-vs-brand" size={26} />
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
              ) : isVideo ? (
                <div className="flex flex-1 items-center justify-center bg-black overflow-hidden">
                  <video
                    src={fileUrl}
                    controls
                    className="max-h-full max-w-full"
                    style={{ outline: "none" }}
                  />
                </div>
              ) : isAudio ? (
                <div className="flex flex-1 items-center justify-center p-8">
                  <div className="flex flex-col items-center gap-6 rounded-2xl border border-vs-border bg-vs-card p-10 shadow-[0_8px_30px_rgba(11,28,48,0.08)] w-full max-w-lg">
                    <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-vs-active">
                      <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#003c90" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/></svg>
                    </div>
                    <p className="text-sm font-semibold text-vs-heading">{effectiveFile?.name}</p>
                    <audio src={fileUrl} controls className="w-full" />
                  </div>
                </div>
              ) : isDocx ? (
                <div className="flex flex-1 overflow-auto p-6 bg-vs-hover">
                  {docxHtml ? (
                    <div
                      ref={docxContainerRef}
                      className="mx-auto bg-vs-card rounded-2xl shadow-[0_8px_30px_rgba(11,28,48,0.08)] p-8 max-w-4xl w-full"
                      dangerouslySetInnerHTML={{ __html: docxHtml }}
                    />
                  ) : (
                    <div className="flex flex-1 items-center justify-center">
                      <Loader2 className="animate-spin text-vs-brand" size={26} />
                    </div>
                  )}
                </div>
              ) : isXlsx ? (
                <div className="flex flex-1 overflow-auto p-6 bg-vs-hover">
                  {xlsxHtml ? (
                    <div
                      className="mx-auto bg-vs-card rounded-2xl shadow-[0_8px_30px_rgba(11,28,48,0.08)] p-4 w-full overflow-x-auto"
                      dangerouslySetInnerHTML={{ __html: xlsxHtml }}
                      style={{ fontSize: 13 }}
                    />
                  ) : (
                    <div className="flex flex-1 items-center justify-center">
                      <Loader2 className="animate-spin text-vs-brand" size={26} />
                    </div>
                  )}
                </div>
              ) : isPptx ? (
                pptxPdfUrl ? (
                  <div className="flex flex-1 overflow-hidden p-6">
                    <div className="flex flex-1 overflow-hidden rounded-2xl border border-vs-border bg-vs-card shadow-[0_8px_30px_rgba(11,28,48,0.08)]">
                      <iframe src={pptxPdfUrl} title={effectiveFile?.name} className="rounded-2xl border-0" style={{ width: "100%", height: "100%", flex: 1 }} />
                    </div>
                  </div>
                ) : (
                <div ref={pptxViewportRef} className="flex flex-1 overflow-auto p-6 bg-vs-hover">
                  {pptxSlides ? (
                    <div className="w-full space-y-6">
                      {pptxSlides.map((slide) => (
                        <div key={slide.index}>
                          <div style={{ height: Math.round(540 * pptxScale) }}>
                            <div style={{
                              width: 960, height: 540,
                              transform: `scale(${pptxScale})`,
                              transformOrigin: "top left",
                              position: "relative",
                              background: slide.bgColor,
                              borderRadius: 12,
                              boxShadow: "0 4px 20px rgba(11,28,48,0.14)",
                              overflow: "hidden",
                              fontFamily: "Calibri, 'Segoe UI', Arial, sans-serif",
                            }}>
                              {/* Images first (behind text) */}
                              {slide.images.map((img) => (
                                <img key={img.id} src={img.src} alt="" style={{
                                  position: "absolute",
                                  left: img.xPx, top: img.yPx,
                                  width: img.wPx, height: img.hPx,
                                  objectFit: "contain",
                                }} />
                              ))}
                              {/* Text shapes */}
                              {slide.shapes.map((shape) => (
                                <div key={shape.id} style={{
                                  position: "absolute",
                                  left: shape.xPx, top: shape.yPx,
                                  width: shape.wPx, height: shape.hPx,
                                  overflow: "hidden",
                                }}>
                                  {shape.paras.map((para, pi) => (
                                    <p key={pi} style={{ margin: "1px 0", lineHeight: 1.25 }}>
                                      {para.runs.map((run, ri) => (
                                        <span key={ri} style={{
                                          fontWeight: run.bold ? "bold" : "normal",
                                          fontStyle: run.italic ? "italic" : "normal",
                                          fontSize: run.sizePx ?? 14,
                                          color: run.color ?? "inherit",
                                        }}>
                                          {run.text}
                                        </span>
                                      ))}
                                    </p>
                                  ))}
                                </div>
                              ))}
                            </div>
                          </div>
                          <p className="mt-2 text-center text-[11px] text-vs-muted">Slide {slide.index}</p>
                        </div>
                      ))}
                      {effectiveFile && id && (
                        <div className="flex justify-center py-2">
                          <button onClick={() => handleDownloadClick(id, effectiveFile.name)}
                            className="inline-flex items-center gap-2 rounded-lg border border-vs-border bg-vs-card px-4 py-2 text-sm font-medium text-vs-heading hover:bg-vs-hover transition-colors shadow-sm">
                            <Download size={14} /> Download original .pptx
                          </button>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="flex flex-1 items-center justify-center">
                      <Loader2 className="animate-spin text-vs-brand" size={26} />
                    </div>
                  )}
                </div>
                )
              ) : isPreviewable ? (
                <div className="flex flex-1 overflow-hidden p-6">
                  <div className="flex flex-1 overflow-hidden rounded-2xl border border-vs-border bg-vs-card shadow-[0_8px_30px_rgba(11,28,48,0.08)]">
                    <iframe
                      src={fileUrl}
                      title={effectiveFile?.name ?? "File"}
                      className="rounded-2xl border-0"
                      style={{ width: "100%", height: "100%", flex: 1 }}
                    />
                  </div>
                </div>
              ) : (
                <div className="flex flex-1 items-center justify-center p-8">
                  <div className="flex flex-col items-center gap-4 rounded-2xl border border-vs-border bg-vs-card p-10 text-center shadow-[0_8px_30px_rgba(11,28,48,0.06)]">
                    <div className="flex h-14 w-14 items-center justify-center rounded-full bg-vs-bg text-vs-muted">
                      <Download size={24} />
                    </div>
                    <div>
                      <p className="text-base font-semibold text-vs-heading">Preview not available</p>
                      <p className="mt-1 text-sm text-vs-muted">
                        This file type can't be displayed in the browser.
                      </p>
                    </div>
                    <button
                      onClick={() => file && handleDownloadClick(file.id, file.name)}
                      className="inline-flex items-center gap-2 rounded-lg bg-vs-brand px-4 py-2 text-sm font-semibold text-white hover:opacity-90 transition-opacity"
                    >
                      <Download size={14} /> Download file
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Status bar */}
          <div className="flex shrink-0 items-center justify-between border-t border-vs-border bg-vs-card px-5 py-2">
            <div className="flex items-center gap-3 text-[11px] text-vs-muted">
              <span className="flex items-center gap-1.5">
                <span className="h-1.5 w-1.5 rounded-full bg-vs-success" />
                AES-256 encrypted
              </span>
              <span>·</span>
              <span>3 viewers active</span>
              <span>·</span>
              <span>Last modified 10:42 AM</span>
            </div>
            <span className="text-[11px] font-medium text-vs-success">SHA-256 verified ✓</span>
          </div>
        </div>

        {/* Drag handle */}
        <div
          onMouseDown={onDragStart}
          className="w-1 shrink-0 cursor-col-resize bg-vs-border hover:bg-vs-brand transition-colors duration-150 active:bg-vs-brand"
          title="Drag to resize"
        />

        {/* Comments & Chat / Ask AI Panel */}
        <div className="flex shrink-0 flex-col bg-vs-card" style={{ width: panelWidth }}>
          {/* Panel tabs */}
          <div className="flex shrink-0 border-b border-vs-border">
            {(["chat", "qa"] as const).map((tab) => (
              <button key={tab} onClick={() => setRightPanel(tab)}
                className={`flex-1 py-2.5 text-xs font-semibold border-0 cursor-pointer transition-colors ${
                  rightPanel === tab
                    ? "text-vs-brand border-b-2 border-vs-brand bg-vs-active/30"
                    : "text-vs-body hover:bg-vs-hover bg-transparent"
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
              <p className="text-sm text-vs-muted">Loading file info…</p>
            </div>
          )}

          {/* Chat panel — only shown when tab is "chat" */}
          {rightPanel === "chat" && <>
          {/* Panel header */}
          <div className="flex shrink-0 flex-col border-b border-vs-border px-4 py-3 gap-2">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-vs-heading">Comments & Chat</h3>
              <div className="flex gap-1 text-vs-muted">
                <span className="text-sm">· · ·</span>
              </div>
            </div>
            {/* Admin-only chat toggle — visible only to file owner */}
            {isOwner && (
              <div
                className={`flex items-center justify-between rounded-lg border px-3 py-2 transition-colors duration-200 ${
                  adminOnlyChat
                    ? "border-amber-200 bg-amber-50"
                    : "border-vs-border bg-vs-bg"
                }`}
              >
                <div className="flex items-center gap-2">
                  {adminOnlyChat ? (
                    <Lock size={13} className="text-amber-600" />
                  ) : (
                    <ShieldCheck size={13} className="text-vs-muted" />
                  )}
                  <div className="flex flex-col leading-tight">
                    <span className={`text-[10px] font-bold uppercase tracking-wider ${adminOnlyChat ? "text-amber-700" : "text-vs-muted"}`}>
                      Admin Only
                    </span>
                    <span className={`text-[10px] ${adminOnlyChat ? "text-amber-600/80" : "text-vs-muted"}`}>
                      {adminOnlyChat ? "Active · only you can send" : "Off · everyone can chat"}
                    </span>
                  </div>
                </div>
                <button
                  onClick={() => setAdminOnly(!adminOnlyChat)}
                  role="switch"
                  aria-checked={adminOnlyChat}
                  className={`relative inline-flex h-5 w-10 shrink-0 items-center rounded-full transition-colors duration-200 focus:outline-none ${
                    adminOnlyChat ? "bg-amber-500" : "bg-vs-brand"
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-vs-card shadow-sm transition-transform duration-200 ${
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
                <p className="text-center text-[11px] text-vs-muted py-4">
                  No messages yet. Start the conversation.
                </p>
              )}
              {chatMessages.map((msg, idx) => {
                const isMe = !!myEmail && !!msg.userEmail && msg.userEmail === myEmail
                const initials = (msg.userName || "")
                  .split(" ")
                  .filter(Boolean)
                  .map((n) => n[0] ?? "")
                  .join("")
                  .toUpperCase()
                  .slice(0, 2) || "?"
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
                        <div className="flex-1 h-px bg-vs-border" />
                        <span className="text-[10px] text-vs-muted font-medium">
                          {formatDate(msgDate)}
                        </span>
                        <div className="flex-1 h-px bg-vs-border" />
                      </div>
                    )}
                    <div className={`group flex items-end gap-1 mb-1 ${isMe ? "flex-row-reverse" : "flex-row"}`}>
                      {!isMe && (
                        <div className="h-7 w-7 shrink-0 rounded-full bg-vs-active flex items-center justify-center text-[10px] font-bold text-vs-brand">
                          {initials}
                        </div>
                      )}
                      <div className={`flex flex-col max-w-[72%] ${isMe ? "items-end" : "items-start"}`}>
                        {!isMe && (
                          <span className="mb-0.5 text-[10px] font-semibold text-vs-body">
                            {msg.userName}
                          </span>
                        )}
                        <div
                          className={`rounded-xl px-3 py-2 text-sm leading-relaxed break-words ${
                            isMe
                              ? "rounded-tr-sm bg-vs-brand text-white"
                              : "rounded-tl-sm bg-vs-hover text-vs-heading"
                          }`}
                        >
                          {replyPreview && (
                            <div className={`mb-1.5 rounded-lg px-2 py-1 text-[10px] border-l-2 ${isMe ? "border-white/30 bg-vs-card/10 text-white/70" : "border-vs-brand/30 bg-vs-active/50 text-vs-body"}`}>
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
                                    ? "border-vs-brand/30 bg-vs-active text-vs-brand"
                                    : "border-vs-border bg-vs-bg text-vs-body hover:border-vs-brand/20"
                                }`}
                              >
                                {emoji} <span>{users.length}</span>
                              </button>
                            ))}
                          </div>
                        )}
                        <span className="text-[9px] mt-0.5 text-vs-muted">{time}</span>
                      </div>

                      {/* Hover action buttons */}
                      <div className={`relative flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity mb-5 ${isMe ? "flex-row-reverse" : "flex-row"}`}>
                        <button
                          onClick={() => setReplyTo({ id: msg.id, userName: msg.userName, content: mainContent })}
                          className="rounded p-1 text-vs-muted hover:bg-vs-hover hover:text-vs-heading cursor-pointer"
                          title="Reply"
                        >
                          <Reply size={12} />
                        </button>
                        <div className="relative" data-emoji-picker>
                          <button
                            onClick={(e) => { e.stopPropagation(); setEmojiPickerFor(emojiPickerFor === msg.id ? null : msg.id) }}
                            className="rounded p-1 text-vs-muted hover:bg-vs-hover hover:text-vs-heading text-[11px] cursor-pointer"
                            title="React"
                          >
                            😊
                          </button>
                          {emojiPickerFor === msg.id && (
                            <div className={`absolute bottom-7 z-20 flex gap-1 rounded-xl border border-vs-border bg-vs-card p-1.5 shadow-xl ${isMe ? "right-0" : "left-0"}`} data-emoji-picker>
                              {EMOJI_OPTIONS.map((emoji) => (
                                <button
                                  key={emoji}
                                  onClick={(e) => { e.stopPropagation(); toggleReaction(msg.id, emoji) }}
                                  className="rounded-lg p-1 text-base hover:bg-vs-hover transition-colors cursor-pointer"
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
            <div className="border-t border-vs-border px-3 pb-4 pt-3 space-y-2">
              {comments.map((c) => (
                <div key={c.id} className="rounded-lg border border-vs-border bg-vs-bg p-3">
                  <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-vs-muted">
                    {c.label}
                  </p>
                  <p className="mb-0.5 text-sm font-semibold text-vs-body">
                    {c.author}{" "}
                    <span className="font-normal text-vs-muted">{c.time}</span>
                  </p>
                  <p className="mb-2 text-sm leading-relaxed text-vs-muted">{c.text}</p>
                  <div className="flex gap-2">
                    <button className="text-[10px] font-medium text-vs-muted hover:text-vs-heading cursor-pointer">Reply</button>
                    <button className="text-[10px] font-medium text-vs-brand hover:underline cursor-pointer">Jump to</button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Input */}
          <div className="shrink-0 border-t border-vs-border p-3">
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
              <div className="flex items-center justify-between mb-2 rounded-lg border border-vs-border bg-vs-hover px-3 py-1.5">
                <div className="flex items-center gap-2 min-w-0">
                  <Reply size={11} className="shrink-0 text-vs-brand" />
                  <span className="text-[10px] text-vs-muted truncate">
                    <span className="font-semibold text-vs-body">{replyTo.userName}</span>: {replyTo.content.slice(0, 50)}{replyTo.content.length > 50 ? "…" : ""}
                  </span>
                </div>
                <button onClick={() => setReplyTo(null)} className="ml-2 shrink-0 text-vs-muted hover:text-vs-heading cursor-pointer">
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
                className="flex-1 rounded-lg border border-vs-border bg-vs-bg px-3 py-2 text-sm text-vs-heading placeholder:text-vs-muted focus:border-vs-brand focus:outline-none disabled:cursor-not-allowed disabled:opacity-40"
              />
              <button type="button" disabled={!canSendMessage} className="text-vs-muted hover:text-vs-heading disabled:opacity-40 cursor-pointer">
                <AtSign size={15} />
              </button>
              <button
                type="submit"
                disabled={!canSendMessage}
                className="flex h-7 w-7 items-center justify-center rounded-lg bg-vs-brand text-white hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40 cursor-pointer"
              >
                <Send size={12} />
              </button>
            </form>
          </div>
          </>}
        </div>
          </>
        )
        }
      </div>

      {settingsTab && id && (
        <FileSettingsModal
          fileId={id}
          fileName={effectiveFile?.name ?? ""}
          initialTab={settingsTab}
          onClose={() => setSettingsTab(null)}
        />
      )}

      {keyRecovery && (
        <KeyRecoveryModal
          fileName={keyRecovery.fileName}
          submitting={recoverySubmitting}
          error={recoveryError}
          onCancel={() => setKeyRecovery(null)}
          onSubmit={handleRecoverySubmit}
        />
      )}
    </div>
  )
}
