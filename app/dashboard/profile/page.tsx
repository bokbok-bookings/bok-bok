'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import { CATEGORIES } from '@/lib/data/categories'

export default function ExpertProfilePage() {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [uploadingImage, setUploadingImage] = useState(false)
  const [message, setMessage] = useState('')

  const [profile, setProfile] = useState<any>(null)
  const [name, setName] = useState('')
  const [role, setRole] = useState('')
  const [location, setLocation] = useState('')
  const [categorySlug, setCategorySlug] = useState('marketing-growth')
  const [subcategorySlug, setSubcategorySlug] = useState('')
  const [bio, setBio] = useState('')
  const [about, setAbout] = useState('')
  const [tagsStr, setTagsStr] = useState('')
  const [image, setImage] = useState('')
  const [instapayUsername, setInstapayUsername] = useState('')
  const [categoriesList, setCategoriesList] = useState<any[]>(CATEGORIES)

  const selectedCategory =
    categoriesList.find((c) => c.slug === categorySlug) || categoriesList[0] || CATEGORIES[0]

  useEffect(() => {
    fetch('/api/categories')
      .then((res) => res.json())
      .then((json) => {
        if (json.success && Array.isArray(json.data) && json.data.length > 0) {
          const normalized = json.data.map((c: any) => ({
            ...c,
            title: c.name || c.title,
            subcategories: (c.subcategories || []).map((s: any) => ({
              ...s,
              title: s.name || s.title,
            })),
          }))
          setCategoriesList(normalized)
        }
      })
      .catch((err) => console.error('Failed to load categories:', err))

    fetch('/api/dashboard/profile')
      .then((res) => res.json())
      .then((json) => {
        if (json.success && json.data) {
          const d = json.data
          setProfile(d)
          setName(d.name || '')
          setRole(d.role || '')
          setLocation(d.location || '')
          setCategorySlug(d.categorySlug || 'marketing')
          setSubcategorySlug(d.subcategorySlug || '')
          setBio(d.bio || '')
          setAbout(d.about || '')
          setTagsStr(d.tags?.join(', ') || '')
          setImage(d.image || '')
          setInstapayUsername(d.instapayUsername || '')
        }
      })
      .finally(() => setLoading(false))
  }, [])

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setUploadingImage(true)
    setMessage('')
    try {
      const formData = new FormData()
      formData.append('file', file)

      const res = await fetch('/api/upload?type=avatar', {
        method: 'POST',
        body: formData,
      })
      const json = await res.json()
      if (json.success && json.url) {
        setImage(json.url)
        setMessage('Photo uploaded. Save profile to apply changes.')
      } else {
        alert(json.error || 'Failed to upload photo')
      }
    } catch (err: any) {
      alert(err.message || 'Error uploading photo')
    } finally {
      setUploadingImage(false)
    }
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setMessage('')
    try {
      const res = await fetch('/api/dashboard/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          role,
          location,
          categorySlug,
          subcategorySlug,
          bio,
          about,
          tags: tagsStr
            .split(',')
            .map((t) => t.trim())
            .filter(Boolean),
          image,
          instapayUsername,
        }),
      })
      const json = await res.json()
      if (json.success) {
        setMessage('Profile updated successfully!')
      } else {
        alert(json.error || 'Failed to update profile')
      }
    } catch (err: any) {
      alert(err.message || 'Error updating profile')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return <div className="p-12 text-center text-xs text-[#8b94a1]">Loading profile...</div>
  }

  return (
    <div className="max-w-3xl space-y-6">
      <div className="flex items-center justify-between border-b border-[#eeeae4] pb-5">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[#14243b]">Public Profile</h1>
          <p className="text-xs text-[#637084] mt-0.5">
            Manage how clients see you across the Bok Bok directory.
          </p>
        </div>
        {profile?.slug && (
          <Link
            href={`/experts/${profile.slug}`}
            target="_blank"
            className="rounded-full border border-[#dedbd5] bg-white px-4 py-2 text-xs font-bold text-[#14243b] hover:border-[#14243b]"
          >
            Preview Profile ↗
          </Link>
        )}
      </div>

      {message && (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-xs font-semibold text-emerald-800">
          {message}
        </div>
      )}

      <form onSubmit={handleSave} className="rounded-3xl border border-[#e7e2da] bg-white p-6 sm:p-8 shadow-sm space-y-5">
        {/* Photo Upload */}
        <div className="flex items-center gap-5 border-b border-[#f4f2ee] pb-6">
          <div className="relative size-20 overflow-hidden rounded-full border border-[#eeeae4] bg-[#faf8f5]">
            {image ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={image} alt="Profile" className="size-full object-cover" />
            ) : (
              <div className="grid size-full place-items-center text-xs font-black text-[#8b94a1]">
                PHOTO
              </div>
            )}
          </div>
          <div>
            <label className="inline-block cursor-pointer rounded-full border border-[#dedbd5] bg-white px-4 py-2 text-xs font-bold text-[#14243b] hover:border-[#14243b]">
              {uploadingImage ? 'Uploading...' : 'Change Profile Photo'}
              <input
                type="file"
                accept="image/*"
                onChange={handleImageUpload}
                disabled={uploadingImage}
                className="hidden"
              />
            </label>
            <p className="mt-1 text-[11px] text-[#8b94a1]">JPG, PNG or WebP under 5MB</p>
          </div>
        </div>

        {/* Basic Fields */}
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="text-xs font-bold text-[#14243b]">
            Full Name *
            <input
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="mt-1.5 w-full rounded-xl border border-[#dedbd5] px-3.5 py-2.5 text-xs outline-none focus:border-[#ef5b4c]"
            />
          </label>
          <label className="text-xs font-bold text-[#14243b]">
            Professional Headline *
            <input
              required
              value={role}
              onChange={(e) => setRole(e.target.value)}
              placeholder="e.g. Product Strategy Consultant"
              className="mt-1.5 w-full rounded-xl border border-[#dedbd5] px-3.5 py-2.5 text-xs outline-none focus:border-[#ef5b4c]"
            />
          </label>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <label className="text-xs font-bold text-[#14243b]">
            Location
            <input
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="e.g. Cairo, Egypt or Remote"
              className="mt-1.5 w-full rounded-xl border border-[#dedbd5] px-3.5 py-2.5 text-xs outline-none focus:border-[#ef5b4c]"
            />
          </label>
          <label className="text-xs font-bold text-[#14243b]">
            InstaPay Address / Phone for Direct Transfers
            <input
              value={instapayUsername}
              onChange={(e) => setInstapayUsername(e.target.value)}
              placeholder="e.g. yourname@instapay or 010xxxxxxxx"
              className="mt-1.5 w-full rounded-xl border border-[#dedbd5] px-3.5 py-2.5 text-xs outline-none focus:border-[#ef5b4c]"
            />
          </label>
        </div>

        {/* Category & Subcategory */}
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="text-xs font-bold text-[#14243b]">
            Primary Category
            <select
              value={categorySlug}
              onChange={(e) => {
                setCategorySlug(e.target.value)
                const cat = categoriesList.find((c) => c.slug === e.target.value)
                setSubcategorySlug(cat?.subcategories?.[0]?.slug || '')
              }}
              className="mt-1.5 w-full rounded-xl border border-[#dedbd5] bg-white px-3.5 py-2.5 text-xs outline-none focus:border-[#ef5b4c]"
            >
              {categoriesList.map((c) => (
                <option key={c.slug} value={c.slug}>
                  {c.title?.en || c.name?.en} — {c.title?.ar || c.name?.ar}
                </option>
              ))}
            </select>
          </label>
          <label className="text-xs font-bold text-[#14243b]">
            Subcategory
            <select
              value={subcategorySlug}
              onChange={(e) => setSubcategorySlug(e.target.value)}
              className="mt-1.5 w-full rounded-xl border border-[#dedbd5] bg-white px-3.5 py-2.5 text-xs outline-none focus:border-[#ef5b4c]"
            >
              {(selectedCategory?.subcategories || []).map((sub: any) => (
                <option key={sub.slug} value={sub.slug}>
                  {sub.title?.en || sub.name?.en} — {sub.title?.ar || sub.name?.ar}
                </option>
              ))}
            </select>
          </label>
        </div>

        {/* Short Bio */}
        <label className="block text-xs font-bold text-[#14243b]">
          Short Bio (Card snippet)
          <input
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            placeholder="1 sentence summary shown on directory cards"
            className="mt-1.5 w-full rounded-xl border border-[#dedbd5] px-3.5 py-2.5 text-xs outline-none focus:border-[#ef5b4c]"
          />
        </label>

        {/* In-depth About */}
        <label className="block text-xs font-bold text-[#14243b]">
          Detailed About Section
          <textarea
            rows={4}
            value={about}
            onChange={(e) => setAbout(e.target.value)}
            placeholder="Share your background, achievements, and session approach..."
            className="mt-1.5 w-full rounded-xl border border-[#dedbd5] px-3.5 py-2.5 text-xs outline-none focus:border-[#ef5b4c]"
          />
        </label>

        {/* Tags */}
        <label className="block text-xs font-bold text-[#14243b]">
          Specialty Tags (Comma separated)
          <input
            value={tagsStr}
            onChange={(e) => setTagsStr(e.target.value)}
            placeholder="e.g. Marketing, Growth, Brand, Content"
            className="mt-1.5 w-full rounded-xl border border-[#dedbd5] px-3.5 py-2.5 text-xs outline-none focus:border-[#ef5b4c]"
          />
        </label>

        <div className="flex items-center justify-end border-t border-[#f4f2ee] pt-4">
          <button
            type="submit"
            disabled={saving}
            className="rounded-full bg-[#ef5b4c] px-6 py-2.5 text-xs font-bold text-white shadow-sm hover:bg-[#14243b] disabled:opacity-50"
          >
            {saving ? 'Saving changes...' : 'Save Profile Changes'}
          </button>
        </div>
      </form>
    </div>
  )
}
