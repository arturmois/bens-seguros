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

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setActiveSection(entry.target.id)
          }
        }
      },
      { rootMargin: '-80px 0px -60% 0px', threshold: 0 }
    )

    for (const el of sectionRefs.current.values()) {
      observer.observe(el)
    }

    return () => observer.disconnect()
  }, [])

  function scrollToSection(id: string) {
    const el = sectionRefs.current.get(id)
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' })
      setTocOpen(false)
    }
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
      {/* Header */}
      <div className="mb-10 text-center">
        <h1 className="text-3xl font-bold text-slate-100 sm:text-4xl">
          {doc.title}
        </h1>
        <p className="mt-3 text-sm text-slate-400">
          Versão {doc.version} — Última atualização:{' '}
          {new Date(doc.updatedAt).toLocaleDateString('pt-BR')}
        </p>
      </div>

      {/* Mobile TOC toggle */}
      <div className="mb-6 md:hidden">
        <button
          type="button"
          onClick={() => setTocOpen((prev) => !prev)}
          className="flex w-full items-center justify-between rounded-lg border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-slate-300"
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
          <nav className="mt-2 rounded-lg border border-white/10 bg-white/[0.04] p-4">
            <ul className="space-y-2">
              {doc.sections.map((section) => (
                <li key={section.id}>
                  <button
                    type="button"
                    onClick={() => scrollToSection(section.id)}
                    className={cn(
                      'w-full text-left text-sm transition-colors',
                      activeSection === section.id
                        ? 'text-accent-400 font-medium'
                        : 'text-slate-400 hover:text-slate-200'
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
            <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-500">
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
                        ? 'border-accent-400 text-accent-400 border-l-2 pl-3 font-medium'
                        : 'border-l-2 border-transparent pl-3 text-slate-400 hover:text-slate-200'
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
              <h2 className="mb-4 text-xl font-semibold text-slate-100">
                {section.title}
              </h2>
              <div className="whitespace-pre-line text-sm leading-relaxed text-slate-300">
                {section.content}
              </div>
            </section>
          ))}
        </article>
      </div>
    </div>
  )
}
