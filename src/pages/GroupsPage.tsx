import { useEffect, useState, type FormEvent } from 'react'
import {
  ChevronLeft, FileText, Loader2, Plus, RefreshCw,
  Shield, Trash2, UserMinus, UserPlus, Users, X,
} from 'lucide-react'
import type { Group, GroupDetail, GroupFile, GroupFileForMe, GroupMember, GroupRole, SharedRole } from '@/store/groupsApi'
import {
  addMember, createGroup, deleteGroup, getGroup, getGroupFilesForMe, listGroups,
  removeGroupFile, removeMember, shareFileWithGroup, updateGroup,
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
  owner:  'bg-[#ffddb8]/60 text-[#5c3800]',
  admin:  'bg-[#ffddb8]/40 text-[#5c3800]',
  editor: 'bg-[#d9e2ff] text-[#003c90]',
  viewer: 'bg-[#e5eeff] text-[#434653]',
}

const inputCls  = 'w-full rounded-lg border border-[#c3c6d5] bg-[#eff4ff] px-3 py-2 text-sm text-[#0b1c30] placeholder:text-[#737784] outline-none focus:border-[#003c90] transition-all'
const selectCls = 'rounded-lg border border-[#c3c6d5] bg-[#eff4ff] px-3 py-2 text-sm text-[#0b1c30] outline-none focus:border-[#003c90] cursor-pointer'
const cardCls   = 'bg-white border border-[#c3c6d5] rounded-xl p-4 shadow-sm'

type Tab = 'my-groups' | 'shared-with-me'
type GroupTab = 'members' | 'files'

