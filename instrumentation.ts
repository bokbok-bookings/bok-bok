export async function register() {
  // Only compile and run background worker in production so `npm run dev` boots in seconds
  // without compiling the entire backend scheduler/DB graph during `/instrumentation` startup.
  if (process.env.NODE_ENV === 'production' && process.env.NEXT_RUNTIME === 'nodejs') {
    setTimeout(async () => {
      try {
        const { processAutomatedReminders } = await import('@/lib/email/scheduler')
        const { ensureDbIndexes } = await import('@/lib/db')

        ensureDbIndexes().catch((err) => console.warn('[DB] Index init warning:', err))

        processAutomatedReminders().catch((err) =>
          console.error('[Scheduler Startup Error]', err?.message || err)
        )

        const FOURTEEN_MINUTES_MS = 14 * 60 * 1000
        setInterval(() => {
          processAutomatedReminders().catch((err) =>
            console.error('[Scheduler Interval Error]', err?.message || err)
          )
        }, FOURTEEN_MINUTES_MS)

        console.log('[Scheduler] Bok Bok background notification engine initialized (14-minute tick).')
      } catch (err: any) {
        console.error('[Scheduler Init Error]', err?.message || err)
      }
    }, 10000)
  }
}

