'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, RefreshCw } from 'lucide-react'

interface UserItem {
  _id: string
  email: string
  displayName: string
  role: string
  status: string
  phone?: string
  createdAt: string
}

export default function AdminUsersPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [currentUser, setCurrentUser] = useState<any>(null)
  const [users, setUsers] = useState<UserItem[]>([])
  const [search, setSearch] = useState('')

  // Create User Modal
  const [userModalOpen, setUserModalOpen] = useState(false)
  const [newEmail, setNewEmail] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [newName, setNewName] = useState('')
  const [newPhone, setNewPhone] = useState('')
  const [newRole, setNewRole] = useState<'admin' | 'expert' | 'client'>('admin')
  const [creatingUser, setCreatingUser] = useState(false)
  const [modalFeedback, setModalFeedback] = useState('')

  // Edit User Modal
  const [editingUser, setEditingUser] = useState<UserItem | null>(null)
  const [editUserName, setEditUserName] = useState('')
  const [editUserEmail, setEditUserEmail] = useState('')
  const [editUserPhone, setEditUserPhone] = useState('')
  const [editUserRole, setEditUserRole] = useState<'admin' | 'expert' | 'client'>('client')
  const [editUserStatus, setEditUserStatus] = useState<'active' | 'pending' | 'disabled'>('active')
  const [editUserNewPassword, setEditUserNewPassword] = useState('')
  const [savingUser, setSavingUser] = useState(false)
  const [editUserFeedback, setEditUserFeedback] = useState('')

  const loadUsers = useCallback(async () => {
    setLoading(true)
    try {
      const [meRes, usersRes] = await Promise.all([
        fetch('/api/auth/me'),
        fetch('/api/admin/users'),
      ])
      const [meJson, usersJson] = await Promise.all([meRes.json(), usersRes.json()])
      if (meJson.success) setCurrentUser(meJson.user)
      if (usersJson.success) setUsers(usersJson.data || [])
    } catch (err) {
      console.error('Failed to load users:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadUsers()
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search)
      if (params.get('new') === '1') {
        setUserModalOpen(true)
      }
    }
  }, [loadUsers])

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault()
    setCreatingUser(true)
    setModalFeedback('')
    try {
      const res = await fetch('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: newEmail,
          password: newPassword,
          displayName: newName,
          phone: newPhone,
          role: newRole,
        }),
      })
      const json = await res.json()
      if (json.success) {
        setUserModalOpen(false)
        setNewEmail('')
        setNewPassword('')
        setNewName('')
        setNewPhone('')
        await loadUsers()
        router.refresh()
        alert(`User created successfully: ${json.data.email}`)
      } else {
        setModalFeedback(json.error || 'Failed to create user')
      }
    } catch (err: any) {
      setModalFeedback(err.message || 'Error creating user')
    } finally {
      setCreatingUser(false)
    }
  }

  const handleOpenEditUser = (u: UserItem) => {
    setEditingUser(u)
    setEditUserName(u.displayName || '')
    setEditUserEmail(u.email || '')
    setEditUserPhone(u.phone || '')
    setEditUserRole((u.role as any) || 'client')
    setEditUserStatus((u.status as any) || 'active')
    setEditUserNewPassword('')
    setEditUserFeedback('')
  }

  const handleSaveEditUser = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingUser) return
    setSavingUser(true)
    setEditUserFeedback('')
    try {
      const res = await fetch('/api/admin/users', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: editingUser._id,
          displayName: editUserName.trim(),
          email: editUserEmail.trim().toLowerCase(),
          phone: editUserPhone.trim(),
          role: editUserRole,
          status: editUserStatus,
          ...(editUserNewPassword.trim() ? { password: editUserNewPassword.trim() } : {}),
        }),
      })
      const json = await res.json()
      if (json.success) {
        setUsers((prev) =>
          prev.map((u) =>
            u._id === editingUser._id
              ? {
                ...u,
                displayName: editUserName.trim(),
                email: editUserEmail.trim().toLowerCase(),
                phone: editUserPhone.trim(),
                role: editUserRole,
                status: editUserStatus,
              }
              : u
          )
        )
        setEditingUser(null)
      } else {
        setEditUserFeedback(json.error || 'Failed to update user')
      }
    } catch (err: any) {
      setEditUserFeedback(err.message || 'Error updating user')
    } finally {
      setSavingUser(false)
    }
  }

  const handleDeleteUser = async (u: UserItem) => {
    if (currentUser?._id === u._id || currentUser?.email === u.email) {
      alert('You cannot delete your own administrative account.')
      return
    }
    if (
      !confirm(
        `Are you sure you want to permanently delete user "${u.displayName}" (${u.email})? This action cannot be undone.`
      )
    ) {
      return
    }

    try {
      const res = await fetch(`/api/admin/users?userId=${u._id}`, { method: 'DELETE' })
      const json = await res.json()
      if (json.success) {
        setUsers((prev) => prev.filter((user) => user._id !== u._id))
        router.refresh()
      } else {
        alert(json.error || 'Failed to delete user')
      }
    } catch (err: any) {
      alert(err.message || 'Error deleting user')
    }
  }

  const filtered = users.filter((u) => {
    if (!search.trim()) return true
    const q = search.toLowerCase()
    return (
      u.displayName?.toLowerCase().includes(q) ||
      u.email?.toLowerCase().includes(q) ||
      u.role?.toLowerCase().includes(q)
    )
  })

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#eeeae4] pb-5">
        <div>
          <span className="text-[10px] font-black uppercase tracking-wider text-primary">
            Accounts &amp; Permissions
          </span>
          <h1 className="mt-0.5 text-3xl font-semibold tracking-tight text-[#14243b]">
            Users &amp; Staff ({users.length})
          </h1>
          <p className="text-xs text-[#637084] mt-0.5">
            Manage administrators, experts, and client accounts across Bok Bok.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search name, email, or role..."
            className="rounded-full border border-[#dedbd5] bg-white px-4 py-2 text-xs text-[#14243b] outline-none focus:border-[#14243b] w-60"
          />
          <button
            type="button"
            onClick={() => loadUsers()}
            className="inline-flex items-center gap-1.5 rounded-full border border-[#dedbd5] bg-white px-4 py-2 text-xs font-bold text-[#14243b] hover:border-[#14243b] transition"
          >
            <RefreshCw size={13} /> Refresh
          </button>
          <button
            type="button"
            onClick={() => setUserModalOpen(true)}
            className="inline-flex items-center gap-1.5 rounded-full bg-primary px-4 py-2 text-xs font-bold text-white shadow-xs hover:bg-primary-hover transition"
          >
            <Plus size={14} /> Create User
          </button>
        </div>
      </div>

      {loading ? (
        <div className="py-20 grid place-items-center">
          <div className="flex flex-col items-center gap-3">
            <div className="size-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
            <p className="text-xs font-bold tracking-widest uppercase text-muted-foreground">
              Loading Users...
            </p>
          </div>
        </div>
      ) : (
        <div className="rounded-3xl border border-[#e7e2da] bg-white overflow-x-auto shadow-xs">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-border bg-neutral-50/80 text-muted-foreground font-semibold">
                <th className="py-3.5 px-4">User</th>
                <th className="py-3.5 px-4">Email</th>
                <th className="py-3.5 px-4">Phone</th>
                <th className="py-3.5 px-4">Role</th>
                <th className="py-3.5 px-4">Status</th>
                <th className="py-3.5 px-4">Created</th>
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered.map((u) => (
                <tr key={u._id} className="hover:bg-neutral-50/60 transition">
                  <td className="py-3.5 px-4 font-bold text-foreground">{u.displayName}</td>
                  <td className="py-3.5 px-4 font-mono text-muted-foreground">{u.email}</td>
                  <td className="py-3.5 px-4 text-muted-foreground">{u.phone || '—'}</td>
                  <td className="py-3.5 px-4">
                    <span
                      className={`inline-block rounded-full px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider ${u.role === 'admin'
                          ? 'bg-rose-50 text-rose-700 border border-rose-200'
                          : u.role === 'expert'
                            ? 'bg-blue-50 text-blue-700 border border-blue-200'
                            : 'bg-neutral-100 text-muted-foreground border border-border'
                        }`}
                    >
                      {u.role}
                    </span>
                  </td>
                  <td className="py-3.5 px-4">
                    <span
                      className={`inline-block rounded-full px-2.5 py-0.5 text-[10px] font-bold capitalize ${u.status === 'active'
                          ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                          : u.status === 'disabled'
                            ? 'bg-rose-50 text-rose-800 border border-rose-200'
                            : 'bg-amber-50 text-amber-800 border border-amber-200'
                        }`}
                    >
                      {u.status}
                    </span>
                  </td>
                  <td className="py-3.5 px-4 text-muted-foreground">
                    {new Date(u.createdAt).toLocaleDateString()}
                  </td>
                  <td className="py-3.5 px-4 text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      <button
                        onClick={() => handleOpenEditUser(u)}
                        className="rounded-lg border border-border bg-white px-2.5 py-1 text-xs font-semibold text-foreground hover:bg-neutral-100 shadow-2xs transition"
                      >
                        ✏ Edit
                      </button>
                      {currentUser?._id !== u._id && currentUser?.email !== u.email && (
                        <button
                          onClick={() => handleDeleteUser(u)}
                          className="rounded-lg border border-rose-200 bg-rose-50 px-2.5 py-1 text-xs font-semibold text-rose-700 hover:bg-rose-100 shadow-2xs transition"
                        >
                          🗑 Delete
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Create User Modal */}
      {userModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <form
            onSubmit={handleCreateUser}
            className="w-full max-w-md rounded-3xl bg-white border border-border p-6 space-y-4 shadow-2xl text-foreground"
          >
            <div className="flex items-center justify-between border-b border-border pb-3">
              <h3 className="text-base font-bold text-foreground">Create New User</h3>
              <button
                type="button"
                onClick={() => setUserModalOpen(false)}
                className="rounded-full bg-neutral-100 border border-border px-3 py-1 text-xs text-muted-foreground hover:text-foreground"
              >
                ✕
              </button>
            </div>

            {modalFeedback && (
              <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-700 font-semibold">
                {modalFeedback}
              </div>
            )}

            <label className="block text-xs font-bold text-foreground">
              Display Name *
              <input
                required
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="e.g. Omar Wagih"
                className="mt-1 w-full rounded-xl border border-border bg-white px-3 py-2 text-xs text-foreground outline-none focus:border-primary shadow-2xs"
              />
            </label>

            <label className="block text-xs font-bold text-foreground">
              Email Address *
              <input
                required
                type="email"
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                placeholder="name@bokbok.com"
                className="mt-1 w-full rounded-xl border border-border bg-white px-3 py-2 text-xs text-foreground outline-none focus:border-primary shadow-2xs"
              />
            </label>

            <label className="block text-xs font-bold text-foreground">
              Phone Number (Optional)
              <input
                type="tel"
                value={newPhone}
                onChange={(e) => setNewPhone(e.target.value)}
                placeholder="+20 100 000 0000"
                className="mt-1 w-full rounded-xl border border-border bg-white px-3 py-2 text-xs text-foreground outline-none focus:border-primary shadow-2xs"
              />
            </label>

            <label className="block text-xs font-bold text-foreground">
              Password *
              <input
                required
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="••••••••••••"
                className="mt-1 w-full rounded-xl border border-border bg-white px-3 py-2 text-xs text-foreground outline-none focus:border-primary shadow-2xs"
              />
            </label>

            <label className="block text-xs font-bold text-foreground">
              Role *
              <select
                value={newRole}
                onChange={(e) => setNewRole(e.target.value as any)}
                className="mt-1 w-full rounded-xl border border-border bg-white px-3 py-2 text-xs text-foreground outline-none focus:border-primary shadow-2xs"
              >
                <option value="expert">Expert</option>
                <option value="admin">Administrator</option>
                <option value="client">Client</option>
              </select>
            </label>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-border">
              <button
                type="button"
                onClick={() => setUserModalOpen(false)}
                className="rounded-full px-4 py-2 text-xs font-bold text-muted-foreground hover:text-foreground"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={creatingUser}
                className="rounded-full bg-primary px-5 py-2 text-xs font-bold text-white hover:bg-primary-hover shadow-xs disabled:opacity-50"
              >
                {creatingUser ? 'Creating...' : 'Create Account ✓'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Edit User Modal */}
      {editingUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <form
            onSubmit={handleSaveEditUser}
            className="w-full max-w-md rounded-3xl bg-white border border-border p-6 space-y-4 shadow-2xl text-foreground"
          >
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div>
                <h3 className="text-base font-bold text-foreground">Edit User Account</h3>
                <p className="text-xs text-muted-foreground">{editingUser.email}</p>
              </div>
              <button
                type="button"
                onClick={() => setEditingUser(null)}
                className="rounded-full bg-neutral-100 border border-border px-3 py-1 text-xs text-muted-foreground hover:text-foreground"
              >
                ✕
              </button>
            </div>

            {editUserFeedback && (
              <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-700 font-semibold">
                {editUserFeedback}
              </div>
            )}

            <label className="block text-xs font-bold text-foreground">
              Display Name *
              <input
                required
                value={editUserName}
                onChange={(e) => setEditUserName(e.target.value)}
                className="mt-1 w-full rounded-xl border border-border bg-white px-3 py-2 text-xs text-foreground outline-none focus:border-primary shadow-2xs"
              />
            </label>

            <label className="block text-xs font-bold text-foreground">
              Email Address *
              <input
                required
                type="email"
                value={editUserEmail}
                onChange={(e) => setEditUserEmail(e.target.value)}
                className="mt-1 w-full rounded-xl border border-border bg-white px-3 py-2 text-xs text-foreground outline-none focus:border-primary shadow-2xs"
              />
            </label>

            <label className="block text-xs font-bold text-foreground">
              Phone Number
              <input
                type="tel"
                value={editUserPhone}
                onChange={(e) => setEditUserPhone(e.target.value)}
                placeholder="+20 100 000 0000"
                className="mt-1 w-full rounded-xl border border-border bg-white px-3 py-2 text-xs text-foreground outline-none focus:border-primary shadow-2xs"
              />
            </label>

            <div className="grid gap-3 sm:grid-cols-2">
              <label className="block text-xs font-bold text-foreground">
                Role *
                <select
                  value={editUserRole}
                  onChange={(e) => setEditUserRole(e.target.value as any)}
                  className="mt-1 w-full rounded-xl border border-border bg-white px-3 py-2 text-xs text-foreground outline-none focus:border-primary shadow-2xs"
                >
                  <option value="expert">Expert</option>
                  <option value="admin">Administrator</option>
                  <option value="client">Client</option>
                </select>
              </label>

              <label className="block text-xs font-bold text-foreground">
                Account Status *
                <select
                  value={editUserStatus}
                  onChange={(e) => setEditUserStatus(e.target.value as any)}
                  className="mt-1 w-full rounded-xl border border-border bg-white px-3 py-2 text-xs text-foreground outline-none focus:border-primary shadow-2xs"
                >
                  <option value="active">Active</option>
                  <option value="pending">Pending</option>
                  <option value="disabled">Disabled</option>
                </select>
              </label>
            </div>

            <label className="block text-xs font-bold text-foreground">
              Reset Password (Optional)
              <input
                type="password"
                value={editUserNewPassword}
                onChange={(e) => setEditUserNewPassword(e.target.value)}
                placeholder="Leave blank to keep unchanged"
                className="mt-1 w-full rounded-xl border border-border bg-white px-3 py-2 text-xs text-foreground outline-none focus:border-primary shadow-2xs"
              />
            </label>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-border">
              <button
                type="button"
                onClick={() => setEditingUser(null)}
                className="rounded-full px-4 py-2 text-xs font-bold text-muted-foreground hover:text-foreground"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={savingUser}
                className="rounded-full bg-primary px-5 py-2 text-xs font-bold text-white hover:bg-primary-hover shadow-xs disabled:opacity-50"
              >
                {savingUser ? 'Saving...' : 'Save Changes ✓'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  )
}

