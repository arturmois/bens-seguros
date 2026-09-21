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
      'Não! O Bens Seguros é 100% online. Basta acessar pelo navegador em qualquer dispositivo — computador, tablet ou celular.',
  },
  {
    question: 'Meus dados estão seguros?',
    answer:
      'Absolutamente. Utilizamos criptografia de ponta a ponta, servidores com certificação SOC 2 e backups automáticos diários. Seus dados estão protegidos por múltiplas camadas de segurança.',
  },
  {
    question: 'Consigo importar meus clientes atuais?',
    answer:
      'Sim! Oferecemos importação via planilha (CSV/Excel) e integração direta com os principais sistemas do mercado. Nossa equipe auxilia na migração sem custo adicional.',
  },
  {
    question: 'Tem período de teste grátis?',
    answer:
      'Sim! Você pode testar o plano Pro completo por 14 dias, sem precisar cadastrar cartão de crédito. Cancele a qualquer momento.',
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
      className="absolute bottom-0 left-1/4 h-[400px] w-[400px] animate-orb-drift rounded-full bg-accent-500/10 blur-[60px]"
      aria-hidden="true"
    />
  )
}

function FaqHeader(): React.ReactElement {
  return (
    <>
      <p className="text-center font-semibold text-accent-500 text-xs uppercase tracking-widest">
        FAQ
      </p>
      <h2 className="mt-4 text-center font-bold text-2xl text-white sm:text-3xl">
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
          className="rounded-xl border border-white/8 bg-white/3 px-5 data-open:border-accent-500/30"
        >
          <AccordionTrigger className="py-5 font-medium text-base text-white hover:text-accent-400">
            {item.question}
          </AccordionTrigger>
          <AccordionContent className="pb-5 text-slate-400 text-sm leading-relaxed">
            {item.answer}
          </AccordionContent>
        </AccordionItem>
      ))}
    </Accordion>
  )
}

function CtaFinal(): React.ReactElement {
  return (
    <div
      id="contato"
      className="mt-16 rounded-2xl border border-accent-500/20 bg-linear-to-r from-accent-500/8 to-primary-500/8 p-8 text-center sm:p-12"
    >
      <h3 className="font-bold text-2xl text-white sm:text-3xl">
        Pronto para transformar sua corretora?
      </h3>
      <p className="mt-4 text-base text-slate-400">
        Comece gratuitamente e veja os resultados em dias, não meses.
      </p>
      <Link
        href="/register"
        className="mt-8 inline-block rounded-xl bg-linear-to-r from-accent-500 to-accent-600 px-8 py-3 font-semibold text-base text-slate-900 shadow-accent-500/25 shadow-lg transition-all hover:shadow-accent-500/40"
      >
        Começar Grátis
      </Link>
    </div>
  )
}
