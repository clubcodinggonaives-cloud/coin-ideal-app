import { useState } from "react"
import { ShieldCheck, Lock } from "lucide-react"
import { Button, Input, Card, CardHeader, CardTitle, CardDescription, CardContent, Alert } from "@/components/ui"
import { useAuth } from "@/features/auth/hooks/use-auth"
import { usePin } from "@/features/auth/hooks/use-pin"
import { formatDate } from "@/utils/format"

const DIGITS_ONLY = /^\d{0,6}$/

interface PinGateProps {
  onUnlocked: () => void
}

/**
 * Rendered by DashboardLayout instead of <Outlet/> for admin/provider
 * accounts that aren't currently "elevated" (see use-pin.ts). Two modes:
 * no PIN configured yet -> setup (create + confirm); PIN already exists ->
 * verify. Every real check (hash comparison, lockout) happens server-side
 * in set_pin()/verify_pin() (00060) -- this component only relays results.
 */
function PinGate({ onUnlocked }: PinGateProps) {
  const { profile } = useAuth()
  const { setPin, verifyPin, elevate } = usePin()
  const [pin, setPinValue] = useState("")
  const [confirmPin, setConfirmPin] = useState("")
  const [error, setError] = useState<string | null>(null)

  const hasPin = !!profile?.pin_set_at

  const handleSetup = async () => {
    setError(null)
    if (!/^\d{6}$/.test(pin)) {
      setError("Le code PIN doit contenir exactement 6 chiffres.")
      return
    }
    if (pin !== confirmPin) {
      setError("Les deux codes ne correspondent pas.")
      return
    }
    try {
      await setPin.mutateAsync(pin)
      elevate()
      onUnlocked()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur lors de la création du PIN.")
    }
  }

  const handleVerify = async () => {
    setError(null)
    if (!/^\d{6}$/.test(pin)) {
      setError("Le code PIN doit contenir exactement 6 chiffres.")
      return
    }
    try {
      const result = await verifyPin.mutateAsync(pin)
      if (result.ok) {
        onUnlocked()
        return
      }
      if (result.lockedUntil) {
        setError(`Trop de tentatives. Réessayez après ${formatDate(result.lockedUntil)}.`)
      } else {
        setError("Code PIN incorrect.")
      }
      setPinValue("")
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur lors de la vérification du PIN.")
    }
  }

  const isBusy = setPin.isPending || verifyPin.isPending

  return (
    <div className="flex min-h-[70vh] items-center justify-center px-4">
      <Card className="w-full max-w-sm">
        <CardHeader className="text-center">
          <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-primary-50 text-primary-600">
            {hasPin ? <Lock className="h-6 w-6" /> : <ShieldCheck className="h-6 w-6" />}
          </div>
          <CardTitle>{hasPin ? "Vérification du code PIN" : "Configurez votre code PIN"}</CardTitle>
          <CardDescription>
            {hasPin
              ? "Entrez votre code à 6 chiffres pour accéder à cet espace."
              : "Cet espace requiert un code PIN à 6 chiffres, en plus de votre mot de passe."}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {error && <Alert variant="error">{error}</Alert>}

          <Input
            label={hasPin ? "Code PIN" : "Nouveau code PIN"}
            type="password"
            inputMode="numeric"
            maxLength={6}
            value={pin}
            onChange={(e) => DIGITS_ONLY.test(e.target.value) && setPinValue(e.target.value)}
            placeholder="••••••"
            autoFocus
          />

          {!hasPin && (
            <Input
              label="Confirmer le code PIN"
              type="password"
              inputMode="numeric"
              maxLength={6}
              value={confirmPin}
              onChange={(e) => DIGITS_ONLY.test(e.target.value) && setConfirmPin(e.target.value)}
              placeholder="••••••"
            />
          )}

          <Button
            className="w-full"
            isLoading={isBusy}
            disabled={isBusy}
            onClick={hasPin ? handleVerify : handleSetup}
          >
            {hasPin ? "Vérifier" : "Créer mon code PIN"}
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}

export { PinGate }
