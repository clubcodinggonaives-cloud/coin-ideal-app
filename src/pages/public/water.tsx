import { Droplets, MapPin } from "lucide-react"
import { Button, Card, CardContent, Skeleton, EmptyState } from "@/components/ui"
import { WhatsAppIcon } from "@/components/icons/social-icons"
import { useServices } from "@/features/services/hooks/use-services"
import { formatCurrency } from "@/utils/format"
import { COMPANY } from "@/lib/constants"

function WaterPage() {
  const { data, isLoading } = useServices({ pageSize: 20 })
  const products = (data?.data ?? []).filter((s) =>
    (s.category?.name ?? "").toLowerCase().includes("eau")
  )

  return (
    <div className="min-h-screen bg-gray-50">
      <section className="bg-gradient-to-br from-primary-700 to-primary-800 px-4 py-16 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-3xl text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-white/10 text-white">
            <Droplets className="h-7 w-7" />
          </div>
          <h1 className="mt-5 text-4xl font-bold text-white sm:text-5xl">Vente d'eau</h1>
          <p className="mx-auto mt-4 max-w-xl text-lg text-primary-100">
            COIN-IDEAL propose également de l'eau à {COMPANY.city}. Contactez-nous pour connaître les
            formats disponibles et leur prix.
          </p>
        </div>
      </section>

      <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6 lg:px-8">
        {isLoading ? (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
            <Skeleton className="h-40 rounded-xl" />
            <Skeleton className="h-40 rounded-xl" />
          </div>
        ) : products.length > 0 ? (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
            {products.map((product) => (
              <Card key={product.id}>
                <CardContent className="pt-6">
                  <h3 className="font-semibold text-gray-900">{product.name}</h3>
                  {product.description && (
                    <p className="mt-1 text-sm text-gray-500">{product.description}</p>
                  )}
                  <p className="mt-3 text-lg font-bold text-primary-700">
                    {formatCurrency(product.price)}
                    {product.price_unit && (
                      <span className="text-sm font-normal text-gray-500"> / {product.price_unit}</span>
                    )}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <EmptyState
            icon={<Droplets className="h-8 w-8 text-gray-400" />}
            title="Catalogue en préparation"
            description="Les produits, photos et prix seront bientôt publiés ici. En attendant, contactez-nous directement pour connaître la disponibilité."
          />
        )}

        <div className="mt-12 grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="flex items-center gap-3 rounded-xl border border-gray-200 bg-white p-4">
            <MapPin className="h-5 w-5 shrink-0 text-primary-600" />
            <p className="text-sm text-gray-700">
              {COMPANY.street}, {COMPANY.city}, {COMPANY.country}
            </p>
          </div>
          <div className="flex items-center gap-3 rounded-xl border border-gray-200 bg-white p-4">
            <WhatsAppIcon className="h-5 w-5 shrink-0 text-primary-600" />
            <a href={`https://wa.me/${COMPANY.whatsapp}`} target="_blank" rel="noopener noreferrer" className="text-sm text-gray-700 hover:text-primary-600">
              +509 41 00 2675
            </a>
          </div>
          <a
            href={`https://wa.me/${COMPANY.whatsapp}?text=${encodeURIComponent("Bonjou, mwen ta renmen jwenn enfòmasyon sou vant dlo a.")}`}
            target="_blank"
            rel="noopener noreferrer"
            className="sm:col-span-1"
          >
            <Button className="w-full">
              <WhatsAppIcon className="h-4 w-4" />
              Demander des informations
            </Button>
          </a>
        </div>
      </div>
    </div>
  )
}

export default WaterPage
