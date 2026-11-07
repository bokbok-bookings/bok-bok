'use client'

import React from 'react'
import { CategoriesManager } from '@/components/dashboard/categories-manager'

export default function AdminCategoriesPage() {
  return (
    <div className="space-y-6">
      <div className="border-b border-[#eeeae4] pb-5">
        <span className="text-[10px] font-black uppercase tracking-wider text-primary">
          Taxonomy Management
        </span>
        <h1 className="mt-0.5 text-3xl font-semibold tracking-tight text-[#14243b]">
          Categories &amp; Subcategories
        </h1>
        <p className="text-xs text-[#637084] mt-0.5">
          Manage bilingual taxonomy (Arabic &amp; English), URL slugs, sort order, and visibility.
        </p>
      </div>

      <CategoriesManager />
    </div>
  )
}
