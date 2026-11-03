export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    // Start background email & reminder worker every 60 seconds
    const { processAutomatedReminders } = await import('@/lib/email/scheduler')
    const { ensureDbIndexes } = await import('@/lib/db')

    // Initialize indexes on start
    ensureDbIndexes().catch((err) => console.warn('[DB] Index init warning:', err))

    // Run first reminder pass after short startup delay
    setTimeout(() => {
      processAutomatedReminders().catch((err) =>
        console.error('[Scheduler Startup Error]', err?.message || err)
      )
    }, 10000)

    // Recurring 14-minute cycle (840,000 ms)
    const FOURTEEN_MINUTES_MS = 14 * 60 * 1000
    setInterval(() => {
      processAutomatedReminders().catch((err) =>
        console.error('[Scheduler Interval Error]', err?.message || err)
      )
    }, FOURTEEN_MINUTES_MS)

    console.log('[Scheduler] Bok Bok background notification engine initialized (14-minute tick).')
  }
}

