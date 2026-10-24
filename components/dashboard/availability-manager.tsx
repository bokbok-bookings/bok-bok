'use client'

import React, { useState, useEffect } from 'react'
import type {
  DaySchedule,
  BreakInterval,
  DateOverrideItem,
  DateOverrideType,
} from '@/lib/data/availability'
import {
  DEFAULT_WEEKLY_SCHEDULE,
  DEFAULT_SLOT_INTERVAL,
} from '@/lib/data/availability'
import { EXPERTS, type Expert } from '@/lib/data/experts'

const WEEKDAYS = [
  { day: 0, name: 'Sunday', arName: 'الأحد' },
  { day: 1, name: 'Monday', arName: 'الاثنين' },
  { day: 2, name: 'Tuesday', arName: 'الثلاثاء' },
  { day: 3, name: 'Wednesday', arName: 'الأربعاء' },
  { day: 4, name: 'Thursday', arName: 'الخميس' },
  { day: 5, name: 'Friday', arName: 'الجمعة', isWeekend: true },
  { day: 6, name: 'Saturday', arName: 'السبت' },
]

interface AvailabilityManagerProps {
  initialExpertId?: string
  initialExpertName?: string
  initialExpertSlug?: string
  initialWeeklySchedule?: Record<number, DaySchedule>
  initialSlotInterval?: number
  initialOverrides?: DateOverrideItem[]
  showExpertPicker?: boolean
}

