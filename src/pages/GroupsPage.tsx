import { useEffect, useState, type FormEvent } from 'react'
import {
  ChevronLeft,
  FileText,
  Loader2,
  Plus,
  RefreshCw,
  Shield,
  Trash2,
  UserMinus,
  UserPlus,
  Users,
  X,
} from 'lucide-react'
import type {
  Group,
  GroupDetail,
  GroupFile,
  GroupFileForMe,
  GroupMember,
  GroupRole,
  SharedRole,
} from '@/store/groupsApi'
import {
  addMember,
  createGroup,
  deleteGroup,
  getGroup,
  getGroupFilesForMe,
  listGroups,
  removeGroupFile,
  removeMember,
  shareFileWithGroup,
  updateGroup,
  updateGroupFilePermission,
  updateMemberRole,
} from '@/store/groupsApi'
import { getMyFiles } from '@/store/filesApi'
import type { UploadedFile } from '@/store/filesApi'

function formatDate(value: string) {
  return new Date(value).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

function formatSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}

const ROLE_COLORS: Record<string, string> = {
  owner: 'bg-purple-100 text-purple-700',
  admin: 'bg-amber-100 text-amber-700',
  editor: 'bg-blue-100 text-blue-700',
  viewer: 'bg-slate-500/20 text-slate-600',
}

type Tab = 'my-groups' | 'shared-with-me'
type GroupTab = 'members' | 'files'

