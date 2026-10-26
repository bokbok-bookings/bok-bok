import React from 'react'

interface BokBokProps {
  className?: string
  text?: string
}

/**
 * Renders the brand wordmark "Bok Bok" (or custom text) using the heading font
 * (Stack Sans Notch) with guaranteed fallback styles.
 */
export function BokBok({ className = '', text = 'Bok Bok' }: BokBokProps) {
  return (
    <span
      className={`font-heading tracking-tight inline-block ${className}`}
      style={{ fontFamily: "var(--font-heading), 'Stack Sans Notch', sans-serif" }}
    >
      {text}
    </span>
  )
}

/**
 * Replaces any occurrence of 'Bok Bok' or 'bok bok' in a string or ReactNode
 * with a styled <span className="font-heading"> element.
 */
export function withBokBok(node: React.ReactNode): React.ReactNode {
  if (typeof node !== 'string') return node
  const regex = /(Bok Bok|bok bok|Bok bok)/g
  if (!regex.test(node)) return node

  const parts = node.split(/(Bok Bok|bok bok|Bok bok)/g)
  return parts.map((part, index) => {
    if (/(Bok Bok|bok bok|Bok bok)/i.test(part)) {
      return (
        <span
          key={index}
          className="font-heading tracking-tight"
          style={{ fontFamily: "var(--font-heading), 'Stack Sans Notch', sans-serif" }}
        >
          {part}
        </span>
      )
    }
    return part
  })
}

export default BokBok