export function AvailabilityManager({
  initialExpertId,
  initialExpertName,
  initialExpertSlug,
  initialWeeklySchedule,
  initialSlotInterval,
  initialOverrides,
  showExpertPicker = true,
}: AvailabilityManagerProps) {
  const [allExperts, setAllExperts] = useState<any[]>(EXPERTS)

  // Find initial expert either by ID or Slug from fallback list
  const fallbackExpert =
    EXPERTS.find(
      (e) =>
        (initialExpertId && (e.id === initialExpertId || (e as any)._id === initialExpertId)) ||
        (initialExpertSlug && e.slug === initialExpertSlug)
    ) || EXPERTS[0]

  const [selectedExpertId, setSelectedExpertId] = useState<string>(
    initialExpertId || fallbackExpert.id
  )
  const [expertName, setExpertName] = useState<string>(
    initialExpertName || (initialExpertId ? '' : fallbackExpert.name)
  )
  const [expertSlug, setExpertSlug] = useState<string>(
    initialExpertSlug || fallbackExpert.slug || ''
  )
  const [expertRole, setExpertRole] = useState<string>(fallbackExpert.role || '')

  const [weeklySchedule, setWeeklySchedule] = useState<Record<number, DaySchedule>>(
    initialWeeklySchedule || DEFAULT_WEEKLY_SCHEDULE,
  )
  const [slotInterval, setSlotInterval] = useState<number>(
    initialSlotInterval || DEFAULT_SLOT_INTERVAL,
  )
  const [overrides, setOverrides] = useState<DateOverrideItem[]>(initialOverrides || [])

  const [loadingExpertData, setLoadingExpertData] = useState(false)
  const [savingSchedule, setSavingSchedule] = useState(false)
  const [scheduleSuccess, setScheduleSuccess] = useState<string | null>(null)
  const [scheduleError, setScheduleError] = useState<string | null>(null)

  // Override Modal State
  const [isOverrideModalOpen, setIsOverrideModalOpen] = useState(false)
  const [overrideDate, setOverrideDate] = useState('')
  const [overrideType, setOverrideType] = useState<DateOverrideType>('closed')
  const [overrideStartTime, setOverrideStartTime] = useState('09:00')
  const [overrideEndTime, setOverrideEndTime] = useState('17:00')
  const [overrideBreaks, setOverrideBreaks] = useState<BreakInterval[]>([])
  const [overrideReason, setOverrideReason] = useState('')
  const [overrideLoading, setOverrideLoading] = useState(false)
  const [overrideError, setOverrideError] = useState<string | null>(null)

  // Fetch all experts from DB if expert picker is enabled
  useEffect(() => {
    if (showExpertPicker) {
      fetch('/api/admin/experts')
        .then((res) => res.json())
        .then((json) => {
          if (json.success && Array.isArray(json.data) && json.data.length > 0) {
            setAllExperts(json.data)
          }
        })
        .catch(() => {})
    }
  }, [showExpertPicker])

  // Update expert info whenever selectedExpertId or allExperts change
  useEffect(() => {
    const found = allExperts.find(
      (e) => (e.id && e.id === selectedExpertId) || (e._id && e._id === selectedExpertId)
    )
    if (found) {
      setExpertName(found.name)
      setExpertSlug(found.slug)
      setExpertRole(found.role || '')
    } else if (selectedExpertId) {
      fetch(`/api/dashboard/profile?expertId=${selectedExpertId}`)
        .then((res) => res.json())
        .then((json) => {
          if (json.success && json.data) {
            setExpertName(json.data.name)
            setExpertSlug(json.data.slug)
            setExpertRole(json.data.role || '')
          }
        })
        .catch(() => {})
    }
  }, [selectedExpertId, allExperts])

  // Fetch expert availability whenever selectedExpertId changes
  useEffect(() => {
    let ignore = false
    async function loadData() {
      setLoadingExpertData(true)
      setScheduleSuccess(null)
      setScheduleError(null)
      try {
        const res = await fetch(`/api/dashboard/availability?expertId=${selectedExpertId}`)
        const json = await res.json()
        if (!ignore && json.success && json.data) {
          setWeeklySchedule(json.data.weeklySchedule || DEFAULT_WEEKLY_SCHEDULE)
          setSlotInterval(json.data.slotIntervalMinutes || DEFAULT_SLOT_INTERVAL)
          setOverrides(json.data.overrides || [])
        }
      } catch (err: any) {
        if (!ignore) {
          setScheduleError('Failed to load expert schedule')
        }
      } finally {
        if (!ignore) {
          setLoadingExpertData(false)
        }
      }
    }

    loadData()
    return () => {
      ignore = true
    }
  }, [selectedExpertId])

  // Toggle Day Open/Closed
  const handleToggleDay = (dayIndex: number) => {
    setWeeklySchedule((prev) => {
      const current = prev[dayIndex] || DEFAULT_WEEKLY_SCHEDULE[dayIndex]
      return {
        ...prev,
        [dayIndex]: {
          ...current,
          enabled: !current.enabled,
        },
      }
    })
  }

  // Update Day Working Hours
  const handleTimeChange = (dayIndex: number, field: 'startTime' | 'endTime', value: string) => {
    setWeeklySchedule((prev) => {
      const current = prev[dayIndex] || DEFAULT_WEEKLY_SCHEDULE[dayIndex]
      return {
        ...prev,
        [dayIndex]: {
          ...current,
          [field]: value,
        },
      }
    })
  }

  // Add Break to a Weekday
  const handleAddBreak = (dayIndex: number) => {
    setWeeklySchedule((prev) => {
      const current = prev[dayIndex] || DEFAULT_WEEKLY_SCHEDULE[dayIndex]
      const newBreak: BreakInterval = {
        id: `break-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        start: '13:00',
        end: '14:00',
        label: 'Lunch Break',
      }
      return {
        ...prev,
        [dayIndex]: {
          ...current,
          breaks: [...(current.breaks || []), newBreak],
        },
      }
    })
  }

  // Update Break in a Weekday
  const handleUpdateBreak = (
    dayIndex: number,
    breakId: string,
    field: 'start' | 'end' | 'label',
    value: string,
  ) => {
    setWeeklySchedule((prev) => {
      const current = prev[dayIndex] || DEFAULT_WEEKLY_SCHEDULE[dayIndex]
      return {
        ...prev,
        [dayIndex]: {
          ...current,
          breaks: (current.breaks || []).map((b) =>
            b.id === breakId ? { ...b, [field]: value } : b,
          ),
        },
      }
    })
  }

  // Remove Break from a Weekday
  const handleRemoveBreak = (dayIndex: number, breakId: string) => {
    setWeeklySchedule((prev) => {
      const current = prev[dayIndex] || DEFAULT_WEEKLY_SCHEDULE[dayIndex]
      return {
        ...prev,
        [dayIndex]: {
          ...current,
          breaks: (current.breaks || []).filter((b) => b.id !== breakId),
        },
      }
    })
  }

  // Save Weekly Schedule
  const handleSaveSchedule = async () => {
    setSavingSchedule(true)
    setScheduleSuccess(null)
    setScheduleError(null)

    try {
      const res = await fetch('/api/dashboard/availability', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          expertId: selectedExpertId,
          expertSlug: expertSlug,
          weeklySchedule,
          slotIntervalMinutes: slotInterval,
        }),
      })

      const data = await res.json()
      if (data.success) {
        setScheduleSuccess(
          `Schedule saved for ${expertName || 'expert'}. Stored under expert ID: ${selectedExpertId}.`,
        )
        setTimeout(() => setScheduleSuccess(null), 4500)
      } else {
        setScheduleError(data.error || 'Failed to save schedule')
      }
    } catch (err: any) {
      setScheduleError(err.message || 'An unexpected error occurred')
    } finally {
      setSavingSchedule(false)
    }
  }

  // Add Override Submit
  const handleSaveOverride = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!overrideDate) {
      setOverrideError('Please select a date')
      return
    }

    setOverrideLoading(true)
    setOverrideError(null)

    try {
      const res = await fetch('/api/dashboard/availability', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          expertId: selectedExpertId,
          expertSlug: expertSlug,
          date: overrideDate,
          type: overrideType,
          startTime: overrideStartTime,
          endTime: overrideEndTime,
          breaks: overrideBreaks,
          reason: overrideReason,
        }),
      })

      const data = await res.json()
      if (data.success) {
        setOverrides((prev) => {
          const filtered = prev.filter((o) => o.date !== overrideDate)
          return [...filtered, data.data].sort((a, b) => a.date.localeCompare(b.date))
        })
        setIsOverrideModalOpen(false)
        setOverrideDate('')
        setOverrideReason('')
        setOverrideBreaks([])
      } else {
        setOverrideError(data.error || 'Failed to save date override')
      }
    } catch (err: any) {
      setOverrideError(err.message || 'An unexpected error occurred')
    } finally {
      setOverrideLoading(false)
    }
  }

  // Delete Override
  const handleDeleteOverride = async (idOrDate: string) => {
    if (!confirm('Are you sure you want to remove this date override?')) return

    try {
      const url = `/api/dashboard/availability?expertId=${selectedExpertId}&id=${encodeURIComponent(idOrDate)}`
      const res = await fetch(url, { method: 'DELETE' })
      const data = await res.json()
      if (data.success) {
        setOverrides((prev) =>
          prev.filter((o) => o.id !== idOrDate && o._id !== idOrDate && o.date !== idOrDate),
        )
      } else {
        alert(data.error || 'Failed to delete override')
      }
    } catch {
      alert('Failed to delete override')
    }
  }

  return (
    <div className="space-y-8">
      {/* Expert Context & Bar */}
      {showExpertPicker && (
        <div className="flex flex-col gap-4 rounded-3xl border border-[#e7e2da] bg-white p-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <p className="text-xs font-bold uppercase tracking-[.14em] text-[#ef5b4c]">
                Managing expert schedule
              </p>
              <span className="font-mono text-[10px] text-[#8b94a1] bg-[#fbfaf7] px-2 py-0.5 rounded-md border border-[#e7e2da]">
                ID: {selectedExpertId}
              </span>
            </div>
            <div className="mt-1 flex items-center gap-3">
              <h2 className="text-xl font-bold tracking-tight text-[#14243b]">
                {expertName}
              </h2>
              {expertRole && (
                <span className="rounded-full bg-[#f7f5f1] px-2.5 py-0.5 text-xs font-semibold text-[#637084]">
                  {expertRole}
                </span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <label htmlFor="expert-select" className="text-xs font-bold text-[#637084]">
              Select expert:
            </label>
            <select
              id="expert-select"
              value={selectedExpertId}
              onChange={(e) => setSelectedExpertId(e.target.value)}
              className="rounded-xl border border-[#dedbd5] bg-[#fbfaf7] px-3.5 py-2 text-xs font-semibold text-[#14243b] outline-none transition focus:border-[#ef5b4c]"
            >
              {allExperts.map((exp) => (
                <option key={exp.id || exp._id} value={exp.id || exp._id}>
                  {exp.name} — {exp.role} (ID: {(exp.id || exp._id || '').slice(-6)})
                </option>
              ))}
            </select>
          </div>
        </div>
      )}

      {/* Main Action Bar */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-[#14243b] sm:text-3xl">
            Availability & Working Hours
          </h1>
          <p className="mt-1 text-sm text-[#637084]">
            Configured for {expertName} (DB Record ID:{' '}
            <span className="font-mono text-xs text-[#14243b]">{selectedExpertId}</span>).
          </p>
        </div>

        <button
          type="button"
          onClick={handleSaveSchedule}
          disabled={savingSchedule || loadingExpertData}
          className="inline-flex items-center justify-center rounded-full bg-[#14243b] px-6 py-3 text-sm font-bold text-white transition hover:bg-[#ef5b4c] disabled:opacity-50"
        >
          {savingSchedule ? 'Saving to Database...' : 'Save weekly schedule'}
        </button>
      </div>

      {/* Status Notifications */}
      {scheduleSuccess && (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3.5 text-sm font-medium text-emerald-800">
          {scheduleSuccess}
        </div>
      )}

      {scheduleError && (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3.5 text-sm font-medium text-rose-800">
          {scheduleError}
        </div>
      )}

      {/* Slot Interval Settings */}
      <div className="rounded-3xl border border-[#e7e2da] bg-white p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="max-w-xl">
            <h3 className="text-base font-bold text-[#14243b]">Session Booking Step (Interval)</h3>
            <p className="mt-1 text-xs leading-5 text-[#637084]">
              Determines the spacing between starting times available for {expertName}.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <select
              value={slotInterval}
              onChange={(e) => setSlotInterval(Number(e.target.value))}
              className="rounded-xl border border-[#dedbd5] bg-[#fbfaf7] px-4 py-2.5 text-xs font-bold text-[#14243b] outline-none focus:border-[#ef5b4c]"
            >
              <option value={15}>Every 15 minutes</option>
              <option value={20}>Every 20 minutes</option>
              <option value={30}>Every 30 minutes</option>
              <option value={45}>Every 45 minutes (Recommended)</option>
              <option value={60}>Every 60 minutes</option>
            </select>
          </div>
        </div>
      </div>

      {/* SECTION 1: Weekly Recurring Template */}
      <div className="space-y-4">
        <div>
          <h2 className="text-xl font-semibold tracking-tight text-[#14243b]">
            Weekly Recurring Schedule
          </h2>
          <p className="text-xs text-[#637084]">
            Specify standard daily hours and closed windows like lunch. Saved under record ID{' '}
            <span className="font-mono text-xs">{selectedExpertId}</span>.
          </p>
        </div>

        <div className="divide-y divide-[#eeeae4] overflow-hidden rounded-3xl border border-[#e7e2da] bg-white">
          {WEEKDAYS.map(({ day, name, arName, isWeekend }) => {
            const config = weeklySchedule[day] || DEFAULT_WEEKLY_SCHEDULE[day]
            const isEnabled = config?.enabled ?? false
            const breaks = config?.breaks || []

            return (
              <div
                key={day}
                className={`p-5 transition-colors sm:p-6 ${
                  isEnabled ? 'bg-white' : 'bg-[#faf8f5] opacity-75'
                }`}
              >
                <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                  {/* Day Info & Toggle */}
                  <div className="flex items-center gap-4 min-w-[220px]">
                    <button
                      type="button"
                      role="switch"
                      aria-checked={isEnabled}
                      aria-label={`Toggle ${name}`}
                      onClick={() => handleToggleDay(day)}
                      className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none ${
                        isEnabled ? 'bg-[#ef5b4c]' : 'bg-[#d6d0c7]'
                      }`}
                    >
                      <span
                        className={`pointer-events-none inline-block size-5 transform rounded-full bg-white shadow-sm transition duration-200 ${
                          isEnabled ? 'translate-x-5' : 'translate-x-0'
                        }`}
                      />
                    </button>

                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-[#14243b] sm:text-base">{name}</span>
                        <span className="text-xs text-[#8b94a1]">{arName}</span>
                        {isWeekend && (
                          <span className="rounded-full bg-[#fff2ed] px-2 py-0.5 text-[10px] font-bold text-[#ef5b4c]">
                            Weekend
                          </span>
                        )}
                      </div>
                      <span className="text-xs text-[#637084]">
                        {isEnabled ? 'Available for bookings' : 'Closed / Day off'}
                      </span>
                    </div>
                  </div>

                  {/* Hours and Break controls when enabled */}
                  {isEnabled && (
                    <div className="flex flex-1 flex-col gap-3 md:flex-row md:items-center md:justify-end">
                      <div className="flex items-center gap-2 rounded-2xl border border-[#e7e2da] bg-[#fbfaf7] p-2">
                        <span className="text-xs font-semibold text-[#637084]">Hours:</span>
                        <input
                          type="time"
                          value={config.startTime || '09:00'}
                          onChange={(e) => handleTimeChange(day, 'startTime', e.target.value)}
                          className="rounded-lg border border-[#dedbd5] bg-white px-2 py-1 text-xs font-semibold text-[#14243b] outline-none focus:border-[#ef5b4c]"
                        />
                        <span className="text-xs text-[#8b94a1]">to</span>
                        <input
                          type="time"
                          value={config.endTime || '17:00'}
                          onChange={(e) => handleTimeChange(day, 'endTime', e.target.value)}
                          className="rounded-lg border border-[#dedbd5] bg-white px-2 py-1 text-xs font-semibold text-[#14243b] outline-none focus:border-[#ef5b4c]"
                        />
                      </div>

                      <button
                        type="button"
                        onClick={() => handleAddBreak(day)}
                        className="rounded-2xl border border-[#dedbd5] bg-white px-3.5 py-2 text-xs font-bold text-[#14243b] transition hover:border-[#14243b]"
                      >
                        + Add break
                      </button>
                    </div>
                  )}
                </div>

                {/* Breaks List */}
                {isEnabled && breaks.length > 0 && (
                  <div className="mt-4 border-t border-[#f0ece5] pt-3 pl-0 sm:pl-15 space-y-2">
                    <span className="block text-[11px] font-bold uppercase tracking-wider text-[#8b94a1]">
                      Break Windows:
                    </span>
                    <div className="flex flex-wrap gap-2">
                      {breaks.map((b) => (
                        <div
                          key={b.id}
                          className="inline-flex items-center gap-2 rounded-xl border border-[#dedbd5] bg-[#fbfaf7] px-3 py-1.5 text-xs"
                        >
                          <input
                            type="text"
                            placeholder="Label (e.g. Lunch)"
                            value={b.label || ''}
                            onChange={(e) =>
                              handleUpdateBreak(day, b.id, 'label', e.target.value)
                            }
                            className="w-24 border-b border-[#dedbd5] bg-transparent text-xs font-medium text-[#14243b] outline-none focus:border-[#ef5b4c]"
                          />
                          <input
                            type="time"
                            value={b.start}
                            onChange={(e) =>
                              handleUpdateBreak(day, b.id, 'start', e.target.value)
                            }
                            className="rounded border border-[#dedbd5] bg-white px-1.5 py-0.5 text-[11px] font-semibold text-[#14243b]"
                          />
                          <span className="text-[10px] text-[#8b94a1]">to</span>
                          <input
                            type="time"
                            value={b.end}
                            onChange={(e) =>
                              handleUpdateBreak(day, b.id, 'end', e.target.value)
                            }
                            className="rounded border border-[#dedbd5] bg-white px-1.5 py-0.5 text-[11px] font-semibold text-[#14243b]"
                          />
                          <button
                            type="button"
                            onClick={() => handleRemoveBreak(day, b.id)}
                            className="ml-1 text-[11px] font-bold text-[#ef5b4c] hover:underline"
                            title="Remove break"
                          >
                            Remove
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* SECTION 2: Date Overrides (Exceptions) */}
      <div className="space-y-4 pt-6 border-t border-[#e7e2da]">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-xl font-semibold tracking-tight text-[#14243b]">
              Date Overrides & Vacation Exceptions
            </h2>
            <p className="text-xs text-[#637084]">
              Mark specific calendar dates as closed (holidays/travel) or open with custom shift
              hours for {expertName || 'expert'}.
            </p>
          </div>

          <button
            type="button"
            onClick={() => {
              setOverrideDate('')
              setOverrideReason('')
              setOverrideType('closed')
              setOverrideBreaks([])
              setOverrideError(null)
              setIsOverrideModalOpen(true)
            }}
            className="rounded-full border border-[#14243b] bg-white px-5 py-2.5 text-xs font-bold text-[#14243b] transition hover:bg-[#14243b] hover:text-white"
          >
            + Add date override
          </button>
        </div>

        {/* Overrides Table */}
        <div className="overflow-hidden rounded-3xl border border-[#e7e2da] bg-white">
          {overrides.length === 0 ? (
            <div className="py-12 text-center text-sm text-[#637084]">
              <p className="font-semibold text-[#14243b]">No date overrides configured</p>
              <p className="mt-1 text-xs">
                All upcoming calendar days will follow {expertName}&apos;s weekly schedule.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-[#e7e2da] bg-[#fbfaf7] text-xs font-bold uppercase tracking-wider text-[#637084]">
                    <th className="px-6 py-3.5">Date</th>
                    <th className="px-4 py-3.5">Status</th>
                    <th className="px-4 py-3.5">Hours & Breaks</th>
                    <th className="px-4 py-3.5">Reason / Notes</th>
                    <th className="px-6 py-3.5 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#eeeae4]">
                  {overrides.map((o) => (
                    <tr key={o.id || o._id || o.date} className="hover:bg-[#fbfaf7] transition">
                      <td className="px-6 py-4 font-bold text-[#14243b]">{o.date}</td>
                      <td className="px-4 py-4">
                        {o.type === 'closed' ? (
                          <span className="rounded-full bg-rose-50 px-2.5 py-1 text-xs font-bold text-rose-700 ring-1 ring-rose-200">
                            Closed / Day off
                          </span>
                        ) : o.type === 'open' ? (
                          <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-bold text-emerald-700 ring-1 ring-emerald-200">
                            Special open day
                          </span>
                        ) : (
                          <span className="rounded-full bg-sky-50 px-2.5 py-1 text-xs font-bold text-sky-700 ring-1 ring-sky-200">
                            Custom hours
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-4 text-xs text-[#637084]">
                        {o.type === 'closed' ? (
                          'Full day off'
                        ) : (
                          <div>
                            <span className="font-bold text-[#14243b]">
                              {o.startTime} – {o.endTime}
                            </span>
                            {o.breaks && o.breaks.length > 0 && (
                              <div className="mt-0.5 text-[11px] text-[#8b94a1]">
                                Breaks: {o.breaks.map((b) => `${b.start}-${b.end}`).join(', ')}
                              </div>
                            )}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-4 text-xs font-medium text-[#14243b]">
                        {o.reason || '—'}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button
                          type="button"
                          onClick={() => handleDeleteOverride(o.id || o._id || o.date)}
                          className="text-xs font-bold text-[#ef5b4c] hover:underline"
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Modal: Add Date Override */}
      {isOverrideModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-lg rounded-3xl border border-[#e7e2da] bg-white p-6 shadow-2xl sm:p-8">
            <div className="flex items-center justify-between border-b border-[#eeeae4] pb-4">
              <div>
                <h3 className="text-lg font-bold text-[#14243b]">Add Date Override</h3>
                <p className="text-xs text-[#637084]">
                  For {expertName} (ID: {selectedExpertId})
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsOverrideModalOpen(false)}
                className="text-sm font-bold text-[#8b94a1] hover:text-[#14243b]"
              >
                Close
              </button>
            </div>

            <form onSubmit={handleSaveOverride} className="mt-5 space-y-4">
              {overrideError && (
                <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs font-medium text-rose-800">
                  {overrideError}
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-[#14243b]">Select Date</label>
                <input
                  type="date"
                  required
                  value={overrideDate}
                  onChange={(e) => setOverrideDate(e.target.value)}
                  className="mt-1.5 w-full rounded-xl border border-[#dedbd5] bg-[#fbfaf7] px-3.5 py-2.5 text-sm font-medium text-[#14243b] outline-none focus:border-[#ef5b4c]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#14243b]">Override Type</label>
                <select
                  value={overrideType}
                  onChange={(e) => setOverrideType(e.target.value as DateOverrideType)}
                  className="mt-1.5 w-full rounded-xl border border-[#dedbd5] bg-[#fbfaf7] px-3.5 py-2.5 text-sm font-medium text-[#14243b] outline-none focus:border-[#ef5b4c]"
                >
                  <option value="closed">Closed / Entire day off (Holiday, Travel, Sick leave)</option>
                  <option value="open">Special Open Day (e.g. Open on Friday)</option>
                  <option value="custom">Custom Working Hours & Breaks for this date</option>
                </select>
              </div>

              {overrideType !== 'closed' && (
                <div className="grid grid-cols-2 gap-3 rounded-2xl border border-[#dedbd5] bg-[#fbfaf7] p-3">
                  <div>
                    <label className="block text-[11px] font-bold text-[#637084]">Start Time</label>
                    <input
                      type="time"
                      value={overrideStartTime}
                      onChange={(e) => setOverrideStartTime(e.target.value)}
                      className="mt-1 w-full rounded-lg border border-[#dedbd5] bg-white px-2 py-1.5 text-xs font-semibold text-[#14243b]"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-[#637084]">End Time</label>
                    <input
                      type="time"
                      value={overrideEndTime}
                      onChange={(e) => setOverrideEndTime(e.target.value)}
                      className="mt-1 w-full rounded-lg border border-[#dedbd5] bg-white px-2 py-1.5 text-xs font-semibold text-[#14243b]"
                    />
                  </div>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-[#14243b]">Reason / Note</label>
                <input
                  type="text"
                  placeholder="e.g. Annual Vacation, Conference, Extra Weekend Shift"
                  value={overrideReason}
                  onChange={(e) => setOverrideReason(e.target.value)}
                  className="mt-1.5 w-full rounded-xl border border-[#dedbd5] bg-[#fbfaf7] px-3.5 py-2.5 text-sm font-medium text-[#14243b] outline-none focus:border-[#ef5b4c]"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-[#eeeae4]">
                <button
                  type="button"
                  onClick={() => setIsOverrideModalOpen(false)}
                  className="rounded-full px-5 py-2.5 text-xs font-bold text-[#637084] hover:text-[#14243b]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={overrideLoading}
                  className="rounded-full bg-[#14243b] px-6 py-2.5 text-xs font-bold text-white transition hover:bg-[#ef5b4c] disabled:opacity-50"
                >
                  {overrideLoading ? 'Saving...' : 'Save Override'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
