import { useMemo, useState } from "react"
import { useLocation, useNavigate } from "react-router-dom"
import { ArrowLeft, ArrowRight, CheckCircle2 } from "lucide-react"
import { Button, Card, CardContent, EmptyState, ErrorState, Skeleton, Alert } from "@/components/ui"
import { useAuth } from "@/features/auth/hooks/use-auth"
import { FileUploader } from "@/features/document-orders/components/file-uploader"
import { PrintOptions } from "@/features/document-orders/components/print-options"
import { DeliveryOptions } from "@/features/document-orders/components/delivery-options"
import { OrderSummary } from "@/features/document-orders/components/order-summary"
import { OrderStepper } from "@/features/document-orders/components/order-stepper"
import { useDocumentOrderServices } from "@/features/document-orders/hooks/use-document-services"
import { useSubmitDocumentOrder } from "@/features/document-orders/hooks/use-submit-document-order"
import { estimateOrderPrice } from "@/features/document-orders/utils/estimate"
import { INITIAL_ORDER_STATE, type DocumentOrderState } from "@/features/document-orders/types"
import { ORDER_FILE_MAX_SIZE_MB, ROUTES } from "@/lib/constants"
import { formatCurrency } from "@/utils/format"

const STEPS = [{ label: "Fichier" }, { label: "Options" }, { label: "Récupération" }, { label: "Confirmation" }]

