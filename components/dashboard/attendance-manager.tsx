'use client'

import React, { useState, useEffect } from 'react'
import {
  Users,
  CheckCircle,
  AlertTriangle,
  UserX,
  Clock,
  Search,
  Filter,
  History,
  ShieldCheck,
  Calendar,
  ExternalLink,
} from 'lucide-react'

interface AttendanceStats {
  totalSessions: number
  completed: number
  clientAbsent: number
  expertAbsent: number
  bothAbsent: number
  disputed: number
  pending: number
}

interface BookingAttendanceItem {
  _id: string
  reference?: string
  expertId: string
  expertName: string
  clientName: string
  clientEmail: string
  serviceTitle?: { en: string; ar: string }
  date: string
  time: string
  durationMinutes: number
  deliveryMode: string
  googleMeetLink?: string
  status: string
  attendanceStatus: string
  expertAttendanceReport?: { response: 'attended' | 'absent'; submittedAt: string; notes?: string }
  clientAttendanceReport?: { response: 'attended' | 'absent'; submittedAt: string; notes?: string }
  attendanceDisputeResolution?: { finalStatus: string; reason: string; resolvedAt: string }
  sessionStartAt?: string
  sessionEndAt?: string
}

interface AuditLogItem {
  _id: string
  bookingId: string
  userId?: string
  userRole: 'client' | 'expert' | 'admin'
  attendanceResponse: string
  previousStatus: string
  updatedStatus: string
  notes?: string
  submittedAt: string
}

