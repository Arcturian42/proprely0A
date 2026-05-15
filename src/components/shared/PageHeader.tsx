interface PageHeaderProps {
  title: string
  description?: string
  action?: React.ReactNode
}

export function PageHeader({ title, description, action }: PageHeaderProps) {
  return (
    <div className="mb-6 flex items-start justify-between">
      <div>
        <h1 className="text-[22px] font-bold text-[#0F172A] tracking-tight">{title}</h1>
        {description && <p className="text-[13px] text-[#475569] mt-1">{description}</p>}
      </div>
      {action && <div>{action}</div>}
    </div>
  )
}
