import { useState } from "react"
import { ShieldCheck } from "lucide-react"
import { Card, CardHeader, CardTitle, CardDescription, CardContent, Button, Input, Alert } from "@/components/ui"
import { usePin } from "@/features/auth/hooks/use-pin"
import { formatDate } from "@/utils/format"

const DIGITS_ONLY = /^\d{0,6}$/

/**
 * Réutilisé sur /admin/settings et /provider/profile — le PIN est une
 * fonctionnalité admin/provider, pas une page dédiée. Exige toujours le PIN
 * ACTUEL (vérifié via verify_pin, pas juste "on est déjà élevé") avant
 * d'accepter un nouveau code : la session élevée prouve qu'on a le droit
 * d'être dans ce tableau de bord, pas qu'on est la même personne qui a
 * choisi le PIN — même logique qu'un changement de mot de passe qui
 * redemande l'ancien.
 */
function ChangePinCard() {
  const { setPin, verifyPin } = usePin()
  const [currentPin, setCurrentPin] = useState("")
  const [newPin, setNewPin] = useState("")
  const [confirmPin, setConfirmPin] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const isBusy = verifyPin.isPending || setPin.isPending

  const handleSubmit = async () => {
    setError(null)
    setSuccess(false)

    if (!/^\d{6}$/.test(currentPin)) {
      setError("Entrez votre code PIN actuel (6 chiffres).")
      return
    }
    if (!/^\d{6}$/.test(newPin)) {
      setError("Le nouveau code PIN doit contenir exactement 6 chiffres.")
      return
    }
    if (newPin !== confirmPin) {
      setError("Les deux nouveaux codes ne correspondent pas.")
      return
    }
    if (newPin === currentPin) {
      setError("Le nouveau code doit être différent de l'actuel.")
      return
    }

    try {
      const check = await verifyPin.mutateAsync(currentPin)
      if (!check.ok) {
        setError(
          check.lockedUntil
            ? `Trop de tentatives. Réessayez après ${formatDate(check.lockedUntil)}.`
            : "Code PIN actuel incorrect."
        )
        return
      }
      await setPin.mutateAsync(newPin)
      setSuccess(true)
      setCurrentPin("")
      setNewPin("")
      setConfirmPin("")
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur lors du changement de code PIN.")
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ShieldCheck className="h-5 w-5 text-primary-600" />
          Code PIN de sécurité
        </CardTitle>
        <CardDescription>
          Ce code à 6 chiffres est demandé en plus de votre mot de passe pour accéder à cet espace.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {error && <Alert variant="error">{error}</Alert>}
        {success && <Alert variant="success">Code PIN mis à jour avec succès.</Alert>}

        <Input
          label="Code PIN actuel"
          type="password"
          inputMode="numeric"
          maxLength={6}
          value={currentPin}
          onChange={(e) => DIGITS_ONLY.test(e.target.value) && setCurrentPin(e.target.value)}
          placeholder="••••••"
        />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Input
            label="Nouveau code PIN"
            type="password"
            inputMode="numeric"
            maxLength={6}
            value={newPin}
            onChange={(e) => DIGITS_ONLY.test(e.target.value) && setNewPin(e.target.value)}
            placeholder="••••••"
          />
          <Input
            label="Confirmer le nouveau code"
            type="password"
            inputMode="numeric"
            maxLength={6}
            value={confirmPin}
            onChange={(e) => DIGITS_ONLY.test(e.target.value) && setConfirmPin(e.target.value)}
            placeholder="••••••"
          />
        </div>
        <Button onClick={handleSubmit} isLoading={isBusy} disabled={isBusy}>
          Mettre à jour mon code PIN
        </Button>
      </CardContent>
    </Card>
  )
}

export { ChangePinCard }
