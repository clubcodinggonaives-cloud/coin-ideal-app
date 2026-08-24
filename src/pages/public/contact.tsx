import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { Phone, MapPin, Send, CheckCircle, AlertTriangle } from "lucide-react"
import { Button, Card, CardContent, Input, Textarea, Alert } from "@/components/ui"
import { WhatsAppIcon } from "@/components/icons/social-icons"
import { COMPANY } from "@/lib/constants"
import { contactSchema, type ContactFormData } from "@/lib/validators"
import { useSubmitContactMessage } from "@/features/contact/hooks/use-contact"

function ContactPage() {
  const submitMessage = useSubmitContactMessage()

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ContactFormData>({
    resolver: zodResolver(contactSchema),
  })

  // isSubmitting (react-hook-form) couvre la validation + l'attente de
  // submitMessage.mutateAsync ; submitMessage.isPending seul ne couvrirait
  // pas la phase de validation. Les deux ensemble empêchent un double clic
  // d'envoyer deux fois pendant que le premier appel est encore en cours.
  const isBusy = isSubmitting || submitMessage.isPending

  const onSubmit = async (data: ContactFormData) => {
    // Ne JAMAIS afficher "message envoyé" avant que Supabase ne confirme
    // réellement l'écriture — contrairement à l'ancienne version de cette
    // page qui affichait toujours un succès après un simple délai simulé.
    await submitMessage.mutateAsync(data)
    reset()
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <section className="bg-gradient-to-br from-primary-600 to-primary-700 px-4 py-16 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-4xl text-center">
          <h1 className="text-4xl font-bold text-white sm:text-5xl">Contactez-nous</h1>
          <p className="mx-auto mt-4 max-w-2xl text-lg text-primary-100">
            Une question, une commande ou besoin d&apos;aide ? Notre équipe est là pour vous.
          </p>
        </div>
      </section>

      <div className="mx-auto max-w-5xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
          <div className="space-y-6">
            <a href={`https://wa.me/${COMPANY.whatsapp}`} target="_blank" rel="noopener noreferrer" className="block">
              <Card>
                <CardContent className="flex items-start gap-4 pt-6">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary-50 text-primary-600">
                    <WhatsAppIcon className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">WhatsApp</h3>
                    <p className="mt-1 text-sm text-gray-500">+509 41 00 2675</p>
                  </div>
                </CardContent>
              </Card>
            </a>

            {COMPANY.phone && (
              <Card>
                <CardContent className="flex items-start gap-4 pt-6">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary-50 text-primary-600">
                    <Phone className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">Téléphone</h3>
                    <p className="mt-1 text-sm text-gray-500">{COMPANY.phone}</p>
                  </div>
                </CardContent>
              </Card>
            )}

            <Card>
              <CardContent className="flex items-start gap-4 pt-6">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary-50 text-primary-600">
                  <MapPin className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">Adresse</h3>
                  <p className="mt-1 text-sm text-gray-500">
                    {COMPANY.street}, {COMPANY.city}, {COMPANY.country}
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="lg:col-span-2">
            <Card>
              <CardContent className="pt-6">
                <h2 className="text-xl font-bold text-gray-900">Envoyez-nous un message</h2>
                <p className="mt-1 text-sm text-gray-500">
                  Remplissez le formulaire ci-dessous et nous vous répondrons dans les plus brefs délais.
                </p>

                {submitMessage.isSuccess && (
                  <Alert variant="success" className="mt-4" onClose={() => submitMessage.reset()}>
                    <CheckCircle className="h-4 w-4" />
                    Votre message a été envoyé avec succès. Nous vous répondrons bientôt.
                  </Alert>
                )}

                {submitMessage.isError && (
                  <Alert variant="error" className="mt-4" onClose={() => submitMessage.reset()}>
                    <AlertTriangle className="h-4 w-4" />
                    Impossible d&apos;envoyer votre message pour le moment. Veuillez réessayer, ou nous
                    contacter directement par email.
                  </Alert>
                )}

                <form onSubmit={handleSubmit(onSubmit)} className="mt-6 space-y-4">
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <Input
                      label="Nom complet"
                      placeholder="Votre nom"
                      error={errors.name?.message}
                      disabled={isBusy}
                      {...register("name")}
                    />
                    <Input
                      label="Adresse email"
                      type="email"
                      placeholder="votre@email.com"
                      error={errors.email?.message}
                      disabled={isBusy}
                      {...register("email")}
                    />
                  </div>

                  <Input
                    label="Sujet"
                    placeholder="Objet de votre message"
                    error={errors.subject?.message}
                    disabled={isBusy}
                    {...register("subject")}
                  />

                  <Textarea
                    label="Message"
                    placeholder="Décrivez votre demande en détail..."
                    rows={6}
                    error={errors.message?.message}
                    disabled={isBusy}
                    {...register("message")}
                  />

                  <Button type="submit" size="lg" isLoading={isBusy} disabled={isBusy} className="w-full sm:w-auto">
                    <Send className="h-4 w-4" />
                    Envoyer le message
                  </Button>
                </form>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}

export default ContactPage
