import { useState } from "react"
import { FolderOpen, Plus, Edit, Save, X } from "lucide-react"
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  Button,
  Badge,
  Input,
  Textarea,
  Skeleton,
  EmptyState,
  ErrorState,
} from "@/components/ui"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { supabase } from "@/services/supabase/client"
import { categorySchema, type CategoryFormData } from "@/lib/validators"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import type { Category } from "@/types"

function useAllCategories() {
  return useQuery({
    queryKey: ["admin", "categories"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("categories")
        .select("*")
        .order("name", { ascending: true })
      if (error) throw error
      return (data ?? []) as Category[]
    },
  })
}

function useToggleCategoryActive() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, isActive }: { id: string; isActive: boolean }) => {
      const { error } = await supabase
        .from("categories")
        .update({ is_active: isActive })
        .eq("id", id)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "categories"] })
    },
  })
}

function useCreateCategory() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (data: CategoryFormData) => {
      const slug = data.slug || data.name.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "")
      const { error } = await supabase.from("categories").insert({
        name: data.name,
        description: data.description || null,
        icon: data.icon || null,
        slug,
        is_active: true,
      })
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "categories"] })
    },
  })
}

function useUpdateCategory() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: CategoryFormData }) => {
      const slug = data.slug || data.name.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "")
      const { error } = await supabase
        .from("categories")
        .update({ name: data.name, description: data.description || null, icon: data.icon || null, slug })
        .eq("id", id)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "categories"] })
    },
  })
}

function AdminCategoriesSkeleton() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-8 w-48" />
      {Array.from({ length: 5 }).map((_, i) => (
        <Skeleton key={i} className="h-16 rounded-xl" />
      ))}
    </div>
  )
}

function AdminCategoriesPage() {
  const [editingId, setEditingId] = useState<string | null>(null)
  const [showForm, setShowForm] = useState(false)

  const { data: categories, isLoading, error, refetch } = useAllCategories()
  const toggleActive = useToggleCategoryActive()
  const createCategory = useCreateCategory()
  const updateCategory = useUpdateCategory()

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<CategoryFormData>({
    resolver: zodResolver(categorySchema),
  })

  if (isLoading) return <AdminCategoriesSkeleton />
  if (error) return <ErrorState onRetry={refetch} />

  const startEdit = (cat: Category) => {
    setEditingId(cat.id)
    setShowForm(true)
    reset({
      name: cat.name,
      description: cat.description || "",
      icon: cat.icon || "",
      slug: cat.slug,
    })
  }

  const startCreate = () => {
    setEditingId(null)
    setShowForm(true)
    reset({ name: "", description: "", icon: "", slug: "" })
  }

  const onSubmit = (data: CategoryFormData) => {
    if (editingId) {
      updateCategory.mutate({ id: editingId, data }, {
        onSuccess: () => { setShowForm(false); setEditingId(null) },
      })
    } else {
      createCategory.mutate(data, {
        onSuccess: () => { setShowForm(false) },
      })
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Catégories</h1>
          <p className="text-gray-500">Gérez les catégories de services.</p>
        </div>
        <Button onClick={startCreate}>
          <Plus className="mr-2 h-4 w-4" />
          Nouvelle catégorie
        </Button>
      </div>

      {showForm && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>{editingId ? "Modifier" : "Nouvelle catégorie"}</CardTitle>
              <Button variant="ghost" size="icon-sm" onClick={() => { setShowForm(false); setEditingId(null) }}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Input
                  label="Nom"
                  {...register("name")}
                  error={errors.name?.message}
                  placeholder="Ex: Plomberie"
                />
                <Input
                  label="Slug"
                  {...register("slug")}
                  error={errors.slug?.message}
                  placeholder="Ex: plomberie"
                />
              </div>
              <Input
                label="Icône"
                {...register("icon")}
                error={errors.icon?.message}
                placeholder="Nom de l'icône (optionnel)"
              />
              <Textarea
                label="Description"
                {...register("description")}
                error={errors.description?.message}
                rows={2}
              />
              <div className="flex justify-end gap-3">
                <Button type="button" variant="outline" onClick={() => { setShowForm(false); setEditingId(null) }}>
                  Annuler
                </Button>
                <Button type="submit" disabled={createCategory.isPending || updateCategory.isPending}>
                  <Save className="mr-2 h-4 w-4" />
                  {editingId ? "Enregistrer" : "Créer"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {!categories || categories.length === 0 ? (
        <EmptyState
          icon={<FolderOpen className="h-8 w-8 text-gray-400" />}
          title="Aucune catégorie"
          description="Créez votre première catégorie pour organiser les services."
        />
      ) : (
        <Card>
          <CardContent className="p-0">
            <div className="divide-y divide-gray-100">
              {categories.map((cat) => (
                <div key={cat.id} className="flex items-center justify-between px-4 py-3">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gray-100 text-lg">
                      {cat.icon || "📁"}
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">{cat.name}</p>
                      <p className="text-xs text-gray-500">{cat.slug}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge variant={cat.is_active ? "success" : "secondary"}>
                      {cat.is_active ? "Active" : "Inactive"}
                    </Badge>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() =>
                        toggleActive.mutate({ id: cat.id, isActive: !cat.is_active })
                      }
                      disabled={toggleActive.isPending}
                    >
                      {cat.is_active ? "Désactiver" : "Activer"}
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => startEdit(cat)}>
                      <Edit className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

export default AdminCategoriesPage
