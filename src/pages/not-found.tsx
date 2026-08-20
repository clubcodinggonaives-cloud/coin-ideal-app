import { Link } from "react-router-dom"
import { Home } from "lucide-react"
import { Button } from "@/components/ui"
import { ROUTES } from "@/lib/constants"

function NotFoundPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gray-50 px-4">
      <div className="text-center">
        <div className="relative">
          <span className="text-[12rem] font-bold leading-none text-primary-100">404</span>
          <div className="absolute inset-0 flex items-center justify-center">
            <svg
              className="h-32 w-32 text-primary-200"
              viewBox="0 0 200 200"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <circle cx="100" cy="100" r="80" stroke="currentColor" strokeWidth="4" strokeDasharray="8 8" />
              <path
                d="M70 90c0-16.569 13.431-30 30-30s30 13.431 30 30"
                stroke="currentColor"
                strokeWidth="4"
                strokeLinecap="round"
              />
              <circle cx="78" cy="78" r="6" fill="currentColor" />
              <circle cx="122" cy="78" r="6" fill="currentColor" />
              <path
                d="M80 115c4.418 3.088 9.58 5 15 5s10.582-1.912 15-5"
                stroke="currentColor"
                strokeWidth="4"
                strokeLinecap="round"
              />
            </svg>
          </div>
        </div>

        <h1 className="mt-2 text-3xl font-bold text-gray-900">Page introuvable</h1>
        <p className="mx-auto mt-4 max-w-md text-gray-500">
          Desole, la page que vous recherchez n&apos;existe pas ou a ete deplacee.
          Verifiez l&apos;adresse ou revenez a l&apos;accueil.
        </p>

        <div className="mt-8">
          <Link to={ROUTES.HOME}>
            <Button size="lg">
              <Home className="h-5 w-5" />
              Retour a l&apos;accueil
            </Button>
          </Link>
        </div>
      </div>
    </div>
  )
}

export default NotFoundPage
