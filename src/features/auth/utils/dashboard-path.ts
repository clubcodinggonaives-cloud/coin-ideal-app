import { ROUTES } from "@/lib/constants"

/**
 * Where to send a user right after authenticating. Login/register/OAuth
 * callback all used to hardcode ROUTES.DASHBOARD (the client dashboard),
 * so a provider or admin account landed on the client shell first every
 * time -- this centralizes the role -> landing-page mapping so all three
 * call sites stay consistent.
 */
function dashboardPathForRole(role: string | undefined): string {
  if (role === "admin") return ROUTES.ADMIN
  if (role === "provider") return ROUTES.PROVIDER_DASHBOARD
  return ROUTES.DASHBOARD
}

export { dashboardPathForRole }
