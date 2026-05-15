import { AdminLayout } from '@/components/layout/AdminLayout'
import { BarChart3 } from 'lucide-react'

export default function RentabiliteClientPage() {
  return (
    <AdminLayout>
      <div className="p-6 flex items-center justify-center min-h-[70vh]">
        <div className="text-center">
          <div className="w-16 h-16 rounded-[16px] bg-[#EEF2FF] flex items-center justify-center mx-auto">
            <BarChart3 className="w-8 h-8 text-[#6366F1]" />
          </div>
          <h2 className="text-[20px] font-bold text-[#0F172A] mt-4">Rentabilité client</h2>
          <p className="text-[14px] text-[#475569] mt-2 max-w-sm mx-auto">Analysez la rentabilité par client, comparez les coûts réels aux revenus et identifiez vos contrats les plus profitables.</p>
          <span className="inline-block mt-4 bg-amber-50 text-amber-700 text-[12px] font-semibold px-3 py-1 rounded-full">Bientôt disponible</span>
        </div>
      </div>
    </AdminLayout>
  )
}
