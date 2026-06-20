import { useEffect, useState } from "react";
import { 
  UploadCloud, 
  Download, 
  Eye, 
  Share2, 
  ShieldAlert, 
  Trash2, 
  History, 
  Lock,
  Loader2
} from "lucide-react";
import { getFileAuditHistory, type AuditLog } from "@/store/auditApi";

interface AuditLogViewerProps {
  fileId: string;
}

const ACTION_ICONS: Record<string, React.ReactNode> = {
  upload: <UploadCloud size={16} className="text-blue-400" />,
  download: <Download size={16} className="text-green-400" />,
  view: <Eye size={16} className="text-purple-400" />,
  share: <Share2 size={16} className="text-indigo-400" />,
  permission_change: <ShieldAlert size={16} className="text-orange-400" />,
  delete: <Trash2 size={16} className="text-red-400" />,
};

const ACTION_LABELS: Record<string, string> = {
  upload: "File Uploaded",
  download: "File Downloaded",
  view: "File Viewed",
  share: "Shared",
  permission_change: "Permission Changed",
  delete: "File Deleted",
};

export default function AuditLogViewer({ fileId }: AuditLogViewerProps) {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!fileId) return;

    setLoading(true);
    setError(null);

    getFileAuditHistory(fileId)
      .then((data) => {
        setLogs(data.logs);
      })
      .catch((err) => {
        if (err.response?.status === 403) {
          setError("Access Denied: Only the file owner can view audit logs.");
        } else {
          setError("Failed to load audit logs.");
        }
      })
      .finally(() => {
        setLoading(false);
      });
  }, [fileId]);

  if (loading) {
    return (
      <div className="flex flex-1 items-center justify-center bg-[#0d0d1a]">
        <div className="flex flex-col items-center gap-3 text-slate-500">
          <Loader2 className="animate-spin" size={24} />
          <span className="text-sm">Loading audit logs…</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-1 items-center justify-center bg-[#0d0d1a]">
        <div className="flex flex-col items-center gap-4 text-slate-400">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-red-500/10 text-red-400">
            <Lock size={32} />
          </div>
          <h2 className="text-lg font-semibold text-white">Access Restricted</h2>
          <p className="text-sm text-slate-500">{error}</p>
        </div>
      </div>
    );
  }

  if (logs.length === 0) {
    return (
      <div className="flex flex-1 items-center justify-center bg-[#0d0d1a]">
        <div className="flex flex-col items-center gap-4 text-slate-500">
          <History size={32} className="opacity-50" />
          <p className="text-sm">No audit logs found for this file.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col overflow-hidden bg-[#0a0a14] p-8">
      <div className="mx-auto w-full max-w-4xl">
        <h2 className="mb-6 text-xl font-bold text-white flex items-center gap-2">
          <History size={20} className="text-blue-500" />
          Audit History
        </h2>

        <div className="rounded-xl border border-white/5 bg-[#0d0d1a] overflow-hidden">
          <table className="w-full text-left text-sm text-slate-400">
            <thead className="border-b border-white/5 bg-white/5 text-xs uppercase tracking-wider text-slate-500">
              <tr>
                <th className="px-6 py-4 font-medium">Action</th>
                <th className="px-6 py-4 font-medium">Details</th>
                <th className="px-6 py-4 font-medium">User</th>
                <th className="px-6 py-4 font-medium">Timestamp</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {logs.map((log) => (
                <tr key={log.id} className="hover:bg-white/5 transition-colors">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center gap-3">
                      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-800">
                        {ACTION_ICONS[log.action] || <History size={16} />}
                      </div>
                      <span className="font-medium text-slate-200">
                        {ACTION_LABELS[log.action] || log.action}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-slate-300">
                      {log.details || "-"}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="rounded bg-slate-800 px-2.5 py-1 text-xs text-slate-300">
                      {log.userId.substring(0, 8)}...
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-xs text-slate-500">
                    {new Date(log.timestamp).toLocaleString(undefined, {
                      dateStyle: "medium",
                      timeStyle: "short",
                    })}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