export default function GroupsPage() {
  const [tab, setTab]                         = useState<Tab>('my-groups')
  const [groups, setGroups]                   = useState<Group[]>([])
  const [selectedGroup, setSelectedGroup]     = useState<GroupDetail | null>(null)
  const [groupTab, setGroupTab]               = useState<GroupTab>('members')
  const [sharedFiles, setSharedFiles]         = useState<GroupFileForMe[]>([])
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
  async function loadGroupDetail(id: string) {
    try { setActionLoading(true); const d = await getGroup(id); setSelectedGroup(d); setEditName(d.name); setEditDesc(d.description ?? ''); setEditDefaultRole((d as any).defaultRole ?? 'viewer'); setShareFileRole((d as any).defaultRole ?? 'viewer') }
    catch { setError('Unable to load group.') } finally { setActionLoading(false) }
  }

  useEffect(() => { if (tab === 'my-groups') loadGroups(); else loadSharedFiles() }, [tab])

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
    try { setActionLoading(true); setError(''); await addMember(selectedGroup.id, { email: memberEmail.trim(), role: memberRole }); await loadGroupDetail(selectedGroup.id); setMemberEmail(''); setMemberRole('viewer'); flashSuccess('Member added.') }
    catch (err: any) { setError(err?.response?.data?.message ?? 'Failed to add member.') } finally { setActionLoading(false) }
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
      {error   && <div className="mb-4 rounded-lg border border-[#ba1a1a]/20 bg-[#ffdad6]/40 px-4 py-3 text-sm font-medium text-[#ba1a1a] flex items-center justify-between">{error}<button onClick={() => setError('')} className="border-0 bg-transparent cursor-pointer text-[#ba1a1a]"><X size={14} /></button></div>}
      {success && <div className="mb-4 rounded-lg border border-[#006c49]/20 bg-[#6cf8bb]/20 px-4 py-3 text-sm font-medium text-[#006c49]">{success}</div>}
    </>
  )

  // ── Group detail view ──
  if (selectedGroup) {
    const myGroupRole = groups.find(g => g.id === selectedGroup.id)?.role ?? 'viewer'
    const canManage = myGroupRole === 'owner' || myGroupRole === 'admin'
    return (
      <div className="flex-1 overflow-y-auto bg-[#f8f9ff]">
        <div className="max-w-4xl mx-auto px-6 py-8">
          <div className="flex items-center gap-3 mb-6">
            <button onClick={() => { setSelectedGroup(null); setEditingGroup(false) }}
              className="flex items-center gap-1 text-[#737784] hover:text-[#0b1c30] transition-colors text-sm border-0 bg-transparent cursor-pointer">
              <ChevronLeft size={16} />Groups
            </button>
            <div className="flex-1 min-w-0">
              {editingGroup ? (
                <form onSubmit={handleUpdateGroup} className="flex items-center gap-2 flex-wrap">
                  <input value={editName} onChange={e => setEditName(e.target.value)} required className="rounded-lg border border-[#c3c6d5] bg-[#eff4ff] px-3 py-1.5 text-[#0b1c30] text-base font-semibold w-44 outline-none focus:border-[#003c90]" />
                  <input value={editDesc} onChange={e => setEditDesc(e.target.value)} placeholder="Description" className="rounded-lg border border-[#c3c6d5] bg-[#eff4ff] px-3 py-1.5 text-[#434653] text-sm flex-1 outline-none focus:border-[#003c90]" />
                  <select value={editDefaultRole} onChange={e => setEditDefaultRole(e.target.value as SharedRole)} className={selectCls}>
                    <option value="viewer">Default: Viewer</option>
                    <option value="editor">Default: Editor</option>
                  </select>
                  <button type="submit" disabled={actionLoading} className="px-3 py-1.5 bg-[#003c90] hover:opacity-90 text-white rounded-lg text-sm font-semibold disabled:opacity-50 cursor-pointer border-0">Save</button>
                  <button type="button" onClick={() => setEditingGroup(false)} className="px-3 py-1.5 text-[#737784] hover:text-[#0b1c30] text-sm border-0 bg-transparent cursor-pointer">Cancel</button>
                </form>
              ) : (
                <div className="flex items-center gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <h1 className="text-xl font-bold text-[#0b1c30] font-display">{selectedGroup.name}</h1>
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold capitalize ${(selectedGroup as any).defaultRole === 'editor' ? 'bg-[#d9e2ff] text-[#003c90]' : 'bg-[#e5eeff] text-[#434653]'}`}>
                        {(selectedGroup as any).defaultRole ?? 'viewer'} access
                      </span>
                    </div>
                    {selectedGroup.description && <p className="text-sm text-[#737784]">{selectedGroup.description}</p>}
                  </div>
                  {canManage && <button onClick={() => setEditingGroup(true)} className="text-sm text-[#003c90] hover:underline border-0 bg-transparent cursor-pointer">Edit</button>}
                </div>
              )}
            </div>
            <div className="flex items-center gap-3">
              <span className="text-sm text-[#737784]">{selectedGroup.memberCount} member{selectedGroup.memberCount !== 1 ? 's' : ''}</span>
              {canManage && (
                <button onClick={() => handleDeleteGroup(selectedGroup.id)} disabled={actionLoading}
                  className="flex items-center gap-1 px-3 py-1.5 bg-[#ffdad6]/40 hover:bg-[#ffdad6]/70 text-[#ba1a1a] rounded-lg text-sm font-medium disabled:opacity-50 cursor-pointer border-0 transition-colors">
                  <Trash2 size={13} />Delete
                </button>
              )}
            </div>
          </div>

          <Alerts />

          {/* Sub-tabs */}
          <div className="flex gap-1 mb-6 bg-[#eff4ff] border border-[#c3c6d5] rounded-xl p-1 w-fit">
            {(['members','files'] as GroupTab[]).map(t => (
              <button key={t} onClick={() => setGroupTab(t)}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium capitalize transition-colors cursor-pointer border-0 ${groupTab === t ? 'bg-[#d9e2ff] text-[#003c90] font-semibold' : 'bg-transparent text-[#434653] hover:text-[#0b1c30]'}`}>
                {t === 'members' ? <><Users size={13} />Members</> : <><FileText size={13} />Files</>}
              </button>
            ))}
          </div>

          {/* Members */}
          {groupTab === 'members' && (
            <div className="space-y-4">
              <div className={cardCls}>
                <h3 className="text-xs font-semibold text-[#737784] uppercase tracking-wider mb-3">Owner</h3>
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-[#003c90] flex items-center justify-center text-white font-bold text-sm">
                    {selectedGroup.ownerName.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-[#0b1c30]">{selectedGroup.ownerName}</p>
                    <p className="text-xs text-[#737784] truncate">{selectedGroup.ownerEmail}</p>
                  </div>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${ROLE_BADGE.owner}`}>owner</span>
                </div>
              </div>

              <div className={cardCls}>
                <h3 className="text-xs font-semibold text-[#737784] uppercase tracking-wider mb-3">Members ({selectedGroup.members.length})</h3>
                {selectedGroup.members.length === 0
                  ? <p className="text-sm text-[#737784]">No members yet.</p>
                  : <div className="divide-y divide-[#e5eeff]">
                    {selectedGroup.members.map((m: GroupMember) => (
                      <div key={m.id} className="flex items-center gap-3 py-2.5">
                        <div className="w-8 h-8 rounded-full bg-[#d9e2ff] flex items-center justify-center text-[#003c90] font-bold text-sm shrink-0">
                          {m.name.charAt(0).toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-[#0b1c30]">{m.name}</p>
                          <p className="text-xs text-[#737784] truncate">{m.email}</p>
                        </div>
                        {canManage
                          ? <select value={m.role} onChange={e => handleUpdateMemberRole(m.userId, e.target.value as GroupRole)} disabled={actionLoading} className={`${selectCls} disabled:opacity-50`}>
                              <option value="viewer">Viewer</option>
                              <option value="editor">Editor</option>
                              <option value="admin">Admin</option>
                            </select>
                          : <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${ROLE_BADGE[m.role] ?? ROLE_BADGE.viewer}`}>{m.role}</span>
                        }
                        {canManage && <button onClick={() => handleRemoveMember(m.userId)} disabled={actionLoading} className="text-[#737784] hover:text-[#ba1a1a] transition-colors disabled:opacity-50 ml-1 border-0 bg-transparent cursor-pointer"><UserMinus size={15} /></button>}
                      </div>
                    ))}
                  </div>
                }
              </div>

              {canManage && (
                <div className={cardCls}>
                  <h3 className="text-xs font-semibold text-[#737784] uppercase tracking-wider mb-3 flex items-center gap-1.5"><UserPlus size={13} />Add Member</h3>
                  <form onSubmit={handleAddMember} className="flex gap-2 flex-wrap">
                    <input type="email" value={memberEmail} onChange={e => setMemberEmail(e.target.value)} placeholder="user@example.com" required className={inputCls + ' flex-1 min-w-[200px] w-auto'} />
                    <select value={memberRole} onChange={e => setMemberRole(e.target.value as GroupRole)} className={selectCls}><option value="viewer">Viewer</option><option value="editor">Editor</option><option value="admin">Admin</option></select>
                    <button type="submit" disabled={actionLoading || !memberEmail.trim()} className="flex items-center gap-1.5 px-4 py-2 bg-[#003c90] hover:opacity-90 text-white rounded-lg text-sm font-semibold disabled:opacity-50 cursor-pointer border-0 transition-opacity">
                      {actionLoading ? <Loader2 size={14} className="animate-spin" /> : <UserPlus size={14} />}Add
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
                <h3 className="text-xs font-semibold text-[#737784] uppercase tracking-wider mb-3">Shared Files ({(selectedGroup.files as GroupFile[]).length})</h3>
                {(selectedGroup.files as GroupFile[]).length === 0
                  ? <p className="text-sm text-[#737784]">No files shared with this group yet.</p>
                  : <div className="divide-y divide-[#e5eeff]">
                    {(selectedGroup.files as GroupFile[]).map(f => (
                      <div key={f.id} className="flex items-center gap-3 py-2.5">
                        <FileText size={15} className="text-[#003c90] shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-[#0b1c30] truncate">{f.fileName}</p>
                          <p className="text-xs text-[#737784]">{formatSize(f.size)} · {formatDate(f.sharedAt)}</p>
                        </div>
                        {canManage
                          ? <select value={f.role} onChange={e => handleUpdateFilePermission(f.fileId, e.target.value as SharedRole)} disabled={actionLoading} className={`${selectCls} disabled:opacity-50`}><option value="viewer">Viewer</option><option value="editor">Editor</option></select>
                          : <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${ROLE_BADGE[f.role] ?? ROLE_BADGE.viewer}`}>{f.role}</span>
                        }
                        {canManage && <button onClick={() => handleRemoveFile(f.fileId)} disabled={actionLoading} className="text-[#737784] hover:text-[#ba1a1a] transition-colors disabled:opacity-50 ml-1 border-0 bg-transparent cursor-pointer"><Trash2 size={14} /></button>}
                      </div>
                    ))}
                  </div>
                }
              </div>

              <div className={cardCls}>
                <h3 className="text-xs font-semibold text-[#737784] uppercase tracking-wider mb-3 flex items-center gap-1.5"><Plus size={13} />Share a File</h3>
                {myFiles.length === 0
                  ? <p className="text-sm text-[#737784]">You have no files uploaded yet.</p>
                  : <form onSubmit={handleShareFile} className="flex gap-2 flex-wrap">
                    <select value={shareFileId} onChange={e => setShareFileId(e.target.value)} required className={`${selectCls} flex-1 min-w-[200px]`}><option value="">Select a file…</option>{myFiles.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}</select>
                    <select value={shareFileRole} onChange={e => setShareFileRole(e.target.value as SharedRole)} className={selectCls}><option value="viewer">Viewer</option><option value="editor">Editor</option></select>
                    <button type="submit" disabled={actionLoading || !shareFileId} className="flex items-center gap-1.5 px-4 py-2 bg-[#003c90] hover:opacity-90 text-white rounded-lg text-sm font-semibold disabled:opacity-50 cursor-pointer border-0 transition-opacity">
                      {actionLoading ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}Share
                    </button>
                  </form>
                }
                <p className="mt-2 text-xs text-[#737784]">All group members will be notified when a file is shared.</p>
              </div>
            </div>
          )}
        </div>
      </div>
    )
  }

  // ── Groups list view ──
  return (
    <div className="flex-1 overflow-y-auto bg-[#f8f9ff]">
      <div className="max-w-4xl mx-auto px-6 py-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-[#0b1c30] font-display flex items-center gap-2"><Users size={22} className="text-[#003c90]" />Groups</h1>
            <p className="text-sm text-[#737784] mt-0.5">Manage teams and share files with multiple people at once</p>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => tab === 'my-groups' ? loadGroups() : loadSharedFiles()} className="text-[#737784] hover:text-[#0b1c30] transition-colors border-0 bg-transparent cursor-pointer" title="Refresh">
              <RefreshCw size={15} />
            </button>
            {tab === 'my-groups' && (
              <button onClick={() => setShowCreateForm(true)}
                className="flex items-center gap-1.5 px-4 py-2 bg-[#003c90] hover:opacity-90 text-white rounded-lg text-sm font-semibold transition-opacity cursor-pointer border-0">
                <Plus size={15} />New Group
              </button>
            )}
          </div>
        </div>

        <Alerts />

        {/* Tabs */}
        <div className="flex gap-1 mb-6 bg-[#eff4ff] border border-[#c3c6d5] rounded-xl p-1 w-fit">
          {([
            { key: 'my-groups',      label: 'My Groups',       icon: <Users size={13} /> },
            { key: 'shared-with-me', label: 'Shared With Me',  icon: <Shield size={13} /> },
          ] as const).map(({ key, label, icon }) => (
            <button key={key} onClick={() => setTab(key)}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-colors cursor-pointer border-0 ${tab === key ? 'bg-[#d9e2ff] text-[#003c90] font-semibold' : 'bg-transparent text-[#434653] hover:text-[#0b1c30]'}`}>
              {icon}{label}
            </button>
          ))}
        </div>

        {/* Create Group Form */}
        {showCreateForm && tab === 'my-groups' && (
          <div className="mb-6 bg-white border border-[#003c90]/20 rounded-xl p-5 shadow-sm">
            <h2 className="text-sm font-semibold text-[#0b1c30] mb-4 flex items-center gap-2"><Plus size={14} className="text-[#003c90]" />Create New Group</h2>
            <form onSubmit={handleCreateGroup} className="space-y-3">
              <input type="text" value={newGroupName} onChange={e => setNewGroupName(e.target.value)} placeholder="Group name *" required className={inputCls} />
              <input type="text" value={newGroupDesc} onChange={e => setNewGroupDesc(e.target.value)} placeholder="Description (optional)" className={inputCls} />
              <div>
                <label className="block text-xs text-[#737784] mb-1.5">Default role for all members</label>
                <div className="flex gap-2">
                  {(['viewer','editor'] as SharedRole[]).map(r => (
                    <button key={r} type="button" onClick={() => setNewGroupDefaultRole(r)}
                      className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium border capitalize cursor-pointer transition-colors ${newGroupDefaultRole === r ? (r === 'editor' ? 'bg-[#d9e2ff] border-[#003c90]/30 text-[#003c90]' : 'bg-[#e5eeff] border-[#c3c6d5] text-[#434653]') : 'bg-transparent border-[#c3c6d5] text-[#737784] hover:text-[#0b1c30]'}`}>
                      {r}
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex gap-2">
                <button type="submit" disabled={actionLoading || !newGroupName.trim()} className="flex items-center gap-1.5 px-4 py-2 bg-[#003c90] hover:opacity-90 text-white rounded-lg text-sm font-semibold disabled:opacity-50 cursor-pointer border-0 transition-opacity">
                  {actionLoading ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}Create
                </button>
                <button type="button" onClick={() => { setShowCreateForm(false); setNewGroupName(''); setNewGroupDesc(''); setNewGroupDefaultRole('viewer') }} className="px-4 py-2 text-[#737784] hover:text-[#0b1c30] rounded-lg text-sm border-0 bg-transparent cursor-pointer">Cancel</button>
              </div>
            </form>
          </div>
        )}

        {/* My Groups */}
        {tab === 'my-groups' && (
          loading ? <div className="flex justify-center py-20"><Loader2 size={28} className="animate-spin text-[#003c90]" /></div>
          : groups.length === 0 ? (
            <div className="text-center py-20 text-[#737784]">
              <Users size={40} className="mx-auto mb-3 opacity-30" />
              <p className="text-sm font-semibold text-[#434653]">No groups yet</p>
              <p className="text-sm mt-1">Create a group to share files with multiple people at once.</p>
              <button onClick={() => setShowCreateForm(true)} className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 bg-[#003c90] hover:opacity-90 text-white rounded-lg text-sm font-semibold cursor-pointer border-0 transition-opacity">
                <Plus size={14} />New Group
              </button>
            </div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              {groups.map(group => (
                <button key={group.id} onClick={() => { loadGroupDetail(group.id); setGroupTab('members') }}
                  className="text-left bg-white hover:bg-[#eff4ff] rounded-xl p-4 transition-colors border border-[#c3c6d5] hover:border-[#003c90]/30 shadow-sm cursor-pointer">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-9 h-9 rounded-lg bg-[#d9e2ff] flex items-center justify-center shrink-0">
                        <Users size={17} className="text-[#003c90]" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-[#0b1c30] truncate">{group.name}</p>
                        {group.description && <p className="text-xs text-[#737784] truncate mt-0.5">{group.description}</p>}
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-1 shrink-0">
                      <span className={`text-[11px] px-2 py-0.5 rounded-full font-semibold ${ROLE_BADGE[group.role] ?? ROLE_BADGE.viewer}`}>{group.role}</span>
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium capitalize ${group.defaultRole === 'editor' ? 'bg-[#d9e2ff] text-[#003c90]' : 'bg-[#e5eeff] text-[#434653]'}`}>{group.defaultRole ?? 'viewer'} access</span>
                    </div>
                  </div>
                  <div className="mt-3 flex items-center gap-3 text-xs text-[#737784]">
                    <span className="flex items-center gap-1"><Users size={11} />{group.memberCount} member{group.memberCount !== 1 ? 's' : ''}</span>
                    <span>·</span>
                    <span>{formatDate(group.createdAt)}</span>
                  </div>
                </button>
              ))}
            </div>
          )
        )}

        {/* Shared With Me */}
        {tab === 'shared-with-me' && (
          loading ? <div className="flex justify-center py-20"><Loader2 size={28} className="animate-spin text-[#003c90]" /></div>
          : sharedFiles.length === 0 ? (
            <div className="text-center py-20 text-[#737784]">
              <FileText size={40} className="mx-auto mb-3 opacity-30" />
              <p className="text-sm font-semibold text-[#434653]">No files shared with you via groups</p>
              <p className="text-sm mt-1">Files shared with your groups will appear here.</p>
            </div>
          ) : (
            <div className="bg-white border border-[#c3c6d5] rounded-xl overflow-hidden shadow-sm">
              <table className="w-full">
                <thead className="bg-[#eff4ff] border-b border-[#c3c6d5]">
                  <tr>
                    {['File','Group','Permission','Shared'].map(h => (
                      <th key={h} className="text-left px-4 py-3 text-[11px] font-semibold text-[#434653] uppercase tracking-wider">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#e5eeff]">
                  {sharedFiles.map(f => (
                    <tr key={`${f.fileId}-${f.groupId}`} className="hover:bg-[#eff4ff] transition-colors">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <FileText size={14} className="text-[#003c90] shrink-0" />
                          <span className="text-sm font-semibold text-[#0b1c30] truncate max-w-[180px]">{f.fileName}</span>
                          <span className="text-xs text-[#737784]">({formatSize(f.size)})</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm text-[#434653]">{f.groupName}</td>
                      <td className="px-4 py-3"><span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${ROLE_BADGE[f.role] ?? ROLE_BADGE.viewer}`}>{f.role}</span></td>
                      <td className="px-4 py-3 text-xs text-[#737784]">{formatDate(f.sharedAt)}</td>
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
