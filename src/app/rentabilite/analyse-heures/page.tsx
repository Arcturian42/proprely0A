import { AdminLayout } from '@/components/layout/AdminLayout'
import { PieChart } from 'lucide-react'

export default function AnalyseHeuresPage() {
  return (
    <AdminLayout>
      <div className="p-6 flex items-center justify-center min-h-[70vh]">
        <div className="text-center">
          <div className="w-16 h-16 rounded-[16px] bg-[#EEF2FF] flex items-center justify-center mx-auto">
            <PieChart className="w-8 h-8 text-[#6366F1]" />
          </div>
          <h2 className="text-[20px] font-bold text-[#0F172A] mt-4">Analyse des heures</h2>
          <p className="text-[14px] text-[#475569] mt-2 max-w-sm mx-auto">Visualisez la répartition des heures par agent, par site et par type de prestation pour optimiser votre planification.</p>
          <span className="inline-block mt-4 bg-amber-50 text-amber-700 text-[12px] font-semibold px-3 py-1 rounded-full">Bientôt disponible</span>
        </div>
      </div>
    </AdminLayout>
  )
}