export default function GroupsPage() {
  const [tab, setTab] = useState<Tab>('my-groups')
  const [groups, setGroups] = useState<Group[]>([])
  const [selectedGroup, setSelectedGroup] = useState<GroupDetail | null>(null)
  const [groupTab, setGroupTab] = useState<GroupTab>('members')
  const [sharedFiles, setSharedFiles] = useState<GroupFileForMe[]>([])
  const [myFiles, setMyFiles] = useState<UploadedFile[]>([])

  // Loading / errors
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  // Create group form
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [newGroupName, setNewGroupName] = useState('')
  const [newGroupDesc, setNewGroupDesc] = useState('')
  const [newGroupDefaultRole, setNewGroupDefaultRole] = useState<SharedRole>('viewer')

  // Edit group
  const [editingGroup, setEditingGroup] = useState(false)
  const [editName, setEditName] = useState('')
  const [editDesc, setEditDesc] = useState('')
  const [editDefaultRole, setEditDefaultRole] = useState<SharedRole>('viewer')

  // Add member form
  const [memberEmail, setMemberEmail] = useState('')
  const [memberRole, setMemberRole] = useState<GroupRole>('viewer')

  // Share file form
  const [shareFileId, setShareFileId] = useState('')
  const [shareFileRole, setShareFileRole] = useState<SharedRole>('viewer')

  // ── Data loading ─────────────────────────────────────────────────────────────

  async function loadGroups() {
    try {
      setLoading(true)
      setError('')
      const [groupList, files] = await Promise.all([listGroups(), getMyFiles()])
      setGroups(groupList)
      setMyFiles(files)
    } catch {
      setError('Unable to load groups.')
    } finally {
      setLoading(false)
    }
  }

  async function loadSharedFiles() {
    try {
      setLoading(true)
      setError('')
      const files = await getGroupFilesForMe()
      setSharedFiles(files)
    } catch {
      setError('Unable to load shared files.')
    } finally {
      setLoading(false)
    }
  }

  async function loadGroupDetail(groupId: string) {
    try {
      setActionLoading(true)
      const detail = await getGroup(groupId)
      setSelectedGroup(detail)
      setEditName(detail.name)
      setEditDesc(detail.description ?? '')
      setEditDefaultRole((detail as any).defaultRole ?? 'viewer')
      setShareFileRole((detail as any).defaultRole ?? 'viewer')
    } catch {
      setError('Unable to load group details.')
    } finally {
      setActionLoading(false)
    }
  }

  useEffect(() => {
    if (tab === 'my-groups') loadGroups()
    else loadSharedFiles()
  }, [tab])

  function flashSuccess(msg: string) {
    setSuccess(msg)
    setTimeout(() => setSuccess(''), 3500)
  }

  // ── Group CRUD ───────────────────────────────────────────────────────────────

  async function handleCreateGroup(e: FormEvent) {
    e.preventDefault()
    if (!newGroupName.trim()) return
    try {
      setActionLoading(true)
      setError('')
      const group = await createGroup({ name: newGroupName.trim(), description: newGroupDesc.trim() || undefined, defaultRole: newGroupDefaultRole })
      setGroups((prev) => [{ ...group, role: 'owner', memberCount: 1 }, ...prev])
      setNewGroupName('')
      setNewGroupDesc('')
      setNewGroupDefaultRole('viewer')
      setShowCreateForm(false)
      flashSuccess('Group created.')
    } catch (err: any) {
      setError(err?.response?.data?.message ?? 'Failed to create group.')
    } finally {
      setActionLoading(false)
    }
  }

  async function handleUpdateGroup(e: FormEvent) {
    e.preventDefault()
    if (!selectedGroup || !editName.trim()) return
    try {
      setActionLoading(true)
      setError('')
      await updateGroup(selectedGroup.id, { name: editName.trim(), description: editDesc.trim() || undefined, defaultRole: editDefaultRole })
      await loadGroupDetail(selectedGroup.id)
      setEditingGroup(false)
      flashSuccess('Group updated.')
    } catch (err: any) {
      setError(err?.response?.data?.message ?? 'Failed to update group.')
    } finally {
      setActionLoading(false)
    }
  }

  async function handleDeleteGroup(groupId: string) {
    if (!confirm('Delete this group? This cannot be undone.')) return
    try {
      setActionLoading(true)
      await deleteGroup(groupId)
      setGroups((prev) => prev.filter((g) => g.id !== groupId))
      setSelectedGroup(null)
      flashSuccess('Group deleted.')
    } catch (err: any) {
      setError(err?.response?.data?.message ?? 'Failed to delete group.')
    } finally {
      setActionLoading(false)
    }
  }

  // ── Members ──────────────────────────────────────────────────────────────────

  async function handleAddMember(e: FormEvent) {
    e.preventDefault()
    if (!selectedGroup || !memberEmail.trim()) return
    try {
      setActionLoading(true)
      setError('')
      await addMember(selectedGroup.id, { email: memberEmail.trim(), role: memberRole })
      await loadGroupDetail(selectedGroup.id)
      setMemberEmail('')
      setMemberRole('viewer')
      flashSuccess('Member added.')
    } catch (err: any) {
      setError(err?.response?.data?.message ?? 'Failed to add member.')
    } finally {
      setActionLoading(false)
    }
  }

  async function handleUpdateMemberRole(userId: string, role: GroupRole) {
    if (!selectedGroup) return
    try {
      setActionLoading(true)
      setError('')
      await updateMemberRole(selectedGroup.id, userId, role)
      await loadGroupDetail(selectedGroup.id)
      flashSuccess('Role updated.')
    } catch (err: any) {
      setError(err?.response?.data?.message ?? 'Failed to update role.')
    } finally {
      setActionLoading(false)
    }
  }

  async function handleRemoveMember(userId: string) {
    if (!selectedGroup) return
    if (!confirm('Remove this member from the group?')) return
    try {
      setActionLoading(true)
      setError('')
      await removeMember(selectedGroup.id, userId)
      await loadGroupDetail(selectedGroup.id)
      flashSuccess('Member removed.')
    } catch (err: any) {
      setError(err?.response?.data?.message ?? 'Failed to remove member.')
    } finally {
      setActionLoading(false)
    }
  }

  // ── File Sharing ─────────────────────────────────────────────────────────────

  async function handleShareFile(e: FormEvent) {
    e.preventDefault()
    if (!selectedGroup || !shareFileId) return
    try {
      setActionLoading(true)
      setError('')
      await shareFileWithGroup(selectedGroup.id, { fileId: shareFileId, role: shareFileRole })
      await loadGroupDetail(selectedGroup.id)
      setShareFileId('')
      setShareFileRole('viewer')
      flashSuccess('File shared with group. Members notified via email.')
    } catch (err: any) {
      setError(err?.response?.data?.message ?? 'Failed to share file.')
    } finally {
      setActionLoading(false)
    }
  }

  async function handleUpdateFilePermission(fileId: string, role: SharedRole) {
    if (!selectedGroup) return
    try {
      setActionLoading(true)
      setError('')
      await updateGroupFilePermission(selectedGroup.id, fileId, role)
      await loadGroupDetail(selectedGroup.id)
      flashSuccess('File permission updated.')
    } catch (err: any) {
      setError(err?.response?.data?.message ?? 'Failed to update permission.')
    } finally {
      setActionLoading(false)
    }
  }

  async function handleRemoveFile(fileId: string) {
    if (!selectedGroup) return
    if (!confirm('Remove this file from the group?')) return
    try {
      setActionLoading(true)
      setError('')
      await removeGroupFile(selectedGroup.id, fileId)
      await loadGroupDetail(selectedGroup.id)
      flashSuccess('File removed from group.')
    } catch (err: any) {
      setError(err?.response?.data?.message ?? 'Failed to remove file.')
    } finally {
      setActionLoading(false)
    }
  }

  // ── Group detail view ────────────────────────────────────────────────────────

  if (selectedGroup) {
    const myGroupRole = groups.find((g) => g.id === selectedGroup.id)?.role ?? 'viewer'
    const canManage = myGroupRole === 'owner' || myGroupRole === 'admin'

    return (
      <div className="flex-1 overflow-y-auto bg-slate-50 text-slate-800">
        <div className="max-w-4xl mx-auto p-6">
          {/* Header */}
          <div className="flex items-center gap-3 mb-6">
            <button
              onClick={() => { setSelectedGroup(null); setEditingGroup(false) }}
              className="flex items-center gap-1 text-slate-400 hover:text-slate-900 transition-colors text-sm"
            >
              <ChevronLeft className="w-4 h-4" />
              Groups
            </button>
            <div className="flex-1 min-w-0">
              {editingGroup ? (
                <form onSubmit={handleUpdateGroup} className="flex items-center gap-3">
                  <input
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="bg-white border border-gray-300 rounded-lg px-3 py-1 text-slate-900 text-lg font-semibold w-48"
                    required
                  />
                  <input
                    value={editDesc}
                    onChange={(e) => setEditDesc(e.target.value)}
                    placeholder="Description (optional)"
                    className="bg-white border border-gray-300 rounded-lg px-3 py-1 text-slate-600 text-sm flex-1"
                  />
                  <select
                    value={editDefaultRole}
                    onChange={(e) => setEditDefaultRole(e.target.value as SharedRole)}
                    className="bg-slate-100 border border-gray-300 rounded-lg px-2 py-1 text-xs text-slate-600"
                  >
                    <option value="viewer">Default: Viewer</option>
                    <option value="editor">Default: Editor</option>
                  </select>
                  <button
                    type="submit"
                    disabled={actionLoading}
                    className="px-3 py-1 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-sm font-medium disabled:opacity-50"
                  >
                    Save
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditingGroup(false)}
                    className="px-3 py-1 text-slate-400 hover:text-slate-900 text-sm"
                  >
                    Cancel
                  </button>
                </form>
              ) : (
                <div className="flex items-center gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <h1 className="text-xl font-bold">{selectedGroup.name}</h1>
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold capitalize ${
                        (selectedGroup as any).defaultRole === 'editor'
                          ? 'bg-blue-100 text-blue-700'
                          : 'bg-slate-500/20 text-slate-600'
                      }`}>
                        {(selectedGroup as any).defaultRole ?? 'viewer'} access
                      </span>
                    </div>
                    {selectedGroup.description && (
                      <p className="text-slate-400 text-sm">{selectedGroup.description}</p>
                    )}
                  </div>
                  {canManage && (
                    <button
                      onClick={() => setEditingGroup(true)}
                      className="text-slate-600 hover:text-slate-800 text-xs underline"
                    >
                      Edit
                    </button>
                  )}
                </div>
              )}
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-400">
                {selectedGroup.memberCount + (selectedGroup.members.length === 0 ? 1 : 0)} member{selectedGroup.memberCount !== 1 ? 's' : ''}
              </span>
              {canManage && (
                <button
                  onClick={() => handleDeleteGroup(selectedGroup.id)}
                  disabled={actionLoading}
                  className="flex items-center gap-1 px-3 py-1.5 bg-red-500/10 hover:bg-red-100 text-red-700 rounded-lg text-sm transition-colors disabled:opacity-50"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Delete Group
                </button>
              )}
            </div>
          </div>

          {/* Alerts */}
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm flex items-center justify-between">
              {error}
              <button onClick={() => setError('')}><X className="w-4 h-4" /></button>
            </div>
          )}
          {success && (
            <div className="mb-4 p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-emerald-600 text-sm">
              {success}
            </div>
          )}

          {/* Tabs */}
          <div className="flex gap-1 mb-6 bg-white rounded-xl p-1 w-fit">
            {(['members', 'files'] as GroupTab[]).map((t) => (
              <button
                key={t}
                onClick={() => setGroupTab(t)}
                className={`px-4 py-2 rounded-lg text-sm font-medium capitalize transition-colors ${
                  groupTab === t
                    ? 'bg-indigo-600 text-white'
                    : 'text-slate-400 hover:text-slate-900'
                }`}
              >
                {t === 'members' ? (
                  <span className="flex items-center gap-1.5"><Users className="w-3.5 h-3.5" />Members</span>
                ) : (
                  <span className="flex items-center gap-1.5"><FileText className="w-3.5 h-3.5" />Files</span>
                )}
              </button>
            ))}
          </div>

          {/* Members Tab */}
          {groupTab === 'members' && (
            <div className="space-y-4">
              {/* Owner row */}
              <div className="bg-white rounded-xl p-4">
                <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Owner</h3>
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-purple-600/30 flex items-center justify-center text-purple-300 font-semibold text-sm">
                    {selectedGroup.ownerName.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm">{selectedGroup.ownerName}</p>
                    <p className="text-slate-400 text-xs truncate">{selectedGroup.ownerEmail}</p>
                  </div>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${ROLE_COLORS.owner}`}>owner</span>
                </div>
              </div>

              {/* Members list */}
              <div className="bg-white rounded-xl p-4">
                <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">
                  Members ({selectedGroup.members.length})
                </h3>
                {selectedGroup.members.length === 0 ? (
                  <p className="text-slate-500 text-sm">No members yet. Add someone below.</p>
                ) : (
                  <div className="space-y-2">
                    {selectedGroup.members.map((m: GroupMember) => (
                      <div key={m.id} className="flex items-center gap-3 py-2 border-b border-gray-200 last:border-0">
                        <div className="w-8 h-8 rounded-full bg-indigo-600/20 flex items-center justify-center text-indigo-300 font-semibold text-sm">
                          {m.name.charAt(0).toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm">{m.name}</p>
                          <p className="text-slate-400 text-xs truncate">{m.email}</p>
                        </div>
                        {canManage ? (
                          <select
                            value={m.role}
                            onChange={(e) => handleUpdateMemberRole(m.userId, e.target.value as GroupRole)}
                            disabled={actionLoading}
                            className="bg-slate-100 border border-gray-300 rounded-lg px-2 py-1 text-xs text-slate-600 disabled:opacity-50"
                          >
                            <option value="viewer">Viewer</option>
                            <option value="editor">Editor</option>
                            <option value="admin">Admin</option>
                          </select>
                        ) : (
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${ROLE_COLORS[m.role]}`}>
                            {m.role}
                          </span>
                        )}
                        {canManage && (
                          <button
                            onClick={() => handleRemoveMember(m.userId)}
                            disabled={actionLoading}
                            className="text-slate-500 hover:text-red-600 transition-colors disabled:opacity-50 ml-1"
                            title="Remove member"
                          >
                            <UserMinus className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Add member form */}
              {canManage && (
                <div className="bg-white rounded-xl p-4">
                  <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                    <UserPlus className="w-3.5 h-3.5" />Add Member
                  </h3>
                  <form onSubmit={handleAddMember} className="flex gap-2 flex-wrap">
                    <input
                      type="email"
                      value={memberEmail}
                      onChange={(e) => setMemberEmail(e.target.value)}
                      placeholder="user@example.com"
                      required
                      className="flex-1 min-w-[200px] bg-slate-100 border border-gray-300 rounded-lg px-3 py-2 text-sm text-slate-900 placeholder-gray-400 focus:outline-none focus:border-indigo-500"
                    />
                    <select
                      value={memberRole}
                      onChange={(e) => setMemberRole(e.target.value as GroupRole)}
                      className="bg-slate-100 border border-gray-300 rounded-lg px-3 py-2 text-sm text-slate-600"
                    >
                      <option value="viewer">Viewer</option>
                      <option value="editor">Editor</option>
                      <option value="admin">Admin</option>
                    </select>
                    <button
                      type="submit"
                      disabled={actionLoading || !memberEmail.trim()}
                      className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-sm font-medium disabled:opacity-50 transition-colors"
                    >
                      {actionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserPlus className="w-4 h-4" />}
                      Add
                    </button>
                  </form>
                  <div className="mt-3 flex gap-4 text-xs text-slate-500">
                    <span><span className="text-slate-600 font-medium">Viewer</span> — read-only access to group files</span>
                    <span><span className="text-slate-600 font-medium">Editor</span> — can edit group files</span>
                    <span><span className="text-slate-600 font-medium">Admin</span> — can manage members &amp; files</span>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Files Tab */}
          {groupTab === 'files' && (
            <div className="space-y-4">
              <div className="bg-white rounded-xl p-4">
                <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">
                  Shared Files ({(selectedGroup.files as GroupFile[]).length})
                </h3>
                {(selectedGroup.files as GroupFile[]).length === 0 ? (
                  <p className="text-slate-500 text-sm">No files shared with this group yet.</p>
                ) : (
                  <div className="space-y-2">
                    {(selectedGroup.files as GroupFile[]).map((f) => (
                      <div key={f.id} className="flex items-center gap-3 py-2 border-b border-gray-200 last:border-0">
                        <FileText className="w-4 h-4 text-indigo-600 shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm truncate">{f.fileName}</p>
                          <p className="text-slate-500 text-xs">{formatSize(f.size)} · {formatDate(f.sharedAt)}</p>
                        </div>
                        {canManage ? (
                          <select
                            value={f.role}
                            onChange={(e) => handleUpdateFilePermission(f.fileId, e.target.value as SharedRole)}
                            disabled={actionLoading}
                            className="bg-slate-100 border border-gray-300 rounded-lg px-2 py-1 text-xs text-slate-600 disabled:opacity-50"
                          >
                            <option value="viewer">Viewer</option>
                            <option value="editor">Editor</option>
                          </select>
                        ) : (
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${ROLE_COLORS[f.role]}`}>
                            {f.role}
                          </span>
                        )}
                        {canManage && (
                          <button
                            onClick={() => handleRemoveFile(f.fileId)}
                            disabled={actionLoading}
                            className="text-slate-500 hover:text-red-600 transition-colors disabled:opacity-50 ml-1"
                            title="Remove file from group"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Share file form */}
              <div className="bg-white rounded-xl p-4">
                <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                  <Plus className="w-3.5 h-3.5" />Share a File with this Group
                </h3>
                {myFiles.length === 0 ? (
                  <p className="text-slate-500 text-sm">
                    You have no files uploaded yet.{' '}
                    <a href="/upload" className="text-indigo-600 hover:underline">Upload one</a>.
                  </p>
                ) : (
                  <form onSubmit={handleShareFile} className="flex gap-2 flex-wrap">
                    <select
                      value={shareFileId}
                      onChange={(e) => setShareFileId(e.target.value)}
                      required
                      className="flex-1 min-w-[200px] bg-slate-100 border border-gray-300 rounded-lg px-3 py-2 text-sm text-slate-600"
                    >
                      <option value="">Select a file…</option>
                      {myFiles.map((f) => (
                        <option key={f.id} value={f.id}>
                          {f.name}
                        </option>
                      ))}
                    </select>
                    <select
                      value={shareFileRole}
                      onChange={(e) => setShareFileRole(e.target.value as SharedRole)}
                      className="bg-slate-100 border border-gray-300 rounded-lg px-3 py-2 text-sm text-slate-600"
                    >
                      <option value="viewer">Viewer</option>
                      <option value="editor">Editor</option>
                    </select>
                    <button
                      type="submit"
                      disabled={actionLoading || !shareFileId}
                      className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-sm font-medium disabled:opacity-50 transition-colors"
                    >
                      {actionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                      Share
                    </button>
                  </form>
                )}
                <p className="mt-2 text-xs text-slate-500">
                  All group members will be notified by email when a file is shared.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    )
  }



  // ── Groups list view ──────────────────────────────────────────────────────────

  return (
    <div className="flex-1 overflow-y-auto bg-slate-50 text-slate-800">
      <div className="max-w-4xl mx-auto p-6">
        {/* Page Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div>
              <h1 className="text-2xl font-bold flex items-center gap-2">
                <Users className="w-6 h-6 text-indigo-600" />
                Groups
              </h1>
              <p className="text-slate-400 text-sm mt-0.5">Manage teams and share files with multiple people at once</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => tab === 'my-groups' ? loadGroups() : loadSharedFiles()}
              className="text-slate-400 hover:text-slate-900 transition-colors"
              title="Refresh"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
            {tab === 'my-groups' && (
              <button
                onClick={() => setShowCreateForm(true)}
                className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-sm font-medium transition-colors"
              >
                <Plus className="w-4 h-4" />
                New Group
              </button>
            )}
          </div>
        </div>

        {/* Alerts */}
        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm flex items-center justify-between">
            {error}
            <button onClick={() => setError('')}><X className="w-4 h-4" /></button>
          </div>
        )}
        {success && (
          <div className="mb-4 p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-emerald-600 text-sm">
            {success}
          </div>
        )}

        {/* Tabs */}
        <div className="flex gap-1 mb-6 bg-white rounded-xl p-1 w-fit">
          {([
            { key: 'my-groups', label: 'My Groups', icon: <Users className="w-3.5 h-3.5" /> },
            { key: 'shared-with-me', label: 'Shared With Me', icon: <Shield className="w-3.5 h-3.5" /> },
          ] as const).map(({ key, label, icon }) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                tab === key ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-slate-900'
              }`}
            >
              {icon}{label}
            </button>
          ))}
        </div>

        {/* Create Group Form */}
        {showCreateForm && tab === 'my-groups' && (
          <div className="mb-6 bg-white rounded-xl p-5 border border-indigo-500/30">
            <h2 className="font-semibold mb-4 flex items-center gap-2">
              <Plus className="w-4 h-4 text-indigo-600" />Create New Group
            </h2>
            <form onSubmit={handleCreateGroup} className="space-y-3">
              <input
                type="text"
                value={newGroupName}
                onChange={(e) => setNewGroupName(e.target.value)}
                placeholder="Group name *"
                required
                className="w-full bg-slate-100 border border-gray-300 rounded-lg px-3 py-2 text-slate-900 placeholder-gray-400 focus:outline-none focus:border-indigo-500"
              />
              <input
                type="text"
                value={newGroupDesc}
                onChange={(e) => setNewGroupDesc(e.target.value)}
                placeholder="Description (optional)"
                className="w-full bg-slate-100 border border-gray-300 rounded-lg px-3 py-2 text-slate-900 placeholder-gray-400 focus:outline-none focus:border-indigo-500"
              />
              <div>
                <label className="block text-xs text-slate-400 mb-1.5">Default role for all members</label>
                <div className="flex gap-2">
                  {(['viewer', 'editor'] as SharedRole[]).map((r) => (
                    <button
                      key={r}
                      type="button"
                      onClick={() => setNewGroupDefaultRole(r)}
                      className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium border transition-colors capitalize ${
                        newGroupDefaultRole === r
                          ? r === 'editor'
                            ? 'bg-blue-500/20 border-blue-500/50 text-blue-700'
                            : 'bg-slate-500/20 border-slate-500/50 text-slate-600'
                          : 'bg-transparent border-gray-300 text-slate-600 hover:text-slate-800'
                      }`}
                    >
                      {r}
                    </button>
                  ))}
                </div>
                <p className="mt-1.5 text-[11px] text-slate-500">
                  {newGroupDefaultRole === 'editor' ? 'Members can view and edit files shared with this group.' : 'Members can only view files shared with this group.'}
                </p>
              </div>
              <div className="flex gap-2">
                <button
                  type="submit"
                  disabled={actionLoading || !newGroupName.trim()}
                  className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-sm font-medium disabled:opacity-50 transition-colors"
                >
                  {actionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                  Create Group
                </button>
                <button
                  type="button"
                  onClick={() => { setShowCreateForm(false); setNewGroupName(''); setNewGroupDesc(''); setNewGroupDefaultRole('viewer') }}
                  className="px-4 py-2 text-slate-400 hover:text-slate-900 rounded-lg text-sm transition-colors"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}

        {/* My Groups Tab */}
        {tab === 'my-groups' && (
          <>
            {loading ? (
              <div className="flex items-center justify-center py-20">
                <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
              </div>
            ) : groups.length === 0 ? (
              <div className="text-center py-20 text-slate-500">
                <Users className="w-12 h-12 mx-auto mb-3 opacity-30" />
                <p className="font-medium">No groups yet</p>
                <p className="text-sm mt-1">Create a group to share files with multiple people at once.</p>
                <button
                  onClick={() => setShowCreateForm(true)}
                  className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-sm font-medium transition-colors"
                >
                  <Plus className="w-4 h-4" />New Group
                </button>
              </div>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2">
                {groups.map((group) => (
                  <button
                    key={group.id}
                    onClick={() => { loadGroupDetail(group.id); setGroupTab('members') }}
                    className="text-left bg-white hover:bg-slate-100 rounded-xl p-4 transition-colors border border-gray-200 hover:border-indigo-500/40"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-9 h-9 rounded-lg bg-indigo-600/20 flex items-center justify-center shrink-0">
                          <Users className="w-4.5 h-4.5 text-indigo-600" />
                        </div>
                        <div className="min-w-0">
                          <p className="font-semibold truncate">{group.name}</p>
                          {group.description && (
                            <p className="text-slate-400 text-xs truncate mt-0.5">{group.description}</p>
                          )}
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-1 shrink-0">
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${ROLE_COLORS[group.role] ?? ROLE_COLORS.viewer}`}>
                          {group.role}
                        </span>
                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium capitalize ${
                          group.defaultRole === 'editor' ? 'bg-blue-500/15 text-blue-600' : 'bg-slate-500/15 text-slate-400'
                        }`}>
                          {group.defaultRole ?? 'viewer'} access
                        </span>
                      </div>
                    </div>
                    <div className="mt-3 flex items-center gap-3 text-xs text-slate-500">
                      <span className="flex items-center gap-1">
                        <Users className="w-3 h-3" />{group.memberCount} member{group.memberCount !== 1 ? 's' : ''}
                      </span>
                      <span>·</span>
                      <span>{formatDate(group.createdAt)}</span>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </>
        )}

        {/* Shared With Me Tab */}
        {tab === 'shared-with-me' && (
          <>
            {loading ? (
              <div className="flex items-center justify-center py-20">
                <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
              </div>
            ) : sharedFiles.length === 0 ? (
              <div className="text-center py-20 text-slate-500">
                <FileText className="w-12 h-12 mx-auto mb-3 opacity-30" />
                <p className="font-medium">No files shared with you via groups</p>
                <p className="text-sm mt-1">When a group you belong to gets a file shared with it, it'll appear here.</p>
              </div>
            ) : (
              <div className="bg-white rounded-xl overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-200">
                      <th className="text-left px-4 py-3 text-slate-500 font-medium text-xs uppercase tracking-wide">File</th>
                      <th className="text-left px-4 py-3 text-slate-500 font-medium text-xs uppercase tracking-wide">Group</th>
                      <th className="text-left px-4 py-3 text-slate-500 font-medium text-xs uppercase tracking-wide">Permission</th>
                      <th className="text-left px-4 py-3 text-slate-500 font-medium text-xs uppercase tracking-wide">Shared</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sharedFiles.map((f, i) => (
                      <tr
                        key={`${f.fileId}-${f.groupId}`}
                        className={i % 2 === 0 ? '' : 'bg-gray-50'}
                      >
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <FileText className="w-4 h-4 text-indigo-600 shrink-0" />
                            <span className="font-medium truncate max-w-[200px]">{f.fileName}</span>
                            <span className="text-slate-500 text-xs">({formatSize(f.size)})</span>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-slate-600">{f.groupName}</span>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${ROLE_COLORS[f.role]}`}>
                            {f.role}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-slate-400 text-xs">
                          {formatDate(f.sharedAt)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
