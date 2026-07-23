import { useState } from "react"
import { Download, KeyRound, Upload, X } from "lucide-react"
import { exportKeysBundle, getAllStoredKeys, importKeysBundle, type KeyBundle } from "@/utils/crypto"

interface KeyBackupModalProps {
  onClose: () => void
}

type Mode = "export" | "import"

const inputCls = "w-full rounded-lg border border-vs-border bg-vs-hover px-3 py-2 text-sm text-vs-heading placeholder:text-vs-muted outline-none focus:border-vs-brand focus:ring-2 focus:ring-vs-brand/10 transition-all"

export default function KeyBackupModal({ onClose }: KeyBackupModalProps) {
  const [mode, setMode] = useState<Mode>("export")
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [importFile, setImportFile] = useState<File | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")

  const keyCount = Object.keys(getAllStoredKeys()).length

  function switchMode(m: Mode) {
    setMode(m); setError(""); setSuccess(""); setPassword(""); setConfirmPassword("")
  }

  async function handleExport(e: React.FormEvent) {
    e.preventDefault()
    setError(""); setSuccess("")
    if (password.length < 8) { setError("Password must be at least 8 characters."); return }
    if (password !== confirmPassword) { setError("Passwords do not match."); return }

    setBusy(true)
    try {
      const bundle = await exportKeysBundle(password)
      const blob = new Blob([JSON.stringify(bundle, null, 2)], { type: "application/json" })
      const url = URL.createObjectURL(blob)
      const anchor = document.createElement("a")
      anchor.href = url
      anchor.download = `vaultshare-keys-${new Date().toISOString().slice(0, 10)}.json`
      document.body.appendChild(anchor)
      anchor.click()
      anchor.remove()
      URL.revokeObjectURL(url)
      setSuccess(`Exported ${keyCount} key${keyCount === 1 ? "" : "s"}.`)
      setPassword(""); setConfirmPassword("")
    } catch {
      setError("Failed to export keys.")
    } finally {
      setBusy(false)
    }
  }

  async function handleImport(e: React.FormEvent) {
    e.preventDefault()
    setError(""); setSuccess("")
    if (!importFile) { setError("Choose a key backup file."); return }
    if (!password) { setError("Enter the backup password."); return }

    setBusy(true)
    try {
      const text = await importFile.text()
      const bundle = JSON.parse(text) as KeyBundle
      const count = await importKeysBundle(bundle, password)
      setSuccess(`Imported ${count} key${count === 1 ? "" : "s"}.`)
      setPassword(""); setImportFile(null)
    } catch (err: any) {
      setError(err?.message ?? "Failed to import keys. Check the file and password.")
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="fixed inset-0 z-[300] bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-vs-card border border-vs-border rounded-xl p-6 w-full max-w-md shadow-xl space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <KeyRound size={18} className="text-vs-brand" />
            <h3 className="text-base font-bold text-vs-heading">Manage Encryption Keys</h3>
          </div>
          <button type="button" onClick={onClose} className="bg-transparent border-0 text-vs-muted hover:text-vs-heading cursor-pointer p-1">
            <X size={16} />
          </button>
        </div>

        <p className="text-xs text-vs-muted">{keyCount} encryption key{keyCount === 1 ? "" : "s"} stored on this device.</p>

        <div className="flex rounded-lg border border-vs-border overflow-hidden text-sm font-medium">
          <button type="button" onClick={() => switchMode("export")}
            className={`flex-1 py-2 cursor-pointer border-0 ${mode === "export" ? "bg-vs-brand text-white" : "bg-vs-card text-vs-body hover:bg-vs-hover"}`}>
            Export
          </button>
          <button type="button" onClick={() => switchMode("import")}
            className={`flex-1 py-2 cursor-pointer border-0 ${mode === "import" ? "bg-vs-brand text-white" : "bg-vs-card text-vs-body hover:bg-vs-hover"}`}>
            Import
          </button>
        </div>

        {mode === "export" ? (
          <form onSubmit={handleExport} className="space-y-3">
            <p className="text-sm text-vs-body">Download all your stored decryption keys as a password-protected backup file.</p>
            <input type="password" required placeholder="Backup password (min 8 chars)" value={password}
              onChange={(e) => setPassword(e.target.value)} className={inputCls} />
            <input type="password" required placeholder="Confirm password" value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)} className={inputCls} />
            <button type="submit" disabled={busy || keyCount === 0}
              className="w-full inline-flex items-center justify-center gap-2 rounded-lg bg-vs-brand px-4 py-2.5 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-50 cursor-pointer border-0">
              <Download size={15} />{busy ? "Exporting…" : "Download backup"}
            </button>
            {keyCount === 0 && <p className="text-xs text-vs-muted">No keys stored yet — encrypt a file first.</p>}
          </form>
        ) : (
          <form onSubmit={handleImport} className="space-y-3">
            <p className="text-sm text-vs-body">Restore keys from a previously exported backup file.</p>
            <input type="file" accept="application/json" required onChange={(e) => setImportFile(e.target.files?.[0] ?? null)}
              className="w-full text-sm text-vs-body file:mr-3 file:rounded-lg file:border-0 file:bg-vs-hover file:px-3 file:py-2 file:text-sm file:font-medium file:text-vs-brand file:cursor-pointer" />
            <input type="password" required placeholder="Backup password" value={password}
              onChange={(e) => setPassword(e.target.value)} className={inputCls} />
            <button type="submit" disabled={busy}
              className="w-full inline-flex items-center justify-center gap-2 rounded-lg bg-vs-brand px-4 py-2.5 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-50 cursor-pointer border-0">
              <Upload size={15} />{busy ? "Importing…" : "Import keys"}
            </button>
          </form>
        )}

        {error && <p className="text-sm font-medium text-vs-error">{error}</p>}
        {success && <p className="text-sm font-medium text-vs-success">{success}</p>}
      </div>
    </div>
  )
}