function DocumentOrderPage() {
  const { isAuthenticated, user } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  const [step, setStep] = useState(0)
  const [order, setOrder] = useState<DocumentOrderState>(INITIAL_ORDER_STATE)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})

  const { data: servicesData, isLoading: loadingServices, isError: servicesError, refetch } =
    useDocumentOrderServices()
  const services = useMemo(() => servicesData?.data ?? [], [servicesData])
  const selectedService = services.find((s) => s.id === order.serviceId)

  const total = estimateOrderPrice(order, selectedService?.price ?? 0)

  const submitOrder = useSubmitDocumentOrder()

  const patch = (updates: Partial<DocumentOrderState>) => setOrder((prev) => ({ ...prev, ...updates }))

  const goNext = () => {
    const errors: Record<string, string> = {}
    if (step === 0 && !order.file) {
      errors.file = "Veuillez sélectionner un document."
    }
    if (step === 1 && !order.serviceId) {
      errors.serviceId = "Veuillez choisir un service."
    }
    if (step === 2 && order.reception === "delivery" && !order.deliveryAddress.trim()) {
      errors.deliveryAddress = "Veuillez indiquer une adresse de livraison."
    }
    setFieldErrors(errors)
    if (Object.keys(errors).length > 0) return
    setStep((s) => Math.min(s + 1, STEPS.length - 1))
  }

  const goBack = () => setStep((s) => Math.max(s - 1, 0))

  const handleConfirm = () => {
    if (!isAuthenticated || !user) {
      navigate(ROUTES.LOGIN, { state: { from: location } })
      return
    }
    if (!selectedService) return

    submitOrder.mutate({
      order,
      service: selectedService,
      providerId: selectedService.provider_id,
      userId: user.id,
      total,
    })
  }

  if (submitOrder.isSuccess) {
    return (
      <div className="mx-auto max-w-lg px-4 py-20 text-center">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-green-50 text-green-600">
          <CheckCircle2 className="h-8 w-8" />
        </div>
        <h1 className="mt-6 text-2xl font-bold text-gray-900">Commande envoyée</h1>
        <p className="mt-2 text-gray-500">
          Votre demande a été transmise à COIN-IDEAL. Vous recevrez une notification dès qu'elle sera
          confirmée, avec le montant définitif.
        </p>
        <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Button onClick={() => navigate(ROUTES.DASHBOARD_REQUESTS)}>Suivre ma commande</Button>
          <Button variant="outline" onClick={() => navigate(ROUTES.HOME)}>
            Retour à l'accueil
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="border-b border-gray-200 bg-white px-4 py-6 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-5xl">
          <h1 className="text-2xl font-bold text-gray-900">Commander une impression</h1>
          <p className="mt-1 text-sm text-gray-500">
            Envoyez votre document, choisissez vos options, puis récupérez-le au local ou faites-le
            livrer.
          </p>
          <div className="mt-6">
            <OrderStepper steps={STEPS} current={step} />
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <Card>
              <CardContent className="pt-6">
                {loadingServices ? (
                  <div className="space-y-3">
                    <Skeleton className="h-10 w-full" />
                    <Skeleton className="h-10 w-full" />
                    <Skeleton className="h-10 w-2/3" />
                  </div>
                ) : servicesError ? (
                  <ErrorState
                    message="Impossible de charger le catalogue de services pour le moment."
                    onRetry={() => refetch()}
                  />
                ) : services.length === 0 ? (
                  <EmptyState
                    title="Aucun service disponible"
                    description="Le catalogue d'impression et de copie n'est pas encore configuré. Contactez-nous pour passer votre commande directement."
                    action={{ label: "Nous contacter", onClick: () => navigate(ROUTES.CONTACT) }}
                  />
                ) : (
                  <>
                    {step === 0 && (
                      <div>
                        <h2 className="text-lg font-semibold text-gray-900">Votre document</h2>
                        <p className="mt-1 text-sm text-gray-500">
                          Formats acceptés : PDF, DOC, DOCX, JPG, PNG — {ORDER_FILE_MAX_SIZE_MB} Mo maximum.
                        </p>
                        <div className="mt-4">
                          <FileUploader
                            file={order.file}
                            onChange={(file) => patch({ file })}
                            error={fieldErrors.file}
                          />
                        </div>
                      </div>
                    )}

                    {step === 1 && (
                      <div>
                        <h2 className="text-lg font-semibold text-gray-900">Options d'impression</h2>
                        <p className="mt-1 text-sm text-gray-500">
                          Le prix est calculé automatiquement selon les tarifs en vigueur.
                        </p>
                        <div className="mt-4">
                          <PrintOptions order={order} services={services} onChange={patch} />
                          {fieldErrors.serviceId && (
                            <p className="mt-2 text-sm text-red-500">{fieldErrors.serviceId}</p>
                          )}
                        </div>
                      </div>
                    )}

                    {step === 2 && (
                      <div>
                        <h2 className="text-lg font-semibold text-gray-900">Retrait ou livraison</h2>
                        <p className="mt-1 text-sm text-gray-500">
                          Choisissez comment vous souhaitez récupérer votre commande.
                        </p>
                        <div className="mt-4">
                          <DeliveryOptions
                            order={order}
                            onChange={patch}
                            addressError={fieldErrors.deliveryAddress}
                          />
                        </div>
                      </div>
                    )}

                    {step === 3 && (
                      <div>
                        <h2 className="text-lg font-semibold text-gray-900">Confirmation</h2>
                        <p className="mt-1 text-sm text-gray-500">
                          Vérifiez les détails de votre commande avant de la confirmer.
                        </p>
                        {!isAuthenticated && (
                          <Alert variant="info" className="mt-4">
                            Vous devrez vous connecter (ou créer un compte) pour finaliser votre commande.
                          </Alert>
                        )}
                        {submitOrder.isError && (
                          <Alert variant="error" className="mt-4">
                            La commande n'a pas pu être envoyée. Veuillez réessayer.
                          </Alert>
                        )}
                        <div className="mt-4 lg:hidden">
                          <OrderSummary order={order} service={selectedService} total={total} />
                        </div>
                      </div>
                    )}

                    <div className="mt-8 flex items-center justify-between border-t border-gray-100 pt-6">
                      <Button variant="ghost" onClick={goBack} disabled={step === 0}>
                        <ArrowLeft className="h-4 w-4" />
                        Retour
                      </Button>
                      {step < STEPS.length - 1 ? (
                        <Button onClick={goNext}>
                          Continuer
                          <ArrowRight className="h-4 w-4" />
                        </Button>
                      ) : (
                        <Button onClick={handleConfirm} isLoading={submitOrder.isPending}>
                          Confirmer la commande
                        </Button>
                      )}
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </div>

          <div className="hidden lg:block">
            <div className="sticky top-24">
              <OrderSummary order={order} service={selectedService} total={total} />
              {order.copies > 0 && order.pages > 0 && (
                <p className="mt-3 text-center text-xs text-gray-400">
                  Estimation en temps réel : {formatCurrency(total)}
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default DocumentOrderPage
