const assert = require('node:assert/strict')

// 1. Timezone Bounds Logic
function computeSessionBounds(dateStr, timeStr, durationMinutes, timeZone = 'Africa/Cairo') {
  const [year, month, day] = dateStr.split('-').map(Number)
  const [hours, minutes] = timeStr.split(':').map(Number)

  const dt = new Date(Date.UTC(year, month - 1, day, hours, minutes, 0))
  const invDate = new Date(dt.toLocaleString('en-US', { timeZone: 'UTC' }))
  const targetDate = new Date(dt.toLocaleString('en-US', { timeZone }))
  const diffMs = invDate.getTime() - targetDate.getTime()

  const sessionStartAt = new Date(dt.getTime() + diffMs)
  const sessionEndAt = new Date(sessionStartAt.getTime() + Math.max(15, durationMinutes) * 60 * 1000)

  return { sessionStartAt, sessionEndAt }
}

// 2. Attendance Status Matrix Logic
function resolveAttendanceStatus(expertResponse, clientResponse, isDeadlineExpired = false) {
  if (expertResponse && clientResponse) {
    if (expertResponse === 'attended' && clientResponse === 'attended') return 'completed'
    if (expertResponse === 'absent' && clientResponse === 'absent') return 'both_absent'
    return 'disputed'
  }
  if (isDeadlineExpired) {
    if (expertResponse === 'attended' && !clientResponse) return 'completed'
    if (expertResponse === 'absent' && !clientResponse) return 'client_absent'
    if (clientResponse === 'attended' && !expertResponse) return 'completed'
    if (clientResponse === 'absent' && !expertResponse) return 'expert_absent'
  }
  return 'pending'
}

console.log('--- TEST 1: Session Bounds & Timezone ---')
const { sessionStartAt, sessionEndAt } = computeSessionBounds('2026-11-10', '14:30', 45, 'Africa/Cairo')
assert.ok(sessionStartAt instanceof Date)
assert.ok(sessionEndAt instanceof Date)
const diffMins = (sessionEndAt.getTime() - sessionStartAt.getTime()) / (60 * 1000)
assert.equal(diffMins, 45)
const cairoFmt = new Intl.DateTimeFormat('en-GB', {
  timeZone: 'Africa/Cairo',
  hour: '2-digit', minute: '2-digit', hour12: false
}).format(sessionStartAt)
assert.equal(cairoFmt, '14:30')
console.log('✓ Session bounds and Cairo timezone conversion verified.')

console.log('--- TEST 2: Rescheduling Deadline Calculation ---')
const deadlineHours = 24
const deadlineMs = sessionStartAt.getTime() - deadlineHours * 60 * 60 * 1000
const deadline = new Date(deadlineMs)
// Client submits 26h before session -> Allowed
const allowedTime = new Date(sessionStartAt.getTime() - 26 * 60 * 60 * 1000)
assert.equal(allowedTime < deadline, true)
// Client submits 20h before session -> Disallowed
const disallowedTime = new Date(sessionStartAt.getTime() - 20 * 60 * 60 * 1000)
assert.equal(disallowedTime < deadline, false)
console.log('✓ Rescheduling deadline formula verified (SessionStart - ConfiguredHours).')

console.log('--- TEST 3: Attendance Verification Matrix ---')
assert.equal(resolveAttendanceStatus('attended', 'attended', false), 'completed')
assert.equal(resolveAttendanceStatus('absent', 'absent', false), 'both_absent')
assert.equal(resolveAttendanceStatus('attended', 'absent', false), 'disputed')
assert.equal(resolveAttendanceStatus('absent', 'attended', false), 'disputed')
assert.equal(resolveAttendanceStatus('attended', undefined, false), 'pending')
assert.equal(resolveAttendanceStatus(undefined, 'attended', false), 'pending')
assert.equal(resolveAttendanceStatus('attended', undefined, true), 'completed')
assert.equal(resolveAttendanceStatus('absent', undefined, true), 'client_absent')
assert.equal(resolveAttendanceStatus(undefined, 'absent', true), 'expert_absent')
console.log('✓ Attendance status resolution matrix verified.')

console.log('--- ALL AUTOMATED VERIFICATION CHECKS PASSED ---')

