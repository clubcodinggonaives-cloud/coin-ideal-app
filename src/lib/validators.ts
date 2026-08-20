import { z } from "zod"

export const loginSchema = z.object({
  email: z.string().email("Adresse email invalide"),
  password: z.string().min(6, "Le mot de passe doit contenir au moins 6 caractères"),
})

export const registerSchema = z.object({
  firstName: z.string().min(2, "Le prénom doit contenir au moins 2 caractères"),
  lastName: z.string().min(2, "Le nom doit contenir au moins 2 caractères"),
  email: z.string().email("Adresse email invalide"),
  password: z.string().min(8, "Le mot de passe doit contenir au moins 8 caractères"),
  confirmPassword: z.string(),
  phone: z.string().optional(),
  role: z.enum(["client", "provider"], { message: "Veuillez sélectionner un rôle" }),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Les mots de passe ne correspondent pas",
  path: ["confirmPassword"],
})

export const forgotPasswordSchema = z.object({
  email: z.string().email("Adresse email invalide"),
})

export const resetPasswordSchema = z.object({
  password: z.string().min(8, "Le mot de passe doit contenir au moins 8 caractères"),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Les mots de passe ne correspondent pas",
  path: ["confirmPassword"],
})

export const profileSchema = z.object({
  firstName: z.string().min(2, "Le prénom doit contenir au moins 2 caractères"),
  lastName: z.string().min(2, "Le nom doit contenir au moins 2 caractères"),
  phone: z.string().optional(),
  bio: z.string().max(500, "La bio ne peut pas dépasser 500 caractères").optional(),
})

export const serviceSchema = z.object({
  name: z.string().min(3, "Le nom doit contenir au moins 3 caractères"),
  description: z.string().min(10, "La description doit contenir au moins 10 caractères"),
  categoryId: z.string().uuid("Catégorie invalide"),
  price: z.number().min(0, "Le prix ne peut pas être négatif"),
  priceUnit: z.string().optional(),
  location: z.string().min(2, "La localisation est requise"),
  estimatedDuration: z.string().optional(),
  conditions: z.string().optional(),
})

export const reviewSchema = z.object({
  rating: z.number().min(1, "La note est requise").max(5, "La note maximale est 5"),
  comment: z.string().min(10, "Le commentaire doit contenir au moins 10 caractères").max(1000, "Le commentaire ne peut pas dépasser 1000 caractères"),
})

export const serviceRequestSchema = z.object({
  serviceId: z.string().uuid("Service invalide"),
  message: z.string().min(10, "Le message doit contenir au moins 10 caractères"),
  preferredDate: z.string().optional(),
  preferredTime: z.string().optional(),
  address: z.string().min(2, "L'adresse est requise"),
})

export const messageSchema = z.object({
  content: z.string().min(1, "Le message ne peut pas être vide").max(2000, "Le message ne peut pas dépasser 2000 caractères"),
})

export const categorySchema = z.object({
  name: z.string().min(2, "Le nom doit contenir au moins 2 caractères"),
  description: z.string().optional(),
  icon: z.string().optional(),
  slug: z.string().optional(),
})

export type LoginFormData = z.infer<typeof loginSchema>
export type RegisterFormData = z.infer<typeof registerSchema>
export type ForgotPasswordFormData = z.infer<typeof forgotPasswordSchema>
export type ResetPasswordFormData = z.infer<typeof resetPasswordSchema>
export type ProfileFormData = z.infer<typeof profileSchema>
export type ServiceFormData = z.infer<typeof serviceSchema>
export type ReviewFormData = z.infer<typeof reviewSchema>
export type ServiceRequestFormData = z.infer<typeof serviceRequestSchema>
export type MessageFormData = z.infer<typeof messageSchema>
export type CategoryFormData = z.infer<typeof categorySchema>