export function AttendanceManager() {
  const [stats, setStats] = useState<AttendanceStats>({
    totalSessions: 0,
    completed: 0,
    clientAbsent: 0,
    expertAbsent: 0,
    bothAbsent: 0,
    disputed: 0,
    pending: 0,
  })
  const [bookings, setBookings] = useState<BookingAttendanceItem[]>([])
  const [loading, setLoading] = useState(true)

  // Filters
  const [statusFilter, setStatusFilter] = useState('all')
  const [clientSearch, setClientSearch] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')

  // Single booking inspection & resolution modal
  const [inspectBooking, setInspectBooking] = useState<BookingAttendanceItem | null>(null)
  const [auditLogs, setAuditLogs] = useState<AuditLogItem[]>([])
  const [loadingAudit, setLoadingAudit] = useState(false)
  const [resolveStatus, setResolveStatus] = useState<string>('completed')
  const [resolveNotes, setResolveNotes] = useState('')
  const [resolving, setResolving] = useState(false)

  // Platform Meeting Settings
  const [reminderMinutes, setReminderMinutes] = useState<number>(15)
  const [reportingHours, setReportingHours] = useState<number>(24)
  const [savingSettings, setSavingSettings] = useState(false)
  const [settingsMessage, setSettingsMessage] = useState<string | null>(null)

  const loadData = async () => {
    setLoading(true)
    try {
      const url = new URL('/api/admin/attendance', window.location.origin)
      if (statusFilter !== 'all') url.searchParams.set('status', statusFilter)
      if (clientSearch.trim()) url.searchParams.set('clientSearch', clientSearch.trim())
      if (startDate) url.searchParams.set('startDate', startDate)
      if (endDate) url.searchParams.set('endDate', endDate)

      const res = await fetch(url.toString())
      const json = await res.json()
      if (json.success) {
        setStats(json.stats)
        setBookings(json.bookings)
      }
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const loadSettings = async () => {
    try {
      const res = await fetch('/api/admin/settings')
      const json = await res.json()
      if (json.success && json.data) {
        setReminderMinutes(json.data.beforeSessionReminderMinutes || 15)
        setReportingHours(json.data.attendanceReportingWindowHours || 24)
      }
    } catch (err) {
      console.error('Failed to load settings:', err)
    }
  }

  useEffect(() => {
    loadData()
  }, [statusFilter, startDate, endDate])

  useEffect(() => {
    loadSettings()
  }, [])

  const handleInspect = async (b: BookingAttendanceItem) => {
    setInspectBooking(b)
    setResolveStatus(b.attendanceStatus === 'disputed' ? 'completed' : b.attendanceStatus)
    setResolveNotes('')
    setLoadingAudit(true)
    try {
      const res = await fetch(`/api/admin/attendance?bookingId=${b._id}`)
      const json = await res.json()
      if (json.success && json.data) {
        setAuditLogs(json.data.auditLogs || [])
      }
    } catch (err) {
      console.error(err)
    } finally {
      setLoadingAudit(false)
    }
  }

  const handleResolveDispute = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!inspectBooking) return

    setResolving(true)
    try {
      const res = await fetch('/api/admin/attendance', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bookingId: inspectBooking._id,
          finalStatus: resolveStatus,
          notes: resolveNotes || 'Admin resolution',
        }),
      })

      const json = await res.json()
      if (json.success) {
        alert(json.message || 'Dispute resolved successfully')
        setInspectBooking(null)
        loadData()
      } else {
        alert(json.error || 'Failed to resolve dispute')
      }
    } catch (err: any) {
      alert(err.message || 'Error resolving dispute')
    } finally {
      setResolving(false)
    }
  }

  const handleSavePlatformSettings = async (e: React.FormEvent) => {
    e.preventDefault()
    setSavingSettings(true)
    setSettingsMessage(null)
    try {
      const res = await fetch('/api/admin/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          beforeSessionReminderMinutes: reminderMinutes,
          attendanceReportingWindowHours: reportingHours,
        }),
      })

      const json = await res.json()
      if (json.success) {
        setSettingsMessage('Platform settings saved successfully')
        setTimeout(() => setSettingsMessage(null), 4000)
      } else {
        alert(json.error || 'Failed to save settings')
      }
    } catch (err: any) {
      alert(err.message || 'Error updating settings')
    } finally {
      setSavingSettings(false)
    }
  }

  return (
    <div className="space-y-8">
      {/* Metrics Row */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-7">
        <div className="rounded-2xl border border-slate-800 bg-[#121d2f] p-4">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Scheduled</span>
          <p className="mt-1 text-2xl font-black text-white">{stats.totalSessions}</p>
          <p className="text-[10px] text-slate-500">Confirmed sessions</p>
        </div>
        <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-4">
          <span className="text-[10px] font-black uppercase tracking-wider text-emerald-400">Completed</span>
          <p className="mt-1 text-2xl font-black text-emerald-300">{stats.completed}</p>
          <p className="text-[10px] text-emerald-400/70">Mutual attendance</p>
        </div>
        <div className="rounded-2xl border border-rose-500/30 bg-rose-500/10 p-4">
          <span className="text-[10px] font-black uppercase tracking-wider text-rose-400">Disputed</span>
          <p className="mt-1 text-2xl font-black text-rose-300">{stats.disputed}</p>
          <p className="text-[10px] text-rose-400/70">Needs admin action</p>
        </div>
        <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4">
          <span className="text-[10px] font-black uppercase tracking-wider text-amber-400">Client Absent</span>
          <p className="mt-1 text-2xl font-black text-amber-300">{stats.clientAbsent}</p>
          <p className="text-[10px] text-amber-400/70">Client no-show</p>
        </div>
        <div className="rounded-2xl border border-rose-500/30 bg-rose-500/10 p-4">
          <span className="text-[10px] font-black uppercase tracking-wider text-rose-400">Expert Absent</span>
          <p className="mt-1 text-2xl font-black text-rose-300">{stats.expertAbsent}</p>
          <p className="text-[10px] text-rose-400/70">Expert no-show</p>
        </div>
        <div className="rounded-2xl border border-slate-800 bg-[#121d2f] p-4">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Both Absent</span>
          <p className="mt-1 text-2xl font-black text-white">{stats.bothAbsent}</p>
          <p className="text-[10px] text-slate-500">Neither attended</p>
        </div>
        <div className="rounded-2xl border border-slate-800 bg-[#121d2f] p-4">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Pending</span>
          <p className="mt-1 text-2xl font-black text-slate-300">{stats.pending}</p>
          <p className="text-[10px] text-slate-500">Awaiting reports</p>
        </div>
      </div>

      {/* Global Reminder & Window Settings Card */}
      <div className="rounded-2xl border border-slate-800 bg-[#121d2f] p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
          <div>
            <h3 className="text-sm font-bold text-white">Automated Notifications &amp; Attendance Configuration</h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Configure global reminder intervals and attendance reporting windows.
            </p>
          </div>
          {settingsMessage && (
            <span className="text-xs font-bold text-emerald-400 bg-emerald-950/60 border border-emerald-500/40 px-3 py-1 rounded-full">
              ✓ {settingsMessage}
            </span>
          )}
        </div>

        <form onSubmit={handleSavePlatformSettings} className="grid gap-4 sm:grid-cols-3 items-end">
          <div>
            <label className="block text-xs font-bold text-slate-300 mb-1.5">
              Reminder 2: Pre-Session Interval (Minutes)
            </label>
            <select
              value={reminderMinutes}
              onChange={(e) => setReminderMinutes(Number(e.target.value))}
              className="w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-xs text-white outline-none focus:border-blue-500"
            >
              <option value={10}>10 minutes before session</option>
              <option value={15}>15 minutes before session (Default)</option>
              <option value={20}>20 minutes before session</option>
              <option value={30}>30 minutes before session</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-300 mb-1.5">
              Attendance Reporting Deadline (Hours Post-Session)
            </label>
            <input
              type="number"
              min={1}
              max={168}
              value={reportingHours}
              onChange={(e) => setReportingHours(Number(e.target.value))}
              className="w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-xs text-white outline-none focus:border-blue-500"
            />
          </div>

          <div>
            <button
              type="submit"
              disabled={savingSettings}
              className="w-full rounded-xl bg-blue-600 px-4 py-2 text-xs font-bold text-white hover:bg-blue-500 transition disabled:opacity-50"
            >
              {savingSettings ? 'Saving...' : 'Save System Settings'}
            </button>
          </div>
        </form>
      </div>

      {/* Filter Bar */}
      <div className="rounded-2xl border border-slate-800 bg-[#121d2f] p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-2">
          {['all', 'disputed', 'pending', 'completed', 'client_absent', 'expert_absent'].map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`rounded-full px-3 py-1.5 text-xs font-bold transition capitalize ${
                statusFilter === st
                  ? 'bg-blue-600 text-white'
                  : 'bg-slate-800 text-slate-300 hover:text-white'
              }`}
            >
              {st.replace('_', ' ')}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <input
            type="text"
            placeholder="Search client or ref..."
            value={clientSearch}
            onChange={(e) => setClientSearch(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && loadData()}
            className="rounded-xl border border-slate-700 bg-slate-900 px-3 py-1.5 text-xs text-white outline-none placeholder:text-slate-500"
          />
          <button
            onClick={loadData}
            className="rounded-xl bg-slate-800 border border-slate-700 px-3 py-1.5 text-xs font-bold text-slate-200 hover:bg-slate-700"
          >
            Filter
          </button>
        </div>
      </div>

      {/* Sessions Table */}
      <div className="rounded-2xl border border-slate-800 bg-[#121d2f] overflow-x-auto">
        {loading ? (
          <p className="p-12 text-center text-xs font-bold text-slate-500">Loading attendance sessions...</p>
        ) : bookings.length === 0 ? (
          <div className="p-12 text-center text-xs text-slate-400">
            No confirmed sessions match the selected attendance filters.
          </div>
        ) : (
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400">
                <th className="py-3 px-4 font-semibold">Ref</th>
                <th className="py-3 px-4 font-semibold">Client</th>
                <th className="py-3 px-4 font-semibold">Expert</th>
                <th className="py-3 px-4 font-semibold">Date &amp; Time</th>
                <th className="py-3 px-4 font-semibold">Expert Report</th>
                <th className="py-3 px-4 font-semibold">Client Report</th>
                <th className="py-3 px-4 font-semibold">Status</th>
                <th className="py-3 px-4 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {bookings.map((b) => (
                <tr key={b._id} className="hover:bg-slate-800/30">
                  <td className="py-3 px-4 font-mono font-bold text-white">
                    {b.reference || b._id.slice(-6).toUpperCase()}
                  </td>
                  <td className="py-3 px-4">
                    <p className="font-bold text-white">{b.clientName}</p>
                    <p className="text-[10px] text-slate-400">{b.clientEmail}</p>
                  </td>
                  <td className="py-3 px-4 font-medium text-slate-300">
                    {b.expertName}
                  </td>
                  <td className="py-3 px-4 text-slate-400">
                    {b.date} at {b.time} ({b.durationMinutes}m)
                  </td>
                  <td className="py-3 px-4">
                    {b.expertAttendanceReport ? (
                      <span
                        className={`font-semibold ${
                          b.expertAttendanceReport.response === 'attended'
                            ? 'text-emerald-400'
                            : 'text-rose-400'
                        }`}
                      >
                        {b.expertAttendanceReport.response === 'attended' ? '✓ Attended' : '✕ Marked Absent'}
                      </span>
                    ) : (
                      <span className="text-slate-500">Not submitted</span>
                    )}
                  </td>
                  <td className="py-3 px-4">
                    {b.clientAttendanceReport ? (
                      <span
                        className={`font-semibold ${
                          b.clientAttendanceReport.response === 'attended'
                            ? 'text-emerald-400'
                            : 'text-rose-400'
                        }`}
                      >
                        {b.clientAttendanceReport.response === 'attended' ? '✓ Attended' : '✕ Marked Absent'}
                      </span>
                    ) : (
                      <span className="text-slate-500">Not submitted</span>
                    )}
                  </td>
                  <td className="py-3 px-4">
                    <span
                      className={`inline-block rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase ${
                        b.attendanceStatus === 'completed'
                          ? 'bg-emerald-500/20 text-emerald-300'
                          : b.attendanceStatus === 'disputed'
                          ? 'bg-rose-500/20 text-rose-300'
                          : b.attendanceStatus === 'client_absent' || b.attendanceStatus === 'expert_absent'
                          ? 'bg-amber-500/20 text-amber-300'
                          : 'bg-slate-800 text-slate-400'
                      }`}
                    >
                      {b.attendanceStatus}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-right">
                    <button
                      onClick={() => handleInspect(b)}
                      className="rounded-full bg-slate-800 border border-slate-700 px-3 py-1 text-[11px] font-bold text-slate-200 hover:bg-slate-700 hover:text-white"
                    >
                      {b.attendanceStatus === 'disputed' ? 'Resolve Dispute' : 'Inspect'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* MODAL: Audit Trail & Admin Dispute Resolution */}
      {inspectBooking && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/70 p-4 backdrop-blur-xs">
          <div className="w-full max-w-2xl rounded-3xl border border-slate-700 bg-[#121d2f] p-6 shadow-2xl space-y-5 text-white max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <h3 className="text-base font-bold text-white">
                  Attendance Audit &amp; Resolution — Ref #{inspectBooking.reference || inspectBooking._id.slice(-6).toUpperCase()}
                </h3>
                <p className="text-xs text-slate-400">
                  {inspectBooking.clientName} with {inspectBooking.expertName} on {inspectBooking.date} at {inspectBooking.time}
                </p>
              </div>
              <button
                onClick={() => setInspectBooking(null)}
                className="size-7 rounded-full bg-slate-800 text-xs font-bold text-slate-400 hover:bg-slate-700"
              >
                ✕
              </button>
            </div>

            {/* Reports Side-by-Side */}
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-2xl border border-slate-800 bg-[#0d1624] p-4 space-y-2">
                <span className="text-[10px] font-bold uppercase text-slate-400">Expert Submission</span>
                {inspectBooking.expertAttendanceReport ? (
                  <>
                    <p className="text-sm font-bold text-emerald-400 capitalize">
                      Response: {inspectBooking.expertAttendanceReport.response}
                    </p>
                    <p className="text-[11px] text-slate-400">
                      Submitted: {new Date(inspectBooking.expertAttendanceReport.submittedAt).toLocaleString()}
                    </p>
                    {inspectBooking.expertAttendanceReport.notes && (
                      <p className="text-xs text-slate-300 pt-1">
                        Notes: &quot;{inspectBooking.expertAttendanceReport.notes}&quot;
                      </p>
                    )}
                  </>
                ) : (
                  <p className="text-xs text-slate-500">Expert has not submitted an attendance report yet.</p>
                )}
              </div>

              <div className="rounded-2xl border border-slate-800 bg-[#0d1624] p-4 space-y-2">
                <span className="text-[10px] font-bold uppercase text-slate-400">Client Submission</span>
                {inspectBooking.clientAttendanceReport ? (
                  <>
                    <p className="text-sm font-bold text-emerald-400 capitalize">
                      Response: {inspectBooking.clientAttendanceReport.response}
                    </p>
                    <p className="text-[11px] text-slate-400">
                      Submitted: {new Date(inspectBooking.clientAttendanceReport.submittedAt).toLocaleString()}
                    </p>
                    {inspectBooking.clientAttendanceReport.notes && (
                      <p className="text-xs text-slate-300 pt-1">
                        Notes: &quot;{inspectBooking.clientAttendanceReport.notes}&quot;
                      </p>
                    )}
                  </>
                ) : (
                  <p className="text-xs text-slate-500">Client has not submitted an attendance report yet.</p>
                )}
              </div>
            </div>

            {/* Immutable Audit Trail List */}
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2 block">
                Immutable Attendance Audit Trail
              </span>
              {loadingAudit ? (
                <p className="text-xs text-slate-500">Loading audit history...</p>
              ) : auditLogs.length === 0 ? (
                <p className="text-xs text-slate-500">No attendance reports or overrides recorded yet.</p>
              ) : (
                <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
                  {auditLogs.map((log) => (
                    <div
                      key={log._id}
                      className="rounded-xl border border-slate-800 bg-[#0d1624] p-2.5 text-xs flex items-center justify-between"
                    >
                      <div>
                        <span className="font-bold uppercase text-blue-400">[{log.userRole}]</span>{' '}
                        <span>Reported &apos;{log.attendanceResponse}&apos;</span>{' '}
                        <span className="text-slate-500">({log.previousStatus} → {log.updatedStatus})</span>
                        {log.notes && <p className="text-[11px] text-slate-400 mt-0.5">&quot;{log.notes}&quot;</p>}
                      </div>
                      <span className="text-[10px] text-slate-500">
                        {new Date(log.submittedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Admin Override & Dispute Resolution Form */}
            <form onSubmit={handleResolveDispute} className="border-t border-slate-800 pt-4 space-y-3">
              <span className="text-xs font-bold text-white block">
                Admin Dispute Resolution / Manual Override
              </span>

              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="block text-[11px] text-slate-400 mb-1">Set Final Attendance Status</label>
                  <select
                    value={resolveStatus}
                    onChange={(e) => setResolveStatus(e.target.value)}
                    className="w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-xs text-white outline-none focus:border-blue-500"
                  >
                    <option value="completed">Completed (Both Attended)</option>
                    <option value="client_absent">Client Absent (Expert Attended, Client No-Show)</option>
                    <option value="expert_absent">Expert Absent (Client Attended, Expert No-Show)</option>
                    <option value="both_absent">Both Absent</option>
                    <option value="cancelled">Cancelled</option>
                    <option value="pending">Pending</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] text-slate-400 mb-1">Resolution Reason / Audit Notes</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Verified via screenshots, technical issues"
                    value={resolveNotes}
                    onChange={(e) => setResolveNotes(e.target.value)}
                    className="w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-xs text-white outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setInspectBooking(null)}
                  className="rounded-full px-4 py-2 text-xs font-bold text-slate-400 hover:text-white"
                >
                  Close
                </button>
                <button
                  type="submit"
                  disabled={resolving}
                  className="rounded-full bg-blue-600 px-6 py-2 text-xs font-bold text-white hover:bg-blue-500 disabled:opacity-50"
                >
                  {resolving ? 'Saving...' : 'Apply Admin Resolution'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

