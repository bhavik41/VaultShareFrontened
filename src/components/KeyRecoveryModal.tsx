import { useState } from "react"
import { AlertTriangle, KeyRound, X } from "lucide-react"

interface KeyRecoveryModalProps {
  fileName: string
  onCancel: () => void
  onSubmit: (key: string) => void
  submitting?: boolean
  error?: string
}

export default function KeyRecoveryModal({ fileName, onCancel, onSubmit, submitting, error }: KeyRecoveryModalProps) {
  const [key, setKey] = useState("")

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!key.trim() || submitting) return
    onSubmit(key.trim())
  }

  return (
    <div className="fixed inset-0 z-[300] bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-vs-card border border-vs-border rounded-xl p-6 w-full max-w-md shadow-xl space-y-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-vs-error-surface/60">
              <AlertTriangle size={20} className="text-vs-error" />
            </div>
            <div>
              <h3 className="text-base font-bold text-vs-heading">Key not found</h3>
              <p className="text-xs text-vs-muted mt-0.5 truncate max-w-[240px]">for "{fileName}"</p>
            </div>
          </div>
          <button type="button" onClick={onCancel} className="bg-transparent border-0 text-vs-muted hover:text-vs-heading cursor-pointer p-1 shrink-0">
            <X size={16} />
          </button>
        </div>

        <p className="text-sm text-vs-body">
          The decryption key for this file wasn't found on this device — it may have been cleared. Paste the key
          below to decrypt and download it, or import a saved key backup instead.
        </p>

        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="relative">
            <KeyRound size={15} className="absolute left-3 top-3 text-vs-muted" />
            <textarea
              value={key}
              onChange={(e) => setKey(e.target.value)}
              placeholder="Paste the encryption key here"
              rows={3}
              required
              autoFocus
              className="w-full rounded-lg border border-vs-border bg-vs-hover pl-9 pr-3 py-2 text-sm font-mono text-vs-heading placeholder:text-vs-muted outline-none focus:border-vs-brand focus:ring-2 focus:ring-vs-brand/10 transition-all resize-none"
            />
          </div>
          {error && <p className="text-sm font-medium text-vs-error">{error}</p>}
          <div className="flex gap-3">
            <button
              type="button"
              onClick={onCancel}
              className="flex-1 rounded-lg border border-vs-border bg-vs-card py-2.5 text-sm font-medium text-vs-body hover:bg-vs-hover cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting || !key.trim()}
              className="flex-1 rounded-lg bg-vs-brand py-2.5 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-50 cursor-pointer border-0"
            >
              {submitting ? "Decrypting…" : "Unlock & Download"}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
