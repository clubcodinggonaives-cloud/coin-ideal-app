// Supabase Auth (GoTrue) throws errors with English messages — the site is
// entirely in French, so those were reaching the UI verbatim (confirmed
// live: a wrong password showed "Invalid login credentials" on the login
// form). GoTrue's error strings are stable, documented text, not internal
// codes, so mapping known ones is reliable; anything unmapped falls back to
// a generic French message rather than ever showing raw English.
const KNOWN_MESSAGES: Record<string, string> = {
  "Invalid login credentials": "Adresse email ou mot de passe incorrect.",
  "Email not confirmed": "Veuillez confirmer votre adresse email avant de vous connecter.",
  "User already registered": "Un compte existe déjà avec cette adresse email.",
  "Email rate limit exceeded": "Trop de tentatives. Veuillez réessayer dans quelques minutes.",
  "Password should be at least 6 characters": "Le mot de passe doit contenir au moins 6 caractères.",
  "Unable to validate email address: invalid format": "L'adresse email n'est pas valide.",
  "New password should be different from the old password": "Le nouveau mot de passe doit être différent de l'ancien.",
  "Signups not allowed for this instance": "Les inscriptions ne sont pas disponibles actuellement.",
}

export function translateAuthError(err: unknown, fallback: string): string {
  const message = err instanceof Error ? err.message : ""
  if (KNOWN_MESSAGES[message]) return KNOWN_MESSAGES[message]
  // GoTrue's rate-limit message for password-reset requests includes a
  // dynamic second count ("For security purposes, you can only request
  // this after 42 seconds.") — match by prefix rather than exact string.
  if (message.startsWith("For security purposes, you can only request this after")) {
    return "Pour des raisons de sécurité, veuillez patienter avant de refaire une demande."
  }
  return fallback
}
