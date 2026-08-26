import { useState } from "react"
import { Link, useNavigate } from "react-router-dom"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { Mail, Lock, Eye, EyeOff, User, Phone, FileText, Upload } from "lucide-react"
import { Button, Input, Textarea, Card, CardHeader, CardTitle, CardContent, Alert } from "@/components/ui"
import { useAuth } from "@/features/auth/hooks/use-auth"
import { translateAuthError } from "@/features/auth/utils/translate-auth-error"
import { dashboardPathForRole } from "@/features/auth/utils/dashboard-path"
import { registerSchema, type RegisterFormData } from "@/lib/validators"
import { ROUTES } from "@/lib/constants"
import { uploadsService } from "@/services/uploads.service"

function RegisterPage() {
  const { signUp, isLoading: authLoading } = useAuth()
  const navigate = useNavigate()
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [legalDocument, setLegalDocument] = useState<File | null>(null)
  const [documentError, setDocumentError] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      role: "client",
    },
  })

  const selectedRole = watch("role")

  const onSubmit = async (data: RegisterFormData) => {
    if (data.role === "provider" && !legalDocument) {
      setDocumentError("Ajoutez une pièce légale (patente ou carte professionnelle).")
      return
    }
    setDocumentError(null)
    try {
      setError(null)
      setSuccess(null)
      // BUG FOUND VIA E2E (Phase 4): same missing-navigation issue as
      // login.tsx — registration silently left the user on this page.
      const { profile } = await signUp(data.email, data.password, {
        firstName: data.firstName,
        lastName: data.lastName,
        phone: data.phone,
        role: data.role,
        proposedServices: data.proposedServices,
      })
      // Le compte est créé déjà connecté (register/index.ts crée l'utilisateur
      // avec email_confirm: true puis authService.signUp() se reconnecte
      // aussitôt) — la pièce légale peut donc être téléversée tout de suite
      // dans le bucket privé provider-documents, qui exige une session réelle.
      if (data.role === "provider" && legalDocument && profile?.id) {
        try {
          await uploadsService.uploadProviderDocument(profile.id, legalDocument)
        } catch {
          // Le compte existe déjà et est fonctionnel — ne pas bloquer
          // l'inscription pour un échec d'upload ; l'admin verra un dossier
          // vide et pourra redemander le document plutôt que de perdre le compte.
        }
      }
      navigate(dashboardPathForRole(profile?.role), { replace: true })
    } catch (err) {
      setError(translateAuthError(err, "Erreur lors de l'inscription. Veuillez réessayer."))
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4 py-12">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mb-4 flex justify-center">
            <Link to={ROUTES.HOME}>
              <img src="/logo.png" alt="COIN-IDEAL Multi-Service" className="h-14 w-14 object-contain" />
            </Link>
          </div>
          <CardTitle className="text-2xl">Créer un compte</CardTitle>
          <p className="mt-2 text-sm text-gray-500">
            Rejoignez COIN-IDEAL dès aujourd'hui
          </p>
        </CardHeader>
        <CardContent>
          {error && (
            <Alert variant="error" onClose={() => setError(null)} className="mb-6">
              {error}
            </Alert>
          )}

          {success && (
            <Alert variant="success" onClose={() => setSuccess(null)} className="mb-6">
              {success}
            </Alert>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <Input
                label="Prénom"
                placeholder="Jean"
                leftIcon={<User className="h-4 w-4" />}
                error={errors.firstName?.message}
                {...register("firstName")}
              />
              <Input
                label="Nom"
                placeholder="Dupont"
                leftIcon={<User className="h-4 w-4" />}
                error={errors.lastName?.message}
                {...register("lastName")}
              />
            </div>

            <Input
              label="Adresse email"
              type="email"
              placeholder="votre@email.com"
              leftIcon={<Mail className="h-4 w-4" />}
              error={errors.email?.message}
              {...register("email")}
            />

            <Input
              label="Téléphone (optionnel)"
              type="tel"
              placeholder="+509 34 56 7890"
              leftIcon={<Phone className="h-4 w-4" />}
              error={errors.phone?.message}
              {...register("phone")}
            />

            <div className="relative">
              <Input
                label="Mot de passe"
                type={showPassword ? "text" : "password"}
                placeholder="••••••••"
                leftIcon={<Lock className="h-4 w-4" />}
                rightIcon={
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="text-gray-400 hover:text-gray-600"
                    aria-label={showPassword ? "Masquer le mot de passe" : "Afficher le mot de passe"}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                }
                error={errors.password?.message}
                helperText="Minimum 8 caractères"
                {...register("password")}
              />
            </div>

            <div className="relative">
              <Input
                label="Confirmer le mot de passe"
                type={showConfirmPassword ? "text" : "password"}
                placeholder="••••••••"
                leftIcon={<Lock className="h-4 w-4" />}
                rightIcon={
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="text-gray-400 hover:text-gray-600"
                    aria-label={showConfirmPassword ? "Masquer le mot de passe" : "Afficher le mot de passe"}
                  >
                    {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                }
                error={errors.confirmPassword?.message}
                {...register("confirmPassword")}
              />
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">
                Je suis...
              </label>
              <div className="grid grid-cols-2 gap-3">
                <label
                  className={`flex cursor-pointer items-center justify-center rounded-lg border-2 p-3 transition-colors ${
                    selectedRole === "client"
                      ? "border-primary-500 bg-primary-50 text-primary-700"
                      : "border-gray-200 bg-white text-gray-700 hover:border-gray-300"
                  }`}
                >
                  <input
                    type="radio"
                    value="client"
                    className="sr-only"
                    {...register("role")}
                  />
                  <div className="text-center">
                    <span className="block text-sm font-medium">Client</span>
                    <span className="text-xs text-gray-600">Je cherche des services</span>
                  </div>
                </label>
                <label
                  className={`flex cursor-pointer items-center justify-center rounded-lg border-2 p-3 transition-colors ${
                    selectedRole === "provider"
                      ? "border-primary-500 bg-primary-50 text-primary-700"
                      : "border-gray-200 bg-white text-gray-700 hover:border-gray-300"
                  }`}
                >
                  <input
                    type="radio"
                    value="provider"
                    className="sr-only"
                    {...register("role")}
                  />
                  <div className="text-center">
                    <span className="block text-sm font-medium">Prestataire</span>
                    <span className="text-xs text-gray-600">Je propose des services</span>
                  </div>
                </label>
              </div>
              {errors.role && (
                <p className="text-sm text-red-500">{errors.role.message}</p>
              )}
            </div>

            {selectedRole === "provider" && (
              <div className="space-y-4 rounded-lg border border-gray-200 bg-gray-50 p-4">
                <p className="text-sm font-medium text-gray-700">
                  Informations prestataire — votre compte sera examiné par un administrateur avant que vos
                  services soient visibles publiquement.
                </p>

                <Textarea
                  label="Quels services proposez-vous ?"
                  placeholder="Ex: Impression et copie de documents, reliure, plastification..."
                  rows={3}
                  error={errors.proposedServices?.message}
                  {...register("proposedServices")}
                />

                <div>
                  <label className="mb-1.5 block text-sm font-medium text-gray-700">
                    Pièce légale (patente ou carte professionnelle)
                  </label>
                  <label className="flex cursor-pointer items-center gap-3 rounded-lg border-2 border-dashed border-gray-300 p-4 hover:border-primary-400">
                    <input
                      type="file"
                      accept="application/pdf,image/jpeg,image/png"
                      className="hidden"
                      onChange={(e) => {
                        setLegalDocument(e.target.files?.[0] ?? null)
                        setDocumentError(null)
                      }}
                    />
                    {legalDocument ? (
                      <>
                        <FileText className="h-5 w-5 shrink-0 text-primary-600" />
                        <span className="truncate text-sm text-gray-700">{legalDocument.name}</span>
                      </>
                    ) : (
                      <>
                        <Upload className="h-5 w-5 shrink-0 text-gray-400" />
                        <span className="text-sm text-gray-500">PDF, JPG ou PNG — cliquez pour choisir un fichier</span>
                      </>
                    )}
                  </label>
                  {documentError && <p className="mt-1.5 text-sm text-red-500">{documentError}</p>}
                </div>
              </div>
            )}

            <Button
              type="submit"
              className="w-full"
              isLoading={isSubmitting}
              disabled={authLoading}
            >
              {isSubmitting ? "Création du compte..." : "Créer mon compte"}
            </Button>
          </form>

          <p className="mt-6 text-center text-sm text-gray-500">
            Déjà un compte ?{" "}
            <Link
              to="/auth/login"
              className="font-medium text-primary-600 hover:text-primary-500"
            >
              Se connecter
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  )
}

export default RegisterPage
