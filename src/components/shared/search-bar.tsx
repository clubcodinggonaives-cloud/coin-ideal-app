import { useState } from "react"
import { Search, MapPin } from "lucide-react"
import { useNavigate } from "react-router-dom"
import { Button } from "@/components/ui/button"
import { ROUTES } from "@/lib/constants"
import { cn } from "@/utils/cn"

interface SearchBarProps {
  variant?: "hero" | "compact"
  className?: string
  initialQuery?: string
  initialLocation?: string
  onSearch?: (query: string, location: string) => void
}

function SearchBar({ variant = "hero", className, initialQuery = "", initialLocation = "", onSearch }: SearchBarProps) {
  const [query, setQuery] = useState(initialQuery)
  const [location, setLocation] = useState(initialLocation)
  const navigate = useNavigate()

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    const params = new URLSearchParams()
    if (query.trim()) params.set("q", query.trim())
    if (location.trim()) params.set("location", location.trim())

    if (onSearch) {
      onSearch(query, location)
    } else {
      navigate(`${ROUTES.SERVICES}?${params.toString()}`)
    }
  }

  if (variant === "compact") {
    return (
      <form onSubmit={handleSearch} className={cn("flex gap-2", className)}>
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Rechercher un service..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="h-10 w-full rounded-lg border border-gray-300 bg-white pl-10 pr-4 text-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
          />
        </div>
        <Button type="submit" size="default">
          Rechercher
        </Button>
      </form>
    )
  }

  return (
    <form
      onSubmit={handleSearch}
      className={cn(
        "mx-auto flex w-full max-w-3xl flex-col gap-3 rounded-2xl bg-white p-3 shadow-xl sm:flex-row",
        className
      )}
    >
      <div className="relative flex-1">
        <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
        <input
          type="text"
          placeholder="Quel service recherchez-vous ?"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="h-12 w-full rounded-xl border-0 bg-gray-50 pl-12 pr-4 text-gray-900 placeholder:text-gray-400 focus:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
        />
      </div>
      <div className="relative sm:w-64">
        <MapPin className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
        <input
          type="text"
          placeholder="Localisation"
          value={location}
          onChange={(e) => setLocation(e.target.value)}
          className="h-12 w-full rounded-xl border-0 bg-gray-50 pl-12 pr-4 text-gray-900 placeholder:text-gray-400 focus:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
        />
      </div>
      <Button type="submit" size="lg" className="rounded-xl px-8">
        <Search className="h-5 w-5" />
        <span className="hidden sm:inline">Rechercher</span>
      </Button>
    </form>
  )
}

export { SearchBar }
