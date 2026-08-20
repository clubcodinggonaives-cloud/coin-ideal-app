import { Construction } from "lucide-react"
import { Card, CardContent, EmptyState } from "@/components/ui"

function AdminSettingsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Paramètres</h1>
        <p className="text-gray-500">Configurez les paramètres de la plateforme.</p>
      </div>

      <Card>
        <CardContent className="py-12">
          <EmptyState
            icon={<Construction className="h-8 w-8 text-gray-400" />}
            title="Page en construction"
            description="Les paramètres de la plateforme seront disponibles prochainement. Vous pourrez y configurer les options générales, les notifications par email, les paramètres de paiement et plus encore."
          />
        </CardContent>
      </Card>
    </div>
  )
}

export default AdminSettingsPage
