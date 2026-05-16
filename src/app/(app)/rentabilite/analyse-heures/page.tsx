import { AdminLayout } from '@/components/layout/AdminLayout'
import { PageHeader } from '@/components/shared/PageHeader'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { PieChart } from 'lucide-react'

export default function AnalyseHeuresPage() {
  return (
    <AdminLayout>
      <div className="p-8">
        <PageHeader
          title="Analyse des heures"
          description="Analyse détaillée de l'utilisation des heures"
        />
        <Card className="max-w-lg mx-auto mt-16">
          <CardContent className="py-16 text-center">
            <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <PieChart className="w-8 h-8 text-slate-400" />
            </div>
            <Badge variant="secondary" className="mb-4">À venir</Badge>
            <h2 className="text-xl font-semibold text-slate-900 mb-2">Module en développement</h2>
            <p className="text-slate-500 text-sm max-w-sm mx-auto">
              L'analyse approfondie des heures sera disponible prochainement.
              Vous pourrez analyser la productivité par agent, identifier les écarts
              entre heures prévues et réalisées, et optimiser vos ressources.
            </p>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  )
}
