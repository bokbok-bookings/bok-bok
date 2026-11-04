import React from 'react'

export interface BokBokProps {
  className?: string
  text?: string
  withAccent?: boolean
  accentClassName?: string
}

/**
 * Renders the brand wordmark "Bok Bok" (or custom text) using the heading font
 * (Stack Sans Notch) with optional accent highlight line.
 */
  export function BokBok({
    className = '',
    text = 'Bok Bok',
    withAccent = false,
    accentClassName = 'bottom-0.5 left-0 w-full h-[2px] bg-accent -z-0 rounded-sm',
  }: BokBokProps) {
    if (!withAccent) {
      return (
        <span
          className={`font-heading tracking-tight inline-block ${className}`}
          style={{ fontFamily: "var(--font-heading), 'Stack Sans Notch', sans-serif" }}
        >
          {text}
        </span>
      )
    }

    return (
        <span className={`relative inline-block ${className}`}>
          <span
            className="relative z-10 font-heading tracking-tight inline-block"
            style={{ fontFamily: "var(--font-heading), 'Stack Sans Notch', sans-serif" }}
          >
            {text}
          </span>
          <span className={`absolute ${accentClassName}`} />
        </span>
        )
}

/**
 * Replaces any occurrence of 'Bok Bok' or 'bok bok' in a string or ReactNode
          * with a styled <BokBok /> element.
          */
export function withBokBok(node: React.ReactNode, withAccent = false): React.ReactNode {
  if (typeof node !== 'string') return node
          const regex = /(Bok Bok|bok bok|Bok bok)/g
          if (!regex.test(node)) return node

          const parts = node.split(/(Bok Bok|bok bok|Bok bok)/g)
  return parts.map((part, index) => {
    if (/(Bok Bok|bok bok|Bok bok)/i.test(part)) {
      return (
          <BokBok key={index} text={part} withAccent={withAccent} />
          )
    }
          return part
  })
}

          export default BokBok
