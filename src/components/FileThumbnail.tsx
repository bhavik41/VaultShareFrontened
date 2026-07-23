import { useEffect, useRef, useState } from "react"
import * as pdfjsLib from "pdfjs-dist"

pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.mjs`

const API = import.meta.env.VITE_API_URL

const cache = new Map<string, string>()

export default function FileThumbnail({ fileId, mimeType, fallback }: { fileId: string; mimeType: string; fallback: React.ReactNode }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [dataUrl, setDataUrl] = useState<string | null>(cache.get(fileId) ?? null)
  const [failed, setFailed] = useState(false)

  const isPdf = mimeType === "application/pdf"
  const isPptx = mimeType === "application/vnd.openxmlformats-officedocument.presentationml.presentation" || mimeType === "application/vnd.ms-powerpoint"

  useEffect(() => {
    if (dataUrl || failed || (!isPdf && !isPptx)) return

    const token = localStorage.getItem("token")
    if (!token) { setFailed(true); return }

    const url = isPdf
      ? `${API}/files/${fileId}/preview`
      : `${API}/files/${fileId}/preview-pdf`

    let cancelled = false

    const controller = new AbortController()

    fetch(url, {
      headers: { Authorization: `Bearer ${token}` },
      signal: controller.signal,
    })
      .then(r => {
        if (!r.ok) throw new Error("fetch failed")
        return r.arrayBuffer()
      })
      .then(buf => {
        if (cancelled) return
        return pdfjsLib.getDocument({ data: new Uint8Array(buf) }).promise
      })
      .then(pdf => {
        if (!pdf || cancelled) return
        return pdf.getPage(1)
      })
      .then(page => {
        if (!page || cancelled) return
        const viewport = page.getViewport({ scale: 1 })
        const scale = 200 / viewport.width
        const scaled = page.getViewport({ scale })

        const canvas = document.createElement("canvas")
        canvas.width = scaled.width
        canvas.height = scaled.height
        const ctx = canvas.getContext("2d")!
        return page.render({ canvasContext: ctx, viewport: scaled }).promise.then(() => {
          const result = canvas.toDataURL("image/jpeg", 0.7)
          if (!cancelled) {
            cache.set(fileId, result)
            setDataUrl(result)
          }
        })
      })
      .catch(() => { if (!cancelled) setFailed(true) })

    return () => { cancelled = true; controller.abort() }
  }, [fileId, mimeType, dataUrl, failed, isPdf, isPptx])

  if (!isPdf && !isPptx) return <>{fallback}</>
  if (failed || !dataUrl) return <>{fallback}</>

  return (
    <img
      src={dataUrl}
      alt="Preview"
      className="w-full h-full object-cover object-top"
    />
  )
}
