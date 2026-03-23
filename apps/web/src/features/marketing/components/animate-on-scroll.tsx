'use client'

import { useRef } from 'react'
import { motion, useInView } from 'framer-motion'

interface AnimateOnScrollProps {
  children: React.ReactNode
  className?: string
}

export function AnimateOnScroll({ children, className }: AnimateOnScrollProps) {
  const ref = useRef<HTMLDivElement>(null)
  const isInView = useInView(ref, { once: true, margin: '-10% 0px' })

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 32 }}
      animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 32 }}
      transition={{ duration: 0.7, ease: 'easeOut' }}
      className={className}
    >
      {children}
    </motion.div>
  )
}
