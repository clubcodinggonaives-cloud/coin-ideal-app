import { useState } from "react"
import { useForm } from "react-hook-form"
import { Mail, Phone, MapPin, Send, CheckCircle } from "lucide-react"
import { Button, Card, CardContent, Input, Textarea, Alert } from "@/components/ui"
import { COMPANY } from "@/lib/constants"

interface ContactFormData {
  name: string
  email: string
  subject: string
  message: string
}

function ContactPage() {
  const [submitted, setSubmitted] = useState(false)

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ContactFormData>()

  const onSubmit = async (data: ContactFormData) => {
    await new Promise((resolve) => setTimeout(resolve, 1000))
    console.log("Contact form submitted:", data)
    setSubmitted(true)
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
            <Card>
              <CardContent className="flex items-start gap-4 pt-6">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary-50 text-primary-600">
                  <Mail className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">Email</h3>
                  <p className="mt-1 text-sm text-gray-500">{COMPANY.email}</p>
                </div>
              </CardContent>
            </Card>

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

                {submitted && (
                  <Alert variant="success" className="mt-4" onClose={() => setSubmitted(false)}>
                    <CheckCircle className="h-4 w-4" />
                    Votre message a été envoyé avec succès. Nous vous répondrons bientôt.
                  </Alert>
                )}

                <form onSubmit={handleSubmit(onSubmit)} className="mt-6 space-y-4">
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <Input
                      label="Nom complet"
                      placeholder="Votre nom"
                      error={errors.name?.message}
                      {...register("name", {
                        required: "Le nom est requis",
                        minLength: { value: 2, message: "Le nom doit contenir au moins 2 caracteres" },
                      })}
                    />
                    <Input
                      label="Adresse email"
                      type="email"
                      placeholder="votre@email.com"
                      error={errors.email?.message}
                      {...register("email", {
                        required: "L'email est requis",
                        pattern: {
                          value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
                          message: "Adresse email invalide",
                        },
                      })}
                    />
                  </div>

                  <Input
                    label="Sujet"
                    placeholder="Objet de votre message"
                    error={errors.subject?.message}
                    {...register("subject", {
                      required: "Le sujet est requis",
                      minLength: { value: 3, message: "Le sujet doit contenir au moins 3 caracteres" },
                    })}
                  />

                  <Textarea
                    label="Message"
                    placeholder="Décrivez votre demande en détail..."
                    rows={6}
                    error={errors.message?.message}
                    {...register("message", {
                      required: "Le message est requis",
                      minLength: { value: 10, message: "Le message doit contenir au moins 10 caracteres" },
                    })}
                  />

                  <Button type="submit" size="lg" isLoading={isSubmitting} className="w-full sm:w-auto">
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
