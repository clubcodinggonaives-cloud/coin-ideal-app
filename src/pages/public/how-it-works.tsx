import { Link } from "react-router-dom"
import { Upload, SlidersHorizontal, Receipt, Truck, Wallet, PackageCheck } from "lucide-react"
import { Button, Card, CardContent } from "@/components/ui"
import { COMPANY, ROUTES } from "@/lib/constants"

const journey = [
  {
    icon: Upload,
    title: "1. Envoyez votre document",
    description:
      "Depuis le site, téléversez le fichier à imprimer ou copier (PDF, Word, JPG, PNG).",
  },
  {
    icon: SlidersHorizontal,
    title: "2. Configurez votre commande",
    description:
      "Choisissez le format, la couleur, le recto/verso, le nombre de copies et les finitions (reliure, plastification, agrafage).",
  },
  {
    icon: Receipt,
    title: "3. Recevez une estimation",
    description: "Le prix est calculé automatiquement selon nos tarifs en vigueur.",
  },
  {
    icon: Truck,
    title: "4. Choisissez retrait ou livraison",
    description: `Retrait gratuit à ${COMPANY.street}, ${COMPANY.city}, ou livraison payante à domicile ou au bureau.`,
  },
  {
    icon: Wallet,
    title: "5. Payez",
    description: "Espèces, MonCash, NatCash ou virement — selon les moyens disponibles.",
  },
  {
    icon: PackageCheck,
    title: "6. Suivez votre commande",
    description:
      "Vous êtes notifié à chaque étape : en préparation, prête, en livraison ou livrée.",
  },
]

function HowItWorksPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <section className="bg-gradient-to-br from-primary-700 to-primary-800 px-4 py-16 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-3xl text-center">
          <h1 className="text-4xl font-bold text-white sm:text-5xl">Comment ça marche ?</h1>
          <p className="mx-auto mt-4 max-w-xl text-lg text-primary-100">
            Commandez vos impressions et copies depuis chez vous, payez, puis récupérez vos documents
            chez COIN-IDEAL ou faites-les livrer.
          </p>
        </div>
      </section>

      <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="space-y-4">
          {journey.map((item) => (
            <Card key={item.title}>
              <CardContent className="flex items-start gap-4 pt-6">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary-50 text-primary-600">
                  <item.icon className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">{item.title}</h3>
                  <p className="mt-1 text-sm text-gray-500">{item.description}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="mt-10 rounded-2xl bg-primary-700 px-8 py-10 text-center">
          <h2 className="text-xl font-bold text-white">Prêt à commander ?</h2>
          <div className="mt-6">
            <Link to={ROUTES.ORDER}>
              <Button size="lg" className="bg-white text-primary-700 hover:bg-gray-100">
                Commander une impression
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}

export default HowItWorksPage
