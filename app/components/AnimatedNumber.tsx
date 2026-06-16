'use client'

import { useEffect, useRef, useState } from 'react'

interface AnimatedNumberProps {
  value: number
  duration?: number
}

export default function AnimatedNumber({ value, duration = 700 }: AnimatedNumberProps) {
  const [displayed, setDisplayed] = useState(0)
  const rafRef = useRef<number>(0)

  useEffect(() => {
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (reduced || value === 0) {
      setDisplayed(value)
      return
    }

    const start = performance.now()

    function update(now: number) {
      const elapsed = now - start
      const progress = Math.min(elapsed / duration, 1)
      const eased = 1 - Math.pow(1 - progress, 3) // ease-out cubic
      setDisplayed(Math.round(eased * value))
      if (progress < 1) {
        rafRef.current = requestAnimationFrame(update)
      } else {
        setDisplayed(value)
      }
    }

    rafRef.current = requestAnimationFrame(update)
    return () => cancelAnimationFrame(rafRef.current)
  }, [value, duration])

  return <>{displayed}</>
}
