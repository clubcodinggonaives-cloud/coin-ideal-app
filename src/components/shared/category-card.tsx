import { Link } from "react-router-dom"
import { Car, Home, Wrench, Sparkles, Truck, GraduationCap, Heart, Building, ShoppingBag, Briefcase, Paintbrush, Shield } from "lucide-react"
import { ROUTES } from "@/lib/constants"
import { cn } from "@/utils/cn"
import type { Category } from "@/types"

const iconMap: Record<string, React.ReactNode> = {
  car: <Car className="h-6 w-6" />,
  home: <Home className="h-6 w-6" />,
  wrench: <Wrench className="h-6 w-6" />,
  sparkles: <Sparkles className="h-6 w-6" />,
  truck: <Truck className="h-6 w-6" />,
  graduation: <GraduationCap className="h-6 w-6" />,
  heart: <Heart className="h-6 w-6" />,
  building: <Building className="h-6 w-6" />,
  shopping: <ShoppingBag className="h-6 w-6" />,
  briefcase: <Briefcase className="h-6 w-6" />,
  paintbrush: <Paintbrush className="h-6 w-6" />,
  shield: <Shield className="h-6 w-6" />,
}

interface CategoryCardProps {
  category: Category
  size?: "default" | "large"
}

function CategoryCard({ category, size = "default" }: CategoryCardProps) {
  const icon = iconMap[category.icon || ""] || <Briefcase className="h-6 w-6" />

  return (
    <Link to={`${ROUTES.SERVICES}/${category.slug}`}>
      <div
        className={cn(
          "group flex flex-col items-center justify-center rounded-xl border border-gray-200 bg-white p-6 text-center shadow-sm transition-all hover:border-primary-300 hover:shadow-md hover:ring-2 hover:ring-primary-500/10",
          size === "large" && "p-8"
        )}
      >
        <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-xl bg-primary-50 text-primary-600 transition-colors group-hover:bg-primary-100">
          {icon}
        </div>
        <h3 className={cn(
          "font-semibold text-gray-900 group-hover:text-primary-600",
          size === "large" ? "text-lg" : "text-sm"
        )}>
          {category.name}
        </h3>
        {category.service_count !== undefined && (
          <p className="mt-1 text-xs text-gray-500">
            {category.service_count} service{category.service_count > 1 ? "s" : ""}
          </p>
        )}
      </div>
    </Link>
  )
}

export { CategoryCard, iconMap }
