import { ReactNode } from 'react'

interface StepCardProps {
  title: string
  description?: string
  children: ReactNode
  footer?: ReactNode
}

export function StepCard({ title, description, children, footer }: StepCardProps) {
  return (
    <section className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
      <header className="px-5 sm:px-8 py-5 sm:py-6 border-b border-slate-100">
        <h2 className="text-[18px] sm:text-[22px] font-semibold text-slate-900 tracking-tight">
          {title}
        </h2>
        {description && (
          <p className="text-[13px] sm:text-[14px] text-slate-500 mt-1.5">{description}</p>
        )}
      </header>
      <div className="px-5 sm:px-8 py-5 sm:py-6">{children}</div>
      {footer && (
        <footer className="px-5 sm:px-8 py-4 sm:py-5 border-t border-slate-100 bg-slate-50/40">
          {footer}
        </footer>
      )}
    </section>
  )
}
