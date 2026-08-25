import { type HTMLAttributes } from "react"
import { cn } from "@/utils/cn"

/**
 * Phase 5H : les tableaux admin/prestataire (utilisateurs, services,
 * prestataires, demandes, revenus) ont plusieurs colonnes et n'ont pas de
 * card-view mobile dédiée. `overflow-x-auto` seul les rend défilables mais
 * sans aucun indice visuel — un audit réel (320px, données réelles) a montré
 * que "Rôle"/"Actions" restent hors champ sans qu'on sache qu'il faut
 * glisser. Ce wrapper ajoute l'indice + garde la 1re colonne (identité de la
 * ligne) visible pendant le défilement.
 */
function ResponsiveTableScroll({ className, children, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn("overflow-x-auto", className)} {...props}>
      {children}
    </div>
  )
}

function TableScrollHint() {
  return (
    <p className="border-b border-gray-100 bg-gray-50 px-4 py-1.5 text-center text-xs text-gray-500 sm:hidden">
      Faites glisser pour voir plus →
    </p>
  )
}

/** Classe à ajouter sur le premier `<th>`/`<td>` (colonne d'identité) de chaque ligne. */
const STICKY_COL_CLASS = "sticky left-0 z-[1] bg-white"

export { ResponsiveTableScroll, TableScrollHint, STICKY_COL_CLASS }
