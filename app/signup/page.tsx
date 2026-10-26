'use client'

import Link from 'next/link'
import { BrandLogo } from '@/components/brand/logo'
import { BokBok } from '@/components/brand/bok-bok'
import { FormEvent, useState } from 'react'
import { useRouter } from 'next/navigation'

export default function SignupPage() {
  const router = useRouter()
  const [displayName, setDisplayName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [role, setRole] = useState<'expert' | 'client'>('expert')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setLoading(true)
    setError('')

    try {
      const res = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ displayName, email, password, role }),
      })
      const data = await res.json()

      if (!data.success) {
        setError(data.error || 'Failed to create account')
        setLoading(false)
        return
      }

      router.push(data.redirectTo || '/dashboard')
      router.refresh()
    } catch {
      setError('An error occurred during account creation. Please try again.')
      setLoading(false)
    }
  }

  return (
    <main className="grid min-h-screen place-items-center bg-[#fbfaf7] px-5 text-[#14243b]">
      <div className="w-full max-w-md py-12">
        <div className="mb-8">
          <BrandLogo href="/" />
        </div>

        <div className="rounded-[28px] bg-white p-7 shadow-xl ring-1 ring-[#e7e2da] sm:p-10">
          <Link
            href="/"
            className="inline-flex items-center text-xs font-bold text-[#ef5b4c] hover:underline"
          >
            ← Back to directory
          </Link>

          <h1 className="mt-6 text-3xl font-semibold tracking-[-.05em]">
            Join <BokBok />.
          </h1>
          <p className="mt-2 text-xs leading-5 text-[#637084]">
            Create your account to start offering sessions or booking top advisors.
          </p>

          {error && (
            <div className="mt-5 rounded-2xl border border-red-200 bg-red-50 p-3.5 text-xs font-semibold text-red-700">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-4">
            {/* Account Role Selector */}
            <div>
              <p className="text-xs font-bold text-[#14243b] mb-2">I am joining as:</p>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setRole('expert')}
                  className={`rounded-2xl border p-3 text-left transition ${role === 'expert'
                      ? 'border-[#14243b] bg-[#14243b] text-white'
                      : 'border-[#dedbd5] bg-[#faf8f5] text-[#637084] hover:border-[#14243b]'
                    }`}
                >
                  <p className="text-xs font-bold">Expert</p>
                  <p className="mt-0.5 text-[10px] opacity-80">Offer sessions & manage time</p>
                </button>
                <button
                  type="button"
                  onClick={() => setRole('client')}
                  className={`rounded-2xl border p-3 text-left transition ${role === 'client'
                      ? 'border-[#14243b] bg-[#14243b] text-white'
                      : 'border-[#dedbd5] bg-[#faf8f5] text-[#637084] hover:border-[#14243b]'
                    }`}
                >
                  <p className="text-xs font-bold">Client</p>
                  <p className="mt-0.5 text-[10px] opacity-80">Book appointments</p>
                </button>
              </div>
            </div>

            <label className="text-xs font-bold text-[#14243b]">
              Full name
              <input
                required
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="e.g. Layla Hassan"
                className="mt-1.5 w-full rounded-xl border border-[#dedbd5] px-4 py-2.5 text-xs outline-none focus:border-[#ef5b4c]"
              />
            </label>

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
              <input
                required
                type="password"
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="At least 6 characters"
                className="mt-1.5 w-full rounded-xl border border-[#dedbd5] px-4 py-2.5 text-xs outline-none focus:border-[#ef5b4c]"
              />
            </label>

            <button
              type="submit"
              disabled={loading}
              className="mt-2 rounded-full bg-[#ef5b4c] px-5 py-3 text-xs font-bold text-white shadow-sm hover:bg-[#14243b] transition disabled:opacity-50"
            >
              {loading
                ? 'Creating account...'
                : role === 'expert'
                  ? 'Create Expert Account →'
                  : 'Create Client Account'}
            </button>
          </form>

          <div className="mt-6 border-t border-[#f4f2ee] pt-4 text-center">
            <p className="text-xs text-[#637084]">
              Already a member?{' '}
              <Link href="/login" className="font-bold text-[#ef5b4c] hover:underline">
                Sign in
              </Link>
            </p>
          </div>
        </div>
      </div>
    </main>
  )
}
