'use client'

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion'
import Link from 'next/link'

interface FaqItem {
  question: string
  answer: string
}

const FAQ_ITEMS: readonly FaqItem[] = [
  {
    question: 'Preciso instalar alguma coisa?',
    answer:
      'Nao! O Bens Seguros e 100% online. Basta acessar pelo navegador em qualquer dispositivo — computador, tablet ou celular.',
  },
  {
    question: 'Meus dados estao seguros?',
    answer:
      'Absolutamente. Utilizamos criptografia de ponta a ponta, servidores com certificacao SOC 2 e backups automaticos diarios. Seus dados estao protegidos por multiplas camadas de seguranca.',
  },
  {
    question: 'Consigo importar meus clientes atuais?',
    answer:
      'Sim! Oferecemos importacao via planilha (CSV/Excel) e integracao direta com os principais sistemas do mercado. Nossa equipe auxilia na migracao sem custo adicional.',
  },
  {
    question: 'Tem periodo de teste gratis?',
    answer:
      'Sim! Voce pode testar o plano Pro completo por 14 dias, sem precisar cadastrar cartao de credito. Cancele a qualquer momento.',
  },
] as const

export function FaqCtaSection(): React.ReactElement {
  return (
    <section
      id="faq"
      className="relative overflow-hidden bg-[#0f172a] px-6 py-20"
    >
      <FaqOrb />
      <div className="relative z-10 mx-auto max-w-3xl">
        <FaqHeader />
        <FaqAccordion />
        <CtaFinal />
      </div>
    </section>
  )
}

function FaqOrb(): React.ReactElement {
  return (
    <div
      className="animate-orb-drift bg-accent-500/10 absolute bottom-0 left-1/4 h-[400px] w-[400px] rounded-full blur-[60px]"
      aria-hidden="true"
    />
  )
}

function FaqHeader(): React.ReactElement {
  return (
    <>
      <p className="text-accent-500 text-center text-xs font-semibold uppercase tracking-widest">
        FAQ
      </p>
      <h2 className="mt-4 text-center text-2xl font-bold text-white sm:text-3xl">
        Perguntas frequentes
      </h2>
    </>
  )
}

function FaqAccordion(): React.ReactElement {
  return (
    <Accordion className="mt-12 space-y-3">
      {FAQ_ITEMS.map((item, index) => (
        <AccordionItem
          key={index}
          className="data-open:border-accent-500/30 border-white/8 bg-white/3 rounded-xl border px-5"
        >
          <AccordionTrigger className="hover:text-accent-400 py-5 text-base font-medium text-white">
            {item.question}
          </AccordionTrigger>
          <AccordionContent className="pb-5 text-sm leading-relaxed text-slate-400">
            {item.answer}
          </AccordionContent>
        </AccordionItem>
      ))}
    </Accordion>
  )
}

function CtaFinal(): React.ReactElement {
  return (
    <div className="border-accent-500/20 from-accent-500/8 to-primary-500/8 bg-linear-to-r mt-16 rounded-2xl border p-8 text-center sm:p-12">
      <h3 className="text-2xl font-bold text-white sm:text-3xl">
        Pronto para transformar sua corretora?
      </h3>
      <p className="mt-4 text-base text-slate-400">
        Comece gratuitamente e veja os resultados em dias, nao meses.
      </p>
      <Link
        href="/register"
        className="from-accent-500 to-accent-600 shadow-accent-500/25 hover:shadow-accent-500/40 bg-linear-to-r mt-8 inline-block rounded-xl px-8 py-3 text-base font-semibold text-slate-900 shadow-lg transition-all"
      >
        Comecar Gratis
      </Link>
    </div>
  )
}
