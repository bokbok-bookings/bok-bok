'use client'

import React, { useState, useEffect, useMemo } from 'react'
import {
  FolderTree,
  Plus,
  Search,
  Check,
  X,
  Edit2,
  Trash2,
  Layers,
  ArrowRight,
  AlertCircle,
  Eye,
  EyeOff,
  ChevronRight,
  ArrowLeft,
  Sparkles,
  RefreshCw,
} from 'lucide-react'

export interface SubcategoryItem {
  _id: string
  id: string
  categoryId: string
  name: { en: string; ar: string }
  slug: string
  description?: { en?: string; ar?: string }
  isActive: boolean
  sortOrder: number
  createdAt?: string
  updatedAt?: string
}

export interface CategoryItem {
  _id: string
  id: string
  name: { en: string; ar: string }
  slug: string
  description?: { en?: string; ar?: string }
  isActive: boolean
  sortOrder: number
  subcategoriesCount?: number
  activeSubcategoriesCount?: number
  subcategories?: SubcategoryItem[]
  createdAt?: string
  updatedAt?: string
}

export function CategoriesManager() {
  const [categories, setCategories] = useState<CategoryItem[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all')
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  // Subcategory Drawer/Detail View
  const [selectedCategory, setSelectedCategory] = useState<CategoryItem | null>(null)
  const [subcategories, setSubcategories] = useState<SubcategoryItem[]>([])
  const [loadingSubs, setLoadingSubs] = useState(false)
  const [subSearch, setSubSearch] = useState('')
  const [subStatusFilter, setSubStatusFilter] = useState<'all' | 'active' | 'inactive'>('all')

  // Category Modal State
  const [categoryModalOpen, setCategoryModalOpen] = useState(false)
  const [editingCategory, setEditingCategory] = useState<CategoryItem | null>(null)
  const [catNameEn, setCatNameEn] = useState('')
  const [catNameAr, setCatNameAr] = useState('')
  const [catSlug, setCatSlug] = useState('')
  const [catSlugManuallyEdited, setCatSlugManuallyEdited] = useState(false)
  const [catDescEn, setCatDescEn] = useState('')
  const [catDescAr, setCatDescAr] = useState('')
  const [catIsActive, setCatIsActive] = useState(true)
  const [catSortOrder, setCatSortOrder] = useState<number>(1)
  const [savingCategory, setSavingCategory] = useState(false)

  // Subcategory Modal State
  const [subcategoryModalOpen, setSubcategoryModalOpen] = useState(false)
  const [editingSubcategory, setEditingSubcategory] = useState<SubcategoryItem | null>(null)
  const [subParentCatId, setSubParentCatId] = useState('')
  const [subNameEn, setSubNameEn] = useState('')
  const [subNameAr, setSubNameAr] = useState('')
  const [subSlug, setSubSlug] = useState('')
  const [subSlugManuallyEdited, setSubSlugManuallyEdited] = useState(false)
  const [subDescEn, setSubDescEn] = useState('')
  const [subDescAr, setSubDescAr] = useState('')
  const [subIsActive, setSubIsActive] = useState(true)
  const [subSortOrder, setSubSortOrder] = useState<number>(1)
  const [savingSubcategory, setSavingSubcategory] = useState(false)

  // Utility to generate URL-safe slugs
  const slugify = (text: string) => {
    return text
      .toLowerCase()
      .trim()
      .replace(/\s+/g, '-')
      .replace(/[^\w\-]+/g, '')
      .replace(/\-\-+/g, '-')
      .replace(/^-+/, '')
      .replace(/-+$/, '')
  }

  const showFeedback = (type: 'success' | 'error', text: string) => {
    setFeedback({ type, text })
    setTimeout(() => setFeedback(null), 6000)
  }

  // Load Categories
  const loadCategories = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/admin/categories')
      const json = await res.json()
      if (json.success) {
        setCategories(json.data || [])
        // If viewing subcategories, refresh current selection
        if (selectedCategory) {
          const updated = json.data.find((c: CategoryItem) => c._id === selectedCategory._id)
          if (updated) setSelectedCategory(updated)
        }
      } else {
        showFeedback('error', json.error || 'Failed to load categories')
      }
    } catch (err: any) {
      showFeedback('error', err.message || 'Error connecting to server')
    } finally {
      setLoading(false)
    }
  }

  // Load Subcategories for Selected Category
  const loadSubcategories = async (categoryId: string) => {
    setLoadingSubs(true)
    try {
      const res = await fetch(`/api/admin/subcategories?categoryId=${categoryId}`)
      const json = await res.json()
      if (json.success) {
        setSubcategories(json.data || [])
      } else {
        showFeedback('error', json.error || 'Failed to load subcategories')
      }
    } catch (err: any) {
      showFeedback('error', err.message || 'Error loading subcategories')
    } finally {
      setLoadingSubs(false)
    }
  }

  useEffect(() => {
    loadCategories()
  }, [])

  useEffect(() => {
    if (selectedCategory) {
      loadSubcategories(selectedCategory._id)
    } else {
      setSubcategories([])
    }
  }, [selectedCategory?._id])

  // Open Category Create Modal
  const openCreateCategory = () => {
    setEditingCategory(null)
    setCatNameEn('')
    setCatNameAr('')
    setCatSlug('')
    setCatSlugManuallyEdited(false)
    setCatDescEn('')
    setCatDescAr('')
    setCatIsActive(true)
    setCatSortOrder(categories.length + 1)
    setCategoryModalOpen(true)
  }

  // Open Category Edit Modal
  const openEditCategory = (cat: CategoryItem) => {
    setEditingCategory(cat)
    setCatNameEn(cat.name.en || '')
    setCatNameAr(cat.name.ar || '')
    setCatSlug(cat.slug || '')
    setCatSlugManuallyEdited(true)
    setCatDescEn(cat.description?.en || '')
    setCatDescAr(cat.description?.ar || '')
    setCatIsActive(cat.isActive)
    setCatSortOrder(cat.sortOrder || 1)
    setCategoryModalOpen(true)
  }

  // Save Category (Create or Edit)
  const handleSaveCategory = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!catNameEn.trim() || !catNameAr.trim()) {
      alert('Please provide category names in both English and Arabic.')
      return
    }

    setSavingCategory(true)
    try {
      const isEdit = Boolean(editingCategory)
      const url = '/api/admin/categories'
      const method = isEdit ? 'PATCH' : 'POST'

      const payload: any = {
        name: { en: catNameEn.trim(), ar: catNameAr.trim() },
        slug: catSlug.trim() || slugify(catNameEn),
        description: { en: catDescEn.trim(), ar: catDescAr.trim() },
        isActive: catIsActive,
        sortOrder: Number(catSortOrder) || 1,
      }

      if (isEdit) {
        payload.id = editingCategory!._id
      }

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      const json = await res.json()
      if (json.success) {
        showFeedback(
          'success',
          isEdit ? `Category "${catNameEn}" updated successfully.` : `Category "${catNameEn}" created successfully.`
        )
        setCategoryModalOpen(false)
        await loadCategories()
      } else {
        alert(json.error || 'Failed to save category')
      }
    } catch (err: any) {
      alert(err.message || 'Error occurred while saving category')
    } finally {
      setSavingCategory(false)
    }
  }

  // Toggle Category Status (Active / Inactive)
  const handleToggleCategoryStatus = async (cat: CategoryItem) => {
    const nextStatus = !cat.isActive
    try {
      const res = await fetch('/api/admin/categories', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: cat._id,
          isActive: nextStatus,
        }),
      })
      const json = await res.json()
      if (json.success) {
        showFeedback(
          'success',
          `Category "${cat.name.en}" is now ${nextStatus ? 'Active' : 'Inactive (hidden from public listings & services)'}.`
        )
        // Optimistically update
        setCategories((prev) =>
          prev.map((c) => (c._id === cat._id ? { ...c, isActive: nextStatus } : c))
        )
        if (selectedCategory?._id === cat._id) {
          setSelectedCategory((prev) => (prev ? { ...prev, isActive: nextStatus } : null))
        }
      } else {
        alert(json.error || 'Failed to update category status')
      }
    } catch (err: any) {
      alert(err.message || 'Error updating status')
    }
  }

  // Delete Category
  const handleDeleteCategory = async (cat: CategoryItem) => {
    if (
      !confirm(
        `Are you sure you want to delete "${cat.name.en}"?\n\nSafety check: You cannot delete a category if it still has subcategories or linked services. Inactivation is recommended.`
      )
    ) {
      return
    }

    try {
      const res = await fetch(`/api/admin/categories?id=${cat._id}`, {
        method: 'DELETE',
      })
      const json = await res.json()
      if (json.success) {
        showFeedback('success', json.message || `Category "${cat.name.en}" deleted.`)
        if (selectedCategory?._id === cat._id) {
          setSelectedCategory(null)
        }
        await loadCategories()
      } else {
        alert(json.error || 'Failed to delete category')
      }
    } catch (err: any) {
      alert(err.message || 'Error deleting category')
    }
  }

  // Open Subcategory Create Modal
  const openCreateSubcategory = () => {
    if (!selectedCategory) return
    setEditingSubcategory(null)
    setSubParentCatId(selectedCategory._id)
    setSubNameEn('')
    setSubNameAr('')
    setSubSlug('')
    setSubSlugManuallyEdited(false)
    setSubDescEn('')
    setSubDescAr('')
    setSubIsActive(true)
    setSubSortOrder(subcategories.length + 1)
    setSubcategoryModalOpen(true)
  }

  // Open Subcategory Edit Modal
  const openEditSubcategory = (sub: SubcategoryItem) => {
    setEditingSubcategory(sub)
    setSubParentCatId(sub.categoryId)
    setSubNameEn(sub.name.en || '')
    setSubNameAr(sub.name.ar || '')
    setSubSlug(sub.slug || '')
    setSubSlugManuallyEdited(true)
    setSubDescEn(sub.description?.en || '')
    setSubDescAr(sub.description?.ar || '')
    setSubIsActive(sub.isActive)
    setSubSortOrder(sub.sortOrder || 1)
    setSubcategoryModalOpen(true)
  }

  // Save Subcategory (Create or Edit)
  const handleSaveSubcategory = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!subNameEn.trim() || !subNameAr.trim()) {
      alert('Please provide subcategory names in both English and Arabic.')
      return
    }

    setSavingSubcategory(true)
    try {
      const isEdit = Boolean(editingSubcategory)
      const url = '/api/admin/subcategories'
      const method = isEdit ? 'PATCH' : 'POST'

      const payload: any = {
        categoryId: subParentCatId,
        name: { en: subNameEn.trim(), ar: subNameAr.trim() },
        slug: subSlug.trim() || slugify(subNameEn),
        description: { en: subDescEn.trim(), ar: subDescAr.trim() },
        isActive: subIsActive,
        sortOrder: Number(subSortOrder) || 1,
      }

      if (isEdit) {
        payload.id = editingSubcategory!._id
      }

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      const json = await res.json()
      if (json.success) {
        showFeedback(
          'success',
          isEdit ? `Subcategory "${subNameEn}" updated.` : `Subcategory "${subNameEn}" created.`
        )
        setSubcategoryModalOpen(false)
        await loadSubcategories(selectedCategory!._id)
        await loadCategories()
      } else {
        alert(json.error || 'Failed to save subcategory')
      }
    } catch (err: any) {
      alert(err.message || 'Error occurred while saving subcategory')
    } finally {
      setSavingSubcategory(false)
    }
  }

  // Toggle Subcategory Status
  const handleToggleSubcategoryStatus = async (sub: SubcategoryItem) => {
    const nextStatus = !sub.isActive
    try {
      const res = await fetch('/api/admin/subcategories', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: sub._id,
          isActive: nextStatus,
        }),
      })
      const json = await res.json()
      if (json.success) {
        showFeedback('success', `Subcategory "${sub.name.en}" is now ${nextStatus ? 'Active' : 'Inactive'}.`)
        setSubcategories((prev) =>
          prev.map((s) => (s._id === sub._id ? { ...s, isActive: nextStatus } : s))
        )
        await loadCategories()
      } else {
        alert(json.error || 'Failed to update subcategory status')
      }
    } catch (err: any) {
      alert(err.message || 'Error updating status')
    }
  }

  // Delete Subcategory
  const handleDeleteSubcategory = async (sub: SubcategoryItem) => {
    if (
      !confirm(
        `Are you sure you want to delete subcategory "${sub.name.en}"?\n\nSafety check: You cannot delete a subcategory if it is currently linked to existing services or expert profiles.`
      )
    ) {
      return
    }

    try {
      const res = await fetch(`/api/admin/subcategories?id=${sub._id}`, {
        method: 'DELETE',
      })
      const json = await res.json()
      if (json.success) {
        showFeedback('success', json.message || `Subcategory "${sub.name.en}" deleted.`)
        await loadSubcategories(selectedCategory!._id)
        await loadCategories()
      } else {
        alert(json.error || 'Failed to delete subcategory')
      }
    } catch (err: any) {
      alert(err.message || 'Error deleting subcategory')
    }
  }

  // Filter Categories
  const filteredCategories = useMemo(() => {
    return categories.filter((cat) => {
      const matchesSearch =
        !search.trim() ||
        cat.name.en.toLowerCase().includes(search.toLowerCase()) ||
        cat.name.ar.includes(search) ||
        cat.slug.toLowerCase().includes(search.toLowerCase()) ||
        (cat.description?.en && cat.description.en.toLowerCase().includes(search.toLowerCase())) ||
        (cat.description?.ar && cat.description.ar.includes(search))

      const matchesStatus =
        statusFilter === 'all' ||
        (statusFilter === 'active' && cat.isActive) ||
        (statusFilter === 'inactive' && !cat.isActive)

      return matchesSearch && matchesStatus
    })
  }, [categories, search, statusFilter])

  // Filter Subcategories
  const filteredSubcategories = useMemo(() => {
    return subcategories.filter((sub) => {
      const matchesSearch =
        !subSearch.trim() ||
        sub.name.en.toLowerCase().includes(subSearch.toLowerCase()) ||
        sub.name.ar.includes(subSearch) ||
        sub.slug.toLowerCase().includes(subSearch.toLowerCase())

      const matchesStatus =
        subStatusFilter === 'all' ||
        (subStatusFilter === 'active' && sub.isActive) ||
        (subStatusFilter === 'inactive' && !sub.isActive)

      return matchesSearch && matchesStatus
    })
  }, [subcategories, subSearch, subStatusFilter])

  // Calculate Statistics
  const totalSubcategoriesCount = useMemo(() => {
    return categories.reduce((acc, cat) => acc + (cat.subcategoriesCount || 0), 0)
  }, [categories])

  const activeCategoriesCount = useMemo(() => {
    return categories.filter((c) => c.isActive).length
  }, [categories])

  return (
    <div className="space-y-6">
      {/* Toast Feedback */}
      {feedback && (
        <div
          className={`flex items-center gap-2 rounded-xl p-4 text-xs font-semibold ${
            feedback.type === 'success'
              ? 'border border-emerald-500/30 bg-emerald-500/10 text-emerald-300'
              : 'border border-rose-500/30 bg-rose-500/10 text-rose-300'
          }`}
        >
          <AlertCircle size={16} />
          <span>{feedback.text}</span>
          <button onClick={() => setFeedback(null)} className="ml-auto text-white/50 hover:text-white">
            <X size={14} />
          </button>
        </div>
      )}

      {/* VIEW 1: Subcategories Manager Detail View */}
      {selectedCategory ? (
        <div className="space-y-6 animate-in fade-in duration-200">
          {/* Header & Back Breadcrumb */}
          <div className="rounded-2xl border border-slate-800 bg-[#121d2f] p-5 sm:p-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <button
                  onClick={() => setSelectedCategory(null)}
                  className="mb-2 inline-flex items-center gap-1.5 text-xs font-bold text-slate-400 hover:text-white transition"
                >
                  <ArrowLeft size={14} /> Back to all categories
                </button>
                <div className="flex flex-wrap items-center gap-3">
                  <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
                    <span className="grid size-7 place-items-center rounded-lg bg-[#2855C5]/20 text-[#2855C5] text-xs font-black">
                      #{selectedCategory.sortOrder}
                    </span>
                    {selectedCategory.name.en}
                  </h2>
                  <span className="rounded-lg bg-slate-800 px-2.5 py-1 text-xs font-semibold text-slate-300 font-mono" dir="rtl">
                    {selectedCategory.name.ar}
                  </span>
                  <span
                    className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                      selectedCategory.isActive
                        ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                        : 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                    }`}
                  >
                    {selectedCategory.isActive ? 'Category Active' : 'Category Inactive'}
                  </span>
                </div>
                {selectedCategory.description?.en && (
                  <p className="mt-1.5 text-xs text-slate-400 max-w-2xl">
                    {selectedCategory.description.en} — <span dir="rtl">{selectedCategory.description.ar}</span>
                  </p>
                )}
                {!selectedCategory.isActive && (
                  <p className="mt-2 text-xs font-medium text-amber-400/90 flex items-center gap-1.5">
                    <AlertCircle size={14} /> Note: This category is currently inactive. Its subcategories are excluded from public service creation and directory pages.
                  </p>
                )}
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={() => loadSubcategories(selectedCategory._id)}
                  className="grid size-9 place-items-center rounded-xl border border-slate-700 bg-slate-800 text-slate-300 hover:text-white hover:border-slate-600 transition"
                  title="Refresh subcategories"
                >
                  <RefreshCw size={14} className={loadingSubs ? 'animate-spin' : ''} />
                </button>
                <button
                  onClick={openCreateSubcategory}
                  className="inline-flex items-center gap-2 rounded-xl bg-[#2855C5] px-4 py-2 text-xs font-bold text-white shadow-sm hover:bg-[#2855C5]/90 transition"
                >
                  <Plus size={15} /> Add Subcategory
                </button>
              </div>
            </div>
          </div>

          {/* Subcategories Filter & Search */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="relative flex-1 max-w-md">
              <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={subSearch}
                onChange={(e) => setSubSearch(e.target.value)}
                placeholder="Search subcategory in English or Arabic..."
                className="w-full rounded-xl border border-slate-800 bg-[#121d2f] py-2 pl-9 pr-3 text-xs text-white placeholder:text-slate-500 outline-none focus:border-[#2855C5]"
              />
            </div>

            <div className="flex items-center gap-2">
              <span className="text-[11px] text-slate-400 font-medium">Status:</span>
              {(['all', 'active', 'inactive'] as const).map((s) => (
                <button
                  key={s}
                  onClick={() => setSubStatusFilter(s)}
                  className={`rounded-lg px-3 py-1.5 text-xs font-bold capitalize transition ${
                    subStatusFilter === s
                      ? 'bg-[#2855C5] text-white'
                      : 'border border-slate-800 bg-[#121d2f] text-slate-400 hover:text-white'
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>

          {/* Subcategories Table */}
          {loadingSubs ? (
            <div className="rounded-2xl border border-slate-800 bg-[#121d2f] p-12 text-center text-xs text-slate-400 font-mono tracking-widest uppercase">
              Loading subcategories...
            </div>
          ) : filteredSubcategories.length === 0 ? (
            <div className="rounded-2xl border border-slate-800 bg-[#121d2f] p-12 text-center">
              <Layers size={36} className="mx-auto text-slate-600 mb-3" />
              <p className="text-sm font-bold text-white">No subcategories found</p>
              <p className="mt-1 text-xs text-slate-400">
                {subSearch ? 'Try a different search query' : 'Create the first subcategory under this category'}
              </p>
              {!subSearch && (
                <button
                  onClick={openCreateSubcategory}
                  className="mt-4 rounded-xl bg-[#2855C5] px-4 py-2 text-xs font-bold text-white"
                >
                  + Add Subcategory
                </button>
              )}
            </div>
          ) : (
            <div className="overflow-hidden rounded-2xl border border-slate-800 bg-[#121d2f]">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="border-b border-slate-800 bg-slate-900/60 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    <tr>
                      <th className="py-3 px-4 w-12 text-center">Order</th>
                      <th className="py-3 px-4">Subcategory Name (EN / AR)</th>
                      <th className="py-3 px-4">Slug (Stable ID)</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800">
                    {filteredSubcategories.map((sub) => (
                      <tr key={sub._id} className="hover:bg-slate-800/30 transition">
                        <td className="py-3 px-4 text-center font-bold text-slate-400">
                          {sub.sortOrder}
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-white">{sub.name.en}</span>
                            <span className="text-slate-500 font-mono">/</span>
                            <span className="text-slate-300 font-semibold" dir="rtl">
                              {sub.name.ar}
                            </span>
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <code className="rounded bg-slate-800 px-2 py-0.5 text-[11px] font-mono text-amber-300">
                            {sub.slug}
                          </code>
                        </td>
                        <td className="py-3 px-4">
                          <button
                            onClick={() => handleToggleSubcategoryStatus(sub)}
                            className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider transition ${
                              sub.isActive
                                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 hover:bg-rose-500/20 hover:text-rose-400 hover:border-rose-500/30'
                                : 'bg-slate-800 text-slate-400 border border-slate-700 hover:bg-emerald-500/20 hover:text-emerald-400'
                            }`}
                            title="Click to toggle status"
                          >
                            {sub.isActive ? (
                              <>
                                <Check size={11} /> Active
                              </>
                            ) : (
                              <>
                                <X size={11} /> Inactive
                              </>
                            )}
                          </button>
                        </td>
                        <td className="py-3 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => openEditSubcategory(sub)}
                              className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white transition"
                              title="Edit Subcategory"
                            >
                              <Edit2 size={13} />
                            </button>
                            <button
                              onClick={() => handleDeleteSubcategory(sub)}
                              className="rounded-lg p-1.5 text-rose-400 hover:bg-rose-950/40 hover:text-rose-300 transition"
                              title="Delete Subcategory (Safety enforced)"
                            >
                              <Trash2 size={13} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      ) : (
        /* VIEW 2: Top-Level Categories List & Table */
        <div className="space-y-6">
          {/* Quick Metrics Bar */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-2xl border border-slate-800 bg-[#121d2f] p-5">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Total Categories
              </span>
              <p className="mt-2 text-3xl font-black text-white">{categories.length}</p>
              <p className="mt-1 text-xs text-slate-400">Bilingual taxonomy groups</p>
            </div>

            <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-5">
              <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400">
                Active Categories
              </span>
              <p className="mt-2 text-3xl font-black text-emerald-300">{activeCategoriesCount}</p>
              <p className="mt-1 text-xs text-emerald-200/70">Visible to public & experts</p>
            </div>

            <div className="rounded-2xl border border-slate-800 bg-[#121d2f] p-5">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Subcategories Count
              </span>
              <p className="mt-2 text-3xl font-black text-white">{totalSubcategoriesCount}</p>
              <p className="mt-1 text-xs text-slate-400">Across all 11 disciplines</p>
            </div>

            <div className="rounded-2xl border border-slate-800 bg-[#121d2f] p-5 flex flex-col justify-between">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Taxonomy Engine
                </span>
                <p className="mt-1 text-xs text-slate-300 font-semibold">MongoDB Atlas Store</p>
              </div>
              <button
                onClick={openCreateCategory}
                className="mt-3 flex items-center justify-center gap-2 rounded-xl bg-[#2855C5] py-2 text-xs font-bold text-white shadow-sm hover:bg-[#2855C5]/90 transition"
              >
                <Plus size={15} /> Add Category
              </button>
            </div>
          </div>

          {/* Action Header & Filters */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="relative flex-1 max-w-md">
              <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search categories in English, Arabic, or slug..."
                className="w-full rounded-xl border border-slate-800 bg-[#121d2f] py-2 pl-9 pr-3 text-xs text-white placeholder:text-slate-500 outline-none focus:border-[#2855C5]"
              />
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[11px] text-slate-400 font-medium">Filter:</span>
              {(['all', 'active', 'inactive'] as const).map((s) => (
                <button
                  key={s}
                  onClick={() => setStatusFilter(s)}
                  className={`rounded-lg px-3 py-1.5 text-xs font-bold capitalize transition ${
                    statusFilter === s
                      ? 'bg-[#2855C5] text-white'
                      : 'border border-slate-800 bg-[#121d2f] text-slate-400 hover:text-white'
                  }`}
                >
                  {s}
                </button>
              ))}

              <button
                onClick={loadCategories}
                className="grid size-8 place-items-center rounded-lg border border-slate-800 bg-[#121d2f] text-slate-400 hover:text-white"
                title="Refresh categories"
              >
                <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
              </button>
            </div>
          </div>

          {/* Categories Table */}
          {loading ? (
            <div className="rounded-2xl border border-slate-800 bg-[#121d2f] p-16 text-center text-xs font-mono uppercase tracking-widest text-slate-400">
              Loading Categories Taxonomy...
            </div>
          ) : filteredCategories.length === 0 ? (
            <div className="rounded-2xl border border-slate-800 bg-[#121d2f] p-12 text-center">
              <FolderTree size={36} className="mx-auto text-slate-600 mb-3" />
              <p className="text-base font-bold text-white">No categories found</p>
              <p className="mt-1 text-xs text-slate-400">
                {search ? 'Try clearing your search query' : 'No categories configured in database.'}
              </p>
            </div>
          ) : (
            <div className="overflow-hidden rounded-2xl border border-slate-800 bg-[#121d2f]">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="border-b border-slate-800 bg-slate-900/60 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    <tr>
                      <th className="py-3.5 px-4 w-12 text-center">Order</th>
                      <th className="py-3.5 px-4">Category (English / Arabic)</th>
                      <th className="py-3.5 px-4">Slug</th>
                      <th className="py-3.5 px-4">Subcategories</th>
                      <th className="py-3.5 px-4">Visibility</th>
                      <th className="py-3.5 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800">
                    {filteredCategories.map((cat) => (
                      <tr key={cat._id} className="hover:bg-slate-800/30 transition group">
                        <td className="py-4 px-4 text-center font-bold text-slate-400">
                          {cat.sortOrder}
                        </td>
                        <td className="py-4 px-4">
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-white text-sm">{cat.name.en}</span>
                              <span className="text-slate-500 font-mono">/</span>
                              <span className="text-slate-300 font-semibold text-sm" dir="rtl">
                                {cat.name.ar}
                              </span>
                            </div>
                            {cat.description?.en && (
                              <p className="mt-1 text-[11px] text-slate-400 max-w-md line-clamp-1">
                                {cat.description.en}
                              </p>
                            )}
                          </div>
                        </td>
                        <td className="py-4 px-4">
                          <code className="rounded bg-slate-800 px-2 py-0.5 text-[11px] font-mono text-amber-300">
                            {cat.slug}
                          </code>
                        </td>
                        <td className="py-4 px-4">
                          <button
                            onClick={() => setSelectedCategory(cat)}
                            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-800 px-3 py-1 text-xs font-bold text-slate-300 hover:text-white hover:border-[#2855C5] transition"
                          >
                            <Layers size={13} className="text-[#2855C5]" />
                            <span>{cat.subcategoriesCount || 0} subcategories</span>
                            <ChevronRight size={13} className="text-slate-400" />
                          </button>
                        </td>
                        <td className="py-4 px-4">
                          <button
                            onClick={() => handleToggleCategoryStatus(cat)}
                            className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider transition ${
                              cat.isActive
                                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 hover:bg-rose-500/20 hover:text-rose-400 hover:border-rose-500/30'
                                : 'bg-slate-800 text-slate-400 border border-slate-700 hover:bg-emerald-500/20 hover:text-emerald-400'
                            }`}
                            title="Click to toggle category status"
                          >
                            {cat.isActive ? (
                              <>
                                <Check size={11} /> Active
                              </>
                            ) : (
                              <>
                                <X size={11} /> Inactive
                              </>
                            )}
                          </button>
                        </td>
                        <td className="py-4 px-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => setSelectedCategory(cat)}
                              className="rounded-lg border border-slate-700 px-2.5 py-1 text-[11px] font-bold text-slate-300 hover:text-white hover:border-slate-500 transition"
                            >
                              Manage Subs
                            </button>
                            <button
                              onClick={() => openEditCategory(cat)}
                              className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white transition"
                              title="Edit Category"
                            >
                              <Edit2 size={13} />
                            </button>
                            <button
                              onClick={() => handleDeleteCategory(cat)}
                              className="rounded-lg p-1.5 text-rose-400 hover:bg-rose-950/40 hover:text-rose-300 transition"
                              title="Delete Category (Safety checks apply)"
                            >
                              <Trash2 size={13} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* MODAL 1: Create / Edit Category */}
      {categoryModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-lg rounded-3xl border border-slate-800 bg-[#121d2f] p-6 text-slate-100 shadow-2xl space-y-5">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div>
                <h3 className="text-base font-bold text-white">
                  {editingCategory ? 'Edit Category' : 'Create New Category'}
                </h3>
                <p className="text-xs text-slate-400">
                  Configure English and Arabic names and URL slug.
                </p>
              </div>
              <button
                onClick={() => setCategoryModalOpen(false)}
                className="rounded-full p-1 text-slate-400 hover:bg-slate-800 hover:text-white"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveCategory} className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="text-xs font-bold text-slate-300">
                  Name (English) *
                  <input
                    required
                    value={catNameEn}
                    onChange={(e) => {
                      setCatNameEn(e.target.value)
                      if (!catSlugManuallyEdited && !editingCategory) {
                        setCatSlug(slugify(e.target.value))
                      }
                    }}
                    placeholder="e.g. Marketing"
                    className="mt-1.5 w-full rounded-xl border border-slate-700 bg-slate-900 px-3.5 py-2 text-xs text-white outline-none focus:border-[#2855C5]"
                  />
                </label>

                <label className="text-xs font-bold text-slate-300">
                  Name (Arabic) *
                  <input
                    required
                    dir="rtl"
                    value={catNameAr}
                    onChange={(e) => setCatNameAr(e.target.value)}
                    placeholder="مثال: التسويق"
                    className="mt-1.5 w-full rounded-xl border border-slate-700 bg-slate-900 px-3.5 py-2 text-xs text-white outline-none focus:border-[#2855C5]"
                  />
                </label>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <label className="text-xs font-bold text-slate-300">
                  Slug (URL Identifier) *
                  <input
                    required
                    value={catSlug}
                    onChange={(e) => {
                      setCatSlug(slugify(e.target.value))
                      setCatSlugManuallyEdited(true)
                    }}
                    placeholder="e.g. marketing"
                    className="mt-1.5 w-full rounded-xl border border-slate-700 bg-slate-900 px-3.5 py-2 text-xs text-amber-300 font-mono outline-none focus:border-[#2855C5]"
                  />
                </label>

                <label className="text-xs font-bold text-slate-300">
                  Sort Order
                  <input
                    type="number"
                    min={1}
                    value={catSortOrder}
                    onChange={(e) => setCatSortOrder(Number(e.target.value))}
                    className="mt-1.5 w-full rounded-xl border border-slate-700 bg-slate-900 px-3.5 py-2 text-xs text-white outline-none focus:border-[#2855C5]"
                  />
                </label>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <label className="text-xs font-bold text-slate-300">
                  Description (English)
                  <textarea
                    rows={2}
                    value={catDescEn}
                    onChange={(e) => setCatDescEn(e.target.value)}
                    placeholder="Short description..."
                    className="mt-1.5 w-full rounded-xl border border-slate-700 bg-slate-900 px-3.5 py-2 text-xs text-white outline-none focus:border-[#2855C5]"
                  />
                </label>

                <label className="text-xs font-bold text-slate-300">
                  Description (Arabic)
                  <textarea
                    rows={2}
                    dir="rtl"
                    value={catDescAr}
                    onChange={(e) => setCatDescAr(e.target.value)}
                    placeholder="وصف مختصر..."
                    className="mt-1.5 w-full rounded-xl border border-slate-700 bg-slate-900 px-3.5 py-2 text-xs text-white outline-none focus:border-[#2855C5]"
                  />
                </label>
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="catIsActive"
                  checked={catIsActive}
                  onChange={(e) => setCatIsActive(e.target.checked)}
                  className="size-4 rounded accent-[#2855C5]"
                />
                <label htmlFor="catIsActive" className="text-xs font-medium text-slate-300">
                  Active (Category is visible to public and available for service creation)
                </label>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setCategoryModalOpen(false)}
                  className="rounded-xl border border-slate-700 px-4 py-2 text-xs font-bold text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingCategory}
                  className="rounded-xl bg-[#2855C5] px-5 py-2 text-xs font-bold text-white hover:bg-[#2855C5]/90 disabled:opacity-50"
                >
                  {savingCategory ? 'Saving...' : editingCategory ? 'Save Changes' : 'Create Category'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: Create / Edit Subcategory */}
      {subcategoryModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-lg rounded-3xl border border-slate-800 bg-[#121d2f] p-6 text-slate-100 shadow-2xl space-y-5">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div>
                <h3 className="text-base font-bold text-white">
                  {editingSubcategory ? 'Edit Subcategory' : 'Add New Subcategory'}
                </h3>
                <p className="text-xs text-slate-400">
                  Belongs to: <span className="font-bold text-white">{selectedCategory?.name.en}</span>
                </p>
              </div>
              <button
                onClick={() => setSubcategoryModalOpen(false)}
                className="rounded-full p-1 text-slate-400 hover:bg-slate-800 hover:text-white"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveSubcategory} className="space-y-4">
              {/* Parent Category Selection */}
              <label className="text-xs font-bold text-slate-300 block">
                Parent Category *
                <select
                  value={subParentCatId}
                  onChange={(e) => setSubParentCatId(e.target.value)}
                  className="mt-1.5 w-full rounded-xl border border-slate-700 bg-slate-900 px-3.5 py-2 text-xs text-white outline-none focus:border-[#2855C5]"
                >
                  {categories.map((c) => (
                    <option key={c._id} value={c._id}>
                      {c.name.en} — {c.name.ar}
                    </option>
                  ))}
                </select>
              </label>

              <div className="grid gap-4 sm:grid-cols-2">
                <label className="text-xs font-bold text-slate-300">
                  Name (English) *
                  <input
                    required
                    value={subNameEn}
                    onChange={(e) => {
                      setSubNameEn(e.target.value)
                      if (!subSlugManuallyEdited && !editingSubcategory) {
                        setSubSlug(slugify(e.target.value))
                      }
                    }}
                    placeholder="e.g. Digital Marketing"
                    className="mt-1.5 w-full rounded-xl border border-slate-700 bg-slate-900 px-3.5 py-2 text-xs text-white outline-none focus:border-[#2855C5]"
                  />
                </label>

                <label className="text-xs font-bold text-slate-300">
                  Name (Arabic) *
                  <input
                    required
                    dir="rtl"
                    value={subNameAr}
                    onChange={(e) => setSubNameAr(e.target.value)}
                    placeholder="مثال: التسويق الرقمي"
                    className="mt-1.5 w-full rounded-xl border border-slate-700 bg-slate-900 px-3.5 py-2 text-xs text-white outline-none focus:border-[#2855C5]"
                  />
                </label>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <label className="text-xs font-bold text-slate-300">
                  Slug (Stable ID) *
                  <input
                    required
                    value={subSlug}
                    onChange={(e) => {
                      setSubSlug(slugify(e.target.value))
                      setSubSlugManuallyEdited(true)
                    }}
                    placeholder="e.g. digital-marketing"
                    className="mt-1.5 w-full rounded-xl border border-slate-700 bg-slate-900 px-3.5 py-2 text-xs text-amber-300 font-mono outline-none focus:border-[#2855C5]"
                  />
                </label>

                <label className="text-xs font-bold text-slate-300">
                  Sort Order
                  <input
                    type="number"
                    min={1}
                    value={subSortOrder}
                    onChange={(e) => setSubSortOrder(Number(e.target.value))}
                    className="mt-1.5 w-full rounded-xl border border-slate-700 bg-slate-900 px-3.5 py-2 text-xs text-white outline-none focus:border-[#2855C5]"
                  />
                </label>
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="subIsActive"
                  checked={subIsActive}
                  onChange={(e) => setSubIsActive(e.target.checked)}
                  className="size-4 rounded accent-[#2855C5]"
                />
                <label htmlFor="subIsActive" className="text-xs font-medium text-slate-300">
                  Active (Selectable when parent category is active)
                </label>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setSubcategoryModalOpen(false)}
                  className="rounded-xl border border-slate-700 px-4 py-2 text-xs font-bold text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingSubcategory}
                  className="rounded-xl bg-[#2855C5] px-5 py-2 text-xs font-bold text-white hover:bg-[#2855C5]/90 disabled:opacity-50"
                >
                  {savingSubcategory ? 'Saving...' : editingSubcategory ? 'Save Changes' : 'Create Subcategory'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

