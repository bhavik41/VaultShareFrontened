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
      <div className="bg-white border border-[#c3c6d5] rounded-xl p-6 w-full max-w-md shadow-xl space-y-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#ffdad6]/60">
              <AlertTriangle size={20} className="text-[#ba1a1a]" />
            </div>
            <div>
              <h3 className="text-base font-bold text-[#0b1c30]">Key not found</h3>
              <p className="text-xs text-[#737784] mt-0.5 truncate max-w-[240px]">for "{fileName}"</p>
            </div>
          </div>
          <button type="button" onClick={onCancel} className="bg-transparent border-0 text-[#737784] hover:text-[#0b1c30] cursor-pointer p-1 shrink-0">
            <X size={16} />
          </button>
        </div>

        <p className="text-sm text-[#434653]">
          The decryption key for this file wasn't found on this device — it may have been cleared. Paste the key
          below to decrypt and download it, or import a saved key backup instead.
        </p>

        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="relative">
            <KeyRound size={15} className="absolute left-3 top-3 text-[#737784]" />
            <textarea
              value={key}
              onChange={(e) => setKey(e.target.value)}
              placeholder="Paste the encryption key here"
              rows={3}
              required
              autoFocus
              className="w-full rounded-lg border border-[#c3c6d5] bg-[#eff4ff] pl-9 pr-3 py-2 text-sm font-mono text-[#0b1c30] placeholder:text-[#737784] outline-none focus:border-[#003c90] focus:ring-2 focus:ring-[#003c90]/10 transition-all resize-none"
            />
          </div>
          {error && <p className="text-sm font-medium text-[#ba1a1a]">{error}</p>}
          <div className="flex gap-3">
            <button
              type="button"
              onClick={onCancel}
              className="flex-1 rounded-lg border border-[#c3c6d5] bg-white py-2.5 text-sm font-medium text-[#434653] hover:bg-[#eff4ff] cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting || !key.trim()}
              className="flex-1 rounded-lg bg-[#003c90] py-2.5 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-50 cursor-pointer border-0"
            >
              {submitting ? "Decrypting…" : "Unlock & Download"}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
