'use client'

import React from 'react'
import { AttendanceManager } from '@/components/dashboard/attendance-manager'

export default function AdminAttendancePage() {
  return (
    <div className="space-y-6">
      <div className="border-b border-[#eeeae4] pb-5">
        <span className="text-[10px] font-black uppercase tracking-wider text-primary">
          Session Quality &amp; Resolution
        </span>
        <h1 className="mt-0.5 text-3xl font-semibold tracking-tight text-[#14243b]">
          Attendance &amp; Disputes
        </h1>
        <p className="text-xs text-[#637084] mt-0.5">
          Monitor post-session attendance reports, resolve conflicting reports, and configure reminder windows.
        </p>
      </div>

      <div className="rounded-3xl border border-[#e7e2da] bg-white p-6 shadow-xs">
        <AttendanceManager />
      </div>
    </div>
  )
}

