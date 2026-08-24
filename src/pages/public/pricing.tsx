import { Link, useNavigate } from "react-router-dom"
import { Printer, MessageCircle, Truck, Layers } from "lucide-react"
import { Button, Card, CardContent, Skeleton, EmptyState, ErrorState } from "@/components/ui"
import { useServices } from "@/features/services/hooks/use-services"
import { usePricingConfig } from "@/features/document-orders/hooks/use-pricing-config"
import { formatCurrency } from "@/utils/format"
import { ROUTES } from "@/lib/constants"
import type { Service } from "@/types"

function PricingCard({ service }: { service: Service }) {
  return (
    <Card>
      <CardContent className="flex items-start justify-between gap-4 pt-6">
        <div>
          <h3 className="font-semibold text-gray-900">{service.name}</h3>
          {service.description && (
            <p className="mt-1 text-sm text-gray-500">{service.description}</p>
          )}
        </div>
        <div className="shrink-0 text-right">
          <p className="text-lg font-bold text-primary-700">{formatCurrency(service.price)}</p>
          {service.price_unit && <p className="text-xs text-gray-500">/ {service.price_unit}</p>}
        </div>
      </CardContent>
    </Card>
  )
}

function ServicePricingSection({ title, services }: { title: string; services: Service[] }) {
  if (services.length === 0) return null
  return (
    <div>
      <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
      <div className="mt-4 space-y-3">
        {services.map((service) => (
          <PricingCard key={service.id} service={service} />
        ))}
      </div>
    </div>
  )
}

function PricingPage() {
  const navigate = useNavigate()
  const { data, isLoading, isError, refetch } = useServices({ pageSize: 50 })
  const services = data?.data ?? []
  const { data: pricingConfig } = usePricingConfig()

  const normalize = (value: string) => value.toLowerCase()
  const printing = services.filter((s) => normalize(s.category?.name ?? "").includes("impression"))
  const copying = services.filter((s) => normalize(s.category?.name ?? "").includes("copie"))
  const other = services.filter((s) => !printing.includes(s) && !copying.includes(s))

  return (
    <div className="min-h-screen bg-gray-50">
      <section className="bg-gradient-to-br from-primary-700 to-primary-800 px-4 py-16 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-3xl text-center">
          <h1 className="text-4xl font-bold text-white sm:text-5xl">Tarifs</h1>
          <p className="mx-auto mt-4 max-w-xl text-lg text-primary-100">
            Des prix clairs pour l'impression, la copie et les finitions. Le montant exact de votre
            commande dépend du nombre de pages, de copies et des options choisies.
          </p>
        </div>
      </section>

      <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6 lg:px-8">
        {isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-20 rounded-xl" />
            ))}
          </div>
        ) : isError ? (
          <ErrorState message="Impossible de charger les tarifs pour le moment." onRetry={() => refetch()} />
        ) : services.length === 0 ? (
          <EmptyState
            icon={<Printer className="h-8 w-8 text-gray-400" />}
            title="Tarifs en cours de configuration"
            description="Notre grille tarifaire sera bientôt disponible en ligne. En attendant, contactez-nous pour connaître le prix de votre commande."
            action={{ label: "Nous contacter", onClick: () => navigate(ROUTES.CONTACT) }}
          />
        ) : (
          <div className="space-y-10">
            <ServicePricingSection title="Impression" services={printing} />
            <ServicePricingSection title="Copie" services={copying} />
            <ServicePricingSection title="Autres services" services={other} />
          </div>
        )}

        {pricingConfig && pricingConfig.finishingOptions.length > 0 && (
          <div className="mt-10">
            <h2 className="flex items-center gap-2 text-lg font-semibold text-gray-900">
              <Layers className="h-5 w-5 text-primary-600" />
              Options de finition
            </h2>
            <div className="mt-4 space-y-3">
              {pricingConfig.finishingOptions.map((option) => (
                <Card key={option.id}>
                  <CardContent className="flex items-center justify-between pt-6">
                    <span className="font-medium text-gray-900">{option.label}</span>
                    <span className="font-semibold text-primary-700">+{formatCurrency(option.cost)}</span>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        {pricingConfig && (
          <div className="mt-10">
            <h2 className="flex items-center gap-2 text-lg font-semibold text-gray-900">
              <Truck className="h-5 w-5 text-primary-600" />
              Livraison
            </h2>
            <Card className="mt-4">
              <CardContent className="pt-6 text-sm text-gray-600">
                Retrait au local : gratuit. Livraison à domicile ou au bureau :{" "}
                <span className="font-semibold text-gray-900">{formatCurrency(pricingConfig.flatDeliveryFee)}</span>{" "}
                (frais fixe — des tarifs par zone pourront être ajoutés par COIN-IDEAL).
              </CardContent>
            </Card>
          </div>
        )}

        <div className="mt-12 rounded-2xl border border-primary-100 bg-primary-50 p-8 text-center">
          <h2 className="text-xl font-bold text-gray-900">Une question sur nos tarifs ?</h2>
          <p className="mx-auto mt-2 max-w-md text-sm text-gray-600">
            Envoyez votre document, nous vous donnons une estimation précise avant de confirmer votre
            commande.
          </p>
          <div className="mt-6 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link to={ROUTES.ORDER}>
              <Button size="lg">
                <Printer className="h-4 w-4" />
                Commander une impression
              </Button>
            </Link>
            <Link to={ROUTES.CONTACT}>
              <Button variant="outline" size="lg">
                <MessageCircle className="h-4 w-4" />
                Nous contacter
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}

export default PricingPage
