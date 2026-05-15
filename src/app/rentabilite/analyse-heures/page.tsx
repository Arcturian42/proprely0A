import { AdminLayout } from '@/components/layout/AdminLayout'
import { PieChart } from 'lucide-react'

export default function AnalyseHeuresPage() {
  return (
    <AdminLayout>
      <div className="p-6 bg-[#F8FAFC] min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 rounded-[16px] bg-[#EEF2FF] flex items-center justify-center mx-auto">
            <PieChart className="w-8 h-8 text-[#6366F1]" />
          </div>
          <h2 className="text-[20px] font-bold text-[#0F172A] mt-4 text-center">Analyse des heures</h2>
          <p className="text-[14px] text-[#475569] text-center mt-2 max-w-sm mx-auto">
            L'analyse approfondie des heures sera disponible prochainement.
            Analysez la productivité par agent et identifiez les écarts entre heures prévues et réalisées.
          </p>
          <span className="inline-block bg-amber-50 text-amber-700 text-[12px] font-semibold px-3 py-1 rounded-full mt-4">
            À venir
          </span>
        </div>
      </div>
    </AdminLayout>
  )
}
