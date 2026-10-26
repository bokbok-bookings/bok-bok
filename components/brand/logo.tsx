import React from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { BokBok } from '@/components/brand/bok-bok'

interface BrandLogoProps {
  href?: string
  size?: 'sm' | 'md' | 'lg'
  showText?: boolean
  textColor?: string
  className?: string
  subtitle?: string
  variant?: 'light' | 'dark'
  text?: string
}

export function BrandLogo({
  href = '/',
  size = 'md',
  showText = true,
  textColor,
  className = '',
  subtitle,
  variant = 'light',
  text = 'Bok Bok',
}: BrandLogoProps) {
  // testFavsmall natural aspect ratio is ~32:36
  const dimensions = {
    sm: { width: 22, height: 25, imgClass: 'h-6' },
    md: { width: 28, height: 32, imgClass: 'h-8' },
    lg: { width: 34, height: 38, imgClass: 'h-9 sm:h-10' },
  }[size]

  const textClasses = {
    sm: 'text-lg',
    md: 'text-[22px]',
    lg: 'text-2xl',
  }[size]

  const defaultTextColor = textColor || (variant === 'dark' ? 'text-white' : 'text-[#14243b]')

  const logoMark = (
    <div className="relative flex shrink-0 items-center justify-center">
      <Image
        src="/testFavsmall.png"
        alt="Bok Bok Logo"
        width={dimensions.width}
        height={dimensions.height}
        className={`${dimensions.imgClass} w-auto object-contain select-none`}
        priority
      />
    </div>
  )

  const content = (
    <div className={`flex items-center gap-2.5 ${className}`}>
      {logoMark}
      {showText && (
        <div className="leading-none">
          <BokBok
            text={text}
            className={`${textClasses} font-bold ${defaultTextColor}`}
          />
          {subtitle && (
            <span className="block text-[10px] text-slate-400 font-mono mt-0.5">
              {subtitle}
            </span>
          )}
        </div>
      )}
    </div>
  )

  if (href) {
    return (
      <Link href={href} className="inline-flex items-center focus:outline-hidden select-none hover:opacity-90 transition-opacity">
        {content}
      </Link>
    )
  }

  return content
}

export default BrandLogo
