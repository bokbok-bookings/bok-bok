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

  const handleInspect = async (b: BookingAttendanceItem, forceSyncMeet = false) => {
    setInspectBooking(b)
    setResolveStatus(b.attendanceStatus === 'disputed' ? 'completed' : b.attendanceStatus)
    if (!forceSyncMeet) setResolveNotes('')
    setLoadingAudit(true)
    try {
      const res = await fetch(
        `/api/admin/attendance?bookingId=${b._id}${forceSyncMeet ? '&syncMeet=1' : ''}`
      )
      const json = await res.json()
      if (json.success && json.data) {
        if (json.data.booking) {
          setInspectBooking(json.data.booking)
        }
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
        <div className="rounded-2xl border border-border bg-white p-4 shadow-xs">
          <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Scheduled</span>
          <p className="mt-1 text-2xl font-black text-foreground">{stats.totalSessions}</p>
          <p className="text-[10px] text-muted-foreground">Confirmed sessions</p>
        </div>
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50/70 p-4 shadow-xs">
          <span className="text-[10px] font-black uppercase tracking-wider text-emerald-800">Completed</span>
          <p className="mt-1 text-2xl font-black text-emerald-900">{stats.completed}</p>
          <p className="text-[10px] text-emerald-700/80">Mutual attendance</p>
        </div>
        <div className="rounded-2xl border border-rose-200 bg-rose-50/70 p-4 shadow-xs">
          <span className="text-[10px] font-black uppercase tracking-wider text-rose-800">Disputed</span>
          <p className="mt-1 text-2xl font-black text-rose-900">{stats.disputed}</p>
          <p className="text-[10px] text-rose-700/80">Needs admin action</p>
        </div>
        <div className="rounded-2xl border border-amber-200 bg-amber-50/70 p-4 shadow-xs">
          <span className="text-[10px] font-black uppercase tracking-wider text-amber-800">Client Absent</span>
          <p className="mt-1 text-2xl font-black text-amber-900">{stats.clientAbsent}</p>
          <p className="text-[10px] text-amber-700/80">Client no-show</p>
        </div>
        <div className="rounded-2xl border border-rose-200 bg-rose-50/70 p-4 shadow-xs">
          <span className="text-[10px] font-black uppercase tracking-wider text-rose-800">Expert Absent</span>
          <p className="mt-1 text-2xl font-black text-rose-900">{stats.expertAbsent}</p>
          <p className="text-[10px] text-rose-700/80">Expert no-show</p>
        </div>
        <div className="rounded-2xl border border-border bg-white p-4 shadow-xs">
          <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Both Absent</span>
          <p className="mt-1 text-2xl font-black text-foreground">{stats.bothAbsent}</p>
          <p className="text-[10px] text-muted-foreground">Neither attended</p>
        </div>
        <div className="rounded-2xl border border-border bg-white p-4 shadow-xs">
          <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Pending</span>
          <p className="mt-1 text-2xl font-black text-muted-foreground">{stats.pending}</p>
          <p className="text-[10px] text-muted-foreground">Awaiting reports</p>
        </div>
      </div>

      {/* Global Reminder & Window Settings Card */}
      <div className="rounded-2xl border border-border bg-white p-6 space-y-4 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-4">
          <div>
            <h3 className="text-sm font-bold text-foreground">Automated Notifications &amp; Attendance Configuration</h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              Configure global reminder intervals and attendance reporting windows.
            </p>
          </div>
          {settingsMessage && (
            <span className="text-xs font-bold text-emerald-800 bg-emerald-50 border border-emerald-200 px-3 py-1 rounded-full">
              ✓ {settingsMessage}
            </span>
          )}
        </div>

        <form onSubmit={handleSavePlatformSettings} className="grid gap-4 sm:grid-cols-3 items-end">
          <div>
            <label className="block text-xs font-bold text-foreground mb-1.5">
              Reminder 2: Pre-Session Interval (Minutes)
            </label>
            <select
              value={reminderMinutes}
              onChange={(e) => setReminderMinutes(Number(e.target.value))}
              className="w-full rounded-xl border border-border bg-white px-3 py-2 text-xs text-foreground outline-none focus:border-primary shadow-2xs"
            >
              <option value={10}>10 minutes before session</option>
              <option value={15}>15 minutes before session (Default)</option>
              <option value={20}>20 minutes before session</option>
              <option value={30}>30 minutes before session</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-foreground mb-1.5">
              Attendance Reporting Deadline (Hours Post-Session)
            </label>
            <input
              type="number"
              min={1}
              max={168}
              value={reportingHours}
              onChange={(e) => setReportingHours(Number(e.target.value))}
              className="w-full rounded-xl border border-border bg-white px-3 py-2 text-xs text-foreground outline-none focus:border-primary shadow-2xs"
            />
          </div>

          <div>
            <button
              type="submit"
              disabled={savingSettings}
              className="w-full rounded-xl bg-primary px-4 py-2 text-xs font-bold text-white hover:bg-primary-hover transition disabled:opacity-50 shadow-xs"
            >
              {savingSettings ? 'Saving...' : 'Save System Settings'}
            </button>
          </div>
        </form>
      </div>

      {/* Filter Bar */}
      <div className="rounded-2xl border border-border bg-white p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-xs">
        <div className="flex flex-wrap items-center gap-2">
          {['all', 'disputed', 'pending', 'completed', 'client_absent', 'expert_absent'].map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`rounded-full px-3 py-1.5 text-xs font-bold transition capitalize ${statusFilter === st
                ? 'bg-primary text-white shadow-2xs'
                : 'bg-neutral-100 text-muted-foreground border border-border hover:text-foreground hover:bg-neutral-200'
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
            className="rounded-xl border border-border bg-white px-3 py-1.5 text-xs text-foreground outline-none placeholder:text-muted-foreground shadow-2xs focus:border-primary"
          />
          <button
            onClick={loadData}
            className="rounded-xl bg-white border border-border px-3 py-1.5 text-xs font-bold text-foreground hover:bg-neutral-50 shadow-2xs"
          >
            Filter
          </button>
        </div>
      </div>

      {/* Sessions Table */}
      <div className="rounded-2xl border border-border bg-white overflow-x-auto shadow-xs">
        {loading ? (
          <p className="p-12 text-center text-xs font-bold text-muted-foreground">Loading attendance sessions...</p>
        ) : bookings.length === 0 ? (
          <div className="p-12 text-center text-xs text-muted-foreground">
            No confirmed sessions match the selected attendance filters.
          </div>
        ) : (
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-border bg-neutral-50/80 text-muted-foreground font-semibold">
                <th className="py-3 px-4">Ref</th>
                <th className="py-3 px-4">Client</th>
                <th className="py-3 px-4">Expert</th>
                <th className="py-3 px-4">Date &amp; Time</th>
                <th className="py-3 px-4">Expert Report</th>
                <th className="py-3 px-4">Client Report</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {bookings.map((b) => (
                <tr key={b._id} className="hover:bg-neutral-50/60 transition">
                  <td className="py-3 px-4 font-mono font-bold text-foreground">
                    {b.reference || b._id.slice(-6).toUpperCase()}
                  </td>
                  <td className="py-3 px-4">
                    <p className="font-bold text-foreground">{b.clientName}</p>
                    <p className="text-[10px] text-muted-foreground">{b.clientEmail}</p>
                  </td>
                  <td className="py-3 px-4 font-medium text-foreground">
                    {b.expertName}
                  </td>
                  <td className="py-3 px-4 text-muted-foreground">
                    {b.date} at {b.time} ({b.durationMinutes}m)
                  </td>
                  <td className="py-3 px-4">
                    {b.expertAttendanceReport ? (
                      <span
                        className={`font-semibold ${b.expertAttendanceReport.response === 'attended'
                          ? 'text-emerald-700'
                          : 'text-rose-700'
                          }`}
                      >
                        {b.expertAttendanceReport.response === 'attended'
                          ? '✓ Attended'
                          : '✕ Marked Absent'}
                      </span>
                    ) : (b as any).meetingJoins?.expert?.firstJoinedAt ? (
                      <div className="text-[11px] font-semibold text-emerald-700">
                        <div>
                          ✓ In:{' '}
                          {new Date((b as any).meetingJoins.expert.firstJoinedAt).toLocaleTimeString(
                            [],
                            { hour: '2-digit', minute: '2-digit' }
                          )}
                          {(b as any).meetingJoins.expert.leftAt && (
                            <>
                              {' · Out: '}
                              {new Date((b as any).meetingJoins.expert.leftAt).toLocaleTimeString(
                                [],
                                { hour: '2-digit', minute: '2-digit' }
                              )}
                            </>
                          )}
                        </div>
                        {(b as any).meetingJoins.expert.durationMinutes !== undefined && (
                          <span className="text-[10px] text-muted-foreground">
                            Duration: {(b as any).meetingJoins.expert.durationMinutes}m
                          </span>
                        )}
                      </div>
                    ) : (
                      <span className="text-muted-foreground">Not submitted</span>
                    )}
                  </td>
                  <td className="py-3 px-4">
                    {b.clientAttendanceReport ? (
                      <span
                        className={`font-semibold ${b.clientAttendanceReport.response === 'attended'
                          ? 'text-emerald-700'
                          : 'text-rose-700'
                          }`}
                      >
                        {b.clientAttendanceReport.response === 'attended'
                          ? '✓ Attended'
                          : '✕ Marked Absent'}
                      </span>
                    ) : (b as any).meetingJoins?.client?.firstJoinedAt ? (
                      <div className="text-[11px] font-semibold text-emerald-700">
                        <div>
                          ✓ In:{' '}
                          {new Date((b as any).meetingJoins.client.firstJoinedAt).toLocaleTimeString(
                            [],
                            { hour: '2-digit', minute: '2-digit' }
                          )}
                          {(b as any).meetingJoins.client.leftAt && (
                            <>
                              {' · Out: '}
                              {new Date((b as any).meetingJoins.client.leftAt).toLocaleTimeString(
                                [],
                                { hour: '2-digit', minute: '2-digit' }
                              )}
                            </>
                          )}
                        </div>
                        {(b as any).meetingJoins.client.durationMinutes !== undefined && (
                          <span className="text-[10px] text-muted-foreground">
                            Duration: {(b as any).meetingJoins.client.durationMinutes}m
                          </span>
                        )}
                      </div>
                    ) : (
                      <span className="text-muted-foreground">Not submitted</span>
                    )}
                  </td>
                  <td className="py-3 px-4">
                    <span
                      className={`inline-block rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase ${b.attendanceStatus === 'completed'
                        ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                        : b.attendanceStatus === 'disputed'
                          ? 'bg-rose-50 text-rose-800 border border-rose-200'
                          : b.attendanceStatus === 'client_absent' || b.attendanceStatus === 'expert_absent'
                            ? 'bg-amber-50 text-amber-800 border border-amber-200'
                            : 'bg-neutral-100 text-muted-foreground border border-border'
                        }`}
                    >
                      {b.attendanceStatus}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-right">
                    <button
                      onClick={() => handleInspect(b)}
                      className="rounded-full bg-white border border-border px-3 py-1 text-[11px] font-bold text-foreground hover:bg-neutral-50 shadow-2xs transition"
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
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-2xl rounded-3xl border border-border bg-white p-6 shadow-2xl space-y-5 text-foreground max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div>
                <h3 className="text-base font-bold text-foreground">
                  Attendance Audit &amp; Resolution — Ref #{inspectBooking.reference || inspectBooking._id.slice(-6).toUpperCase()}
                </h3>
                <p className="text-xs text-muted-foreground">
                  {inspectBooking.clientName} with {inspectBooking.expertName} on {inspectBooking.date} at {inspectBooking.time}
                </p>
              </div>
              <div className="flex items-center gap-2">
                {inspectBooking.googleMeetLink && (
                  <button
                    type="button"
                    disabled={loadingAudit}
                    onClick={() => handleInspect(inspectBooking, true)}
                    className="rounded-full border border-border bg-neutral-100 px-3 py-1 text-[11px] font-bold text-foreground hover:bg-neutral-200 transition disabled:opacity-50"
                  >
                    {loadingAudit ? 'Syncing...' : 'Sync Meet API ↻'}
                  </button>
                )}
                <button
                  onClick={() => setInspectBooking(null)}
                  className="size-7 rounded-full bg-neutral-100 border border-border text-xs font-bold text-muted-foreground hover:text-foreground hover:bg-neutral-200"
                >
                  ✕
                </button>
              </div>
            </div>

            {/* Google Meet Telemetry (Entry, Leave & Duration) */}
            {inspectBooking.deliveryMode !== 'IN_PERSON' && (
              <div className="rounded-2xl border border-border bg-neutral-50/70 p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                    Google Meet Room Telemetry (Entry · Leave · Duration)
                  </span>
                  {(inspectBooking as any).googleMeetTelemetry?.lastSyncedAt && (
                    <span className="text-[10px] text-muted-foreground">
                      Synced:{' '}
                      {new Date(
                        (inspectBooking as any).googleMeetTelemetry.lastSyncedAt
                      ).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  )}
                </div>

                {(inspectBooking as any).googleMeetTelemetry?.syncError && (
                  <div className="rounded-xl border border-amber-200 bg-amber-50 p-2.5 text-[11px] text-amber-900">
                    {(inspectBooking as any).googleMeetTelemetry.syncError}{' '}
                    <a
                      href="/api/auth/google/connect"
                      className="font-bold underline hover:text-amber-700"
                    >
                      Reconnect Google Account
                    </a>
                  </div>
                )}

                <div className="grid gap-3 sm:grid-cols-2 text-xs">
                  {(['expert', 'client'] as const).map((role) => {
                    const j = (inspectBooking as any).meetingJoins?.[role]
                    const label = role === 'expert' ? `Expert (${inspectBooking.expertName})` : `Client (${inspectBooking.clientName})`
                    return (
                      <div key={role} className="rounded-xl border border-border bg-white p-3 space-y-1">
                        <p className="text-[11px] font-bold text-foreground">{label}</p>
                        {j?.firstJoinedAt ? (
                          <div className="text-[11px] text-muted-foreground space-y-0.5">
                            <p>
                              <strong className="text-foreground">Entered:</strong>{' '}
                              {new Date(j.firstJoinedAt).toLocaleTimeString([], {
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </p>
                            <p>
                              <strong className="text-foreground">Left:</strong>{' '}
                              {j.leftAt
                                ? new Date(j.leftAt).toLocaleTimeString([], {
                                  hour: '2-digit',
                                  minute: '2-digit',
                                })
                                : j.inMeetingNow
                                  ? 'Active in call now'
                                  : 'Awaiting call end / Meet sync'}
                            </p>
                            {j.durationMinutes !== undefined && (
                              <p>
                                <strong className="text-foreground">Duration:</strong>{' '}
                                {j.durationMinutes} min ({j.joinCount || 1} session
                                {(j.joinCount || 1) > 1 ? 's' : ''})
                              </p>
                            )}
                          </div>
                        ) : (
                          <p className="text-[11px] text-muted-foreground">No room entry recorded</p>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Reports Side-by-Side */}
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-2xl border border-border bg-neutral-50 p-4 space-y-2">
                <span className="text-[10px] font-bold uppercase text-muted-foreground">Expert Submission</span>
                {inspectBooking.expertAttendanceReport ? (
                  <>
                    <p className="text-sm font-bold text-emerald-700 capitalize">
                      Response: {inspectBooking.expertAttendanceReport.response}
                    </p>
                    <p className="text-[11px] text-muted-foreground">
                      Submitted: {new Date(inspectBooking.expertAttendanceReport.submittedAt).toLocaleString()}
                    </p>
                    {inspectBooking.expertAttendanceReport.notes && (
                      <p className="text-xs text-foreground pt-1">
                        Notes: &quot;{inspectBooking.expertAttendanceReport.notes}&quot;
                      </p>
                    )}
                  </>
                ) : (
                  <p className="text-xs text-muted-foreground">Expert has not submitted an attendance report yet.</p>
                )}
              </div>

              <div className="rounded-2xl border border-border bg-neutral-50 p-4 space-y-2">
                <span className="text-[10px] font-bold uppercase text-muted-foreground">Client Submission</span>
                {inspectBooking.clientAttendanceReport ? (
                  <>
                    <p className="text-sm font-bold text-emerald-700 capitalize">
                      Response: {inspectBooking.clientAttendanceReport.response}
                    </p>
                    <p className="text-[11px] text-muted-foreground">
                      Submitted: {new Date(inspectBooking.clientAttendanceReport.submittedAt).toLocaleString()}
                    </p>
                    {inspectBooking.clientAttendanceReport.notes && (
                      <p className="text-xs text-foreground pt-1">
                        Notes: &quot;{inspectBooking.clientAttendanceReport.notes}&quot;
                      </p>
                    )}
                  </>
                ) : (
                  <p className="text-xs text-muted-foreground">Client has not submitted an attendance report yet.</p>
                )}
              </div>
            </div>

            {/* Immutable Audit Trail List */}
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2 block">
                Immutable Attendance Audit Trail
              </span>
              {loadingAudit ? (
                <p className="text-xs text-muted-foreground">Loading audit history...</p>
              ) : auditLogs.length === 0 ? (
                <p className="text-xs text-muted-foreground">No attendance reports or overrides recorded yet.</p>
              ) : (
                <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
                  {auditLogs.map((log) => (
                    <div
                      key={log._id}
                      className="rounded-xl border border-border bg-neutral-50 p-2.5 text-xs flex items-center justify-between"
                    >
                      <div>
                        <span className="font-bold uppercase text-primary">[{log.userRole}]</span>{' '}
                        <span>Reported &apos;{log.attendanceResponse}&apos;</span>{' '}
                        <span className="text-muted-foreground">({log.previousStatus} → {log.updatedStatus})</span>
                        {log.notes && <p className="text-[11px] text-muted-foreground mt-0.5">&quot;{log.notes}&quot;</p>}
                      </div>
                      <span className="text-[10px] text-muted-foreground">
                        {new Date(log.submittedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Admin Override & Dispute Resolution Form */}
            <form onSubmit={handleResolveDispute} className="border-t border-border pt-4 space-y-3">
              <span className="text-xs font-bold text-foreground block">
                Admin Dispute Resolution / Manual Override
              </span>

              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="block text-[11px] text-muted-foreground mb-1 font-semibold">Set Final Attendance Status</label>
                  <select
                    value={resolveStatus}
                    onChange={(e) => setResolveStatus(e.target.value)}
                    className="w-full rounded-xl border border-border bg-white px-3 py-2 text-xs text-foreground outline-none focus:border-primary shadow-2xs"
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
                  <label className="block text-[11px] text-muted-foreground mb-1 font-semibold">Resolution Reason / Audit Notes</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Verified via screenshots, technical issues"
                    value={resolveNotes}
                    onChange={(e) => setResolveNotes(e.target.value)}
                    className="w-full rounded-xl border border-border bg-white px-3 py-2 text-xs text-foreground outline-none focus:border-primary shadow-2xs"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setInspectBooking(null)}
                  className="rounded-full px-4 py-2 text-xs font-bold text-muted-foreground hover:text-foreground"
                >
                  Close
                </button>
                <button
                  type="submit"
                  disabled={resolving}
                  className="rounded-full bg-primary px-6 py-2 text-xs font-bold text-white hover:bg-primary-hover shadow-xs disabled:opacity-50"
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
