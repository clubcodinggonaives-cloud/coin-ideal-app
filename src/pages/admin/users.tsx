import { useState } from "react"
import { Users, Search, UserX } from "lucide-react"
import {
  Card,
  CardContent,
  Button,
  Badge,
  Input,
  Skeleton,
  EmptyState,
  ErrorState,
  Pagination,
} from "@/components/ui"
import { useAdminUsers, useSuspendUser } from "@/features/admin/hooks/use-admin"
import { formatDate } from "@/utils/format"

function AdminUsersSkeleton() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-8 w-48" />
      <Skeleton className="h-10 w-72" />
      <Skeleton className="h-[400px] rounded-xl" />
    </div>
  )
}

function AdminUsersPage() {
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState("")

  const { data, isLoading, error, refetch } = useAdminUsers(page)
  const suspendUser = useSuspendUser()

  if (isLoading) return <AdminUsersSkeleton />
  if (error) return <ErrorState onRetry={refetch} />

  const users = data?.data || []
  const filtered = search
    ? users.filter(
        (u) =>
          u.first_name.toLowerCase().includes(search.toLowerCase()) ||
          u.last_name.toLowerCase().includes(search.toLowerCase()) ||
          u.email.toLowerCase().includes(search.toLowerCase())
      )
    : users

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Utilisateurs</h1>
        <p className="text-gray-500">Gérez les comptes utilisateurs de la plateforme.</p>
      </div>

      <div className="max-w-sm">
        <Input
          placeholder="Rechercher un utilisateur..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          leftIcon={<Search className="h-4 w-4" />}
        />
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          icon={<Users className="h-8 w-8 text-gray-400" />}
          title="Aucun utilisateur"
          description={search ? "Aucun utilisateur ne correspond à votre recherche." : "Aucun utilisateur enregistré."}
        />
      ) : (
        <>
          <Card>
            <CardContent className="overflow-x-auto p-0">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-gray-200 bg-gray-50">
                    <th className="px-4 py-3 font-medium text-gray-500">Nom</th>
                    <th className="px-4 py-3 font-medium text-gray-500">Email</th>
                    <th className="px-4 py-3 font-medium text-gray-500">Rôle</th>
                    <th className="px-4 py-3 font-medium text-gray-500">Inscrit le</th>
                    <th className="px-4 py-3 text-right font-medium text-gray-500">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filtered.map((user) => (
                    <tr key={user.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <p className="font-medium text-gray-900">
                          {user.first_name} {user.last_name}
                        </p>
                      </td>
                      <td className="px-4 py-3 text-gray-600">{user.email}</td>
                      <td className="px-4 py-3">
                        <Badge
                          variant={
                            user.role === "admin"
                              ? "destructive"
                              : user.role === "provider"
                              ? "info"
                              : "secondary"
                          }
                        >
                          {user.role === "admin" ? "Admin" : user.role === "provider" ? "Prestataire" : "Client"}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-gray-500">
                        {formatDate(user.created_at)}
                      </td>
                      <td className="px-4 py-3 text-right">
                        {user.role !== "admin" && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => suspendUser.mutate(user.id)}
                            disabled={suspendUser.isPending}
                          >
                            <UserX className="h-4 w-4" />
                          </Button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>

          {data && data.totalPages > 1 && (
            <Pagination
              currentPage={page}
              totalPages={data.totalPages}
              onPageChange={setPage}
            />
          )}
        </>
      )}
    </div>
  )
}

export default AdminUsersPage
