'use client'

import { useState, useEffect, useRef } from 'react'
import { ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { LegalDocument } from '../types'

interface LegalPageLayoutProps {
  document: LegalDocument
}

export function LegalPageLayout({ document: doc }: LegalPageLayoutProps) {
  const [activeSection, setActiveSection] = useState(doc.sections[0]?.id ?? '')
  const [tocOpen, setTocOpen] = useState(false)
  const sectionRefs = useRef<Map<string, HTMLElement>>(new Map())
  const scrollLockRef = useRef(false)
  useEffect(() => {
    function handleScroll() {
      if (scrollLockRef.current) return
      const scrollY = window.scrollY + 120
      let current = doc.sections[0]?.id ?? ''
      for (const el of sectionRefs.current.values()) {
        if (el.offsetTop <= scrollY) {
          current = el.id
        }
      }
      setActiveSection(current)
    }
    window.addEventListener('scroll', handleScroll, { passive: true })
    handleScroll()
    return () => window.removeEventListener('scroll', handleScroll)
  }, [doc.sections])
  function scrollToSection(id: string) {
    const el = sectionRefs.current.get(id)
    if (el) {
      scrollLockRef.current = true
      setActiveSection(id)
      el.scrollIntoView({ behavior: 'smooth', block: 'start' })
      setTocOpen(false)
      setTimeout(() => {
        scrollLockRef.current = false
      }, 1500)
    }
  }
  return (
    <div className="mx-auto max-w-6xl px-4 pt-24 pb-12 sm:px-6">
      {/* Header */}
      <div className="mb-10 text-center">
        <h1 className="font-bold text-3xl text-foreground sm:text-4xl">
          {doc.title}
        </h1>
        <p className="mt-3 text-muted-foreground text-sm">
          Versão {doc.version} — Última atualização:{' '}
          {new Date(doc.updatedAt).toLocaleDateString('pt-BR')}
        </p>
      </div>
      {/* Mobile TOC toggle */}
      <div className="mb-6 md:hidden">
        <button
          type="button"
          onClick={() => setTocOpen((prev) => !prev)}
          className="flex w-full items-center justify-between rounded-lg border border-border bg-secondary px-4 py-3 text-foreground text-sm"
        >
          <span>Índice</span>
          <ChevronDown
            className={cn(
              'size-4 transition-transform',
              tocOpen && 'rotate-180'
            )}
          />
        </button>
        {tocOpen && (
          <nav className="mt-2 rounded-lg border border-border bg-secondary p-4">
            <ul className="space-y-2">
              {doc.sections.map((section) => (
                <li key={section.id}>
                  <button
                    type="button"
                    onClick={() => scrollToSection(section.id)}
                    className={cn(
                      'w-full text-left text-sm transition-colors',
                      activeSection === section.id
                        ? 'font-medium text-primary'
                        : 'text-muted-foreground hover:text-foreground'
                    )}
                  >
                    {section.title}
                  </button>
                </li>
              ))}
            </ul>
          </nav>
        )}
      </div>
      {/* Desktop layout: sidebar + content */}
      <div className="flex gap-10">
        {/* Sidebar TOC (desktop) */}
        <aside className="hidden w-56 shrink-0 md:block">
          <nav className="sticky top-24">
            <p className="mb-3 font-semibold text-muted-foreground text-xs uppercase tracking-wider">
              Índice
            </p>
            <ul className="space-y-1.5">
              {doc.sections.map((section) => (
                <li key={section.id}>
                  <button
                    type="button"
                    onClick={() => scrollToSection(section.id)}
                    className={cn(
                      'w-full text-left text-sm transition-colors',
                      activeSection === section.id
                        ? 'border-primary border-l-2 pl-3 font-medium text-primary'
                        : 'border-transparent border-l-2 pl-3 text-muted-foreground hover:text-foreground'
                    )}
                  >
                    {section.title}
                  </button>
                </li>
              ))}
            </ul>
          </nav>
        </aside>
        {/* Content */}
        <article className="min-w-0 flex-1">
          {doc.sections.map((section) => (
            <section
              key={section.id}
              id={section.id}
              ref={(el) => {
                if (el) sectionRefs.current.set(section.id, el)
              }}
              className="mb-10 scroll-mt-24"
            >
              <h2 className="mb-4 font-semibold text-foreground text-xl">
                {section.title}
              </h2>
              <div className="whitespace-pre-line text-muted-foreground text-sm leading-relaxed">
                {section.content}
              </div>
            </section>
          ))}
        </article>
      </div>
    </div>
  )
}
