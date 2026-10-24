'use client'

import Link from 'next/link'
import { FormEvent, useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'

function LoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const callbackUrl = searchParams.get('callbackUrl')

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setLoading(true)
    setError('')

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      })
      const data = await res.json()

      if (!data.success) {
        setError(data.error || 'Invalid email or password')
        setLoading(false)
        return
      }

      const target = callbackUrl || data.redirectTo || '/dashboard'
      router.push(target)
      router.refresh()
    } catch {
      setError('An error occurred during login. Please try again.')
      setLoading(false)
    }
  }

  return (
    <div className="rounded-[28px] bg-white p-7 shadow-xl ring-1 ring-[#e7e2da] sm:p-10">
      <Link
        href="/"
        className="inline-flex items-center text-xs font-bold text-[#ef5b4c] hover:underline"
      >
        ← Back to directory
      </Link>

      <h1 className="mt-6 text-3xl font-semibold tracking-[-.05em]">Welcome back.</h1>
      <p className="mt-2 text-xs leading-5 text-[#637084]">
        Sign in to manage your appointments, schedule, or marketplace operations.
      </p>

      {error && (
        <div className="mt-5 rounded-2xl border border-red-200 bg-red-50 p-3.5 text-xs font-semibold text-red-700">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-4">
        <label className="text-xs font-bold text-[#14243b]">
          Email address
          <input
            required
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            className="mt-1.5 w-full rounded-xl border border-[#dedbd5] px-4 py-2.5 text-xs outline-none focus:border-[#ef5b4c]"
          />
        </label>

        <label className="text-xs font-bold text-[#14243b]">
          Password
          <div className="mt-1.5 flex rounded-xl border border-[#dedbd5] focus-within:border-[#ef5b4c]">
            <input
              required
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your password"
              className="w-full rounded-xl px-4 py-2.5 text-xs outline-none"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="px-3.5 text-[11px] font-bold text-[#637084] hover:text-[#14243b]"
            >
              {showPassword ? 'Hide' : 'Show'}
            </button>
          </div>
        </label>

        <button
          type="submit"
          disabled={loading}
          className="mt-2 rounded-full bg-[#14243b] px-5 py-3 text-xs font-bold text-white shadow-sm hover:bg-[#ef5b4c] transition disabled:opacity-50"
        >
          {loading ? 'Signing in...' : 'Sign in'}
        </button>
      </form>

      <div className="mt-6 border-t border-[#f4f2ee] pt-4 text-center">
        <p className="text-xs text-[#637084]">
          New expert or client?{' '}
          <Link href="/signup" className="font-bold text-[#ef5b4c] hover:underline">
            Create an account
          </Link>
        </p>
      </div>
    </div>
  )
}

export default function LoginPage() {
  return (
    <main className="grid min-h-screen place-items-center bg-[#fbfaf7] px-5 text-[#14243b]">
      <div className="w-full max-w-md py-12">
        <Link href="/" className="mb-8 flex items-center gap-2.5 text-[22px] font-bold tracking-tight">
          <span className="grid size-8 place-items-center rounded-[10px] bg-[#ef5b4c] text-sm font-black text-white">
            B
          </span>
          Bok Bok
        </Link>
        <Suspense fallback={<div className="p-8 text-center text-xs text-[#8b94a1]">Loading...</div>}>
          <LoginForm />
        </Suspense>
      </div>
    </main>
  )
}
