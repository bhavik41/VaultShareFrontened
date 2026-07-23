import { useEffect, useState, type FormEvent } from 'react'
import { useSearchParams } from 'react-router-dom'
import {
  Check, ChevronLeft, FileText, Loader2, Mail, Plus, RefreshCw,
  Shield, Trash2, UserMinus, UserPlus, Users, X,
} from 'lucide-react'
import type { Group, GroupDetail, GroupFile, GroupFileForMe, GroupInvite, GroupMember, GroupRole, SharedRole } from '@/store/groupsApi'
import {
  addMember, createGroup, deleteGroup, getGroup, getGroupFilesForMe,
  getMyGroupInvitations, listGroups, removeGroupFile, removeMember,
  respondToGroupInvitation, shareFileWithGroup, updateGroup,
  updateGroupFilePermission, updateMemberRole,
} from '@/store/groupsApi'
import { getMyFiles } from '@/store/filesApi'
import type { UploadedFile } from '@/store/filesApi'

function formatDate(v: string) { return new Date(v).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' }) }
function formatSize(b: number) {
  if (b < 1024) return `${b} B`
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)} KB`
  return `${(b / 1024 / 1024).toFixed(1)} MB`
}

const ROLE_BADGE: Record<string, string> = {
  owner:  'bg-vs-warn-surface/60 text-vs-warn',
  admin:  'bg-vs-warn-surface/40 text-vs-warn',
  editor: 'bg-vs-active text-vs-brand',
  viewer: 'bg-vs-surface text-vs-body',
}

const inputCls  = 'w-full rounded-lg border border-vs-border bg-vs-hover px-3 py-2 text-sm text-vs-heading placeholder:text-vs-muted outline-none focus:border-vs-brand transition-all'
const selectCls = 'rounded-lg border border-vs-border bg-vs-hover px-3 py-2 text-sm text-vs-heading outline-none focus:border-vs-brand cursor-pointer'
const cardCls   = 'bg-vs-card border border-vs-border rounded-xl p-4 shadow-sm'

type Tab = 'my-groups' | 'shared-with-me' | 'invitations'
type GroupTab = 'members' | 'files'

export default function GroupsPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const [tab, setTab]                         = useState<Tab>('my-groups')
  const [groups, setGroups]                   = useState<Group[]>([])
  const [selectedGroup, setSelectedGroup]     = useState<GroupDetail | null>(null)
  const [groupTab, setGroupTab]               = useState<GroupTab>('members')
  const [sharedFiles, setSharedFiles]         = useState<GroupFileForMe[]>([])
  const [invitations, setInvitations]         = useState<GroupInvite[]>([])
  const [myFiles, setMyFiles]                 = useState<UploadedFile[]>([])
  const [loading, setLoading]                 = useState(true)
  const [actionLoading, setActionLoading]     = useState(false)
  const [error, setError]                     = useState('')
  const [success, setSuccess]                 = useState('')
  const [showCreateForm, setShowCreateForm]   = useState(false)
  const [newGroupName, setNewGroupName]       = useState('')
  const [newGroupDesc, setNewGroupDesc]       = useState('')
  const [newGroupDefaultRole, setNewGroupDefaultRole] = useState<SharedRole>('viewer')
  const [editingGroup, setEditingGroup]       = useState(false)
  const [editName, setEditName]               = useState('')
  const [editDesc, setEditDesc]               = useState('')
  const [editDefaultRole, setEditDefaultRole] = useState<SharedRole>('viewer')
  const [memberEmail, setMemberEmail]         = useState('')
  const [memberRole, setMemberRole]           = useState<GroupRole>('viewer')
  const [shareFileId, setShareFileId]         = useState('')
  const [shareFileRole, setShareFileRole]     = useState<SharedRole>('viewer')

  async function loadGroups() {
    try { setLoading(true); setError(''); const [gs, fs] = await Promise.all([listGroups(), getMyFiles()]); setGroups(gs); setMyFiles(fs) }
    catch { setError('Unable to load groups.') } finally { setLoading(false) }
  }
  async function loadSharedFiles() {
    try { setLoading(true); setError(''); setSharedFiles(await getGroupFilesForMe()) }
    catch { setError('Unable to load shared files.') } finally { setLoading(false) }
  }
  async function loadInvitations() {
    try { setLoading(true); setError(''); setInvitations(await getMyGroupInvitations()) }
    catch { setError('Unable to load invitations.') } finally { setLoading(false) }
  }
  async function loadGroupDetail(id: string) {
    try { setActionLoading(true); const d = await getGroup(id); setSelectedGroup(d); setEditName(d.name); setEditDesc(d.description ?? ''); setEditDefaultRole((d as any).defaultRole ?? 'viewer'); setShareFileRole((d as any).defaultRole ?? 'viewer') }
    catch { setError('Unable to load group.') } finally { setActionLoading(false) }
  }

  useEffect(() => {
    if (tab === 'my-groups') loadGroups()
    else if (tab === 'shared-with-me') loadSharedFiles()
    else loadInvitations()
  }, [tab])

  useEffect(() => {
    getMyGroupInvitations().then(setInvitations).catch(() => {})
    const inviteId = searchParams.get('invite')
    if (inviteId) {
      setTab('invitations')
      setSearchParams({}, { replace: true })
    }
  }, [])

  function flashSuccess(msg: string) { setSuccess(msg); setTimeout(() => setSuccess(''), 3500) }

  async function handleCreateGroup(e: FormEvent) {
    e.preventDefault(); if (!newGroupName.trim()) return
    try { setActionLoading(true); setError(''); const g = await createGroup({ name: newGroupName.trim(), description: newGroupDesc.trim() || undefined, defaultRole: newGroupDefaultRole }); setGroups(p => [{ ...g, role: 'owner', memberCount: 1 }, ...p]); setNewGroupName(''); setNewGroupDesc(''); setNewGroupDefaultRole('viewer'); setShowCreateForm(false); flashSuccess('Group created.') }
    catch (err: any) { setError(err?.response?.data?.message ?? 'Failed to create group.') } finally { setActionLoading(false) }
  }
  async function handleUpdateGroup(e: FormEvent) {
    e.preventDefault(); if (!selectedGroup || !editName.trim()) return
    try { setActionLoading(true); setError(''); await updateGroup(selectedGroup.id, { name: editName.trim(), description: editDesc.trim() || undefined, defaultRole: editDefaultRole }); await loadGroupDetail(selectedGroup.id); setEditingGroup(false); flashSuccess('Group updated.') }
    catch (err: any) { setError(err?.response?.data?.message ?? 'Failed to update.') } finally { setActionLoading(false) }
  }
  async function handleDeleteGroup(id: string) {
    if (!confirm('Delete this group?')) return
    try { setActionLoading(true); await deleteGroup(id); setGroups(p => p.filter(g => g.id !== id)); setSelectedGroup(null); flashSuccess('Group deleted.') }
    catch (err: any) { setError(err?.response?.data?.message ?? 'Failed to delete.') } finally { setActionLoading(false) }
  }
  async function handleAddMember(e: FormEvent) {
    e.preventDefault(); if (!selectedGroup || !memberEmail.trim()) return
    try { setActionLoading(true); setError(''); await addMember(selectedGroup.id, { email: memberEmail.trim(), role: memberRole }); await loadGroupDetail(selectedGroup.id); setMemberEmail(''); setMemberRole('viewer'); flashSuccess('Invitation sent.') }
    catch (err: any) { setError(err?.response?.data?.message ?? 'Failed to send invitation.') } finally { setActionLoading(false) }
  }
  async function handleRespondInvitation(invitationId: string, accept: boolean) {
    try { setActionLoading(true); setError(''); await respondToGroupInvitation(invitationId, accept); setInvitations(p => p.filter(i => i.id !== invitationId)); flashSuccess(accept ? 'Invitation accepted! You are now a member.' : 'Invitation rejected.') }
    catch (err: any) { setError(err?.response?.data?.message ?? 'Failed to respond.') } finally { setActionLoading(false) }
  }
  async function handleUpdateMemberRole(userId: string, role: GroupRole) {
    if (!selectedGroup) return
    try { setActionLoading(true); setError(''); await updateMemberRole(selectedGroup.id, userId, role); await loadGroupDetail(selectedGroup.id); flashSuccess('Role updated.') }
    catch (err: any) { setError(err?.response?.data?.message ?? 'Failed to update role.') } finally { setActionLoading(false) }
  }
  async function handleRemoveMember(userId: string) {
    if (!selectedGroup || !confirm('Remove this member?')) return
    try { setActionLoading(true); setError(''); await removeMember(selectedGroup.id, userId); await loadGroupDetail(selectedGroup.id); flashSuccess('Member removed.') }
    catch (err: any) { setError(err?.response?.data?.message ?? 'Failed to remove.') } finally { setActionLoading(false) }
  }
  async function handleShareFile(e: FormEvent) {
    e.preventDefault(); if (!selectedGroup || !shareFileId) return
    try { setActionLoading(true); setError(''); await shareFileWithGroup(selectedGroup.id, { fileId: shareFileId, role: shareFileRole }); await loadGroupDetail(selectedGroup.id); setShareFileId(''); setShareFileRole('viewer'); flashSuccess('File shared with group.') }
    catch (err: any) { setError(err?.response?.data?.message ?? 'Failed to share.') } finally { setActionLoading(false) }
  }
  async function handleUpdateFilePermission(fileId: string, role: SharedRole) {
    if (!selectedGroup) return
    try { setActionLoading(true); setError(''); await updateGroupFilePermission(selectedGroup.id, fileId, role); await loadGroupDetail(selectedGroup.id); flashSuccess('Permission updated.') }
    catch (err: any) { setError(err?.response?.data?.message ?? 'Failed to update.') } finally { setActionLoading(false) }
  }
  async function handleRemoveFile(fileId: string) {
    if (!selectedGroup || !confirm('Remove this file from the group?')) return
    try { setActionLoading(true); setError(''); await removeGroupFile(selectedGroup.id, fileId); await loadGroupDetail(selectedGroup.id); flashSuccess('File removed.') }
    catch (err: any) { setError(err?.response?.data?.message ?? 'Failed to remove.') } finally { setActionLoading(false) }
  }

  const Alerts = () => (
    <>
      {error   && <div className="mb-4 rounded-lg border border-vs-error/20 bg-vs-error-surface/40 px-4 py-3 text-sm font-medium text-vs-error flex items-center justify-between">{error}<button onClick={() => setError('')} className="border-0 bg-transparent cursor-pointer text-vs-error"><X size={14} /></button></div>}
      {success && <div className="mb-4 rounded-lg border border-vs-success/20 bg-vs-success-surface/20 px-4 py-3 text-sm font-medium text-vs-success">{success}</div>}
    </>
  )

  // ── Group detail view ──
  if (selectedGroup) {
    const myGroupRole = groups.find(g => g.id === selectedGroup.id)?.role ?? 'viewer'
    const canManage = myGroupRole === 'owner' || myGroupRole === 'admin'
    return (
      <div className="flex-1 overflow-y-auto bg-vs-bg">
        <div className="max-w-4xl mx-auto px-6 py-8">
          <div className="flex items-center gap-3 mb-6">
            <button onClick={() => { setSelectedGroup(null); setEditingGroup(false) }}
              className="flex items-center gap-1 text-vs-muted hover:text-vs-heading transition-colors text-sm border-0 bg-transparent cursor-pointer">
              <ChevronLeft size={16} />Groups
            </button>
            <div className="flex-1 min-w-0">
              {editingGroup ? (
                <form onSubmit={handleUpdateGroup} className="flex items-center gap-2 flex-wrap">
                  <input value={editName} onChange={e => setEditName(e.target.value)} required className="rounded-lg border border-vs-border bg-vs-hover px-3 py-1.5 text-vs-heading text-base font-semibold w-44 outline-none focus:border-vs-brand" />
                  <input value={editDesc} onChange={e => setEditDesc(e.target.value)} placeholder="Description" className="rounded-lg border border-vs-border bg-vs-hover px-3 py-1.5 text-vs-body text-sm flex-1 outline-none focus:border-vs-brand" />
                  <select value={editDefaultRole} onChange={e => setEditDefaultRole(e.target.value as SharedRole)} className={selectCls}>
                    <option value="viewer">Default: Viewer</option>
                    <option value="editor">Default: Editor</option>
                  </select>
                  <button type="submit" disabled={actionLoading} className="px-3 py-1.5 bg-vs-brand hover:opacity-90 text-white rounded-lg text-sm font-semibold disabled:opacity-50 cursor-pointer border-0">Save</button>
                  <button type="button" onClick={() => setEditingGroup(false)} className="px-3 py-1.5 text-vs-muted hover:text-vs-heading text-sm border-0 bg-transparent cursor-pointer">Cancel</button>
                </form>
              ) : (
                <div className="flex items-center gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <h1 className="text-xl font-bold text-vs-heading font-display">{selectedGroup.name}</h1>
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold capitalize ${(selectedGroup as any).defaultRole === 'editor' ? 'bg-vs-active text-vs-brand' : 'bg-vs-surface text-vs-body'}`}>
                        {(selectedGroup as any).defaultRole ?? 'viewer'} access
                      </span>
                    </div>
                    {selectedGroup.description && <p className="text-sm text-vs-muted">{selectedGroup.description}</p>}
                  </div>
                  {canManage && <button onClick={() => setEditingGroup(true)} className="text-sm text-vs-brand hover:underline border-0 bg-transparent cursor-pointer">Edit</button>}
                </div>
              )}
            </div>
            <div className="flex items-center gap-3">
              <span className="text-sm text-vs-muted">{selectedGroup.memberCount} member{selectedGroup.memberCount !== 1 ? 's' : ''}</span>
              {canManage && (
                <button onClick={() => handleDeleteGroup(selectedGroup.id)} disabled={actionLoading}
                  className="flex items-center gap-1 px-3 py-1.5 bg-vs-error-surface/40 hover:bg-vs-error-surface/70 text-vs-error rounded-lg text-sm font-medium disabled:opacity-50 cursor-pointer border-0 transition-colors">
                  <Trash2 size={13} />Delete
                </button>
              )}
            </div>
          </div>

          <Alerts />

          {/* Sub-tabs */}
          <div className="flex gap-1 mb-6 bg-vs-hover border border-vs-border rounded-xl p-1 w-fit">
            {(['members','files'] as GroupTab[]).map(t => (
              <button key={t} onClick={() => setGroupTab(t)}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium capitalize transition-colors cursor-pointer border-0 ${groupTab === t ? 'bg-vs-active text-vs-brand font-semibold' : 'bg-transparent text-vs-body hover:text-vs-heading'}`}>
                {t === 'members' ? <><Users size={13} />Members</> : <><FileText size={13} />Files</>}
              </button>
            ))}
          </div>

          {/* Members */}
          {groupTab === 'members' && (
            <div className="space-y-4">
              <div className={cardCls}>
                <h3 className="text-xs font-semibold text-vs-muted uppercase tracking-wider mb-3">Owner</h3>
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-vs-brand flex items-center justify-center text-white font-bold text-sm">
                    {selectedGroup.ownerName.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-vs-heading">{selectedGroup.ownerName}</p>
                    <p className="text-xs text-vs-muted truncate">{selectedGroup.ownerEmail}</p>
                  </div>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${ROLE_BADGE.owner}`}>owner</span>
                </div>
              </div>

              <div className={cardCls}>
                <h3 className="text-xs font-semibold text-vs-muted uppercase tracking-wider mb-3">Members ({selectedGroup.members.length})</h3>
                {selectedGroup.members.length === 0
                  ? <p className="text-sm text-vs-muted">No members yet.</p>
                  : <div className="divide-y divide-vs-border-subtle">
                    {selectedGroup.members.map((m: GroupMember) => (
                      <div key={m.id} className="flex items-center gap-3 py-2.5">
                        <div className="w-8 h-8 rounded-full bg-vs-active flex items-center justify-center text-vs-brand font-bold text-sm shrink-0">
                          {m.name.charAt(0).toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-vs-heading">{m.name}</p>
                          <p className="text-xs text-vs-muted truncate">{m.email}</p>
                        </div>
                        {canManage
                          ? <select value={m.role} onChange={e => handleUpdateMemberRole(m.userId, e.target.value as GroupRole)} disabled={actionLoading} className={`${selectCls} disabled:opacity-50`}>
                              <option value="viewer">Viewer</option>
                              <option value="editor">Editor</option>
                              <option value="admin">Admin</option>
                            </select>
                          : <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${ROLE_BADGE[m.role] ?? ROLE_BADGE.viewer}`}>{m.role}</span>
                        }
                        {canManage && <button onClick={() => handleRemoveMember(m.userId)} disabled={actionLoading} className="text-vs-muted hover:text-vs-error transition-colors disabled:opacity-50 ml-1 border-0 bg-transparent cursor-pointer"><UserMinus size={15} /></button>}
                      </div>
                    ))}
                  </div>
                }
              </div>

              {canManage && (
                <div className={cardCls}>
                  <h3 className="text-xs font-semibold text-vs-muted uppercase tracking-wider mb-3 flex items-center gap-1.5"><UserPlus size={13} />Invite Member</h3>
                  <form onSubmit={handleAddMember} className="flex gap-2 flex-wrap">
                    <input type="email" value={memberEmail} onChange={e => setMemberEmail(e.target.value)} placeholder="user@example.com" required className={inputCls + ' flex-1 min-w-[200px] w-auto'} />
                    <select value={memberRole} onChange={e => setMemberRole(e.target.value as GroupRole)} className={selectCls}><option value="viewer">Viewer</option><option value="editor">Editor</option><option value="admin">Admin</option></select>
                    <button type="submit" disabled={actionLoading || !memberEmail.trim()} className="flex items-center gap-1.5 px-4 py-2 bg-vs-brand hover:opacity-90 text-white rounded-lg text-sm font-semibold disabled:opacity-50 cursor-pointer border-0 transition-opacity">
                      {actionLoading ? <Loader2 size={14} className="animate-spin" /> : <UserPlus size={14} />}Invite
                    </button>
                  </form>
                </div>
              )}
            </div>
          )}

          {/* Files */}
          {groupTab === 'files' && (
            <div className="space-y-4">
              <div className={cardCls}>
                <h3 className="text-xs font-semibold text-vs-muted uppercase tracking-wider mb-3">Shared Files ({(selectedGroup.files as GroupFile[]).length})</h3>
                {(selectedGroup.files as GroupFile[]).length === 0
                  ? <p className="text-sm text-vs-muted">No files shared with this group yet.</p>
                  : <div className="divide-y divide-vs-border-subtle">
                    {(selectedGroup.files as GroupFile[]).map(f => (
                      <div key={f.id} className="flex items-center gap-3 py-2.5">
                        <FileText size={15} className="text-vs-brand shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-vs-heading truncate">{f.fileName}</p>
                          <p className="text-xs text-vs-muted">{formatSize(f.size)} · {formatDate(f.sharedAt)}</p>
                        </div>
                        {canManage
                          ? <select value={f.role} onChange={e => handleUpdateFilePermission(f.fileId, e.target.value as SharedRole)} disabled={actionLoading} className={`${selectCls} disabled:opacity-50`}><option value="viewer">Viewer</option><option value="editor">Editor</option></select>
                          : <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${ROLE_BADGE[f.role] ?? ROLE_BADGE.viewer}`}>{f.role}</span>
                        }
                        {canManage && <button onClick={() => handleRemoveFile(f.fileId)} disabled={actionLoading} className="text-vs-muted hover:text-vs-error transition-colors disabled:opacity-50 ml-1 border-0 bg-transparent cursor-pointer"><Trash2 size={14} /></button>}
                      </div>
                    ))}
                  </div>
                }
              </div>

              <div className={cardCls}>
                <h3 className="text-xs font-semibold text-vs-muted uppercase tracking-wider mb-3 flex items-center gap-1.5"><Plus size={13} />Share a File</h3>
                {myFiles.length === 0
                  ? <p className="text-sm text-vs-muted">You have no files uploaded yet.</p>
                  : <form onSubmit={handleShareFile} className="flex gap-2 flex-wrap">
                    <select value={shareFileId} onChange={e => setShareFileId(e.target.value)} required className={`${selectCls} flex-1 min-w-[200px]`}><option value="">Select a file…</option>{myFiles.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}</select>
                    <select value={shareFileRole} onChange={e => setShareFileRole(e.target.value as SharedRole)} className={selectCls}><option value="viewer">Viewer</option><option value="editor">Editor</option></select>
                    <button type="submit" disabled={actionLoading || !shareFileId} className="flex items-center gap-1.5 px-4 py-2 bg-vs-brand hover:opacity-90 text-white rounded-lg text-sm font-semibold disabled:opacity-50 cursor-pointer border-0 transition-opacity">
                      {actionLoading ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}Share
                    </button>
                  </form>
                }
                <p className="mt-2 text-xs text-vs-muted">All group members will be notified when a file is shared.</p>
              </div>
            </div>
          )}
        </div>
      </div>
    )
  }

  // ── Groups list view ──
  return (
    <div className="flex-1 overflow-y-auto bg-vs-bg">
      <div className="max-w-4xl mx-auto px-6 py-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-vs-heading font-display flex items-center gap-2"><Users size={22} className="text-vs-brand" />Groups</h1>
            <p className="text-sm text-vs-muted mt-0.5">Manage teams and share files with multiple people at once</p>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => tab === 'my-groups' ? loadGroups() : loadSharedFiles()} className="text-vs-muted hover:text-vs-heading transition-colors border-0 bg-transparent cursor-pointer" title="Refresh">
              <RefreshCw size={15} />
            </button>
            {tab === 'my-groups' && (
              <button onClick={() => setShowCreateForm(true)}
                className="flex items-center gap-1.5 px-4 py-2 bg-vs-brand hover:opacity-90 text-white rounded-lg text-sm font-semibold transition-opacity cursor-pointer border-0">
                <Plus size={15} />New Group
              </button>
            )}
          </div>
        </div>

        <Alerts />

        {/* Tabs */}
        <div className="flex gap-1 mb-6 bg-vs-hover border border-vs-border rounded-xl p-1 w-fit">
          {([
            { key: 'my-groups',      label: 'My Groups',       icon: <Users size={13} /> },
            { key: 'shared-with-me', label: 'Shared With Me',  icon: <Shield size={13} /> },
            { key: 'invitations',    label: 'Invitations',     icon: <Mail size={13} /> },
          ] as const).map(({ key, label, icon }) => (
            <button key={key} onClick={() => setTab(key)}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-colors cursor-pointer border-0 ${tab === key ? 'bg-vs-active text-vs-brand font-semibold' : 'bg-transparent text-vs-body hover:text-vs-heading'}`}>
              {icon}{label}
              {key === 'invitations' && invitations.length > 0 && (
                <span className="ml-1 w-5 h-5 rounded-full bg-vs-brand text-white text-[10px] font-bold flex items-center justify-center">{invitations.length}</span>
              )}
            </button>
          ))}
        </div>

        {/* Create Group Form */}
        {showCreateForm && tab === 'my-groups' && (
          <div className="mb-6 bg-vs-card border border-vs-brand/20 rounded-xl p-5 shadow-sm">
            <h2 className="text-sm font-semibold text-vs-heading mb-4 flex items-center gap-2"><Plus size={14} className="text-vs-brand" />Create New Group</h2>
            <form onSubmit={handleCreateGroup} className="space-y-3">
              <input type="text" value={newGroupName} onChange={e => setNewGroupName(e.target.value)} placeholder="Group name *" required className={inputCls} />
              <input type="text" value={newGroupDesc} onChange={e => setNewGroupDesc(e.target.value)} placeholder="Description (optional)" className={inputCls} />
              <div>
                <label className="block text-xs text-vs-muted mb-1.5">Default role for all members</label>
                <div className="flex gap-2">
                  {(['viewer','editor'] as SharedRole[]).map(r => (
                    <button key={r} type="button" onClick={() => setNewGroupDefaultRole(r)}
                      className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium border capitalize cursor-pointer transition-colors ${newGroupDefaultRole === r ? (r === 'editor' ? 'bg-vs-active border-vs-brand/30 text-vs-brand' : 'bg-vs-surface border-vs-border text-vs-body') : 'bg-transparent border-vs-border text-vs-muted hover:text-vs-heading'}`}>
                      {r}
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex gap-2">
                <button type="submit" disabled={actionLoading || !newGroupName.trim()} className="flex items-center gap-1.5 px-4 py-2 bg-vs-brand hover:opacity-90 text-white rounded-lg text-sm font-semibold disabled:opacity-50 cursor-pointer border-0 transition-opacity">
                  {actionLoading ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}Create
                </button>
                <button type="button" onClick={() => { setShowCreateForm(false); setNewGroupName(''); setNewGroupDesc(''); setNewGroupDefaultRole('viewer') }} className="px-4 py-2 text-vs-muted hover:text-vs-heading rounded-lg text-sm border-0 bg-transparent cursor-pointer">Cancel</button>
              </div>
            </form>
          </div>
        )}

        {/* My Groups */}
        {tab === 'my-groups' && (
          loading ? <div className="flex justify-center py-20"><Loader2 size={28} className="animate-spin text-vs-brand" /></div>
          : groups.length === 0 ? (
            <div className="text-center py-20 text-vs-muted">
              <Users size={40} className="mx-auto mb-3 opacity-30" />
              <p className="text-sm font-semibold text-vs-body">No groups yet</p>
              <p className="text-sm mt-1">Create a group to share files with multiple people at once.</p>
              <button onClick={() => setShowCreateForm(true)} className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 bg-vs-brand hover:opacity-90 text-white rounded-lg text-sm font-semibold cursor-pointer border-0 transition-opacity">
                <Plus size={14} />New Group
              </button>
            </div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              {groups.map(group => (
                <button key={group.id} onClick={() => { loadGroupDetail(group.id); setGroupTab('members') }}
                  className="text-left bg-vs-card hover:bg-vs-hover rounded-xl p-4 transition-colors border border-vs-border hover:border-vs-brand/30 shadow-sm cursor-pointer">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-9 h-9 rounded-lg bg-vs-active flex items-center justify-center shrink-0">
                        <Users size={17} className="text-vs-brand" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-vs-heading truncate">{group.name}</p>
                        {group.description && <p className="text-xs text-vs-muted truncate mt-0.5">{group.description}</p>}
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-1 shrink-0">
                      <span className={`text-[11px] px-2 py-0.5 rounded-full font-semibold ${ROLE_BADGE[group.role] ?? ROLE_BADGE.viewer}`}>{group.role}</span>
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium capitalize ${group.defaultRole === 'editor' ? 'bg-vs-active text-vs-brand' : 'bg-vs-surface text-vs-body'}`}>{group.defaultRole ?? 'viewer'} access</span>
                    </div>
                  </div>
                  <div className="mt-3 flex items-center gap-3 text-xs text-vs-muted">
                    <span className="flex items-center gap-1"><Users size={11} />{group.memberCount} member{group.memberCount !== 1 ? 's' : ''}</span>
                    <span>·</span>
                    <span>{formatDate(group.createdAt)}</span>
                  </div>
                </button>
              ))}
            </div>
          )
        )}

        {/* Invitations */}
        {tab === 'invitations' && (
          loading ? <div className="flex justify-center py-20"><Loader2 size={28} className="animate-spin text-vs-brand" /></div>
          : invitations.length === 0 ? (
            <div className="text-center py-20 text-vs-muted">
              <Mail size={40} className="mx-auto mb-3 opacity-30" />
              <p className="text-sm font-semibold text-vs-body">No pending invitations</p>
              <p className="text-sm mt-1">When someone invites you to a group, it will appear here.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {invitations.map(inv => (
                <div key={inv.id} className="bg-vs-card border border-vs-border rounded-xl p-5 shadow-sm">
                  <div className="flex items-start gap-4">
                    <div className="w-10 h-10 rounded-lg bg-vs-active flex items-center justify-center shrink-0">
                      <Users size={18} className="text-vs-brand" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-vs-heading">
                        <span className="text-vs-brand">{inv.inviterName}</span> invited you to join <span className="text-vs-brand">{inv.groupName}</span>
                      </p>
                      <div className="flex items-center gap-3 mt-1 text-xs text-vs-muted">
                        <span>Role: <span className={`px-1.5 py-0.5 rounded-full font-semibold ${ROLE_BADGE[inv.role] ?? ROLE_BADGE.viewer}`}>{inv.role}</span></span>
                        <span>·</span>
                        <span>{formatDate(inv.createdAt)}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <button onClick={() => handleRespondInvitation(inv.id, true)} disabled={actionLoading}
                        className="flex items-center gap-1.5 px-4 py-2 bg-vs-brand hover:opacity-90 text-white rounded-lg text-sm font-semibold disabled:opacity-50 cursor-pointer border-0 transition-opacity">
                        <Check size={14} />Accept
                      </button>
                      <button onClick={() => handleRespondInvitation(inv.id, false)} disabled={actionLoading}
                        className="flex items-center gap-1.5 px-4 py-2 bg-vs-error-surface/40 hover:bg-vs-error-surface/70 text-vs-error rounded-lg text-sm font-semibold disabled:opacity-50 cursor-pointer border-0 transition-colors">
                        <X size={14} />Reject
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )
        )}

        {/* Shared With Me */}
        {tab === 'shared-with-me' && (
          loading ? <div className="flex justify-center py-20"><Loader2 size={28} className="animate-spin text-vs-brand" /></div>
          : sharedFiles.length === 0 ? (
            <div className="text-center py-20 text-vs-muted">
              <FileText size={40} className="mx-auto mb-3 opacity-30" />
              <p className="text-sm font-semibold text-vs-body">No files shared with you via groups</p>
              <p className="text-sm mt-1">Files shared with your groups will appear here.</p>
            </div>
          ) : (
            <div className="bg-vs-card border border-vs-border rounded-xl overflow-hidden shadow-sm">
              <table className="w-full">
                <thead className="bg-vs-hover border-b border-vs-border">
                  <tr>
                    {['File','Group','Permission','Shared'].map(h => (
                      <th key={h} className="text-left px-4 py-3 text-[11px] font-semibold text-vs-body uppercase tracking-wider">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-vs-border-subtle">
                  {sharedFiles.map(f => (
                    <tr key={`${f.fileId}-${f.groupId}`} className="hover:bg-vs-hover transition-colors">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <FileText size={14} className="text-vs-brand shrink-0" />
                          <span className="text-sm font-semibold text-vs-heading truncate max-w-[180px]">{f.fileName}</span>
                          <span className="text-xs text-vs-muted">({formatSize(f.size)})</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm text-vs-body">{f.groupName}</td>
                      <td className="px-4 py-3"><span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${ROLE_BADGE[f.role] ?? ROLE_BADGE.viewer}`}>{f.role}</span></td>
                      <td className="px-4 py-3 text-xs text-vs-muted">{formatDate(f.sharedAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        )}
      </div>
    </div>
  )
}
