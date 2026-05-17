import { AdminLayout } from '@/components/layout/AdminLayout'
import { PageHeader } from '@/components/shared/PageHeader'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { BarChart3 } from 'lucide-react'

export default function RentabiliteClientPage() {
  return (
    <AdminLayout>
      <div className="p-8">
        <PageHeader
          title="Rentabilité client"
          description="Analyse de la rentabilité par client"
        />
        <Card className="max-w-lg mx-auto mt-16">
          <CardContent className="py-16 text-center">
            <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <BarChart3 className="w-8 h-8 text-slate-400" />
            </div>
            <Badge variant="secondary" className="mb-4">À venir</Badge>
            <h2 className="text-xl font-semibold text-slate-900 mb-2">Module en développement</h2>
            <p className="text-slate-500 text-sm max-w-sm mx-auto">
              L'analyse de rentabilité par client sera disponible prochainement.
              Cette fonctionnalité permettra de visualiser la marge brute,
              le coût des interventions et la valeur de chaque client.
            </p>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  )
}
